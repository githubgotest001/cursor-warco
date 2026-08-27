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

/* ============ 本地配置 data/config.json ============ */
function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}
function writeConfig(patch) {
  const cfg = { ...readConfig(), ...patch };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  return cfg;
}

/* 管理后台隐藏路径：环境变量 ADMIN_PATH > data/config.json > 自动生成随机路径 */
function resolveAdminPath() {
  const clean = s => String(s || '').replace(/^\/+/, '').replace(/[^\w-]/g, '');
  if (process.env.ADMIN_PATH && clean(process.env.ADMIN_PATH)) return clean(process.env.ADMIN_PATH);
  const saved = readConfig().adminPath;
  if (saved) return clean(saved);
  const generated = 'hive-' + crypto.randomBytes(6).toString('hex');
  writeConfig({ adminPath: generated });
  return generated;
}
const ADMIN_PATH = resolveAdminPath();

/* 访客 IP 哈希盐：持久化以保证重启前后 UV 口径一致，日志中不落明文 IP */
function resolveVisitSalt() {
  const saved = readConfig().visitSalt;
  if (saved) return saved;
  const salt = crypto.randomBytes(16).toString('hex');
  writeConfig({ visitSalt: salt });
  return salt;
}
const VISIT_SALT = resolveVisitSalt();

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

  CREATE TABLE IF NOT EXISTS visits (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    ts      TEXT NOT NULL,
    day     TEXT NOT NULL,
    path    TEXT NOT NULL,
    status  INTEGER NOT NULL DEFAULT 200,
    ip_hash TEXT NOT NULL,
    ua      TEXT NOT NULL DEFAULT '',
    referer TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_visits_day ON visits(day);
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

/* ============ 访问记录 ============
   1) 只记页面、接口与异常请求，静态资源正常命中不记，避免一次访问产生多条噪音
   2) 同一 IP 同一路径 60 秒内只记一次
   3) 内存缓冲后批量落库，避免每个请求一次同步写阻塞事件循环
   4) 仅保留 LOG_KEEP_DAYS 天且设行数上限，防止被刷请求撑爆磁盘
   5) IP 只存加盐哈希；路径 / UA / 来源一律截断 */
const LOG_SKIP_EXT = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.css', '.js', '.map']);
const LOG_DEDUP_MS = 60 * 1000;
const LOG_FLUSH_MS = 5000;
const LOG_FLUSH_MAX = 50;
const LOG_KEEP_DAYS = 90;
const LOG_MAX_ROWS = 200000;

const visitBuf = [];
const visitSeen = new Map();
let stmtInsertVisit = null;

const cut = (s, n) => String(s || '').slice(0, n);
const hashIP = ip => crypto.createHash('sha256').update(VISIT_SALT + ip).digest('hex').slice(0, 16);

function localNow() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function recordVisit(req, res, url) {
  if (req.method === 'HEAD') return;
  const p = url.pathname;
  if (p === '/api/stats') return;                       // 后台自己看统计，不计入统计
  const status = res.statusCode;
  if (LOG_SKIP_EXT.has(path.extname(p).toLowerCase()) && status < 400) return;

  const ipHash = hashIP(clientIP(req));
  const key = `${ipHash}|${p}`;
  const now = Date.now();
  if (now - (visitSeen.get(key) || 0) < LOG_DEDUP_MS) return;
  visitSeen.set(key, now);

  const ts = localNow();
  visitBuf.push({
    ts, day: ts.slice(0, 10),
    path: cut(p, 200),
    status,
    ipHash,
    ua: cut(req.headers['user-agent'], 200),
    referer: cut(req.headers['referer'], 200),
  });
  if (visitBuf.length >= LOG_FLUSH_MAX) flushVisits();
}

function flushVisits() {
  if (!visitBuf.length) return;
  const batch = visitBuf.splice(0, visitBuf.length);
  if (!stmtInsertVisit) {
    stmtInsertVisit = db.prepare(
      `INSERT INTO visits (ts, day, path, status, ip_hash, ua, referer) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
  }
  try {
    db.exec('BEGIN');
    for (const v of batch) stmtInsertVisit.run(v.ts, v.day, v.path, v.status, v.ipHash, v.ua, v.referer);
    db.exec('COMMIT');
  } catch {
    try { db.exec('ROLLBACK'); } catch {}
  }
}

function pruneVisits() {
  try {
    db.prepare(`DELETE FROM visits WHERE day < date('now', 'localtime', ?)`).run(`-${LOG_KEEP_DAYS} days`);
    const { c } = db.prepare('SELECT COUNT(*) AS c FROM visits').get();
    if (c > LOG_MAX_ROWS) {
      db.prepare(
        `DELETE FROM visits WHERE id <= (SELECT id FROM visits ORDER BY id DESC LIMIT 1 OFFSET ?)`
      ).run(LOG_MAX_ROWS);
    }
  } catch {}
}

setInterval(flushVisits, LOG_FLUSH_MS).unref();
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of visitSeen) if (now - t > LOG_DEDUP_MS) visitSeen.delete(k);
}, 5 * 60 * 1000).unref();
setInterval(pruneVisits, 60 * 60 * 1000).unref();
pruneVisits();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { flushVisits(); process.exit(0); });
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

  /* 访问统计（仅后台可读） */
  if (url.pathname === '/api/stats' && req.method === 'GET') {
    if (!requireAuth(req, res)) return;
    flushVisits();                                   // 先把缓冲落库，保证读到最新
    const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 14, 1), 90);
    const today = db.prepare(
      `SELECT COUNT(*) AS pv, COUNT(DISTINCT ip_hash) AS uv FROM visits WHERE day = date('now','localtime')`
    ).get();
    const total = db.prepare(`SELECT COUNT(*) AS pv, COUNT(DISTINCT ip_hash) AS uv FROM visits`).get();
    const daily = db.prepare(
      `SELECT day, COUNT(*) AS pv, COUNT(DISTINCT ip_hash) AS uv FROM visits
       WHERE day >= date('now','localtime',?) GROUP BY day ORDER BY day DESC`
    ).all(`-${days} days`);
    const topPaths = db.prepare(
      `SELECT path, COUNT(*) AS n FROM visits WHERE status < 400 GROUP BY path ORDER BY n DESC LIMIT 12`
    ).all();
    const scans = db.prepare(
      `SELECT path, COUNT(*) AS n, MAX(ts) AS last_ts FROM visits WHERE status >= 400
       GROUP BY path ORDER BY n DESC LIMIT 12`
    ).all();
    const referers = db.prepare(
      `SELECT referer, COUNT(*) AS n FROM visits WHERE referer <> '' GROUP BY referer ORDER BY n DESC LIMIT 10`
    ).all();
    const recent = db.prepare(
      `SELECT ts, path, status, ip_hash, ua, referer FROM visits ORDER BY id DESC LIMIT 60`
    ).all();
    return sendJSON(res, 200, { ok: true, today, total, daily, topPaths, scans, referers, recent, keepDays: LOG_KEEP_DAYS });
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
  /* 响应结束后再记录，拿得到最终状态码，且不拖慢请求 */
  res.on('finish', () => { try { recordVisit(req, res, url); } catch {} });
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
  console.log(`  访问记录 IP 仅存哈希 · 保留 ${LOG_KEEP_DAYS} 天 · 上限 ${LOG_MAX_ROWS} 行 · 后台「访客监控」查看`);
});
