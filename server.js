/**
 * UMBRELLA 4365 · Cursor 战地纪实
 * 零依赖服务端：node:http + node:sqlite（需要 Node >= 22.13）
 *
 * 启动：node server.js
 * 环境变量：
 *   PORT         监听端口，默认 4365
 *   ADMIN_KEY    管理密钥，默认 redqueen-4365（部署公网前务必修改为强随机值）
 *   ADMIN_PATH   管理后台入口路径（不含 /）。未设置时首次启动自动生成随机路径，
 *                持久化在 data/config.json 并打印在启动日志。/admin 恒为 404。
 *   TRUST_PROXY  置 1 表示运行在反向代理（Nginx 等）之后，取 X-Forwarded-For 作为客户端 IP
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 4365);
const ADMIN_KEY = process.env.ADMIN_KEY || 'redqueen-4365';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'chronicle.db');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ============ 管理后台隐藏路径 ============
   优先级：环境变量 ADMIN_PATH > data/config.json > 自动生成随机路径 */
function resolveAdminPath() {
  const clean = s => String(s || '').replace(/^\/+/, '').replace(/[^\w-]/g, '');
  if (process.env.ADMIN_PATH && clean(process.env.ADMIN_PATH)) return clean(process.env.ADMIN_PATH);
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (cfg.adminPath) return clean(cfg.adminPath);
  } catch {}
  const generated = 'hive-' + crypto.randomBytes(6).toString('hex');
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ adminPath: generated }, null, 2));
  return generated;
}
const ADMIN_PATH = resolveAdminPath();

/* ============ 数据库 ============ */
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    side       TEXT NOT NULL CHECK(side IN ('main','dark')),
    date       TEXT NOT NULL,
    tag        TEXT NOT NULL DEFAULT '',
    title      TEXT NOT NULL,
    summary    TEXT NOT NULL,
    detail     TEXT NOT NULL DEFAULT '',
    image      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);
