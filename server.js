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
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
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

function validateEvent(b) {
  const errors = [];
  if (!['main', 'dark'].includes(b.side)) errors.push('side 必须是 main（正史）或 dark（野史）');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || Number.isNaN(Date.parse(b.date))) errors.push('date 必须是 YYYY-MM-DD');
  if (!b.title || !String(b.title).trim()) errors.push('title 必填');
  if (!b.summary || !String(b.summary).trim()) errors.push('summary 必填');
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

const allEvents = () => db.prepare('SELECT * FROM events ORDER BY date DESC, id DESC').all();

const seoCache = new Map(); // key -> { body: Buffer, etag }
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
  return `
        <article class="card c-${ev.side}" data-id="${ev.id}">
          ${ev.side === 'dark' ? '<span class="stamp">野史</span>' : ''}
          <div class="head"><span class="tag">${escHtml(ev.tag) || '记录'}</span><span class="no">${no}</span></div>
          <time datetime="${escHtml(ev.date)}">${dotDate(ev.date)}</time>
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

/* 站长平台验证 meta（拿到验证码后填环境变量即生效，只需出现在首页） */
function verifyMetaHTML() {
  return [
    process.env.BAIDU_SITE_VERIFY ? `<meta name="baidu-site-verification" content="${escHtml(process.env.BAIDU_SITE_VERIFY)}">` : '',
    process.env.GOOGLE_SITE_VERIFY ? `<meta name="google-site-verification" content="${escHtml(process.env.GOOGLE_SITE_VERIFY)}">` : '',
    process.env.BING_SITE_VERIFY ? `<meta name="msvalidate.01" content="${escHtml(process.env.BING_SITE_VERIFY)}">` : '',
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
    `<script>window.__EVENTS__=${ldjson(events)};</script>`,
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

/* 首页页脚的档案索引导航：给聚合页提供固定的站内发现入口（在 #track 之外，不受客户端筛选重绘影响） */
function footNavHTML() {
  const s = allSeriesRows().map(r => `<a href="${seriesPath(r.series)}">${escHtml(r.series)}</a>`).join(' · ');
  const y = allYearRows().map(r => `<a href="/y/${r.y}">${r.y}</a>`).join(' · ');
  return `<nav class="foot-nav" aria-label="档案索引">事件线索：${s}<br>年度大事记：${y} · <a href="/about">关于本站</a></nav>`;
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
          <span>${escHtml(ev.tag)}</span>
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
    <a href="/">⇱ 返回完整时间树</a> · <a href="/feed.xml">RSS</a> · <a href="${SITE_URL}">umbrella4365.com</a>
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

/* 列表页共用外壳（线索页 / 年份页 / 关于本站共用一套 head 与视觉） */
function listPageHTML({ url, pageTitle, desc, kicker, h1, lead, metaHtml, bodyHtml, ldBlocks }) {
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
</style>
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
    <a href="/">⇱ 返回完整时间树</a> · <a href="/about">关于本站</a> · <a href="/feed.xml">RSS</a> · <a href="${SITE_URL}">umbrella4365.com</a>
  </footer>
</div>
</body>
</html>`;
}

