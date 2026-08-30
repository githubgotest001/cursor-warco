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
 *   SITE_URL     站点对外地址（生成 canonical / sitemap / RSS 的绝对链接），默认 https://umbrella4365.com
 *   BAIDU_PUSH_TOKEN    百度主动推送 token（搜索资源平台 → 普通收录 → API 推送）；设置后档案增删改实时推送百度
 *   BAIDU_SITE_VERIFY   百度站长验证码（首页输出 <meta name="baidu-site-verification">）
 *   GOOGLE_SITE_VERIFY  Google Search Console 验证码（首页输出 <meta name="google-site-verification">）
 *   BING_SITE_VERIFY    Bing 站长验证码（首页输出 <meta name="msvalidate.01">）
 *
 * 以上 4 个 SEO 接入变量推荐改从后台「系统」页管理（存 data/config.json，保存即生效免重启）；
 * 环境变量仅作兜底，后台里的非空值优先。
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { execFile } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 4365);
const ADMIN_KEY = process.env.ADMIN_KEY || 'redqueen-4365';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const SITE_URL = (process.env.SITE_URL || 'https://umbrella4365.com').replace(/\/+$/, '');
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

/* ============ 站点设置（后台「系统」页可管理） ============
   SEO 接入类配置存 data/config.json，后台改完即时生效、无需重启；
   同名环境变量作为兜底（config 里的非空值优先，删空后台值即回落环境变量）。 */
const SETTING_KEYS = {
  baiduPushToken: 'BAIDU_PUSH_TOKEN',
  baiduSiteVerify: 'BAIDU_SITE_VERIFY',
  googleSiteVerify: 'GOOGLE_SITE_VERIFY',
  bingSiteVerify: 'BING_SITE_VERIFY',
};
function getSettings() {
  const cfg = readConfig();
  const out = {};
  for (const [key, envKey] of Object.entries(SETTING_KEYS)) {
    out[key] = String(cfg[key] || '').trim() || String(process.env[envKey] || '').trim();
  }
  return out;
}

/* 频道与支援链接（后台「系统」页配置，存 data/config.json，无环境变量）：
   配置了才在前台渲染对应入口；donate/tg/wechat/x 全空时「联络与支援」自动隐藏。
   sponsorText + sponsorUrl 是「补给线」赞助位：都配置了才在页脚出现。 */
const LINK_KEYS = ['donateUrl', 'tgUrl', 'wechatId', 'xUrl', 'contactEmail', 'sponsorText', 'sponsorUrl'];
function getLinks() {
  const cfg = readConfig();
  const out = {};
  for (const k of LINK_KEYS) out[k] = String(cfg[k] || '').trim().slice(0, 200);
  return out;
}

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
    series     TEXT NOT NULL DEFAULT '',
    source     TEXT NOT NULL DEFAULT '',
    front      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);

  /* 刊物（编辑部）：weekly = 每周战报，feature = 专题特稿；draft 状态不对外 */
  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind       TEXT NOT NULL CHECK(kind IN ('weekly','feature')),
    slug       TEXT NOT NULL DEFAULT '',
    issue      INTEGER,
    title      TEXT NOT NULL,
    summary    TEXT NOT NULL DEFAULT '',
    content    TEXT NOT NULL DEFAULT '',
    date       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_issue ON posts(issue) WHERE issue IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug  ON posts(slug)  WHERE slug <> '';

  /* 草稿收件箱：侦察 agent / 站长手记草稿先落这里，审核通过才进 events（录入永远人工） */
  CREATE TABLE IF NOT EXISTS drafts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    side       TEXT NOT NULL DEFAULT 'main',
    date       TEXT NOT NULL DEFAULT '',
    tag        TEXT NOT NULL DEFAULT '',
    title      TEXT NOT NULL DEFAULT '',
    summary    TEXT NOT NULL DEFAULT '',
    detail     TEXT NOT NULL DEFAULT '',
    image      TEXT NOT NULL DEFAULT '',
    series     TEXT NOT NULL DEFAULT '',
    source     TEXT NOT NULL DEFAULT '',
    front      TEXT NOT NULL DEFAULT '',
    verify     TEXT NOT NULL DEFAULT '',
    origin     TEXT NOT NULL DEFAULT 'manual',
    state      TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','dismissed')),
    event_id   INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  /* 读者线报：前台公开提交（限速 + 蜜罐），后台收件箱查阅 */
  CREATE TABLE IF NOT EXISTS tips (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    content    TEXT NOT NULL,
    contact    TEXT NOT NULL DEFAULT '',
    url        TEXT NOT NULL DEFAULT '',
    ip_hash    TEXT NOT NULL DEFAULT '',
    state      TEXT NOT NULL DEFAULT 'new' CHECK(state IN ('new','read')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  /* 模型补给表（作战室）：Cursor 在售模型的覆盖 / 价格 / 额度口径，后台「补给线」维护 */
  CREATE TABLE IF NOT EXISTS supply (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    model      TEXT NOT NULL,
    provider   TEXT NOT NULL DEFAULT '',
    tier       TEXT NOT NULL DEFAULT '',
    price      TEXT NOT NULL DEFAULT '',
    quota      TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','watch','removed')),
    note       TEXT NOT NULL DEFAULT '',
    sort       INTEGER NOT NULL DEFAULT 100,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

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
  '.woff2': 'font/woff2',
};
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const COMPRESSIBLE_EXT = new Set(['.html', '.js', '.css', '.svg', '.json', '.xml', '.txt']);

/* 文本响应统一出口：>1KB 且客户端支持时压缩，brotli 优先（同内容比 gzip 再省 15–20%），
   缩短首字节到可读内容的时间（Core Web Vitals） */
function pickEncoding(req) {
  const ae = String((req && req.headers['accept-encoding']) || '');
  if (/\bbr\b/i.test(ae)) return 'br';
  if (/\bgzip\b/i.test(ae)) return 'gzip';
  return '';
}
/* 动态内容用中档质量：压缩率已优于 gzip-6，速度不拖响应 */
const brOpts = size => ({ params: {
  [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
  ...(size ? { [zlib.constants.BROTLI_PARAM_SIZE_HINT]: size } : {}),
} });

function sendBody(res, code, headers, body) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  headers = { Vary: 'Accept-Encoding', ...headers };
  const enc = buf.length > 1024 ? pickEncoding(res.req) : '';
  const done = name => (err, out) => {
    if (!err && out && out.length < buf.length) {
      res.writeHead(code, { ...headers, 'Content-Encoding': name });
      res.end(out);
    } else {
      res.writeHead(code, headers);
      res.end(buf);
    }
  };
  if (enc === 'br') return zlib.brotliCompress(buf, brOpts(buf.length), done('br'));
  if (enc === 'gzip') return zlib.gzip(buf, { level: 6 }, done('gzip'));
  res.writeHead(code, headers);
  res.end(buf);
}

function sendJSON(res, code, obj) {
  /* 接口数据不进搜索索引：内容已由 SSR 页面承载，避免 JSON 被当作重复内容收录 */
  sendBody(res, code, { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' }, JSON.stringify(obj));
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

/* 战区（front）：'' = Cursor 主战线（不标注）；其余代号在卡片与档案页打「⌖ 战区」徽标。
   扩战区纪律：Cursor 始终是坐标，邻圈档案只收「影响格局 / 波及 Cursor 用户」量级的事件。
   新增战区在此登记（代号用于 API/DB，名称用于展示），前台 index.html 的 FRONTS 同步补一行。 */
const FRONTS = {
  'claude-code': 'CLAUDE CODE 战区',
  'codex': 'CODEX 战区',
  'copilot': 'COPILOT 战区',
  'windsurf': 'WINDSURF 战区',
  'cn-tools': '国产工具战线',
  'model-labs': '模型厂商战区',
};
const frontName = f => FRONTS[f] || '';

function validateEvent(b) {
  const errors = [];
  if (!['main', 'dark'].includes(b.side)) errors.push('side 必须是 main（正史）或 dark（野史）');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || Number.isNaN(Date.parse(b.date))) errors.push('date 必须是 YYYY-MM-DD');
  if (!b.title || !String(b.title).trim()) errors.push('title 必填');
  if (!b.summary || !String(b.summary).trim()) errors.push('summary 必填');
  if (b.front && !FRONTS[b.front]) errors.push(`front 战区未登记（可用：${Object.keys(FRONTS).join(' / ')}，留空 = Cursor 主战线）`);
  return errors;
}

function rowToEvent(r) { return r; }

/* ==================================================================
   SEO / GEO（生成式引擎优化）
   - 首页服务端直出完整时间树 HTML + 内联档案数据：不执行 JS 的搜索引擎
     与 AI 爬虫（GPTBot / ClaudeBot / PerplexityBot 等）也能读到全文
   - 每条档案有独立可索引页面 /ev/:id（专属 title / OG 卡片 / Article JSON-LD / 内链）
   - robots.txt · sitemap.xml · feed.xml（RSS 2.0）· llms.txt / llms-full.txt
   - 产物全部内存缓存 + ETag，档案增删改时失效重建
   ================================================================== */
const escHtml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dotDate = d => String(d || '').replaceAll('-', '.');
const absUrl = u => !u ? '' : /^https?:\/\//i.test(u) ? u : SITE_URL + (u.startsWith('/') ? '' : '/') + u;
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const ldjson = o => JSON.stringify(o).replace(/</g, '\\u003c');   // 防内容闭合 </script>
const rfc822 = d => new Date(d + 'T00:00:00+08:00').toUTCString();
const isoTs = t => String(t || '').replace(' ', 'T');

const SITE_NAME = 'UMBRELLA 4365 · Cursor 战地纪实';
const SITE_DESC = 'AI一日，人间一年。一条正史，一条野史，双向时间树记录 Cursor 与 AI 编程圈的光与影。仅作记录，不构成立场。';
const SITE_INTRO = 'UMBRELLA 4365（umbrella4365.com）是一个中文时间轴档案站，以「战地纪实」风格记录 AI 代码编辑器 Cursor（Anysphere 公司出品）及 AI 编程圈的重要事件。档案分两线：「正史」收录融资、发布、并购等有公开信源的报道；「野史」收录漏洞、套利、事故等场外情报（采自封闭频道与未具名信源，含演绎成分）。仅作记录，不构成立场。';
/* 英文站点简介只出现在机器可读层（llms.txt），供英文语境的 AI 检索理解本站，不做英文页面 */
const SITE_INTRO_EN = 'UMBRELLA 4365 (umbrella4365.com) is a Chinese-language timeline archive chronicling Cursor (the AI code editor by Anysphere) and the AI coding scene, written in a war-correspondence style. Events are filed on two tracks: the Main Chronicle (正史) covers funding rounds, releases and acquisitions backed by public sources; the Shadow Chronicle (野史) covers exploits, arbitrage plays and incidents reported from off-the-record channels, with stylized narration. Records only; no stance taken.';

/* ICP 备案号：境内服务器的法定展示义务，出现在全部公开页面页脚（链接到工信部备案系统） */
const ICP_NO = '京ICP备17020239号';
const icpHTML = () => `<a href="https://beian.miit.gov.cn" target="_blank" rel="noopener nofollow">${ICP_NO}</a>`;

const allEvents = () => db.prepare('SELECT * FROM events ORDER BY date DESC, id DESC').all();

const seoCache = new Map(); // key -> { body: Buffer, etag }
/* 档案 / 刊物 / 设置发生增删改时，同步失效 SEO 缓存与作战室缓存 */
function invalidateDynamic() {
  seoCache.clear();
  warroomDoc = { at: 0, doc: null };
}
function seoDoc(key, build) {
  let doc = seoCache.get(key);
  if (!doc) {
    const body = Buffer.from(build());
    doc = { body, etag: `W/"${crypto.createHash('sha1').update(body).digest('base64url').slice(0, 16)}"` };
    seoCache.set(key, doc);
  }
  return doc;
}
function sendDoc(req, res, doc, type, cacheControl) {
  const headers = { 'Content-Type': type, 'Cache-Control': cacheControl, ETag: doc.etag };
  if (req.headers['if-none-match'] === doc.etag) {
    res.writeHead(304, { ...headers, Vary: 'Accept-Encoding' });
    return res.end();
  }
  sendBody(res, 200, headers, doc.body);
}

/* ---- 首页 SSR：与 public/index.html 客户端 render() 输出同构 ---- */
const SSR_PHASES = {
  '2022': { a: 'PHASE-0 始祖毒株 · PROGENITOR', b: '暗面无记录' },
  '2023': { a: 'PHASE-I 初次泄漏 · OUTBREAK',  b: '暗面微弱杂音' },
  '2024': { a: 'PHASE-II 城市扩散 · SPREAD',   b: '暗面异常增殖' },
  '2025': { a: 'PHASE-III 全球大流行 · PANDEMIC', b: '变异体横行 · MUTATION' },
  '2026': { a: 'PHASE-IV 吞并纪元 · ASSIMILATION', b: '暗面信号追踪中…' },
};
const ssrPhase = y => SSR_PHASES[y] || { a: `PHASE-? 观测中 · ${y}`, b: '暗面信号追踪中…' };
const SSR_LENS = [40, 112, 72];

function ssrCard(ev) {
  const no = (ev.side === 'main' ? 'A-' : 'X-') + String(ev.id).padStart(3, '0');
  const thumb = ev.image ? `<div class="thumb"><img src="${escHtml(ev.image)}" alt="${escHtml(ev.title)}" loading="lazy" decoding="async"></div>` : '';
  const seriesTag = ev.series ? `<span class="series-tag" data-series="${escHtml(ev.series)}">◈ ${escHtml(ev.series)}</span>` : '';
  const frontTag = ev.front ? `<span class="front-tag">⌖ ${escHtml(frontName(ev.front) || ev.front)}</span>` : '';
  return `
        <article class="card c-${ev.side}" data-id="${ev.id}">
          ${ev.side === 'dark' ? '<span class="stamp">野史</span>' : ''}
          <div class="head"><span class="tag">${escHtml(ev.tag) || '记录'}</span><span class="no">${no}</span></div>
          <time datetime="${escHtml(ev.date)}">${dotDate(ev.date)}</time>${frontTag}
          <h3>${escHtml(ev.title)}</h3>
          ${thumb}
          <p>${escHtml(ev.summary)}</p>
          ${seriesTag}
          <a class="more" href="/ev/${ev.id}">调阅档案 »</a>
        </article>`;
}

function ssrTrackHTML(events) {
  let html = `
      <div class="row intro">
        <div class="card-intro">
          <span class="lead">发刊词</span>大模型纪元，一夜巨变、一周洗牌。本刊以 Cursor 为坐标，由新到旧铺开两条战线：<span class="up"><span class="lr-d">脊柱之左，</span><span class="lr-m">浅色档案，</span>是台面上的正史</span>；<span class="down"><span class="lr-d">脊柱之右，</span><span class="lr-m">深色档案，</span>是同一时刻的暗面野史</span>——漏洞、套利、事故与传闻，多采自封闭频道与场外信源。<span class="vow">记者不站队、不批判、仅作记录；正因热爱，才如实记下它的光与影。</span>　<span class="memo-link" id="memoLink" title="OFF THE RECORD · 记者私话">附 · 战地手记 »</span>
        </div>
      </div>
      <div class="row now">
        <div class="pulse"><span class="cursor-blink"></span><span class="t1">未完待续 · 记录进行中</span></div>
        <span class="t2">LIVE · 战地记者在线</span>
      </div>`;

  const byYear = new Map();
  for (const ev of events) {
    const y = ev.date.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(ev);
  }
  const sideCount = { main: 0, dark: 0 };
  let prevWasEvent = false, prevSide = null;

  for (const [year, ylist] of byYear) {
    const ph = ssrPhase(year);
    html += `
      <div class="row year">
        <span class="ghost">${year}</span>
        <span class="evo-a">${escHtml(ph.a)}</span>
        <span class="evo-b">${escHtml(ph.b)}</span>
        <div class="plate"><span class="gate"></span><span class="yr">${year}</span></div>
      </div>`;
    prevWasEvent = false; prevSide = null;

    for (const ev of ylist) {
      const n = sideCount[ev.side]++;
      const len = SSR_LENS[n % SSR_LENS.length];
      const tuck = prevWasEvent && prevSide && prevSide !== ev.side ? ' tuck' : '';
      const card = ssrCard(ev);
      html += `
      <div class="row ev ${ev.side}${tuck}" style="--len:${len}px">
        <div class="cell l">${ev.side === 'main' ? card + '<div class="link"></div>' : ''}</div>
        <div class="cell r">${ev.side === 'dark' ? '<div class="link"></div>' + card : ''}</div>
        <span class="node"></span>
      </div>`;
      prevWasEvent = true; prevSide = ev.side;
    }
  }

  html += `
      <div class="row zero">
        <img src="/logo.svg" alt="">
        <div class="t1">毒 株 原 点</div>
        <div class="t2">STRAIN ZERO · 一切从这里开始</div>
      </div>`;
  return html;
}

/* 站长平台验证 meta（后台「系统」页或环境变量配置，保存即生效，只需出现在首页） */
function verifyMetaHTML() {
  const s = getSettings();
  return [
    s.baiduSiteVerify ? `<meta name="baidu-site-verification" content="${escHtml(s.baiduSiteVerify)}">` : '',
    s.googleSiteVerify ? `<meta name="google-site-verification" content="${escHtml(s.googleSiteVerify)}">` : '',
    s.bingSiteVerify ? `<meta name="msvalidate.01" content="${escHtml(s.bingSiteVerify)}">` : '',
  ].filter(Boolean).join('\n');
}

function homeHeadHTML(events) {
  const website = ldjson({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: ['UMBRELLA 4365', 'Cursor 战地纪实', 'Cursor 大事记', 'Cursor 编年史', 'Cursor 时间线'],
    url: `${SITE_URL}/`,
    description: SITE_DESC,
    inLanguage: 'zh-CN',
  });
  const itemList = ldjson({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Cursor 战地纪实档案索引',
    numberOfItems: events.length,
    itemListElement: events.slice(0, 100).map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/ev/${e.id}`,
      name: `${e.title}（${e.date}）`,
    })),
  });
  return [
    `<link rel="canonical" href="${SITE_URL}/">`,
    `<meta property="og:url" content="${SITE_URL}/">`,
    `<meta property="og:image" content="${SITE_URL}/og.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="UMBRELLA 4365 · Cursor 战地纪实">`,
    `<meta name="twitter:image" content="${SITE_URL}/og.png">`,
    verifyMetaHTML(),
    `<script type="application/ld+json">${website}</script>`,
    `<script>window.__EVENTS__=${ldjson(events)};window.__LINKS__=${ldjson(getLinks())};</script>`,
    `<script type="application/ld+json">${itemList}</script>`,
  ].filter(Boolean).join('\n');
}

const INDEX_PATH = path.join(PUBLIC_DIR, 'index.html');
let indexTpl = { mtime: -1, text: '' };
function indexTemplate() {
  const st = fs.statSync(INDEX_PATH);
  if (st.mtimeMs !== indexTpl.mtime) {
    indexTpl = { mtime: st.mtimeMs, text: fs.readFileSync(INDEX_PATH, 'utf8') };
    seoCache.delete('home');
  }
  return indexTpl.text;
}

/* 首页页脚的档案索引导航：给聚合页提供固定的站内发现入口（在 #track 之外，不受客户端筛选重绘影响）
   末尾追加「补给线」赞助位——sponsorText + sponsorUrl 都在后台配置了才出现 */
function footNavHTML() {
  const s = allSeriesRows().map(r => `<a href="${seriesPath(r.series)}">${escHtml(r.series)}</a>`).join(' · ');
  const y = allYearRows().map(r => `<a href="/y/${r.y}">${r.y}</a>`).join(' · ');
  const feats = publishedPosts().filter(p => p.kind === 'feature').slice(0, 6)
    .map(p => `<a href="/t/${escHtml(p.slug)}">${escHtml(p.title)}</a>`).join(' · ');
  const links = getLinks();
  const sponsor = links.sponsorText && links.sponsorUrl
    ? `<div class="foot-sponsor">补给线 SUPPLY LINE · <a href="${escHtml(links.sponsorUrl)}" target="_blank" rel="noopener sponsored">${escHtml(links.sponsorText)}</a></div>` : '';
  return `<nav class="foot-nav" aria-label="档案索引">情报站：<a href="/warroom">红后作战室</a> · <a href="/w">战报周刊</a> · <a href="/d/windows">套利窗口全史</a> · <a href="/d/versions">版本史全表</a> · <a href="/d/funding">融资估值全史</a>${feats ? `<br>专题特稿：${feats}` : ''}<br>事件线索：${s}<br>年度大事记：${y} · <a href="/about">关于本站</a></nav>${sponsor}`;
}

function serveHome(req, res) {
  indexTemplate(); // 模板文件变更时先失效缓存
  const doc = seoDoc('home', () => {
    const events = allEvents();
    return indexTemplate()
      .replace('<!--SSR:HEAD-->', homeHeadHTML(events))
      .replace('<!--SSR:TRACK-->', ssrTrackHTML(events))
      .replace('<!--SSR:FOOT-->', footNavHTML());
  });
  sendDoc(req, res, doc, 'text/html; charset=utf-8', 'no-cache, must-revalidate');
}

/* ---- 档案独立页 /ev/:id ---- */
function eventPageHTML(ev, events) {
  const isMain = ev.side === 'main';
  const sideName = isMain ? '正史' : '野史';
  const no = (isMain ? 'A-' : 'X-') + String(ev.id).padStart(3, '0');
  const url = `${SITE_URL}/ev/${ev.id}`;
  const ogImg = ev.image ? absUrl(ev.image) : `${SITE_URL}/og.png`;
  const pageTitle = `${ev.title}（${dotDate(ev.date)}）· ${sideName}档案`;
  const desc = clip(ev.summary, 150);
  const idx = events.findIndex(e => e.id === ev.id);
  const newer = idx > 0 ? events[idx - 1] : null;
  const older = idx >= 0 && idx < events.length - 1 ? events[idx + 1] : null;

  const paras = String(ev.detail || '').split(/\n{2,}/).filter(Boolean)
    .map(p => `<p>${escHtml(p).replaceAll('\n', '<br>')}</p>`).join('') || '<p>（暂无详细描述）</p>';

  let seriesHtml = '';
  if (ev.series) {
    const arr = events.filter(e => e.series === ev.series).sort((a, b) => a.date < b.date ? -1 : 1);
    const span = arr.length >= 2 ? Math.round(Math.abs(new Date(arr[arr.length - 1].date) - new Date(arr[0].date)) / 864e5) : 0;
    seriesHtml = `
      <section class="thread">
        <div class="th-hd">◈ 事件线索 · <a href="${seriesPath(ev.series)}" title="查看该线索的聚合页">${escHtml(ev.series)}</a>（${arr.length} 个节点）</div>
        ${arr.map(e => e.id === ev.id
          ? `<div class="node2 cur"><span class="d">${dotDate(e.date)}</span><span>${escHtml(e.title)}（本条）</span></div>`
          : `<div class="node2"><span class="d">${dotDate(e.date)}</span><a href="/ev/${e.id}" title="调阅该档案">${escHtml(e.title)} »</a></div>`).join('')}
        ${span ? `<div class="win">◷ 窗口跨度 ${span} 天（${dotDate(arr[0].date)} → ${dotDate(arr[arr.length - 1].date)}）· <a href="${seriesPath(ev.series)}">线索专页 »</a></div>` : ''}
      </section>`;
  }
  const srcHtml = ev.source ? `<div class="srcline">信源 SOURCE · <a href="${escHtml(ev.source)}" target="_blank" rel="noopener">${escHtml(ev.source)}</a></div>` : '';

  const ld = ldjson({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: ev.title,
    description: ev.summary,
    datePublished: ev.date,
    dateModified: isoTs(ev.updated_at) || ev.date,
    inLanguage: 'zh-CN',
    mainEntityOfPage: url,
    image: [ogImg],
    articleSection: ev.tag || sideName,
    keywords: [ev.tag, ev.series, 'Cursor', 'AI 编程', sideName].filter(Boolean).join(','),
    author: { '@type': 'Person', name: 'Cursor Warco', alternateName: '战地记者' },
    publisher: { '@type': 'Organization', name: 'UMBRELLA 4365', url: `${SITE_URL}/`, logo: { '@type': 'ImageObject', url: `${SITE_URL}/og.png` } },
    ...(ev.source ? { isBasedOn: ev.source } : {}),
  });
  const crumb = ldjson(ev.series
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'UMBRELLA 4365 · 时间树', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: `事件线索 · ${ev.series}`, item: SITE_URL + seriesPath(ev.series) },
          { '@type': 'ListItem', position: 3, name: ev.title, item: url },
        ],
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'UMBRELLA 4365 · 时间树', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: ev.title, item: url },
        ],
      });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(pageTitle)} · UMBRELLA 4365</title>