`);

/* ============ 工具 ============ */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req, limit = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJSON(req) {
  const buf = await readBody(req);
  try { return JSON.parse(buf.toString('utf8') || '{}'); }
  catch { throw new Error('invalid json'); }
}

/* ============ 鉴权与防爆破 ============ */
function safeEq(a, b) {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function clientIP(req) {
  if (TRUST_PROXY) {
    const xf = req.headers['x-forwarded-for'];
    if (xf) return String(xf).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/* 同 IP 15 分钟内密钥错误 5 次 → 封禁 15 分钟 */
const FAIL_WINDOW = 15 * 60 * 1000;
const FAIL_MAX = 5;
const BLOCK_MS = 15 * 60 * 1000;
const failMap = new Map(); // ip -> { count, first, until }

function isBlocked(ip) {
  const e = failMap.get(ip);
  if (!e || !e.until) return false;
  if (Date.now() < e.until) return true;
  failMap.delete(ip);
  return false;
}
function recordFail(ip) {
  const now = Date.now();
  let e = failMap.get(ip);
  if (!e || now - e.first > FAIL_WINDOW) e = { count: 0, first: now, until: 0 };
  e.count++;
  if (e.count >= FAIL_MAX) e.until = now + BLOCK_MS;
  failMap.set(ip, e);
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of failMap) {
    if ((e.until && now >= e.until) || (!e.until && now - e.first > FAIL_WINDOW)) failMap.delete(ip);
  }
}, 30 * 60 * 1000).unref();

/* 写接口统一守卫：先查封禁，再验密钥；失败计数，成功清零 */
function requireAuth(req, res) {
  const ip = clientIP(req);
  if (isBlocked(ip)) { sendJSON(res, 429, { ok: false, error: 'TOO MANY ATTEMPTS · 已临时封禁，请稍后再试' }); return false; }
  if (!safeEq(req.headers['x-admin-key'] || '', ADMIN_KEY)) {
    recordFail(ip);
    sendJSON(res, 401, { ok: false, error: 'ACCESS DENIED' });
    return false;
  }
  failMap.delete(ip);
  return true;
}

function validateEvent(b) {
  const errors = [];
  if (!['main', 'dark'].includes(b.side)) errors.push('side 必须是 main（正史）或 dark（野史）');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || Number.isNaN(Date.parse(b.date))) errors.push('date 必须是 YYYY-MM-DD');
  if (!b.title || !String(b.title).trim()) errors.push('title 必填');
  if (!b.summary || !String(b.summary).trim()) errors.push('summary 必填');
  return errors;
}

function rowToEvent(r) { return r; }

/* ============ 路由 ============ */
async function handleAPI(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', 'events', ':id']

  /* 密钥校验（后台登录，含防爆破限速） */
  if (url.pathname === '/api/auth/check' && req.method === 'POST') {
    const ip = clientIP(req);
    if (isBlocked(ip)) return sendJSON(res, 429, { ok: false, error: 'TOO MANY ATTEMPTS · 已临时封禁，请稍后再试' });
    const body = await readJSON(req);
    if (safeEq(body.key || '', ADMIN_KEY)) { failMap.delete(ip); return sendJSON(res, 200, { ok: true }); }
    recordFail(ip);
    return sendJSON(res, 401, { ok: false, error: 'ACCESS DENIED' });
  }

  /* 事件集合 */
  if (parts[1] === 'events' && parts.length === 2) {
    if (req.method === 'GET') {
      const side = url.searchParams.get('side');
      const q = (url.searchParams.get('q') || '').trim();
      let sql = 'SELECT * FROM events';
      const cond = [], args = [];
      if (side === 'main' || side === 'dark') { cond.push('side = ?'); args.push(side); }
      if (q) {
        cond.push('(title LIKE ? OR summary LIKE ? OR detail LIKE ? OR tag LIKE ?)');
        const like = `%${q}%`; args.push(like, like, like, like);
      }
      if (cond.length) sql += ' WHERE ' + cond.join(' AND ');
      sql += ' ORDER BY date DESC, id DESC';
      const rows = db.prepare(sql).all(...args);
      return sendJSON(res, 200, { ok: true, events: rows.map(rowToEvent) });
    }
    if (req.method === 'POST') {
      if (!requireAuth(req, res)) return;
      const b = await readJSON(req);
      const errors = validateEvent(b);
      if (errors.length) return sendJSON(res, 400, { ok: false, error: errors.join('；') });
      const info = db.prepare(
        `INSERT INTO events (side, date, tag, title, summary, detail, image) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(b.side, b.date, String(b.tag || '').trim(), String(b.title).trim(),
            String(b.summary).trim(), String(b.detail || '').trim(), String(b.image || '').trim());
      const row = db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid);
      return sendJSON(res, 201, { ok: true, event: rowToEvent(row) });
    }
  }

  /* 单个事件 */
  if (parts[1] === 'events' && parts.length === 3) {
    const id = Number(parts[2]);
    if (!Number.isInteger(id)) return sendJSON(res, 400, { ok: false, error: 'bad id' });
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!row) return sendJSON(res, 404, { ok: false, error: 'not found' });

    if (req.method === 'GET') return sendJSON(res, 200, { ok: true, event: rowToEvent(row) });

    if (req.method === 'PUT') {
      if (!requireAuth(req, res)) return;
      const b = await readJSON(req);
      const merged = { ...row, ...b };
      const errors = validateEvent(merged);
      if (errors.length) return sendJSON(res, 400, { ok: false, error: errors.join('；') });
      db.prepare(
        `UPDATE events SET side=?, date=?, tag=?, title=?, summary=?, detail=?, image=?,
         updated_at=datetime('now','localtime') WHERE id=?`
      ).run(merged.side, merged.date, String(merged.tag || '').trim(), String(merged.title).trim(),
            String(merged.summary).trim(), String(merged.detail || '').trim(), String(merged.image || '').trim(), id);
      const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      return sendJSON(res, 200, { ok: true, event: rowToEvent(updated) });
    }

    if (req.method === 'DELETE') {
      if (!requireAuth(req, res)) return;
      db.prepare('DELETE FROM events WHERE id = ?').run(id);
      return sendJSON(res, 200, { ok: true });
    }
  }

  /* 图片上传：{ name, data }，data 为 dataURL 或 base64 */
  if (url.pathname === '/api/upload' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const b = await readJSON(req);
    const ext = path.extname(String(b.name || '')).toLowerCase();
    if (!IMG_EXT.has(ext)) return sendJSON(res, 400, { ok: false, error: '仅支持 png / jpg / jpeg / gif / webp / svg' });
    let data = String(b.data || '');
    const m = data.match(/^data:[^;]+;base64,(.*)$/s);
    if (m) data = m[1];
    let buf;
    try { buf = Buffer.from(data, 'base64'); } catch { return sendJSON(res, 400, { ok: false, error: 'bad base64' }); }
    if (!buf.length) return sendJSON(res, 400, { ok: false, error: 'empty file' });
    if (buf.length > 10 * 1024 * 1024) return sendJSON(res, 400, { ok: false, error: '图片不能超过 10MB' });
    const fname = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fname), buf);
    return sendJSON(res, 200, { ok: true, url: `/uploads/${fname}` });
  }

  return sendJSON(res, 404, { ok: false, error: 'not found' });
}

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 · 档案不存在');
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';

  /* 管理后台：仅隐藏路径可达；/admin 与 /admin.html 一律 404，不暴露真实入口 */
  if (p === `/${ADMIN_PATH}` || p === `/${ADMIN_PATH}/`) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' });
    return fs.createReadStream(path.join(PUBLIC_DIR, 'admin.html')).pipe(res);
  }
  if (/^\/admin(\.html)?\/?$/i.test(p)) return send404(res);

  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('forbidden'); }
  if (path.basename(file).toLowerCase() === 'admin.html') return send404(res);
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send404(res);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleAPI(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, url);
  } catch (e) {
    return sendJSON(res, 500, { ok: false, error: String(e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`UMBRELLA 4365 · RED QUEEN SYSTEM ONLINE`);
  console.log(`  前台     http://localhost:${PORT}/`);
  console.log(`  后台入口 http://localhost:${PORT}/${ADMIN_PATH}   （保密！/admin 恒为 404）`);
  console.log(`  管理密钥 ${ADMIN_KEY === 'redqueen-4365' ? 'redqueen-4365（默认值，部署公网前务必用环境变量 ADMIN_KEY 修改）' : '（来自环境变量）'}`);
  console.log(`  防爆破   同 IP 密钥错 ${FAIL_MAX} 次封禁 ${BLOCK_MS / 60000} 分钟${TRUST_PROXY ? ' · 反代模式(X-Forwarded-For)' : ''}`);
});