/* 列表条目（线索页 / 年份页共用），链到档案独立页 */
const listItemHTML = e => `
      <a class="item i-${e.side}" href="/ev/${e.id}">
        <div class="ihead"><time datetime="${escHtml(e.date)}">${dotDate(e.date)}</time><span class="side">${e.side === 'main' ? '正史' : '野史'}</span>${e.tag ? `<span>${escHtml(e.tag)}</span>` : ''}</div>
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
        <h2>订阅与机器可读</h2>
        <p>更新订阅：<a href="/feed.xml">RSS（/feed.xml）</a>。AI / LLM 检索索引：<a href="/llms.txt">/llms.txt（目录）</a>与 <a href="/llms-full.txt">/llms-full.txt（全文）</a>。全部档案亦可通过 <a href="/api/events">/api/events</a> 以 JSON 读取。</p>
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

function serveNotFound(res, msg) {
  sendBody(res, 404, { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
    '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>404 · 档案不存在</title><meta name="robots" content="noindex"></head>' +
    `<body style="background:#0a0b0e;color:#e9e6df;font-family:Consolas,monospace;text-align:center;padding:80px 20px"><p>404 · ${escHtml(msg || '档案不存在或已销毁')}</p><p style="margin-top:14px"><a href="/" style="color:#ff4a52">⇱ 返回时间树</a></p></body></html>`);
}

/* ============ 百度主动推送 ============
   境内已备案站点的收录加速器：档案增删改时把受影响的 URL 实时推给百度，
   新档案从「发布」到「可被百度检索」缩短到分钟级。
   开关：环境变量 BAIDU_PUSH_TOKEN（百度搜索资源平台 → 普通收录 → API 推送的 token），
   未设置时静默跳过；推送异步进行，失败只记日志，不影响主流程。 */
const BAIDU_PUSH_TOKEN = process.env.BAIDU_PUSH_TOKEN || '';
function baiduPush(urls) {
  if (!BAIDU_PUSH_TOKEN || !urls.length) return;
  const api = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(SITE_URL)}&token=${BAIDU_PUSH_TOKEN}`;
  fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: urls.join('\n') })
    .then(r => r.json())
    .then(j => console.log(`[百度推送] ${urls.length} 条 · 成功 ${j.success ?? 0} · 当日剩余配额 ${j.remain ?? '?'}`))
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
  const latest = events.reduce((m, e) => (e.updated_at > m ? e.updated_at : m), '').slice(0, 10);
  const urls = [
    `  <url><loc>${SITE_URL}/</loc>${latest ? `<lastmod>${latest}</lastmod>` : ''}<changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${SITE_URL}/about</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
    ...allSeriesRows().map(r => `  <url><loc>${escHtml(SITE_URL + seriesPath(r.series))}</loc><lastmod>${r.last}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`),
    ...allYearRows().map(r => `  <url><loc>${SITE_URL}/y/${r.y}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`),
    ...events.map(e => `  <url><loc>${SITE_URL}/ev/${e.id}</loc><lastmod>${String(e.updated_at).slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function buildFeed() {
  const events = allEvents().slice(0, 50);
  const items = events.map(e => `    <item>
      <title>${escHtml(`[${e.side === 'main' ? '正史' : '野史'}] ${e.title}`)}</title>
      <link>${SITE_URL}/ev/${e.id}</link>
      <guid isPermaLink="true">${SITE_URL}/ev/${e.id}</guid>
      <pubDate>${rfc822(e.date)}</pubDate>${e.tag ? `
      <category>${escHtml(e.tag)}</category>` : ''}
      <description>${escHtml(e.summary)}</description>
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
    ...(e.source ? [`- 信源：${e.source}`] : []),
    '',
    e.summary,
    ...(e.detail ? ['', e.detail] : []),
  ].join('\n');
  return `# ${SITE_NAME}（全文）

> ${SITE_INTRO}

> English: ${SITE_INTRO_EN}

${events.map(block).join('\n\n---\n\n')}
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
  if (p === '/robots.txt') { sendDoc(req, res, seoDoc('robots', buildRobots), 'text/plain; charset=utf-8', 'public, max-age=600'); return true; }
  if (p === '/sitemap.xml') { sendDoc(req, res, seoDoc('sitemap', buildSitemap), 'application/xml; charset=utf-8', 'public, max-age=600'); return true; }
  if (p === '/feed.xml') { sendDoc(req, res, seoDoc('feed', buildFeed), 'application/rss+xml; charset=utf-8', 'public, max-age=600'); return true; }
  if (p === '/llms.txt') { sendDoc(req, res, seoDoc('llms', buildLlms), 'text/markdown; charset=utf-8', 'public, max-age=600'); return true; }
  if (p === '/llms-full.txt') { sendDoc(req, res, seoDoc('llms-full', buildLlmsFull), 'text/markdown; charset=utf-8', 'public, max-age=600'); return true; }
  return false;
}

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
      const cond = [], args = [];
      if (side === 'main' || side === 'dark') { cond.push('side = ?'); args.push(side); }
      if (series) { cond.push('series = ?'); args.push(series); }
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
        `INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(b.side, b.date, String(b.tag || '').trim(), String(b.title).trim(),
            String(b.summary).trim(), String(b.detail || '').trim(), String(b.image || '').trim(),
            String(b.series || '').trim(), String(b.source || '').trim());
      const row = db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid);
      seoCache.clear();
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
        `UPDATE events SET side=?, date=?, tag=?, title=?, summary=?, detail=?, image=?, series=?, source=?,
         updated_at=datetime('now','localtime') WHERE id=?`
      ).run(merged.side, merged.date, String(merged.tag || '').trim(), String(merged.title).trim(),
            String(merged.summary).trim(), String(merged.detail || '').trim(), String(merged.image || '').trim(),
            String(merged.series || '').trim(), String(merged.source || '').trim(), id);
      const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      seoCache.clear();
      baiduPushEvent(updated);
      return sendJSON(res, 200, { ok: true, event: rowToEvent(updated) });
    }

    if (req.method === 'DELETE') {
      if (!requireAuth(req, res)) return;
      db.prepare('DELETE FROM events WHERE id = ?').run(id);
      seoCache.clear();
      /* 删除后档案页已 404，只推被删档案影响到的列表页 */
      baiduPush([`${SITE_URL}/`, ...(row.series ? [SITE_URL + seriesPath(row.series)] : []), `${SITE_URL}/y/${row.date.slice(0, 4)}`]);
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
  console.log(`  百度推送 ${BAIDU_PUSH_TOKEN ? '已启用（档案增删改实时推送）' : '未启用（设置 BAIDU_PUSH_TOKEN 后开启）'}`);
});