<meta name="description" content="${escHtml(desc)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/logo.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0a0b0e">
<meta name="author" content="Cursor Warco · 战地记者">
<meta property="og:type" content="article">
<meta property="og:site_name" content="UMBRELLA 4365">
<meta property="og:locale" content="zh_CN">
<meta property="og:title" content="${escHtml(pageTitle)}">
<meta property="og:description" content="${escHtml(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${escHtml(ogImg)}">
${ev.image ? '' : `<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
`}<meta property="article:published_time" content="${escHtml(ev.date)}">
<meta property="article:modified_time" content="${escHtml(isoTs(ev.updated_at))}">
<meta property="article:section" content="${escHtml(ev.tag || sideName)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(pageTitle)}">
<meta name="twitter:description" content="${escHtml(desc)}">
<meta name="twitter:image" content="${escHtml(ogImg)}">
<link rel="alternate" type="application/rss+xml" title="UMBRELLA 4365 · 档案更新" href="/feed.xml">
<script type="application/ld+json">${ld}</script>
<script type="application/ld+json">${crumb}</script>
<style>
  @font-face { font-family:"JetBrains Mono"; font-style:normal; font-weight:100 800; font-display:swap;
    src:local("JetBrains Mono"), url("/fonts/jetbrains-mono-latin.woff2") format("woff2");
    unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
  :root { --ink:#0a0b0e; --umb:#e0242e; --umb-hi:#ff4a52; --bone:#e9e6df; --bone-dim:#9aa0a8;
    --serif:"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif; --sans:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif; --mono:"JetBrains Mono","Consolas",monospace; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--ink); color:var(--bone); font-family:var(--sans); -webkit-font-smoothing:antialiased; }
  .wrap { max-width:680px; margin:0 auto; padding:14px clamp(14px,4vw,28px) 36px; }
  .mast { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 0 12px; border-bottom:1px solid rgba(224,36,46,.35); }
  .brand { display:flex; align-items:center; gap:10px; text-decoration:none; color:var(--bone); }
  .brand img { width:26px; height:auto; filter:drop-shadow(0 0 10px rgba(224,36,46,.4)); }
  .brand b { font-family:var(--serif); font-size:15px; letter-spacing:.06em; }
  .brand .em { color:var(--umb-hi); }
  .mast .no { font-family:var(--mono); font-size:10px; letter-spacing:.18em; color:var(--bone-dim); }
  .dossier { margin-top:18px; }
  .bar { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;
    font-family:var(--mono); font-size:10px; letter-spacing:.22em; padding:8px 14px; background:var(--umb); color:#fff; }
  .bar a { color:#fff; text-decoration:none; border-bottom:1px dashed rgba(255,255,255,.6); letter-spacing:.1em; white-space:nowrap; }
  .body { padding:22px 24px 24px; }
  .d-main .body { background:#edeae2; color:#1d1e22; }
  .d-dark .body { background:#140c10; color:#efdada; border:1px dashed rgba(224,36,46,.5); border-top:none; }
  .meta { display:flex; gap:14px; align-items:baseline; flex-wrap:wrap; font-family:var(--mono); font-size:12px; margin-bottom:10px; }
  .d-main .meta { color:#a01820; }
  .d-dark .meta { color:var(--umb-hi); }
  .meta .side-tag { font-weight:700; letter-spacing:.3em; }
  h1 { font-family:var(--serif); font-size:24px; line-height:1.4; margin-bottom:12px; }
  .d-dark h1 { color:#ffd9d4; }
  .pic { margin:12px 0; border:1px solid rgba(224,36,46,.3); }
  .pic img { display:block; width:100%; }
  .sum { font-size:13.5px; line-height:1.9; font-weight:700; margin-bottom:12px; }
  .d-main .sum { color:#33343a; }
  .txt p { font-size:13px; line-height:2; margin-bottom:10px; }
  .d-main .txt p { color:#44464c; }
  .d-dark .txt p { color:#c7a8a6; }
  .thread { margin:14px 0; padding:12px 14px; border:1px dashed rgba(224,36,46,.4); }
  .thread .th-hd { font-family:var(--mono); font-size:11px; letter-spacing:.14em; margin-bottom:10px; }
  .thread .th-hd a, .thread .win a { color:inherit; }
  .d-main .thread .th-hd, .d-main .thread .win { color:#a01820; }
  .d-dark .thread .th-hd, .d-dark .thread .win { color:var(--umb-hi); }
  .thread .node2 { display:flex; gap:10px; align-items:baseline; padding:4px 0; font-size:12.5px; line-height:1.5; }
  .thread .node2 .d { font-family:var(--mono); white-space:nowrap; opacity:.65; }
  .thread .node2 a { color:inherit; text-decoration:none; border-bottom:1px dashed currentColor; }
  .d-main .thread .node2 a:hover { color:#a01820; border-bottom-style:solid; }
  .d-dark .thread .node2 a:hover { color:var(--umb-hi); border-bottom-style:solid; }
  .thread .node2.cur { font-weight:700; }
  .d-main .thread .node2.cur { color:#a01820; }
  .d-dark .thread .node2.cur { color:#ffd9d4; }
  .thread .win { margin-top:9px; padding-top:8px; border-top:1px dashed rgba(224,36,46,.25); font-family:var(--mono); font-size:11px; }
  .srcline { margin-top:12px; font-family:var(--mono); font-size:11.5px; word-break:break-all; }
  .srcline a { color:inherit; }
  .d-main .srcline { color:#a01820; }
  .d-dark .srcline { color:var(--umb-hi); }
  .foot { margin-top:14px; padding-top:10px; border-top:1px dashed rgba(224,36,46,.35); font-family:var(--mono); font-size:10px; letter-spacing:.18em; opacity:.6; }
  .backcta { display:block; margin-top:18px; padding:16px 18px; text-align:center; text-decoration:none;
    background:var(--umb); color:#fff; border:1px solid rgba(255,255,255,.25);
    box-shadow:0 0 20px rgba(224,36,46,.4); transition:background .2s, box-shadow .2s; }
  .backcta b { display:block; font-family:var(--serif); font-size:17px; letter-spacing:.14em; }
  .backcta span { display:block; margin-top:7px; font-family:var(--mono); font-size:10.5px; letter-spacing:.14em; opacity:.85; }
  .backcta:hover { background:#f0333d; box-shadow:0 0 30px rgba(224,36,46,.65); }
  .pager { display:flex; justify-content:space-between; gap:12px; margin-top:16px; font-size:12px; }
  .pager a { color:var(--bone-dim); text-decoration:none; border:1px solid rgba(224,36,46,.35); padding:8px 12px; max-width:48%; }
  .pager a:hover { color:var(--bone); background:rgba(224,36,46,.12); }
  .pager b { color:var(--umb-hi); font-family:var(--mono); font-size:10px; letter-spacing:.12em; display:block; margin-bottom:4px; }
  .sitefoot { text-align:center; font-family:var(--mono); font-size:10.5px; color:var(--bone-dim); opacity:.75; padding:22px 0 6px; line-height:2; }
  .sitefoot a { color:var(--umb-hi); text-decoration:none; }
</style>
</head>
<body>
<div class="wrap">
  <header class="mast">
    <a class="brand" href="/"><img src="/logo.svg" alt="UMBRELLA 4365"><b>UMBRELLA 4365 <span class="em">· Cursor 战地纪实</span></b></a>
    <span class="no">ARCHIVE ${no}</span>
  </header>
  <main>
    <article class="dossier ${isMain ? 'd-main' : 'd-dark'}">
      <div class="bar"><span>ARCHIVE ACCESS · ${no} · CLEARANCE LV.4</span><a href="/#ev-${ev.id}">⇱ 在时间树中定位</a></div>
      <div class="body">
        <div class="meta">
          <span class="side-tag">${isMain ? '正史 · 官方档案' : '野史 · 场外情报'}</span>
          <time datetime="${escHtml(ev.date)}">${dotDate(ev.date)}</time>
          <span>${escHtml(ev.tag)}</span>${ev.front ? `
          <span>⌖ ${escHtml(frontName(ev.front) || ev.front)}</span>` : ''}
        </div>
        <h1>${escHtml(ev.title)}</h1>
        ${ev.image ? `<div class="pic"><img src="${escHtml(ev.image)}" alt="${escHtml(ev.title)}" decoding="async"></div>` : ''}
        <p class="sum">${escHtml(ev.summary)}</p>
        <div class="txt">${paras}</div>
        ${seriesHtml}
        ${srcHtml}
        <div class="foot">UMBRELLA 4365 ARCHIVE · ${sideName}档案 · 仅作记录 · 不构成立场</div>
      </div>
    </article>
    <a class="backcta" href="/">
      <b>⇱ 返回完整时间树</b>
      <span>UMBRELLA 4365 · 正史 ${events.filter(e => e.side === 'main').length} 条 × 野史 ${events.filter(e => e.side === 'dark').length} 条 · 双线对照阅读</span>
    </a>
    <nav class="pager">
      ${newer ? `<a href="/ev/${newer.id}"><b>« 较新档案</b>${escHtml(clip(newer.title, 20))}</a>` : '<span></span>'}
      ${older ? `<a href="/ev/${older.id}" style="text-align:right"><b>较旧档案 »</b>${escHtml(clip(older.title, 20))}</a>` : '<span></span>'}
    </nav>
  </main>
  <footer class="sitefoot">
    基于公开报道与场外情报整理 · 野史含演绎 仅作记录 不构成立场<br>
    <a href="/">⇱ 返回完整时间树</a> · <a href="/feed.xml">RSS</a> · <a href="${SITE_URL}">umbrella4365.com</a> · ${icpHTML()}
  </footer>
</div>
</body>
</html>`;
}

function serveEvent(req, res, id) {
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!row) return serveNotFound(res, '档案不存在或已销毁');
  const doc = seoDoc(`ev:${id}`, () => eventPageHTML(row, allEvents()));
  sendDoc(req, res, doc, 'text/html; charset=utf-8', 'no-cache, must-revalidate');
}

/* ==================================================================
   聚合着陆页：事件线索 /s/:slug · 年份大事记 /y/:year · 关于本站 /about
   档案标题是文学化的，拦不住「cursor 融资」「spacex 收购 cursor」这类
   检索词；聚合页用搜索者的语言做 title/H1/导语，把检索意图接进站内。
   ================================================================== */

/* 现役线索的 slug 与搜索友好文案；未配置的新线索自动回退中文 URL（encodeURIComponent） */
const SERIES_PAGES = {
  '融资阶梯': {
    slug: 'funding',
    title: 'Cursor 融资历史全记录：从种子轮到 D 轮的金额与估值',
    h1: 'Cursor 融资历史全记录',
    lead: '从 OpenAI 领投的 800 万美元种子轮，到 NVIDIA 入局的 23 亿美元 D 轮，再到 ARR（年经常性收入）破 20 亿美元——Anysphere（Cursor 母公司）反复改写硅谷融资史的刻度。本线索按时间收录 Cursor 各轮融资的金额、估值与投资方。',
  },
  '模型军备': {
    slug: 'model-arms',
    title: 'Cursor 模型大战编年史：Claude、GPT、Grok 的军备竞赛',
    h1: 'Cursor 模型大战编年史',
    lead: 'Cursor 是大模型厂商的前线阵地：Claude 3.5 改写默认项，GPT-5 免费进驻一周，Grok 匿名入场，Fable 5 断层登顶。本线索记录各家旗舰模型在 Cursor 里的每一次进场、登顶、降价与换防。',
  },
  '自研模型线': {
    slug: 'composer',
    title: 'Cursor 自研模型 Composer 发展全记录',
    h1: 'Cursor 自研模型 Composer 全记录',
    lead: '从 Tab 补全改用在线强化学习，到 Cursor 2.0 亮相的自研模型 Composer，再到场外对底座来源的溯源——本线索记录 Cursor 从模型集成商走向模型厂商的全过程，正史发布与野史情报同列。',
  },
  '火箭并购案': {
    slug: 'spacex',
    title: 'SpaceX 600 亿美元收购 Cursor 全过程时间线',
    h1: 'SpaceX 收购 Cursor 全过程',
    lead: 'SpaceX 以 600 亿美元全股票收购 Anysphere（Cursor 母公司），是 AI 编程纪元至今最大的一笔并购。本线索按时间收录从联姻选择权、SpaceX 上市、Grok 联合训练，到收购签约与交割完成的全部档案。',
  },
  'AI 失控档案': {
    slug: 'ai-incidents',
    title: 'Cursor AI 失控事故档案：拒写代码、幻觉客服与删库事件',
    h1: 'Cursor AI 失控事故档案',
    lead: '拒写代码并劝用户自学的生成单元、编造政策的客服 AI「Sam」、触发跨厂商警报的删库事件——本线索收录与 Cursor 相关的 AI 失控与事故记录。核心事件均真实存在，语气按野史文体呈现。',
  },
  '定价攻防': {
    slug: 'pricing',
    title: 'Cursor 定价变更全记录：计费风波与 Auto 攻防',
    h1: 'Cursor 定价变更全记录',
    lead: '500 次请求改 20 美元额度的计费风波，Cursor Router 发布次日的「语义变更」众怒——本线索记录 Cursor 定价体系的每一次调整，以及场外的每一次反弹。',
  },
  '供给线': {
    slug: 'supply',
    title: 'Cursor 模型供应线：上游厂商的结盟与断供',
    h1: 'Cursor 模型供应线',
    lead: '模型供应商对 Cursor 的进与退：Anthropic 包下 Colossus 1 把 Claude 限额翻倍，OpenAI 发出断供通牒。本线索追踪 Cursor 上游供给的松紧。',
  },
  '临期锁额': {
    slug: 'quota-lock',
    title: '「临期锁额」套利窗口：从检出到灭活 · Cursor 野史',
    h1: '「临期锁额」套利窗口全记录',
    lead: '订阅临期锁定额度、计数器不走字的套利玩法，自场外检出，到官方补上缺口、计数器重新走字。本线索完整记录该套利窗口从检出到灭活的生命周期。',
  },
  'Team 席位差': {
    slug: 'team-seats',
    title: '「Team 席位差」套利窗口：从检出到灭活 · Cursor 野史',
    h1: '「Team 席位差」套利窗口全记录',
    lead: '40 美元 Team 席位拉满五个 5x 额度的套利玩法，从场外检出到账单追上席位、官方灭活。本线索完整记录该套利窗口的生命周期。',
  },
  '假焚诀': {
    slug: 'fake-burn',
    title: '「假焚诀」套利窗口：从检出到灭活 · Cursor 野史',
    h1: '「假焚诀」套利窗口全记录',
    lead: '把贵价模型的消耗记在 Auto 名下的「假焚诀」，从场外检出到官方两本账合一。本线索完整记录该套利窗口从检出到灭活的全过程。',
  },
  '风帆易主': {
    slug: 'windsurf-saga',
    title: 'Windsurf 三日易主全过程：OpenAI 告吹、谷歌摘人、Cognition 接盘',
    h1: 'Windsurf 三日易主全过程',
    lead: 'OpenAI 以 30 亿美元收购 Windsurf 的协议在 2025 年 7 月告吹，Google 当天以约 24 亿美元反向收编创始团队，三天后 Cognition 收购余部。本线索按时间收录这场 AI 编程战争中最快的一次资产处置。',
  },
};
const seriesBySlug = new Map(Object.entries(SERIES_PAGES).map(([name, c]) => [c.slug, name]));
const seriesPath = name => `/s/${(SERIES_PAGES[name] && SERIES_PAGES[name].slug) || encodeURIComponent(name)}`;

const daysSpan = arr => arr.length >= 2
  ? Math.round(Math.abs(new Date(arr[arr.length - 1].date) - new Date(arr[0].date)) / 864e5) : 0;

const allSeriesRows = () => db.prepare(
  `SELECT series, COUNT(*) AS n, MIN(date) AS first, MAX(date) AS last
   FROM events WHERE series <> '' GROUP BY series ORDER BY last DESC`
).all();
const allYearRows = () => db.prepare(
  `SELECT substr(date, 1, 4) AS y, COUNT(*) AS n FROM events GROUP BY y ORDER BY y DESC`
).all();

/* 面包屑 JSON-LD：首页 > 当前页 */
const breadcrumbLD = (name, url) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'UMBRELLA 4365 · 时间树', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name, item: url },
  ],
});

/* 列表页共用外壳（线索页 / 年份页 / 关于本站 / 作战室 / 数据页 / 刊物共用一套 head 与视觉）
   extraCss：页面专属样式（如数据表格、作战室面板），追加在共用样式之后 */
function listPageHTML({ url, pageTitle, desc, kicker, h1, lead, metaHtml, bodyHtml, ldBlocks, extraCss }) {
  const ldHtml = (ldBlocks || []).map(o => `<script type="application/ld+json">${ldjson(o)}</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(pageTitle)} · UMBRELLA 4365</title>
<meta name="description" content="${escHtml(desc)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/logo.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0a0b0e">
<meta name="author" content="Cursor Warco · 战地记者">
<meta property="og:type" content="website">
<meta property="og:site_name" content="UMBRELLA 4365">
<meta property="og:locale" content="zh_CN">
<meta property="og:title" content="${escHtml(pageTitle)}">
<meta property="og:description" content="${escHtml(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(pageTitle)}">
<meta name="twitter:description" content="${escHtml(desc)}">
<meta name="twitter:image" content="${SITE_URL}/og.png">
<link rel="alternate" type="application/rss+xml" title="UMBRELLA 4365 · 档案更新" href="/feed.xml">
${ldHtml}
<style>
  @font-face { font-family:"JetBrains Mono"; font-style:normal; font-weight:100 800; font-display:swap;
    src:local("JetBrains Mono"), url("/fonts/jetbrains-mono-latin.woff2") format("woff2");
    unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
  :root { --ink:#0a0b0e; --umb:#e0242e; --umb-hi:#ff4a52; --bone:#e9e6df; --bone-dim:#9aa0a8;
    --serif:"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif; --sans:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif; --mono:"JetBrains Mono","Consolas",monospace; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--ink); color:var(--bone); font-family:var(--sans); -webkit-font-smoothing:antialiased; }
  .wrap { max-width:720px; margin:0 auto; padding:14px clamp(14px,4vw,28px) 36px; }
  .mast { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 0 12px; border-bottom:1px solid rgba(224,36,46,.35); }
  .brand { display:flex; align-items:center; gap:10px; text-decoration:none; color:var(--bone); }
  .brand img { width:26px; height:auto; filter:drop-shadow(0 0 10px rgba(224,36,46,.4)); }
  .brand b { font-family:var(--serif); font-size:15px; letter-spacing:.06em; }
  .brand .em { color:var(--umb-hi); }
  .mast .no { font-family:var(--mono); font-size:10px; letter-spacing:.18em; color:var(--bone-dim); text-align:right; }
  .lede { margin:22px 0 6px; }
  .lede h1 { font-family:var(--serif); font-size:clamp(20px,4vw,26px); line-height:1.45; letter-spacing:.02em; }
  .lede .lead { margin-top:12px; font-size:13px; line-height:2; color:var(--bone-dim); text-align:justify; }
  .lede .stat { margin-top:12px; font-family:var(--mono); font-size:11px; letter-spacing:.1em; color:var(--umb-hi); }
  .list { margin-top:18px; }
  .item { display:block; text-decoration:none; color:inherit; padding:13px 15px 14px; margin-bottom:14px; transition:transform .2s ease, box-shadow .2s ease; }
  .item.i-main { background:linear-gradient(175deg,#edeae2 0%,#d9d5c9 100%); color:#1d1e22; border-right:3px solid var(--umb); box-shadow:0 10px 26px rgba(0,0,0,.5); }
  .item.i-dark { background:linear-gradient(190deg,#180c10 0%,#100a0e 100%); color:#efdada; border:1px dashed rgba(224,36,46,.6); box-shadow:0 10px 26px rgba(0,0,0,.55), inset 0 0 40px rgba(224,36,46,.06); }
  .item:hover { transform:translateY(-3px); }
  .item .ihead { display:flex; gap:12px; align-items:baseline; flex-wrap:wrap; font-family:var(--mono); font-size:11px; letter-spacing:.1em; margin-bottom:6px; }
  .item.i-main .ihead { color:#a01820; }
  .item.i-dark .ihead { color:var(--umb-hi); }
  .item .side { font-weight:700; letter-spacing:.3em; }
  .item .it { font-family:var(--serif); font-size:16px; line-height:1.45; }
  .item.i-dark .it { color:#ffd9d4; }
  .item .is { margin-top:6px; font-size:12px; line-height:1.8; text-align:justify; }
  .item.i-main .is { color:#44464c; }
  .item.i-dark .is { color:#c7a8a6; }
  .txtcard { padding:18px 20px; margin-bottom:14px; background:linear-gradient(175deg,#edeae2 0%,#d9d5c9 100%); color:#1d1e22; border-right:3px solid var(--umb); box-shadow:0 10px 26px rgba(0,0,0,.5); }
  .txtcard h2 { font-family:var(--serif); font-size:16px; margin-bottom:8px; color:#a01820; }
  .txtcard p { font-size:12.5px; line-height:2; color:#44464c; text-align:justify; margin-bottom:8px; }
  .txtcard p:last-child { margin-bottom:0; }
  .txtcard a { color:#a01820; }
  .othernav { margin:26px 0 0; padding:14px 16px; border:1px dashed rgba(224,36,46,.4); }
  .othernav .oh { font-family:var(--mono); font-size:11px; letter-spacing:.14em; color:var(--umb-hi); margin-bottom:10px; }
  .othernav .links { font-size:12.5px; line-height:2.2; }
  .othernav a { color:var(--bone-dim); text-decoration:none; border-bottom:1px dashed rgba(224,36,46,.4); white-space:nowrap; }
  .othernav a:hover { color:var(--umb-hi); }
  .othernav .sep { color:rgba(233,230,223,.25); margin:0 7px; }
  .backcta { display:block; margin-top:20px; padding:16px 18px; text-align:center; text-decoration:none;
    background:var(--umb); color:#fff; border:1px solid rgba(255,255,255,.25); box-shadow:0 0 20px rgba(224,36,46,.4); transition:background .2s, box-shadow .2s; }
  .backcta b { display:block; font-family:var(--serif); font-size:17px; letter-spacing:.14em; }
  .backcta span { display:block; margin-top:7px; font-family:var(--mono); font-size:10.5px; letter-spacing:.14em; opacity:.85; }
  .backcta:hover { background:#f0333d; box-shadow:0 0 30px rgba(224,36,46,.65); }
  .sitefoot { text-align:center; font-family:var(--mono); font-size:10.5px; color:var(--bone-dim); opacity:.75; padding:22px 0 6px; line-height:2; }
  .sitefoot a { color:var(--umb-hi); text-decoration:none; }
${extraCss || ''}</style>
</head>
<body>
<div class="wrap">
  <header class="mast">
    <a class="brand" href="/"><img src="/logo.svg" alt="UMBRELLA 4365"><b>UMBRELLA 4365 <span class="em">· Cursor 战地纪实</span></b></a>
    <span class="no">${kicker}</span>
  </header>
  <main>
    <div class="lede">
      <h1>${escHtml(h1)}</h1>
      ${lead ? `<p class="lead">${escHtml(lead)}</p>` : ''}
      ${metaHtml || ''}
    </div>
    ${bodyHtml}
    <a class="backcta" href="/">
      <b>⇱ 返回完整时间树</b>
      <span>UMBRELLA 4365 · 双线对照 · 由新到旧 · 全部档案</span>
    </a>
  </main>
  <footer class="sitefoot">
    基于公开报道与场外情报整理 · 野史含演绎 仅作记录 不构成立场<br>
    <a href="/">⇱ 返回完整时间树</a> · <a href="/about">关于本站</a> · <a href="/feed.xml">RSS</a> · <a href="${SITE_URL}">umbrella4365.com</a> · ${icpHTML()}
  </footer>
</div>
</body>
</html>`;
}

/* 列表条目（线索页 / 年份页共用），链到档案独立页 */
const listItemHTML = e => `
      <a class="item i-${e.side}" href="/ev/${e.id}">
        <div class="ihead"><time datetime="${escHtml(e.date)}">${dotDate(e.date)}</time><span class="side">${e.side === 'main' ? '正史' : '野史'}</span>${e.tag ? `<span>${escHtml(e.tag)}</span>` : ''}${e.front ? `<span>⌖ ${escHtml(frontName(e.front) || e.front)}</span>` : ''}</div>
        <div class="it">${escHtml(e.title)}</div>
        <p class="is">${escHtml(e.summary)}</p>
      </a>`;

/* 「其他线索 / 其他年份」交叉导航，让聚合页互相可达 */
function crossNavHTML(excludeSeries, excludeYear) {
  const s = allSeriesRows().filter(r => r.series !== excludeSeries)
    .map(r => `<a href="${seriesPath(r.series)}">${escHtml(r.series)}（${r.n}）</a>`).join('<span class="sep">·</span>');
  const y = allYearRows().filter(r => r.y !== excludeYear)
    .map(r => `<a href="/y/${r.y}">${r.y} 年大事记（${r.n}）</a>`).join('<span class="sep">·</span>');
  return `
    <nav class="othernav" aria-label="更多档案索引">
      <div class="oh">◈ 更多事件线索</div>
      <div class="links">${s}</div>
      <div class="oh" style="margin-top:12px">◈ 年度大事记</div>
      <div class="links">${y}</div>
    </nav>`;
}

/* ---- 事件线索聚合页 /s/:slug ---- */
function seriesPageHTML(name, arr) {
  const cfg = SERIES_PAGES[name] || {};
  const url = `${SITE_URL}${seriesPath(name)}`;
  const pageTitle = cfg.title || `事件线索 · ${name} · Cursor 战地纪实`;
  const h1 = cfg.h1 || `事件线索 · ${name}`;
  const nMain = arr.filter(e => e.side === 'main').length;
  const span = daysSpan(arr);
  const desc = clip(cfg.lead || `事件线索「${name}」的全部档案：${arr.map(e => e.title).join('；')}`, 150);
  const metaHtml = `<div class="stat">◈ 事件线索 · ${escHtml(name)} · ${arr.length} 个节点（正史 ${nMain} · 野史 ${arr.length - nMain}）${span ? ` · 窗口跨度 ${span} 天` : ''} · 由旧到新</div>`;

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    description: desc,
    url,
    inLanguage: 'zh-CN',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: arr.length,
      itemListElement: arr.map((e, i) => ({
        '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/ev/${e.id}`, name: `${e.title}（${e.date}）`,
      })),
    },
  };

  return listPageHTML({
    url, pageTitle, desc,
    kicker: `SERIES FILE · ${arr.length} NODES`,
    h1, lead: cfg.lead || '',
    metaHtml,
    bodyHtml: `<div class="list">${arr.map(listItemHTML).join('')}</div>${crossNavHTML(name, null)}`,
    ldBlocks: [collection, breadcrumbLD(`事件线索 · ${name}`, url)],
  });
}

function serveSeries(req, res, rawSlug) {
  let name = seriesBySlug.get(rawSlug);
  if (!name) {
    let decoded = '';
    try { decoded = decodeURIComponent(rawSlug); } catch {}
    if (decoded && SERIES_PAGES[decoded]) {
      /* 有正式 slug 的线索被用中文路径访问 → 301 归一，保证 canonical 唯一 */
      res.writeHead(301, { Location: seriesPath(decoded) });
      return res.end();
    }
    name = decoded;
  }
  const arr = name
    ? db.prepare('SELECT * FROM events WHERE series = ? ORDER BY date ASC, id ASC').all(name)
    : [];
  if (!arr.length) return serveNotFound(res, '线索不存在或暂无档案');
  const doc = seoDoc(`s:${seriesPath(name)}`, () => seriesPageHTML(name, arr));
  sendDoc(req, res, doc, 'text/html; charset=utf-8', 'no-cache, must-revalidate');
}

/* ---- 年份大事记页 /y/:year ---- */
function yearPageHTML(year, arr) {
  const url = `${SITE_URL}/y/${year}`;
  const nMain = arr.filter(e => e.side === 'main').length;
  const ph = ssrPhase(year);
  const pageTitle = `${year} 年 Cursor 大事记：AI 编程编年史（全 ${arr.length} 条档案）`;
  const desc = clip(`${year} 年 Cursor 与 AI 编程圈大事记：${arr.filter(e => e.side === 'main').slice(0, 6).map(e => e.title).join('；')}……正史 ${nMain} 条、野史 ${arr.length - nMain} 条，按时间排列。`, 150);
  const lead = `「${ph.a}」——本页按时间顺序收录 ${year} 年与 Cursor 及 AI 编程圈相关的全部档案：正史（融资、发布、并购）与野史（漏洞、套利、事故）双线并列。`;
  const metaHtml = `<div class="stat">◈ ${year} 年度检查站 · ${arr.length} 条档案（正史 ${nMain} · 野史 ${arr.length - nMain}）· 由旧到新</div>`;

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    description: desc,
    url,
    inLanguage: 'zh-CN',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: arr.length,
      itemListElement: arr.map((e, i) => ({
        '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/ev/${e.id}`, name: `${e.title}（${e.date}）`,
      })),
    },
  };

  return listPageHTML({
    url, pageTitle, desc,
    kicker: `YEAR GATE · ${year}`,
    h1: `${year} 年 Cursor 大事记`,
    lead,
    metaHtml,
    bodyHtml: `<div class="list">${arr.map(listItemHTML).join('')}</div>${crossNavHTML(null, year)}`,
    ldBlocks: [collection, breadcrumbLD(`${year} 年 Cursor 大事记`, url)],
  });
}

function serveYear(req, res, year) {
  const arr = db.prepare(`SELECT * FROM events WHERE date LIKE ? ORDER BY date ASC, id ASC`).all(`${year}-%`);
  if (!arr.length) return serveNotFound(res, '该年份暂无档案');
  const doc = seoDoc(`y:${year}`, () => yearPageHTML(year, arr));
  sendDoc(req, res, doc, 'text/html; charset=utf-8', 'no-cache, must-revalidate');
}

/* ---- 关于本站 /about：站点身份与查证纪律（E-E-A-T 信号页） ---- */
function aboutPageHTML() {
  const url = `${SITE_URL}/about`;
  const pageTitle = '关于本站：UMBRELLA 4365 是什么 · Cursor 战地纪实';
  const desc = 'UMBRELLA 4365 是一个记录 Cursor 与 AI 编程圈的中文时间轴档案站：正史收录有公开信源的融资、发布与并购，野史收录场外的漏洞、套利与事故。本页说明双线体例、查证纪律与订阅方式。';

  const about = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: pageTitle,
    url,
    description: desc,
    inLanguage: 'zh-CN',
    mainEntity: {
      '@type': 'Organization',
      name: 'UMBRELLA 4365',
      alternateName: ['Cursor 战地纪实', 'Cursor 大事记', 'umbrella4365'],
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/logo.svg`,
      description: SITE_INTRO,
      foundingDate: '2026-08-27',
      founder: { '@type': 'Person', name: 'Cursor Warco', alternateName: '战地记者' },
    },
  };

  const bodyHtml = `
    <div class="list">
      <div class="txtcard">
        <h2>本站是什么</h2>
        <p>UMBRELLA 4365（umbrella4365.com）是一个中文时间轴档案站，以「战地纪实」的体例记录 AI 代码编辑器 Cursor（Anysphere 公司出品）及 AI 编程圈的重要事件。站训「AI一日，人间一年」——大模型纪元的行情以天为单位翻篇，本站把这些日子一条一条钉进时间树。</p>
      </div>
      <div class="txtcard">
        <h2>双线体例：正史与野史</h2>
        <p>时间树分两线。「正史」收录台面之上的官方大事记——融资、发布、并购、故障通报，全部来自可公开核验的报道与公告；「野史」收录同一时刻的暗面——漏洞、套利、事故与传闻，多采自封闭频道与场外信源，含演绎成分，不构成立场。</p>
        <p>同一事件的官方发布与场外玩法常在同日各立一条，两种档案的温差即是本站的叙事。</p>
      </div>
      <div class="txtcard">
        <h2>查证纪律</h2>
        <p>正史档案的日期、金额、轮次、估值与版本号均经查证；查不到确切数字时按「约」「据公开报道」模糊化处理，不编造精确数字。</p>
        <p>野史档案的核心事件必须真实存在（信源可以是论坛、社区或截图），演绎只作用于语气，不虚构事件；线报越劲爆，越需要交叉验证后才立档。</p>
        <p>每条档案页尽可能附一条最硬的信源链接（SOURCE），供读者自行核验。记录者立场：不站队、不批判、仅作记录。</p>
      </div>
      <div class="txtcard">
        <h2>记录者</h2>
        <p>署名 Cursor Warco（Warco 是 War Correspondent「战地记者」的行话缩写）。记者本人是 Cursor 重度用户——正因热爱，才如实记下它的光与影。私人观点只出现在「战地手记」一处，不混入档案正文。</p>
      </div>
      <div class="txtcard">
        <h2>情报站：作战室、周刊与速查表</h2>
        <p>时间树之外，档案库还有三种打开方式：<a href="/warroom">红后作战室</a>（套利窗口存活状态、模型补给表、战线状态的实时板）、<a href="/w">战报周刊</a>（每周五分钟跟上战况）、速查表（<a href="/d/versions">版本史</a> / <a href="/d/funding">融资史</a> / <a href="/d/windows">套利窗口史</a>）。</p>
        <p>关于套利窗口类内容的边界：本站只记录场外已公开的观测与官方的处置，不提供教程、不构成操作建议——记录是纪实，教唆不是。</p>
      </div>
      <div class="txtcard">
        <h2>向红后投递线报</h2>
        <p>观测到新窗口、新故障、新变阵？<a href="/#tip">前往首页提交线报</a>——匿名可投，留联系方式则采纳后可获致谢。线报经交叉查证后立档，查证不过就不上墙。</p>
      </div>
      <div class="txtcard">
        <h2>订阅与机器可读</h2>
        <p>更新订阅：<a href="/feed.xml">RSS（/feed.xml）</a>——新档案与每周战报合流推送。AI / LLM 检索索引：<a href="/llms.txt">/llms.txt（目录）</a>与 <a href="/llms-full.txt">/llms-full.txt（全文）</a>。全部档案亦可通过 <a href="/api/events">/api/events</a> 以 JSON 读取。</p>
        <p>事件线索聚合页与年度大事记入口见本页下方与首页页脚。</p>
      </div>
    </div>
    ${crossNavHTML(null, null)}`;

  return listPageHTML({
    url, pageTitle, desc,
    kicker: 'VISITOR BRIEFING',
    h1: '关于本站 · 档案馆访客须知',
    lead: '',
    metaHtml: `<div class="stat">UMBRELLA 4365 · CURSOR FRONTLINE CHRONICLE · EST. 2026-08-27</div>`,
    bodyHtml,
    ldBlocks: [about, breadcrumbLD('关于本站', url)],
  });
}

function serveAbout(req, res) {
  const doc = seoDoc('about', aboutPageHTML);
  sendDoc(req, res, doc, 'text/html; charset=utf-8', 'no-cache, must-revalidate');
}

/* ==================================================================
   情报站扩展（2026-08-30）
   - 刊物 posts：kind=weekly 每周战报（/w/:issue）· kind=feature 专题特稿（/t/:slug）
   - 红后作战室 /warroom：存活窗口 / 最近灭活 / 模型补给表 / 战线状态，全部由库实时推导
   - 数据页 /d/*：版本史 / 融资史 / 套利窗口史——同一个档案库的速查表包装
   ================================================================== */

/* ---- 刊物（posts） ---- */
const postPath = p => (p.kind === 'weekly' ? `/w/${p.issue}` : `/t/${p.slug}`);
const publishedPosts = () => db.prepare(`SELECT * FROM posts WHERE status = 'published' ORDER BY date DESC, id DESC`).all();

function validatePost(b) {
  const errors = [];
  if (!['weekly', 'feature'].includes(b.kind)) errors.push('kind 必须是 weekly（战报）或 feature（特稿）');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || Number.isNaN(Date.parse(b.date))) errors.push('date 必须是 YYYY-MM-DD');
  if (!b.title || !String(b.title).trim()) errors.push('title 必填');
  if (b.kind === 'weekly' && !(Number.isInteger(Number(b.issue)) && Number(b.issue) >= 1)) errors.push('战报必须填期号 issue（正整数）');
  if (b.kind === 'feature' && !/^[a-z0-9][a-z0-9-]{1,59}$/.test(String(b.slug || ''))) errors.push('特稿必须填 slug（小写字母 / 数字 / 连字符，2–60 位）');
  if (b.status && !['draft', 'published'].includes(b.status)) errors.push('status 必须是 draft 或 published');
  return errors;
}

/* 刊物正文渲染：空行分段；「## 」起头的段落为小节标题；整段均为「- 」行时渲染为列表；
   [文字](/站内路径 或 https://外链) 生成链接——先 escHtml 再联接，不产生 XSS 面 */
const linkify = s => s.replace(/\[([^\]]+)\]\((\/[^\s)]+|https?:\/\/[^\s)]+)\)/g,
  (m, t, u) => `<a href="${u}"${u.startsWith('/') ? '' : ' target="_blank" rel="noopener"'}>${t}</a>`);
function renderPostBody(content) {
  return String(content || '').split(/\n{2,}/).filter(Boolean).map(b => {
    b = b.trim();
    if (/^##\s+/.test(b)) return `<h2>${escHtml(b.replace(/^##\s+/, ''))}</h2>`;
    const lines = b.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length && lines.every(l => /^[-·]\s+/.test(l))) {
      return `<ul>${lines.map(l => `<li>${linkify(escHtml(l.replace(/^[-·]\s+/, '')))}</li>`).join('')}</ul>`;
    }
    return `<p>${linkify(escHtml(b)).replaceAll('\n', '<br>')}</p>`;
  }).join('');
}

/* 刊物文章页（战报 / 特稿共用）：骨白档案纸 + 战报编号 */
function postPageHTML(p) {
  const isWeekly = p.kind === 'weekly';
  const no = isWeekly ? `DISPATCH-${String(p.issue).padStart(3, '0')}` : `FEATURE-${String(p.id).padStart(3, '0')}`;
  const url = SITE_URL + postPath(p);
  const pageTitle = isWeekly ? `${p.title} · Cursor 周报 第 ${p.issue} 期` : `${p.title} · 专题特稿`;
  const desc = clip(p.summary || p.title, 150);
  const body = renderPostBody(p.content) || '<p>（正文整理中）</p>';

  let pager = '';
  if (isWeekly) {
    const newer = db.prepare(`SELECT issue, title FROM posts WHERE kind='weekly' AND status='published' AND issue > ? ORDER BY issue ASC LIMIT 1`).get(p.issue);
    const older = db.prepare(`SELECT issue, title FROM posts WHERE kind='weekly' AND status='published' AND issue < ? ORDER BY issue DESC LIMIT 1`).get(p.issue);
    pager = `
    <nav class="pager">
      ${newer ? `<a href="/w/${newer.issue}"><b>« 第 ${newer.issue} 期</b>${escHtml(clip(newer.title, 20))}</a>` : '<span></span>'}
      ${older ? `<a href="/w/${older.issue}" style="text-align:right"><b>第 ${older.issue} 期 »</b>${escHtml(clip(older.title, 20))}</a>` : '<span></span>'}
    </nav>`;
  }

  const ld = ldjson({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.title,
    description: desc,
    datePublished: p.date,
    dateModified: isoTs(p.updated_at) || p.date,
    inLanguage: 'zh-CN',
    mainEntityOfPage: url,
    articleSection: isWeekly ? '每周战报' : '专题特稿',
    author: { '@type': 'Person', name: 'Cursor Warco', alternateName: '战地记者' },
    publisher: { '@type': 'Organization', name: 'UMBRELLA 4365', url: `${SITE_URL}/`, logo: { '@type': 'ImageObject', url: `${SITE_URL}/og.png` } },
  });
  const crumb = ldjson(breadcrumbLD(isWeekly ? `Cursor 周报 第 ${p.issue} 期` : `特稿 · ${p.title}`, url));

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(pageTitle)} · UMBRELLA 4365</title>
<meta name="description" content="${escHtml(desc)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/logo.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0a0b0e">
<meta name="author" content="Cursor Warco · 战地记者">
<meta property="og:type" content="article">
<meta property="og:site_name" content="UMBRELLA 4365">
<meta property="og:locale" content="zh_CN">
<meta property="og:title" content="${escHtml(pageTitle)}">
<meta property="og:description" content="${escHtml(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="article:published_time" content="${escHtml(p.date)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(pageTitle)}">
<meta name="twitter:description" content="${escHtml(desc)}">
<meta name="twitter:image" content="${SITE_URL}/og.png">
<link rel="alternate" type="application/rss+xml" title="UMBRELLA 4365 · 档案更新" href="/feed.xml">
<script type="application/ld+json">${ld}</script>
<script type="application/ld+json">${crumb}</script>
<style>
  @font-face { font-family:"JetBrains Mono"; font-style:normal; font-weight:100 800; font-display:swap;
    src:local("JetBrains Mono"), url("/fonts/jetbrains-mono-latin.woff2") format("woff2");
    unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
  :root { --ink:#0a0b0e; --umb:#e0242e; --umb-hi:#ff4a52; --bone:#e9e6df; --bone-dim:#9aa0a8;
    --serif:"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif; --sans:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif; --mono:"JetBrains Mono","Consolas",monospace; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--ink); color:var(--bone); font-family:var(--sans); -webkit-font-smoothing:antialiased; }
  .wrap { max-width:680px; margin:0 auto; padding:14px clamp(14px,4vw,28px) 36px; }
  .mast { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 0 12px; border-bottom:1px solid rgba(224,36,46,.35); }
  .brand { display:flex; align-items:center; gap:10px; text-decoration:none; color:var(--bone); }
  .brand img { width:26px; height:auto; filter:drop-shadow(0 0 10px rgba(224,36,46,.4)); }
  .brand b { font-family:var(--serif); font-size:15px; letter-spacing:.06em; }
  .brand .em { color:var(--umb-hi); }
  .mast .no { font-family:var(--mono); font-size:10px; letter-spacing:.18em; color:var(--bone-dim); }
  .dossier { margin-top:18px; }
  .bar { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;
    font-family:var(--mono); font-size:10px; letter-spacing:.22em; padding:8px 14px; background:var(--umb); color:#fff; }
  .bar a { color:#fff; text-decoration:none; border-bottom:1px dashed rgba(255,255,255,.6); letter-spacing:.1em; white-space:nowrap; }
  .body { padding:22px 24px 26px; background:#edeae2; color:#1d1e22; }
  .meta { display:flex; gap:14px; align-items:baseline; flex-wrap:wrap; font-family:var(--mono); font-size:12px; margin-bottom:10px; color:#a01820; }
  .meta .side-tag { font-weight:700; letter-spacing:.3em; }
  h1 { font-family:var(--serif); font-size:24px; line-height:1.4; margin-bottom:12px; }
  .sum { font-size:13.5px; line-height:1.9; font-weight:700; margin-bottom:14px; color:#33343a; }
  .txt p { font-size:13px; line-height:2.05; margin-bottom:11px; color:#44464c; text-align:justify; }
  .txt h2 { font-family:var(--serif); font-size:16px; color:#a01820; margin:20px 0 10px; padding-left:10px; border-left:3px solid var(--umb); }
  .txt ul { margin:0 0 11px 0; padding-left:0; list-style:none; }
  .txt li { font-size:13px; line-height:1.95; color:#44464c; padding-left:16px; position:relative; margin-bottom:5px; text-align:justify; }
  .txt li::before { content:"◆"; position:absolute; left:0; top:0; font-size:9px; color:#a01820; }
  .txt a { color:#a01820; }
  .foot { margin-top:16px; padding-top:10px; border-top:1px dashed rgba(224,36,46,.35); font-family:var(--mono); font-size:10px; letter-spacing:.18em; opacity:.6; }
  .backcta { display:block; margin-top:18px; padding:16px 18px; text-align:center; text-decoration:none;
    background:var(--umb); color:#fff; border:1px solid rgba(255,255,255,.25);
    box-shadow:0 0 20px rgba(224,36,46,.4); transition:background .2s, box-shadow .2s; }
  .backcta b { display:block; font-family:var(--serif); font-size:17px; letter-spacing:.14em; }
  .backcta span { display:block; margin-top:7px; font-family:var(--mono); font-size:10.5px; letter-spacing:.14em; opacity:.85; }
  .backcta:hover { background:#f0333d; box-shadow:0 0 30px rgba(224,36,46,.65); }
  .pager { display:flex; justify-content:space-between; gap:12px; margin-top:16px; font-size:12px; }
  .pager a { color:var(--bone-dim); text-decoration:none; border:1px solid rgba(224,36,46,.35); padding:8px 12px; max-width:48%; }
  .pager a:hover { color:var(--bone); background:rgba(224,36,46,.12); }
  .pager b { color:var(--umb-hi); font-family:var(--mono); font-size:10px; letter-spacing:.12em; display:block; margin-bottom:4px; }
  .sitefoot { text-align:center; font-family:var(--mono); font-size:10.5px; color:var(--bone-dim); opacity:.75; padding:22px 0 6px; line-height:2; }
  .sitefoot a { color:var(--umb-hi); text-decoration:none; }
</style>
</head>
<body>
<div class="wrap">
  <header class="mast">
    <a class="brand" href="/"><img src="/logo.svg" alt="UMBRELLA 4365"><b>UMBRELLA 4365 <span class="em">· Cursor 战地纪实</span></b></a>
    <span class="no">${no}</span>
  </header>
  <main>
    <article class="dossier">
      <div class="bar"><span>${isWeekly ? `WEEKLY DISPATCH · 第 ${p.issue} 期` : 'SPECIAL FEATURE · 专题特稿'}</span><a href="/w">⇱ 刊物索引</a></div>
      <div class="body">
        <div class="meta">
          <span class="side-tag">${isWeekly ? '每周战报' : '专题特稿'}</span>
          <time datetime="${escHtml(p.date)}">${dotDate(p.date)}</time>
        </div>
        <h1>${escHtml(p.title)}</h1>
        ${p.summary ? `<p class="sum">${escHtml(p.summary)}</p>` : ''}
        <div class="txt">${body}</div>
        <div class="foot">UMBRELLA 4365 · ${isWeekly ? 'WEEKLY DISPATCH' : 'SPECIAL FEATURE'} · 仅作记录 · 不构成立场</div>
      </div>
    </article>
    ${pager}
    <a class="backcta" href="/">
      <b>⇱ 返回完整时间树</b>
      <span>UMBRELLA 4365 · 双线对照 · 由新到旧 · 全部档案</span>
    </a>
  </main>
  <footer class="sitefoot">
    基于公开报道与场外情报整理 · 仅作记录 不构成立场<br>
    <a href="/w">刊物索引</a> · <a href="/warroom">红后作战室</a> · <a href="/feed.xml">RSS</a> · <a href="${SITE_URL}">umbrella4365.com</a> · ${icpHTML()}
  </footer>
</div>
</body>
</html>`;
}

/* 刊物索引 /w：战报（按期号倒序）+ 特稿 */
function pubIndexHTML() {
  const posts = publishedPosts();
  const weeklies = posts.filter(p => p.kind === 'weekly').sort((a, b) => b.issue - a.issue);
  const features = posts.filter(p => p.kind === 'feature');
  const url = `${SITE_URL}/w`;
  const pageTitle = 'Cursor 周报 · 每周战报与专题特稿';
  const desc = '每周五分钟跟上 Cursor 与 AI 编程圈：正史要点、野史暗面、套利窗口进展与下周观察。战报每周一期，特稿不定期。';

  const item = p => `
      <a class="item i-main" href="${postPath(p)}">
        <div class="ihead"><time datetime="${escHtml(p.date)}">${dotDate(p.date)}</time><span class="side">${p.kind === 'weekly' ? `第 ${p.issue} 期` : '特稿'}</span></div>
        <div class="it">${escHtml(p.title)}</div>
        <p class="is">${escHtml(clip(p.summary, 120))}</p>
      </a>`;

  const bodyHtml = `
    <div class="list">
      ${weeklies.length ? weeklies.map(item).join('') : '<div class="txtcard"><p>第一期战报整理中——RSS 订阅后自动送达。</p></div>'}
    </div>
    ${features.length ? `<h2 style="font-family:var(--serif);font-size:18px;letter-spacing:.04em;margin:24px 0 12px">专题特稿</h2><div class="list">${features.map(item).join('')}</div>` : ''}
    ${crossNavHTML(null, null)}`;

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle, description: desc, url, inLanguage: 'zh-CN',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
    mainEntity: {
      '@type': 'ItemList', numberOfItems: posts.length,
      itemListElement: posts.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE_URL + postPath(p), name: p.title })),
    },
  };

  return listPageHTML({
    url, pageTitle, desc,
    kicker: `PRESS ROOM · ${posts.length} ISSUES`,
    h1: '战报周刊 · 每周五分钟跟上战况',
    lead: '战报由档案库每周汇编：正史要点、野史暗面、套利窗口的检出与灭活、下周观察。订阅 RSS（/feed.xml）战报与新档案自动送达。',
    metaHtml: `<div class="stat">◈ 战报 ${weeklies.length} 期 · 特稿 ${features.length} 篇 · 每周更新</div>`,
    bodyHtml,
    ldBlocks: [collection, breadcrumbLD('战报周刊', url)],
  });
}

function servePubIndex(req, res) {
  const doc = seoDoc('pub-index', pubIndexHTML);
  sendDoc(req, res, doc, 'text/html; charset=utf-8', 'no-cache, must-revalidate');
}
function servePost(req, res, p) {
  if (!p || p.status !== 'published') return serveNotFound(res, '刊物不存在或尚未发布');
  const doc = seoDoc(`post:${p.id}`, () => postPageHTML(p));
  sendDoc(req, res, doc, 'text/html; charset=utf-8', 'no-cache, must-revalidate');
}

/* ---- 红后作战室 /warroom ---- */
let warroomDoc = { at: 0, doc: null };
const WARROOM_TTL = 5 * 60 * 1000;

/* 从档案库推导窗口态势：
   存活 = 标题带「（存活）」的档案（按立档惯例，灭活后会改题挂 series）；
   已灭活 = series 内同时存在「·检出」与「·灭活」节点的成对线索 */
function windowBoards() {
  const rows = db.prepare('SELECT id, side, date, tag, title, summary, series FROM events ORDER BY date ASC, id ASC').all();
  const todayStr = localNow().slice(0, 10);
  const daysSince = d => Math.max(0, Math.round((new Date(todayStr) - new Date(d)) / 864e5));

  const live = rows.filter(e => e.title.includes('（存活）')).map(e => ({
    id: e.id, date: e.date, days: daysSince(e.date), tag: e.tag,
    title: e.title.replace('（存活）', '').trim(),
    summary: e.summary,
  })).reverse();

  const bySeries = new Map();
  for (const e of rows) {
    if (!e.series) continue;
    if (!bySeries.has(e.series)) bySeries.set(e.series, []);
    bySeries.get(e.series).push(e);
  }
  const closed = [];
  for (const [name, arr] of bySeries) {
    const det = arr.find(e => e.title.includes('·检出'));
    if (!det) continue;
    const kill = [...arr].reverse().find(e => e.title.includes('·灭活'));
    if (!kill) continue;
    closed.push({
      series: name, from: det.date, to: kill.date,
      span: Math.max(0, Math.round((new Date(kill.date) - new Date(det.date)) / 864e5)),
      detId: det.id, killId: kill.id, detSummary: det.summary,
    });
  }
  closed.sort((a, b) => (a.to < b.to ? 1 : -1));
  return { live, closed, todayStr };
}

/* 战线状态：status.cursor.com 镜像（Statuspage v2 summary），5 分钟缓存，失联降级不阻塞 */
let statusCache = { at: 0, data: null };
async function fetchFrontlineStatus() {
  if (Date.now() - statusCache.at < WARROOM_TTL) return statusCache.data;
  try {
    const r = await fetch('https://status.cursor.com/api/v2/summary.json', { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    statusCache = {
      at: Date.now(),
      data: {
        indicator: (j.status && j.status.indicator) || 'none',
        description: (j.status && j.status.description) || '',
        incidents: (j.incidents || []).slice(0, 3).map(i => ({ name: i.name, status: i.status, at: String(i.started_at || '').slice(0, 10) })),
        stale: false,
      },
    };
  } catch {
    statusCache = { at: Date.now(), data: statusCache.data ? { ...statusCache.data, stale: true } : null };
  }
  return statusCache.data;
}

const WARROOM_CSS = `
  .wr-box { border:1px dashed rgba(224,36,46,.5); padding:15px 17px 13px; background:linear-gradient(190deg,#14090d 0%,#0e090c 100%); margin-bottom:14px; box-shadow:0 10px 26px rgba(0,0,0,.5), inset 0 0 40px rgba(224,36,46,.05); }
  .wr-box h2 { font-family:var(--mono); font-size:11.5px; letter-spacing:.2em; color:var(--umb-hi); margin-bottom:11px; font-weight:400; }
  .wr-row { display:flex; gap:12px; align-items:baseline; justify-content:space-between; flex-wrap:wrap; padding:8px 0; border-bottom:1px solid rgba(224,36,46,.12); font-size:12.5px; }
  .wr-row:last-child { border-bottom:none; }
  .wr-row .t { color:#efdada; line-height:1.7; }
  .wr-row .t a { color:#ffd9d4; text-decoration:none; border-bottom:1px dashed rgba(224,36,46,.6); }
  .wr-row .t a:hover { color:var(--umb-hi); border-bottom-style:solid; }
  .wr-row .m { font-family:var(--mono); font-size:11px; color:var(--bone-dim); white-space:nowrap; }
  .wr-row .m b { color:var(--umb-hi); font-weight:700; }
  .wr-live::before { content:"●"; color:var(--umb); margin-right:8px; animation:wrblink 1.3s steps(1) infinite; }
  @keyframes wrblink { 50% { opacity:.2; } }
  .wr-empty { font-family:var(--mono); font-size:11px; letter-spacing:.14em; color:var(--bone-dim); padding:6px 0; }
  .wr-status { display:flex; gap:10px; align-items:center; font-family:var(--mono); font-size:12.5px; letter-spacing:.08em; padding:2px 0 6px; }
  .wr-status .lamp { width:10px; height:10px; transform:rotate(45deg); flex:none; }
  .wr-status.ok .lamp { background:var(--bone); box-shadow:0 0 10px rgba(233,230,223,.8); }
  .wr-status.ok { color:var(--bone); }
  .wr-status.bad .lamp { background:var(--umb); box-shadow:0 0 12px rgba(224,36,46,.9); animation:wrblink 1.1s steps(1) infinite; }
  .wr-status.bad { color:var(--umb-hi); }
  .wr-status.unknown .lamp { background:transparent; border:1.5px solid #58606e; }
  .wr-status.unknown { color:var(--bone-dim); }
  .wr-note { margin-top:8px; font-size:11px; line-height:1.9; color:var(--bone-dim); }
  .wr-note a { color:var(--umb-hi); text-decoration:none; }
  .wtable-wrap { overflow-x:auto; }
  table.wtable { width:100%; border-collapse:collapse; font-size:12px; }
  table.wtable th { font-family:var(--mono); font-size:9.5px; letter-spacing:.14em; color:var(--bone-dim); text-align:left; padding:7px 8px; border-bottom:1px solid rgba(224,36,46,.35); white-space:nowrap; font-weight:400; }
  table.wtable td { padding:8px; border-bottom:1px solid rgba(224,36,46,.1); color:#d8c4c2; vertical-align:top; line-height:1.65; }
  table.wtable tr:last-child td { border-bottom:none; }
  table.wtable td.mono { font-family:var(--mono); font-size:10.5px; white-space:nowrap; }
  table.wtable .model { color:#ffd9d4; font-weight:700; white-space:nowrap; }
  table.wtable .st { font-family:var(--mono); font-size:10px; letter-spacing:.1em; white-space:nowrap; }
  table.wtable .st.active { color:#e9e6df; }
  table.wtable .st.watch { color:var(--umb-hi); }
  table.wtable .st.removed { color:#58606e; text-decoration:line-through; }
`;

function warroomPageHTML(status) {
  const { live, closed, todayStr } = windowBoards();
  const supply = db.prepare(`SELECT * FROM supply ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'watch' THEN 1 ELSE 2 END, sort ASC, id ASC`).all();
  const url = `${SITE_URL}/warroom`;
  const pageTitle = 'Cursor 实时作战室：套利窗口存活状态 · 模型补给表 · 战线状态';
  const desc = '红后作战室实时板：场外套利窗口哪些还存活、哪些刚被灭活，Cursor 在售模型与价格额度一览，官方服务状态镜像。由档案库实时推导，每五分钟刷新。';

  const liveHtml = live.length ? live.map(w => `
      <div class="wr-row">
        <span class="t wr-live"><a href="/ev/${w.id}">${escHtml(w.title)}</a></span>
        <span class="m">${dotDate(w.date)} 检出 · 存活 <b>${w.days}</b> 天</span>
      </div>`).join('') : '<div class="wr-empty">当前无已检出的存活窗口 · 场外静默</div>';

  const closedHtml = closed.length ? closed.slice(0, 8).map(w => `
      <div class="wr-row">
        <span class="t"><a href="${seriesPath(w.series)}">${escHtml(w.series)}</a> · ${escHtml(clip(w.detSummary, 42))}</span>
        <span class="m">${dotDate(w.from)} → ${dotDate(w.to)} · 存活 <b>${w.span}</b> 天 · <a href="/ev/${w.killId}" style="color:inherit">灭活档案</a></span>
      </div>`).join('') : '<div class="wr-empty">暂无已灭活窗口记录</div>';

  const supplyHtml = supply.length ? `
      <div class="wtable-wrap"><table class="wtable">
        <thead><tr><th>模型</th><th>厂商</th><th>覆盖</th><th>价格</th><th>额度口径</th><th>状态</th></tr></thead>
        <tbody>${supply.map(s => `
          <tr>
            <td class="model">${escHtml(s.model)}</td>
            <td>${escHtml(s.provider) || '—'}</td>
            <td>${escHtml(s.tier) || '—'}</td>
            <td class="mono">${escHtml(s.price) || '—'}</td>
            <td>${escHtml(s.quota) || '—'}${s.note ? `<div style="font-size:10.5px;color:#9aa0a8;margin-top:2px">${escHtml(s.note)}</div>` : ''}</td>
            <td><span class="st ${s.status}">${s.status === 'active' ? '在役' : s.status === 'watch' ? '观察' : '撤出'}</span></td>
          </tr>`).join('')}</tbody>
      </table></div>
      <div class="wr-note">价格为每百万 token 计（输入 / 输出）；口径以 <a href="https://cursor.com/docs" target="_blank" rel="noopener">官方文档</a> 为准，此表随档案更新维护。</div>`
    : '<div class="wr-empty">补给表待录入 · 后台「补给线」维护</div>';

  let statusHtml;
  if (!status) {
    statusHtml = '<div class="wr-status unknown"><span class="lamp"></span>哨所失联 · 无法接通 status.cursor.com</div>';
  } else {
    const ok = status.indicator === 'none';
    statusHtml = `
      <div class="wr-status ${ok ? 'ok' : 'bad'}"><span class="lamp"></span>${ok ? '战线平稳 · ALL SYSTEMS NOMINAL' : escHtml(status.description || '战线异常')}${status.stale ? ' ·（缓存读数）' : ''}</div>
      ${(status.incidents || []).map(i => `<div class="wr-row"><span class="t">${escHtml(i.name)}</span><span class="m">${escHtml(i.at)} · ${escHtml(i.status)}</span></div>`).join('')}`;
  }

  const bodyHtml = `
    <div class="wr-box">
      <h2>◈ 套利窗口 · 存活中 LIVE WINDOWS</h2>
      ${liveHtml}
      <div class="wr-note">存活天数按检出日推算。窗口随时可能被灭活——本板仅记录场外已公开的观测，不构成任何操作建议。</div>
    </div>
    <div class="wr-box">
      <h2>◈ 最近灭活 RECENTLY NEUTRALIZED</h2>
      ${closedHtml}
      <div class="wr-note">完整生命周期表：<a href="/d/windows">套利窗口全史 »</a></div>
    </div>
    <div class="wr-box">
      <h2>◈ 模型补给表 SUPPLY LINE</h2>
      ${supplyHtml}
    </div>
    <div class="wr-box">
      <h2>◈ 战线状态 FRONTLINE STATUS</h2>
      ${statusHtml}
      <div class="wr-note">镜像自 <a href="https://status.cursor.com" target="_blank" rel="noopener">status.cursor.com</a>，五分钟一刷；历次故障均在<a href="/">时间树</a>以「故障」标签立档。</div>
    </div>
    <div class="wr-box">
      <h2>◈ 向红后投递线报 SUBMIT INTEL</h2>
      <div class="wr-note" style="margin-top:0">观测到新窗口、新故障、新变阵？<a href="/#tip">前往首页提交线报 »</a>（匿名可投，采纳即立档）。订阅 <a href="/feed.xml">RSS</a> 或 <a href="/w">战报周刊</a>，战况自动送达。</div>
    </div>`;

  return listPageHTML({
    url, pageTitle, desc,
    kicker: 'WAR ROOM · LIVE SITREP',
    h1: '红后作战室 RED QUEEN WAR ROOM',
    lead: `档案库实时推导的战况面板：存活窗口 ${live.length} 个 · 已灭活 ${closed.length} 个 · 补给线 ${supply.length} 条。读数截至 ${todayStr}。仅作记录，不构成立场，更不构成操作建议。`,
    metaHtml: '',
    bodyHtml,
    ldBlocks: [breadcrumbLD('红后作战室', url)],
    extraCss: WARROOM_CSS,
  });
}

async function serveWarroom(req, res) {
  const status = await fetchFrontlineStatus();
  if (!warroomDoc.doc || Date.now() - warroomDoc.at > WARROOM_TTL) {
    const body = Buffer.from(warroomPageHTML(status));
    warroomDoc = { at: Date.now(), doc: { body, etag: `W/"${crypto.createHash('sha1').update(body).digest('base64url').slice(0, 16)}"` } };
  }
  sendDoc(req, res, warroomDoc.doc, 'text/html; charset=utf-8', 'no-cache, must-revalidate');
}

/* ---- 数据页 /d/*：搜索者语言的速查表 ---- */
const DATA_CSS = `
  .dtable-wrap { overflow-x:auto; margin-bottom:14px; box-shadow:0 10px 26px rgba(0,0,0,.5); }
  table.dtable { width:100%; border-collapse:collapse; font-size:12.5px; background:linear-gradient(175deg,#edeae2 0%,#d9d5c9 100%); color:#1d1e22; }
  table.dtable th { font-family:var(--mono); font-size:10px; letter-spacing:.14em; color:#a01820; text-align:left; padding:9px 12px; border-bottom:1px solid rgba(160,24,32,.45); white-space:nowrap; font-weight:400; }
  table.dtable td { padding:9px 12px; border-bottom:1px solid rgba(160,24,32,.14); vertical-align:top; line-height:1.75; color:#44464c; }
  table.dtable tr:last-child td { border-bottom:none; }
  table.dtable td.mono { font-family:var(--mono); white-space:nowrap; font-size:11.5px; color:#33343a; }
  table.dtable td b { color:#1d1e22; }
  table.dtable a { color:#a01820; }
  table.dtable .dim { color:#7a7c84; font-size:11.5px; }
  .chip { display:inline-block; font-family:var(--mono); font-size:10px; letter-spacing:.12em; padding:1px 8px; border:1px solid currentColor; white-space:nowrap; }
  .chip.live { color:#a01820; font-weight:700; }
  .chip.dead { color:#7a7c84; }
`;

/* 版本与关键节点（curated：官方 changelog / 站内档案双重口径；新版本发布后在此补一行 + 立档） */
const VERSIONS = [
  { date: '2023-03-14', name: 'Cursor 初版', note: 'VS Code 分叉 + GPT-4 深度内置，「AI 原生编辑器」问世', ev: 2 },
  { date: '2024-06-20', name: '默认模型换防', note: 'Claude 3.5 Sonnet 上线即改写默认项，模型军备竞赛起点', ev: 5 },
  { date: '2024-11-12', name: 'Cursor Tab 换代', note: '收购 Supermaven，补全进化为低延迟跨文件预判', ev: 8 },
  { date: '2025-06-04', name: 'Cursor 1.0', note: 'Bugbot 自动审查 PR、Background Agent 全员开放、Memories 记忆', ev: 18 },
  { date: '2025-10-29', name: 'Cursor 2.0', note: '自研模型 Composer 首发；多 Agent 界面支持八路并行', ev: 30 },
  { date: '2025-11-21', name: 'Cursor 2.1', note: 'AI 代码评审、Plan 模式改进（官方 changelog 口径）', ev: 0 },
  { date: '2026-01-22', name: 'Cursor 2.4', note: 'Subagents 并行拆解、Skills 开放标准、图像生成、Cursor Blame', ev: 35 },
  { date: '2026-02-24', name: 'Cloud Agents 虚拟机', note: '每个云端 agent 独占隔离虚拟机，自主跑软件测试改动', ev: 36 },
  { date: '2026-03-04', name: 'JetBrains 全家桶', note: '借 ACP 协议入驻 IntelliJ / PyCharm / WebStorm 全系', ev: 38 },
  { date: '2026-03-05', name: 'Automations', note: '定时器 / Slack / Linear / PagerDuty 事件自动拉起云端 agent', ev: 39 },
  { date: '2026-03-19', name: 'Composer 2', note: '首次持续预训练 + 强化学习完整链路，Fast 变体默认', ev: 40 },
  { date: '2026-04-02', name: 'Cursor 3.0', note: 'Agents Window 升为一等公民：跨仓库、跨环境、云端会话互搬', ev: 42 },
  { date: '2026-05-18', name: 'Composer 2.5', note: '自研模型升级并成为默认：标准档 $0.50/$2.50 每百万 token', ev: 49 },
  { date: '2026-06-16', name: 'Compile 大会', note: '首届开发者大会：Origin 预告、Mobile TestFlight、1.5 万亿参数自训模型官宣', ev: 57 },
  { date: '2026-06-29', name: 'iOS 版公测', note: '手机指挥云端 agent：锁屏追进度、看 demo、直接合 PR', ev: 59 },
  { date: '2026-07-08', name: 'Grok 4.5 上线', note: '收编后首个联合训练模型：$2/$6 每百万 token', ev: 61 },
  { date: '2026-07-22', name: 'Cursor Router', note: 'Auto 智能分流：按任务类型与复杂度选模型，团队先行', ev: 66 },
  { date: '2026-08-13', name: 'Builds', note: '云端环境预构建：启动 10 倍提速、坏提交不再拖垮 agent（changelog）', ev: 0 },
  { date: '2026-08-17', name: 'Origin 早期 beta', note: '自家代码托管上线：建仓、PR、浏览、GitHub 双向同步', ev: 80 },
  { date: '2026-08-19', name: 'Subscriptions / Goal', note: '云端 agent 事件订阅、/goal 长任务、子代理独立虚拟机（changelog）', ev: 0 },
  { date: '2026-08-27', name: 'Grok Bot 全线 + 零依赖开工', note: 'Grok Bot 下放付费全线并重置周额度；Cloud Agents 无需 GitHub 起步', ev: 86 },
];

/* 融资与估值（curated：站内档案已查证口径；新一轮官宣后在此补一行 + 立档） */
const FUNDING = [
  { round: '种子轮', date: '2023-10-11', amount: '$800 万', valuation: '—', investors: 'OpenAI Startup Fund 领投；Nat Friedman 等跟投', ev: 4 },
  { round: 'A 轮', date: '2024-08-09', amount: '$6,000 万', valuation: '约 $4 亿', investors: 'a16z、Thrive Capital', ev: 6 },
  { round: 'B 轮', date: '2025-01-14', amount: '$1.05 亿', valuation: '约 $26 亿（据媒体报道）', investors: 'Thrive、a16z、Benchmark', ev: 9 },
  { round: 'C 轮', date: '2025-06-05', amount: '$9 亿', valuation: '$99 亿', investors: 'Thrive 领投；a16z、Accel、DST 跟投', ev: 19 },
  { round: 'D 轮', date: '2025-11-13', amount: '$23 亿', valuation: '$293 亿', investors: 'Accel 与 Coatue 联合领投；NVIDIA、Google 入局', ev: 32 },
  { round: '全股票收购', date: '2026-06-16 签约 · 08-14 交割', amount: '对价 $600 亿', valuation: '—', investors: 'SpaceX（增发约 3.89 亿股 A 类普通股）', ev: 55 },
];
const ARR_NOTES = 'ARR（年经常性收入）里程碑：2025-01 破 $1 亿 → 2025-06 破 $5 亿 → 2025-11 破 $10 亿 → 2026-02 破 $20 亿 → 2026-05 破 $30 亿 → 收购前夕约 $40 亿（据公开报道，详见档案 A-037）。';

function dataPageShell({ slug, pageTitle, h1, lead, bodyHtml }) {
  const url = `${SITE_URL}/d/${slug}`;
  return listPageHTML({
    url, pageTitle, desc: clip(lead, 150),
    kicker: 'DATA SHEET · 速查表',
    h1, lead,
    metaHtml: '',
    bodyHtml: bodyHtml + `
    <nav class="othernav" aria-label="更多速查表">
      <div class="oh">◈ 更多速查表与情报页</div>
      <div class="links"><a href="/d/versions">版本史全表</a><span class="sep">·</span><a href="/d/funding">融资估值全史</a><span class="sep">·</span><a href="/d/windows">套利窗口全史</a><span class="sep">·</span><a href="/warroom">红后作战室</a><span class="sep">·</span><a href="/w">战报周刊</a></div>
    </nav>`,
    ldBlocks: [breadcrumbLD(h1, url)],
    extraCss: DATA_CSS,
  });
}

function dataVersionsHTML() {
  const rows = [...VERSIONS].reverse().map(v => `
    <tr>
      <td class="mono"><time datetime="${v.date}">${dotDate(v.date)}</time></td>
      <td><b>${escHtml(v.name)}</b></td>
      <td>${escHtml(v.note)}${v.ev ? ` <a href="/ev/${v.ev}">档案 »</a>` : ''}</td>
    </tr>`).join('');
  return dataPageShell({
    slug: 'versions',
    pageTitle: 'Cursor 版本历史大全：每个版本的发布日期与关键功能',
    h1: 'Cursor 版本史全表',
    lead: '从 2023 年初版到 Origin 代码托管——Cursor 每个大版本与关键节点的发布日期、核心功能速查，由新到旧。口径以官方 changelog 与本站已查证档案为准。',
    bodyHtml: `<div class="dtable-wrap"><table class="dtable">
      <thead><tr><th>日期</th><th>版本 / 节点</th><th>关键内容</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`,
  });
}

function dataFundingHTML() {
  const rows = FUNDING.map(f => `
    <tr>
      <td class="mono">${escHtml(f.date)}</td>
      <td><b>${escHtml(f.round)}</b></td>
      <td class="mono">${escHtml(f.amount)}</td>
      <td class="mono">${escHtml(f.valuation)}</td>
      <td>${escHtml(f.investors)}${f.ev ? ` <a href="/ev/${f.ev}">档案 »</a>` : ''}</td>
    </tr>`).join('');
  return dataPageShell({
    slug: 'funding',
    pageTitle: 'Cursor 融资历史与估值数据表：从种子轮到 600 亿收购',
    h1: 'Cursor 融资估值全史',
    lead: 'Anysphere（Cursor 母公司）历轮融资的日期、金额、估值与投资方速查。叙事版时间线见融资阶梯线索页，此表为数据口径汇总——金额与估值均经查证，模糊处按「约 / 据报道」标注。',
    bodyHtml: `<div class="dtable-wrap"><table class="dtable">
      <thead><tr><th>日期</th><th>轮次</th><th>金额</th><th>投后估值</th><th>投资方</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div class="txtcard"><h2>ARR 增长台阶</h2><p>${escHtml(ARR_NOTES)}</p><p>叙事版完整时间线：<a href="/s/funding">融资阶梯线索页 »</a> · <a href="/s/spacex">SpaceX 收购全过程 »</a></p></div>`,
  });
}

function dataWindowsHTML() {
  const { live, closed } = windowBoards();
  const liveRows = live.map(w => `
    <tr>
      <td class="mono"><time datetime="${w.date}">${dotDate(w.date)}</time></td>
      <td><b>${escHtml(w.title)}</b><div class="dim">${escHtml(clip(w.summary, 60))}</div></td>
      <td class="mono">—</td>
      <td class="mono">${w.days} 天+</td>
      <td><span class="chip live">存活</span></td>
      <td><a href="/ev/${w.id}">检出档案 »</a></td>
    </tr>`).join('');
  const closedRows = closed.map(w => `
    <tr>
      <td class="mono"><time datetime="${w.from}">${dotDate(w.from)}</time></td>
      <td><b>${escHtml(w.series)}</b><div class="dim">${escHtml(clip(w.detSummary, 60))}</div></td>
      <td class="mono">${dotDate(w.to)}</td>
      <td class="mono">${w.span} 天</td>
      <td><span class="chip dead">已灭活</span></td>
      <td><a href="${seriesPath(w.series)}">线索 »</a> <a href="/ev/${w.killId}">灭活档案 »</a></td>
    </tr>`).join('');
  return dataPageShell({
    slug: 'windows',
    pageTitle: 'Cursor 套利窗口全史：检出与灭活时间表（存活状态实时）',
    h1: '套利窗口全史',
    lead: '场外套利玩法的完整生命周期表：何时被检出、何时被灭活、共存活多少天。数据由档案库实时推导；存活窗口以「检出档案」为准，实时态势见红后作战室。本表仅作记录，不构成任何操作建议。',
    bodyHtml: `<div class="dtable-wrap"><table class="dtable">
      <thead><tr><th>检出日</th><th>窗口 / 玩法</th><th>灭活日</th><th>存活</th><th>状态</th><th>档案</th></tr></thead>
      <tbody>${liveRows}${closedRows}</tbody>
    </table></div>
    <div class="txtcard"><h2>什么是「检出 / 灭活」</h2><p>本站按病毒学词系为有生命周期的套利 / 漏洞事件立档：玩法被场外观测到记「检出」，被官方废掉记「灭活」，两条档案同挂一个事件线索自动串成时间线。立档纪律见<a href="/about">关于本站</a>。</p></div>`,
  });
}

function serveDataPage(req, res, slug) {
  const builders = { versions: dataVersionsHTML, funding: dataFundingHTML, windows: dataWindowsHTML };
  const build = builders[slug];
  if (!build) return serveNotFound(res, '速查表不存在');
  const doc = seoDoc(`d:${slug}`, build);
  sendDoc(req, res, doc, 'text/html; charset=utf-8', 'no-cache, must-revalidate');
}

function serveNotFound(res, msg) {
  sendBody(res, 404, { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
    '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>404 · 档案不存在</title><meta name="robots" content="noindex"></head>' +
    `<body style="background:#0a0b0e;color:#e9e6df;font-family:Consolas,monospace;text-align:center;padding:80px 20px"><p>404 · ${escHtml(msg || '档案不存在或已销毁')}</p><p style="margin-top:14px"><a href="/" style="color:#ff4a52">⇱ 返回时间树</a></p></body></html>`);
}

/* ============ 百度主动推送 ============
   境内已备案站点的收录加速器：档案增删改时把受影响的 URL 实时推给百度，
   新档案从「发布」到「可被百度检索」缩短到分钟级。
   开关：后台「系统」页的推送 token（或环境变量 BAIDU_PUSH_TOKEN 兜底），
   未配置时静默跳过；推送异步进行，失败只记日志，不影响主流程。 */
async function baiduPushRaw(urls, token) {
  const api = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(SITE_URL)}&token=${encodeURIComponent(token)}`;
  const r = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: urls.join('\n') });
  try { return await r.json(); }
  catch { return { error: r.status, message: '百度接口返回非 JSON' }; }
}
function baiduPush(urls) {
  const token = getSettings().baiduPushToken;
  if (!token || !urls.length) return;
  baiduPushRaw(urls, token)
    .then(j => console.log(`[百度推送] ${urls.length} 条 · 成功 ${j.success ?? 0} · 当日剩余配额 ${j.remain ?? '?'}${j.error ? ` · 错误 ${j.error} ${j.message || ''}` : ''}`))
    .catch(e => console.warn(`[百度推送] 失败（不影响主流程）：${e.message}`));
}
/* 一条档案发生增改时，受影响的页面：档案页本身、首页、所属线索页、所属年份页 */
function baiduPushEvent(row) {
  baiduPush([
    `${SITE_URL}/ev/${row.id}`,
    `${SITE_URL}/`,
    ...(row.series ? [SITE_URL + seriesPath(row.series)] : []),
    `${SITE_URL}/y/${row.date.slice(0, 4)}`,
  ]);
}

/* ---- robots / sitemap / RSS / llms.txt ---- */
function buildRobots() {
  /* /api/events 是 llms.txt 推荐给 AI 爬虫的 JSON 数据源，显式 Allow 放行（更长路径规则优先）；
     其响应仍带 X-Robots-Tag: noindex——允许抓取读取，但不进搜索索引，避免与 SSR 页面构成重复内容 */
  return `# ${SITE_NAME} · ${SITE_URL}
# 搜索引擎与 AI/LLM 爬虫（GPTBot、ClaudeBot、PerplexityBot、Google-Extended、Bytespider 等）均欢迎抓取
# 机器可读索引：${SITE_URL}/llms.txt（目录）与 ${SITE_URL}/llms-full.txt（全文）

User-agent: *
Allow: /
Allow: /api/events
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

function buildSitemap() {
  const events = allEvents();
  const posts = publishedPosts();
  const latest = events.reduce((m, e) => (e.updated_at > m ? e.updated_at : m), '').slice(0, 10);
  const urls = [
    `  <url><loc>${SITE_URL}/</loc>${latest ? `<lastmod>${latest}</lastmod>` : ''}<changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${SITE_URL}/warroom</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    `  <url><loc>${SITE_URL}/w</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    `  <url><loc>${SITE_URL}/d/windows</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    `  <url><loc>${SITE_URL}/d/versions</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    `  <url><loc>${SITE_URL}/d/funding</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    `  <url><loc>${SITE_URL}/about</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
    ...posts.map(p => `  <url><loc>${escHtml(SITE_URL + postPath(p))}</loc><lastmod>${String(p.updated_at).slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`),
    ...allSeriesRows().map(r => `  <url><loc>${escHtml(SITE_URL + seriesPath(r.series))}</loc><lastmod>${r.last}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`),
    ...allYearRows().map(r => `  <url><loc>${SITE_URL}/y/${r.y}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`),
    ...events.map(e => `  <url><loc>${SITE_URL}/ev/${e.id}</loc><lastmod>${String(e.updated_at).slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function buildFeed() {
  /* 档案与刊物（战报 / 特稿）合流：订阅一个源即可收到全部更新 */
  const entries = [
    ...allEvents().slice(0, 50).map(e => ({
      date: e.date, title: `[${e.side === 'main' ? '正史' : '野史'}] ${e.title}`,
      url: `${SITE_URL}/ev/${e.id}`, tag: e.tag, desc: e.summary,
    })),
    ...publishedPosts().slice(0, 20).map(p => ({
      date: p.date, title: `[${p.kind === 'weekly' ? `战报 第 ${p.issue} 期` : '特稿'}] ${p.title}`,
      url: SITE_URL + postPath(p), tag: p.kind === 'weekly' ? '战报' : '特稿', desc: p.summary || p.title,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 50);
  const items = entries.map(e => `    <item>
      <title>${escHtml(e.title)}</title>
      <link>${e.url}</link>
      <guid isPermaLink="true">${e.url}</guid>
      <pubDate>${rfc822(e.date)}</pubDate>${e.tag ? `
      <category>${escHtml(e.tag)}</category>` : ''}
      <description>${escHtml(e.desc)}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escHtml(SITE_NAME)}</title>
    <link>${SITE_URL}/</link>
    <description>${escHtml(SITE_DESC)}</description>
    <language>zh-cn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

function buildLlms() {
  const events = allEvents();
  const line = e => `- [${e.date} ${e.title}](${SITE_URL}/ev/${e.id})：${clip(e.summary, 100)}`;
  const main = events.filter(e => e.side === 'main');
  const dark = events.filter(e => e.side === 'dark');
  const seriesLines = allSeriesRows().map(r => {
    const cfg = SERIES_PAGES[r.series] || {};
    return `- [${cfg.title || `事件线索 · ${r.series}`}](${SITE_URL}${seriesPath(r.series)})：${r.series} · ${r.n} 个节点（${r.first} → ${r.last}）`;
  }).join('\n');
  const yearLines = allYearRows().map(r => `- [${r.y} 年 Cursor 大事记](${SITE_URL}/y/${r.y})：${r.n} 条档案`).join('\n');
  return `# ${SITE_NAME}

> ${SITE_INTRO}

> English: ${SITE_INTRO_EN}

已收录 ${events.length} 条档案（正史 ${main.length} · 野史 ${dark.length}），按日期倒序。每条档案的独立页面含日期、标签、摘要、详情、事件线索与信源链接。全文合集见 [llms-full.txt](${SITE_URL}/llms-full.txt)。

## 实时情报与速查表（结构化数据页）

- [红后作战室](${SITE_URL}/warroom)：套利窗口存活状态、最近灭活、Cursor 在售模型补给表、服务状态镜像（实时推导）
- [套利窗口全史](${SITE_URL}/d/windows)：每个套利/漏洞窗口的检出日、灭活日与存活天数
- [Cursor 版本史全表](${SITE_URL}/d/versions)：各版本发布日期与关键功能
- [Cursor 融资估值全史](${SITE_URL}/d/funding)：历轮融资金额、估值、投资方与 ARR 里程碑

## 刊物（每周战报与专题特稿）

- [战报周刊索引](${SITE_URL}/w)：每周汇编 Cursor 与 AI 编程圈战况
${publishedPosts().map(p => `- [${p.kind === 'weekly' ? `战报 第 ${p.issue} 期 · ` : '特稿 · '}${p.title}](${SITE_URL}${postPath(p)})：${clip(p.summary || p.title, 80)}`).join('\n') || '-（第一期整理中）'}

## 事件线索（专题聚合页）

${seriesLines}

## 年度大事记

${yearLines}

## 正史档案（官方 · 公开报道）

${main.map(line).join('\n')}

## 野史档案（场外情报 · 含演绎）

${dark.map(line).join('\n')}

## 订阅与数据

- [完整时间树](${SITE_URL}/)
- [关于本站与查证纪律](${SITE_URL}/about)
- [RSS 订阅](${SITE_URL}/feed.xml)
- [全部档案 JSON](${SITE_URL}/api/events)
- [网站地图](${SITE_URL}/sitemap.xml)
`;
}

function buildLlmsFull() {
  const events = allEvents();
  const block = e => [
    `## [${e.side === 'main' ? '正史' : '野史'}] ${e.title}（${e.date}${e.tag ? ' · ' + e.tag : ''}）`,
    '',
    `- 链接：${SITE_URL}/ev/${e.id}`,
    ...(e.series ? [`- 事件线索：${e.series}`] : []),
    ...(e.front ? [`- 战区：${frontName(e.front) || e.front}`] : []),
    ...(e.source ? [`- 信源：${e.source}`] : []),
    '',
    e.summary,
    ...(e.detail ? ['', e.detail] : []),
  ].join('\n');
  const postBlock = p => [
    `## [${p.kind === 'weekly' ? `战报 第 ${p.issue} 期` : '特稿'}] ${p.title}（${p.date}）`,
    '',
    `- 链接：${SITE_URL}${postPath(p)}`,
    '',
    p.summary || '',
    ...(p.content ? ['', p.content] : []),
  ].join('\n');
  const posts = publishedPosts();
  return `# ${SITE_NAME}（全文）

> ${SITE_INTRO}

> English: ${SITE_INTRO_EN}

${events.map(block).join('\n\n---\n\n')}${posts.length ? '\n\n---\n\n' + posts.map(postBlock).join('\n\n---\n\n') : ''}
`;
}

/* ---- SEO 路由分发（仅 GET/HEAD 到达此处） ---- */
function handleSEO(req, res, url) {
  const p = url.pathname;
  if (p === '/') { serveHome(req, res); return true; }
  if (p === '/index.html') { res.writeHead(301, { Location: '/' }); res.end(); return true; }
  const m = p.match(/^\/ev\/(\d+)\/?$/);
  if (m) {
    if (p.endsWith('/')) { res.writeHead(301, { Location: `/ev/${m[1]}` }); res.end(); return true; }
    serveEvent(req, res, Number(m[1]));
    return true;
  }
  const ms = p.match(/^\/s\/([^/]+?)\/?$/);
  if (ms) {
    if (p.endsWith('/')) { res.writeHead(301, { Location: `/s/${ms[1]}` }); res.end(); return true; }
    serveSeries(req, res, ms[1]);
    return true;
  }
  const my = p.match(/^\/y\/(\d{4})\/?$/);
  if (my) {
    if (p.endsWith('/')) { res.writeHead(301, { Location: `/y/${my[1]}` }); res.end(); return true; }
    serveYear(req, res, my[1]);
    return true;
  }
  if (p === '/about' || p === '/about/') {
    if (p.endsWith('/')) { res.writeHead(301, { Location: '/about' }); res.end(); return true; }
    serveAbout(req, res);
    return true;
  }
  if (p === '/warroom' || p === '/warroom/') {
    if (p.endsWith('/')) { res.writeHead(301, { Location: '/warroom' }); res.end(); return true; }
    serveWarroom(req, res).catch(e => { try { sendJSON(res, 500, { ok: false, error: String(e.message || e) }); } catch {} });
    return true;
  }
  if (p === '/w' || p === '/w/') {
    if (p.endsWith('/')) { res.writeHead(301, { Location: '/w' }); res.end(); return true; }
    servePubIndex(req, res);
    return true;
  }
  const mw = p.match(/^\/w\/(\d+)\/?$/);
  if (mw) {
    if (p.endsWith('/')) { res.writeHead(301, { Location: `/w/${mw[1]}` }); res.end(); return true; }
    servePost(req, res, db.prepare(`SELECT * FROM posts WHERE kind='weekly' AND issue = ?`).get(Number(mw[1])));
    return true;
  }
  const mt = p.match(/^\/t\/([a-z0-9-]+)\/?$/);
  if (mt) {
    if (p.endsWith('/')) { res.writeHead(301, { Location: `/t/${mt[1]}` }); res.end(); return true; }
    servePost(req, res, db.prepare(`SELECT * FROM posts WHERE kind='feature' AND slug = ?`).get(mt[1]));
    return true;
  }
  const md = p.match(/^\/d\/([a-z-]+)\/?$/);
  if (md) {
    if (p.endsWith('/')) { res.writeHead(301, { Location: `/d/${md[1]}` }); res.end(); return true; }
    serveDataPage(req, res, md[1]);
    return true;
  }
  if (p === '/robots.txt') { sendDoc(req, res, seoDoc('robots', buildRobots), 'text/plain; charset=utf-8', 'public, max-age=600'); return true; }
  if (p === '/sitemap.xml') { sendDoc(req, res, seoDoc('sitemap', buildSitemap), 'application/xml; charset=utf-8', 'public, max-age=600'); return true; }
  if (p === '/feed.xml') { sendDoc(req, res, seoDoc('feed', buildFeed), 'application/rss+xml; charset=utf-8', 'public, max-age=600'); return true; }
  if (p === '/llms.txt') { sendDoc(req, res, seoDoc('llms', buildLlms), 'text/markdown; charset=utf-8', 'public, max-age=600'); return true; }
  if (p === '/llms-full.txt') { sendDoc(req, res, seoDoc('llms-full', buildLlmsFull), 'text/markdown; charset=utf-8', 'public, max-age=600'); return true; }
  return false;
}

/* 线报限速：同 IP 每小时最多 5 条（独立于密钥防爆破计数） */
const tipMap = new Map(); // ip -> { count, first }
function tipAllowed(ip) {
  const now = Date.now();
  let e = tipMap.get(ip);
  if (!e || now - e.first > 3600e3) e = { count: 0, first: now };
  e.count++;
  tipMap.set(ip, e);
  return e.count <= 5;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of tipMap) if (now - e.first > 3600e3) tipMap.delete(ip);
}, 30 * 60 * 1000).unref();

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
    const rSize = Math.min(Math.max(Number(url.searchParams.get('rsize')) || 30, 1), 100);
    const rPage = Math.max(Number(url.searchParams.get('rpage')) || 1, 1);
    const recentTotal = db.prepare(`SELECT COUNT(*) AS c FROM visits`).get().c;
    const recent = db.prepare(
      `SELECT ts, path, status, ip_hash, ua, referer FROM visits ORDER BY id DESC LIMIT ? OFFSET ?`
    ).all(rSize, (rPage - 1) * rSize);
    return sendJSON(res, 200, { ok: true, today, total, daily, topPaths, scans, referers, recent, recentTotal, rPage, rSize, keepDays: LOG_KEEP_DAYS });
  }

  /* 站点设置（后台「系统」页）：SEO 接入配置 + 频道与支援链接的读取 / 保存 / 推送测试 */
  if (url.pathname === '/api/settings' && req.method === 'GET') {
    if (!requireAuth(req, res)) return;
    const cfg = readConfig();
    const settings = {}, envFallback = {};
    for (const [key, envKey] of Object.entries(SETTING_KEYS)) {
      settings[key] = String(cfg[key] || '').trim();
      envFallback[key] = Boolean(String(process.env[envKey] || '').trim());
    }
    const links = {};
    for (const k of LINK_KEYS) links[k] = String(cfg[k] || '').trim();
    const version = await new Promise(resolve => {
      execFile('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, timeout: 10000 }, (err, stdout) => resolve(err ? '' : String(stdout).trim()));
    });
    return sendJSON(res, 200, { ok: true, settings, envFallback, links, siteUrl: SITE_URL, version });
  }
  if (url.pathname === '/api/settings' && req.method === 'PUT') {
    if (!requireAuth(req, res)) return;
    const b = await readJSON(req);
    const patch = {};
    for (const key of [...Object.keys(SETTING_KEYS), ...LINK_KEYS]) {
      if (key in b) patch[key] = cut(String(b[key] || '').trim(), 200);
    }
    writeConfig(patch);
    invalidateDynamic();   // 验证 meta 与 __LINKS__ 在首页 head 里，改完立刻重建
    return sendJSON(res, 200, { ok: true });
  }
  /* ============ 一键部署（后台「系统」页）============
     行为固定为三步：git pull --ff-only → node --check server.js → systemd 环境下退出进程由
     Restart=always 拉起新版。不接受任何参数、不执行任意命令；语法自检不过则拒绝重启（旧版继续跑）。
     涉及一次性迁移脚本 / 环境变量的升级仍走 SSH（见 DEPLOY.md / runbook）。 */
  if (url.pathname === '/api/system/deploy' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const run = (cmd, args) => new Promise(resolve => {
      execFile(cmd, args, { cwd: ROOT, timeout: 60000 }, (err, stdout, stderr) => {
        resolve({ ok: !err, out: String(stdout || '').trim(), err: (String(stderr || '').trim() || (err ? err.message : '')) });
      });
    });
    const before = (await run('git', ['rev-parse', '--short', 'HEAD'])).out || '?';
    const pull = await run('git', ['pull', '--ff-only']);
    if (!pull.ok) return sendJSON(res, 500, { ok: false, error: `git pull 失败：${pull.err || pull.out}` });
    const after = (await run('git', ['rev-parse', '--short', 'HEAD'])).out || '?';
    if (before === after) {
      return sendJSON(res, 200, { ok: true, updated: false, version: after, log: pull.out || '已是最新' });
    }
    const check = await run(process.execPath, ['--check', 'server.js']);
    if (!check.ok) {
      return sendJSON(res, 500, { ok: false, error: `已拉取到 ${after}，但新代码未通过语法自检，已保持 ${before} 继续运行——请 SSH 处理。\n${check.err}` });
    }
    invalidateDynamic();   // 静态模板可能已更新；若不重启（本地开发）也让首页缓存重建
    const underSystemd = Boolean(process.env.INVOCATION_ID);
    sendJSON(res, 200, {
      ok: true, updated: true, from: before, version: after, restarting: underSystemd, log: pull.out,
      note: underSystemd ? '2 秒后自动重启，约数秒后恢复' : '当前不在 systemd 下（本地开发）：已拉取，server.js 的变更需手动重启生效',
    });
    if (underSystemd) setTimeout(() => { try { flushVisits(); } catch {} process.exit(0); }, 2000);
    return;
  }

  if (url.pathname === '/api/settings/test-baidu' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const token = getSettings().baiduPushToken;
    if (!token) return sendJSON(res, 400, { ok: false, error: '尚未配置百度推送 token' });
    const urls = [`${SITE_URL}/`];
    try {
      const result = await baiduPushRaw(urls, token);
      console.log(`[百度推送·手动测试] ${JSON.stringify(result)}`);
      return sendJSON(res, 200, { ok: true, pushed: urls, result });
    } catch (e) {
      return sendJSON(res, 502, { ok: false, error: `推送请求失败：${e.message}` });
    }
  }

  /* 已用过的标签与事件线索（供后台下拉、前台线索概览）——公开只读 */
  if (url.pathname === '/api/meta' && req.method === 'GET') {
    const tags = db.prepare(`SELECT DISTINCT tag FROM events WHERE tag <> '' ORDER BY tag`).all().map(r => r.tag);
    const series = db.prepare(
      `SELECT series, COUNT(*) AS n, MIN(date) AS first, MAX(date) AS last
       FROM events WHERE series <> '' GROUP BY series ORDER BY last DESC`
    ).all();
    return sendJSON(res, 200, { ok: true, tags, series });
  }

  /* 事件集合 */
  if (parts[1] === 'events' && parts.length === 2) {
    if (req.method === 'GET') {
      const side = url.searchParams.get('side');
      const q = (url.searchParams.get('q') || '').trim();
      const series = (url.searchParams.get('series') || '').trim();
      const front = (url.searchParams.get('front') || '').trim();
      const cond = [], args = [];
      if (side === 'main' || side === 'dark') { cond.push('side = ?'); args.push(side); }
      if (series) { cond.push('series = ?'); args.push(series); }
      if (front) { cond.push('front = ?'); args.push(front === 'cursor' ? '' : front); }
      if (q) {
        cond.push('(title LIKE ? OR summary LIKE ? OR detail LIKE ? OR tag LIKE ? OR series LIKE ?)');
        const like = `%${q}%`; args.push(like, like, like, like, like);
      }
      const where = cond.length ? ' WHERE ' + cond.join(' AND ') : '';

      const SORTS = { date: 'date', created_at: 'created_at', updated_at: 'updated_at', id: 'id', title: 'title' };
      const sortCol = SORTS[url.searchParams.get('sort')] || 'date';
      const order = (url.searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      const orderBy = ` ORDER BY ${sortCol} ${order}, id ${order}`;

      const total = db.prepare(`SELECT COUNT(*) AS c FROM events${where}`).get(...args).c;

      // 传了 page 才分页（后台档案管理用）；不传则返回全部（前台完整时间轴用）
      const pageRaw = Number(url.searchParams.get('page'));
      if (Number.isInteger(pageRaw) && pageRaw >= 1) {
        const pageSize = Math.min(Math.max(Number(url.searchParams.get('pageSize')) || 20, 1), 100);
        const rows = db.prepare(`SELECT * FROM events${where}${orderBy} LIMIT ? OFFSET ?`)
          .all(...args, pageSize, (pageRaw - 1) * pageSize);
        return sendJSON(res, 200, { ok: true, events: rows.map(rowToEvent), total, page: pageRaw, pageSize });
      }
      const rows = db.prepare(`SELECT * FROM events${where}${orderBy}`).all(...args);
      return sendJSON(res, 200, { ok: true, events: rows.map(rowToEvent), total });
    }
    if (req.method === 'POST') {
      if (!requireAuth(req, res)) return;
      const b = await readJSON(req);
      const errors = validateEvent(b);
      if (errors.length) return sendJSON(res, 400, { ok: false, error: errors.join('；') });
      const info = db.prepare(
        `INSERT INTO events (side, date, tag, title, summary, detail, image, series, source, front) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(b.side, b.date, String(b.tag || '').trim(), String(b.title).trim(),
            String(b.summary).trim(), String(b.detail || '').trim(), String(b.image || '').trim(),
            String(b.series || '').trim(), String(b.source || '').trim(), String(b.front || '').trim());
      const row = db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid);
      invalidateDynamic();
      baiduPushEvent(row);
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
        `UPDATE events SET side=?, date=?, tag=?, title=?, summary=?, detail=?, image=?, series=?, source=?, front=?,
         updated_at=datetime('now','localtime') WHERE id=?`
      ).run(merged.side, merged.date, String(merged.tag || '').trim(), String(merged.title).trim(),
            String(merged.summary).trim(), String(merged.detail || '').trim(), String(merged.image || '').trim(),
            String(merged.series || '').trim(), String(merged.source || '').trim(), String(merged.front || '').trim(), id);
      const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      invalidateDynamic();
      baiduPushEvent(updated);
      return sendJSON(res, 200, { ok: true, event: rowToEvent(updated) });
    }

    if (req.method === 'DELETE') {
      if (!requireAuth(req, res)) return;
      db.prepare('DELETE FROM events WHERE id = ?').run(id);
      invalidateDynamic();
      /* 删除后档案页已 404，只推被删档案影响到的列表页 */
      baiduPush([`${SITE_URL}/`, ...(row.series ? [SITE_URL + seriesPath(row.series)] : []), `${SITE_URL}/y/${row.date.slice(0, 4)}`]);
      return sendJSON(res, 200, { ok: true });
    }
  }

  /* ============ 刊物 posts（战报 / 特稿）：读写均需鉴权，公开消费走 SSR 页面与 RSS ============ */
  if (url.pathname === '/api/posts' && req.method === 'GET') {
    if (!requireAuth(req, res)) return;
    const rows = db.prepare('SELECT * FROM posts ORDER BY date DESC, id DESC').all();
    return sendJSON(res, 200, { ok: true, posts: rows });
  }
  if (url.pathname === '/api/posts' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const b = await readJSON(req);
    b.status = b.status || 'draft';
    const errors = validatePost(b);
    if (errors.length) return sendJSON(res, 400, { ok: false, error: errors.join('；') });
    try {
      const info = db.prepare(
        'INSERT INTO posts (kind, slug, issue, title, summary, content, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(b.kind, b.kind === 'feature' ? String(b.slug).trim() : '', b.kind === 'weekly' ? Number(b.issue) : null,
            String(b.title).trim(), String(b.summary || '').trim(), String(b.content || ''), b.date, b.status);
      const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(info.lastInsertRowid);
      invalidateDynamic();
      if (row.status === 'published') baiduPush([SITE_URL + postPath(row), `${SITE_URL}/w`, `${SITE_URL}/`]);
      return sendJSON(res, 201, { ok: true, post: row });
    } catch (e) {
      return sendJSON(res, 400, { ok: false, error: /UNIQUE/i.test(String(e)) ? '期号或 slug 已被占用' : String(e.message || e) });
    }
  }
  if (parts[1] === 'posts' && parts.length === 3) {
    const id = Number(parts[2]);
    if (!Number.isInteger(id)) return sendJSON(res, 400, { ok: false, error: 'bad id' });
    if (!requireAuth(req, res)) return;
    const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!row) return sendJSON(res, 404, { ok: false, error: 'not found' });
    if (req.method === 'GET') return sendJSON(res, 200, { ok: true, post: row });
    if (req.method === 'PUT') {
      const b = await readJSON(req);
      const merged = { ...row, ...b };
      const errors = validatePost(merged);
      if (errors.length) return sendJSON(res, 400, { ok: false, error: errors.join('；') });
      const wasPublished = row.status === 'published';
      try {
        db.prepare(
          `UPDATE posts SET kind=?, slug=?, issue=?, title=?, summary=?, content=?, date=?, status=?,
           updated_at=datetime('now','localtime') WHERE id=?`
        ).run(merged.kind, merged.kind === 'feature' ? String(merged.slug).trim() : '',
              merged.kind === 'weekly' ? Number(merged.issue) : null, String(merged.title).trim(),
              String(merged.summary || '').trim(), String(merged.content || ''), merged.date, merged.status || 'draft', id);
      } catch (e) {
        return sendJSON(res, 400, { ok: false, error: /UNIQUE/i.test(String(e)) ? '期号或 slug 已被占用' : String(e.message || e) });
      }
      const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
      invalidateDynamic();
      if (updated.status === 'published') baiduPush([SITE_URL + postPath(updated), `${SITE_URL}/w`, ...(wasPublished ? [] : [`${SITE_URL}/`])]);
      return sendJSON(res, 200, { ok: true, post: updated });
    }
    if (req.method === 'DELETE') {
      db.prepare('DELETE FROM posts WHERE id = ?').run(id);
      invalidateDynamic();
      return sendJSON(res, 200, { ok: true });
    }
  }

  /* ============ 草稿收件箱 drafts：侦察 agent 投递，站长审核后发布为档案 ============ */
  if (url.pathname === '/api/drafts' && req.method === 'GET') {
    if (!requireAuth(req, res)) return;
    const state = url.searchParams.get('state') || 'pending';
    const rows = state === 'all'
      ? db.prepare('SELECT * FROM drafts ORDER BY id DESC LIMIT 200').all()
      : db.prepare('SELECT * FROM drafts WHERE state = ? ORDER BY id DESC LIMIT 200').all(state);
    const pending = db.prepare(`SELECT COUNT(*) AS c FROM drafts WHERE state = 'pending'`).get().c;
    return sendJSON(res, 200, { ok: true, drafts: rows, pending });
  }
  if (url.pathname === '/api/drafts' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const b = await readJSON(req);
    if (!String(b.title || '').trim()) return sendJSON(res, 400, { ok: false, error: '草稿至少要有 title' });
    const info = db.prepare(
      'INSERT INTO drafts (side, date, tag, title, summary, detail, image, series, source, front, verify, origin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(['main', 'dark'].includes(b.side) ? b.side : 'main', String(b.date || '').trim(), String(b.tag || '').trim(),
          String(b.title).trim(), String(b.summary || '').trim(), String(b.detail || ''), String(b.image || '').trim(),
          String(b.series || '').trim(), String(b.source || '').trim(), String(b.front || '').trim(),
          String(b.verify || ''), cut(String(b.origin || 'agent').trim(), 40));
    const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(info.lastInsertRowid);
    return sendJSON(res, 201, { ok: true, draft: row });
  }
  if (parts[1] === 'drafts' && parts.length >= 3) {
    const id = Number(parts[2]);
    if (!Number.isInteger(id)) return sendJSON(res, 400, { ok: false, error: 'bad id' });
    if (!requireAuth(req, res)) return;
    const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id);
    if (!row) return sendJSON(res, 404, { ok: false, error: 'not found' });

    /* 审核发布：草稿（可携带最终修改）→ 正式档案；草稿标记 accepted 并记录 event_id */
    if (parts.length === 4 && parts[3] === 'publish' && req.method === 'POST') {
      const b = await readJSON(req);
      const ev = {
        side: b.side ?? row.side, date: b.date ?? row.date, tag: b.tag ?? row.tag, title: b.title ?? row.title,
        summary: b.summary ?? row.summary, detail: b.detail ?? row.detail, image: b.image ?? row.image,
        series: b.series ?? row.series, source: b.source ?? row.source, front: b.front ?? row.front,
      };
      const errors = validateEvent(ev);
      if (errors.length) return sendJSON(res, 400, { ok: false, error: errors.join('；') });
      const info = db.prepare(
        'INSERT INTO events (side, date, tag, title, summary, detail, image, series, source, front) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(ev.side, ev.date, String(ev.tag || '').trim(), String(ev.title).trim(), String(ev.summary).trim(),
            String(ev.detail || '').trim(), String(ev.image || '').trim(), String(ev.series || '').trim(),
            String(ev.source || '').trim(), String(ev.front || '').trim());
      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid);
      db.prepare(`UPDATE drafts SET state='accepted', event_id=?, updated_at=datetime('now','localtime') WHERE id=?`).run(event.id, id);
      invalidateDynamic();
      baiduPushEvent(event);
      return sendJSON(res, 201, { ok: true, event, draftId: id });
    }
    if (parts.length === 3 && req.method === 'PUT') {
      const b = await readJSON(req);
      const m = { ...row, ...b };
      if (m.state && !['pending', 'accepted', 'dismissed'].includes(m.state)) return sendJSON(res, 400, { ok: false, error: 'state 非法' });
      db.prepare(
        `UPDATE drafts SET side=?, date=?, tag=?, title=?, summary=?, detail=?, image=?, series=?, source=?, front=?, verify=?, state=?,
         updated_at=datetime('now','localtime') WHERE id=?`
      ).run(m.side, String(m.date || '').trim(), String(m.tag || '').trim(), String(m.title || '').trim(),
            String(m.summary || '').trim(), String(m.detail || ''), String(m.image || '').trim(), String(m.series || '').trim(),
            String(m.source || '').trim(), String(m.front || '').trim(), String(m.verify || ''), m.state || row.state, id);
      return sendJSON(res, 200, { ok: true, draft: db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) });
    }
    if (parts.length === 3 && req.method === 'DELETE') {
      db.prepare('DELETE FROM drafts WHERE id = ?').run(id);
      return sendJSON(res, 200, { ok: true });
    }
  }

  /* ============ 读者线报 tips：公开投递（限速 + 蜜罐），后台查阅 ============ */
  if (url.pathname === '/api/tips' && req.method === 'POST') {
    const ip = clientIP(req);
    const b = await readJSON(req);
    if (String(b.website || '').trim()) return sendJSON(res, 201, { ok: true, msg: '线报已进入红后收件箱' });  // 蜜罐：对机器人装作成功
    const content = String(b.content || '').trim();
    if (content.length < 8) return sendJSON(res, 400, { ok: false, error: '线报太短——至少 8 个字，说清楚观测到了什么' });
    if (content.length > 1000) return sendJSON(res, 400, { ok: false, error: '线报超长——1000 字以内，长材料请附链接' });
    if (!tipAllowed(ip)) return sendJSON(res, 429, { ok: false, error: '投递太频繁 · 每小时最多 5 条' });
    db.prepare('INSERT INTO tips (content, contact, url, ip_hash) VALUES (?, ?, ?, ?)')
      .run(cut(content, 1000), cut(String(b.contact || '').trim(), 120), cut(String(b.url || '').trim(), 300), hashIP(ip));
    const { c } = db.prepare('SELECT COUNT(*) AS c FROM tips').get();
    if (c > 2000) db.prepare('DELETE FROM tips WHERE id IN (SELECT id FROM tips ORDER BY id ASC LIMIT ?)').run(c - 2000);
    return sendJSON(res, 201, { ok: true, msg: '线报已进入红后收件箱' });
  }
  if (url.pathname === '/api/tips' && req.method === 'GET') {
    if (!requireAuth(req, res)) return;
    const rows = db.prepare('SELECT * FROM tips ORDER BY id DESC LIMIT 200').all();
    const unread = db.prepare(`SELECT COUNT(*) AS c FROM tips WHERE state = 'new'`).get().c;
    return sendJSON(res, 200, { ok: true, tips: rows, unread });
  }
  if (parts[1] === 'tips' && parts.length === 3) {
    const id = Number(parts[2]);
    if (!Number.isInteger(id)) return sendJSON(res, 400, { ok: false, error: 'bad id' });
    if (!requireAuth(req, res)) return;
    if (req.method === 'PUT') {
      const b = await readJSON(req);
      if (!['new', 'read'].includes(b.state)) return sendJSON(res, 400, { ok: false, error: 'state 非法' });
      db.prepare(`UPDATE tips SET state = ? WHERE id = ?`).run(b.state, id);
      return sendJSON(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      db.prepare('DELETE FROM tips WHERE id = ?').run(id);
      return sendJSON(res, 200, { ok: true });
    }
  }

  /* ============ 模型补给表 supply：读公开（作战室数据源），写需鉴权 ============ */
  if (url.pathname === '/api/supply' && req.method === 'GET') {
    const rows = db.prepare(`SELECT * FROM supply ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'watch' THEN 1 ELSE 2 END, sort ASC, id ASC`).all();
    return sendJSON(res, 200, { ok: true, supply: rows });
  }
  if (url.pathname === '/api/supply' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const b = await readJSON(req);
    if (!String(b.model || '').trim()) return sendJSON(res, 400, { ok: false, error: 'model 必填' });
    if (b.status && !['active', 'watch', 'removed'].includes(b.status)) return sendJSON(res, 400, { ok: false, error: 'status 必须是 active / watch / removed' });
    const info = db.prepare(
      'INSERT INTO supply (model, provider, tier, price, quota, status, note, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(cut(String(b.model).trim(), 60), cut(String(b.provider || '').trim(), 60), cut(String(b.tier || '').trim(), 80),
          cut(String(b.price || '').trim(), 80), cut(String(b.quota || '').trim(), 120),
          b.status || 'active', cut(String(b.note || '').trim(), 200), Number(b.sort) || 100);
    invalidateDynamic();
    return sendJSON(res, 201, { ok: true, row: db.prepare('SELECT * FROM supply WHERE id = ?').get(info.lastInsertRowid) });
  }
  if (parts[1] === 'supply' && parts.length === 3) {
    const id = Number(parts[2]);
    if (!Number.isInteger(id)) return sendJSON(res, 400, { ok: false, error: 'bad id' });
    if (!requireAuth(req, res)) return;
    const row = db.prepare('SELECT * FROM supply WHERE id = ?').get(id);
    if (!row) return sendJSON(res, 404, { ok: false, error: 'not found' });
    if (req.method === 'PUT') {
      const b = await readJSON(req);
      const m = { ...row, ...b };
      if (!['active', 'watch', 'removed'].includes(m.status)) return sendJSON(res, 400, { ok: false, error: 'status 非法' });
      db.prepare(
        `UPDATE supply SET model=?, provider=?, tier=?, price=?, quota=?, status=?, note=?, sort=?, updated_at=datetime('now','localtime') WHERE id=?`
      ).run(cut(String(m.model).trim(), 60), cut(String(m.provider || '').trim(), 60), cut(String(m.tier || '').trim(), 80),
            cut(String(m.price || '').trim(), 80), cut(String(m.quota || '').trim(), 120), m.status,
            cut(String(m.note || '').trim(), 200), Number(m.sort) || 100, id);
      invalidateDynamic();
      return sendJSON(res, 200, { ok: true, row: db.prepare('SELECT * FROM supply WHERE id = ?').get(id) });
    }
    if (req.method === 'DELETE') {
      db.prepare('DELETE FROM supply WHERE id = ?').run(id);
      invalidateDynamic();
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
  let p;
  try { p = decodeURIComponent(url.pathname); }
  catch { res.writeHead(400); return res.end('bad request'); }
  if (p === '/') p = '/index.html';

  /* 管理后台：仅隐藏路径可达；/admin 与 /admin.html 一律 404，不暴露真实入口 */
  if (p === `/${ADMIN_PATH}` || p === `/${ADMIN_PATH}/`) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, must-revalidate',
      'X-Robots-Tag': 'noindex, nofollow',
    });
    return fs.createReadStream(path.join(PUBLIC_DIR, 'admin.html')).pipe(res);
  }
  if (/^\/admin(\.html)?\/?$/i.test(p)) return send404(res);

  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end('forbidden'); }
  if (path.basename(file).toLowerCase() === 'admin.html') return send404(res);
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send404(res);
    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      // HTML 不缓存，保证改代码 / 部署新版后浏览器立刻拿到新页面；图片等静态资源可缓存；
      // 字体子集内容永不变（要换就换文件名），给长缓存
      'Cache-Control': ext === '.html' ? 'no-cache, must-revalidate'
        : ext === '.woff2' ? 'public, max-age=31536000, immutable'
        : 'public, max-age=3600',
    };
    if (COMPRESSIBLE_EXT.has(ext)) {
      headers.Vary = 'Accept-Encoding';
      if (st.size > 1024) {
        const enc = pickEncoding(req);
        if (enc === 'br') {
          res.writeHead(200, { ...headers, 'Content-Encoding': 'br' });
          return fs.createReadStream(file).pipe(zlib.createBrotliCompress(brOpts(st.size))).pipe(res);
        }
        if (enc === 'gzip') {
          res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip' });
          return fs.createReadStream(file).pipe(zlib.createGzip({ level: 6 })).pipe(res);
        }
      }
    }
    res.writeHead(200, headers);
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
    if (handleSEO(req, res, url)) return;
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
  console.log(`  SEO/GEO  首页 SSR + /ev/:id + /s/:slug 线索页 + /y/:year 年份页 + /about · robots/sitemap/RSS/llms.txt · 站点地址 ${SITE_URL}`);
  console.log(`  百度推送 ${getSettings().baiduPushToken ? '已启用（档案增删改实时推送）' : '未启用（后台「系统」页或环境变量 BAIDU_PUSH_TOKEN 配置后开启）'}`);
});
