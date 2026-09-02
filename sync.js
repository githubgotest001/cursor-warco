/**
 * UMBRELLA 4365 · 线上 ⇄ 本地同步工具（零依赖，Node ≥ 22.13）
 *
 * 设计前提：线上库是唯一真源，本地库只是供 AI 分析用的只读镜像——
 * 档案的增删改永远走线上（后台或 REST API 逐条），保证 /ev/:id 永久 URL 不变，
 * 并自动触发 SEO 缓存重建与百度推送。因此同步只有两个方向明确的动作：
 *
 *   node sync.js pull                    线上 → 本地：档案 + 刊物 + 补给表 + 毒株谱系全量镜像，引用图片增量下载
 *   node sync.js push-image <图片路径>    本地 → 线上：上传图片到 /uploads/（需管理密钥）
 *
 * pull 镜像五张内容表：events（档案，公开接口）、supply（模型补给表，公开接口）、
 * models / scores（毒株谱系：模型登记表与评测记录，公开接口）、
 * posts（编辑部的战报 / 特稿，含 draft 态——/api/posts 需要管理密钥，没有密钥时跳过并提示）。
 * 不同步访问日志 / 收件箱 / 线报等运营数据：访客日志含加盐 IP 哈希（本地与线上盐不同）且体量大，
 * 设计上不出服务器，本地后台「访客监控」显示的因此是本机流量；收件箱与线报是待处置队列，只在线上后台操作。
 *
 * 站点地址与密钥的来源（按优先级）：
 *   site：    --site <url>  >  环境变量 UMB_SITE  >  data/remote.json 的 "site"  >  https://umbrella4365.com
 *   adminKey：--key <key>   >  环境变量 UMB_ADMIN_KEY  >  data/remote.json 的 "adminKey"（push-image 必需；pull 有则多镜像刊物）
 *
 * data/remote.json 示例（data/ 已 gitignore，密钥不会入库）：
 *   { "site": "https://umbrella4365.com", "adminKey": "线上 ADMIN_KEY" }
 */
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'chronicle.db');
const UPLOAD_DIR = path.join(ROOT, 'public', 'uploads');
const REMOTE_CONF = path.join(DATA_DIR, 'remote.json');

/* ---- 参数解析 ---- */
const argv = process.argv.slice(2);
const cmd = argv[0];
function argOf(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : '';
}
function remoteConf() {
  try { return JSON.parse(fs.readFileSync(REMOTE_CONF, 'utf8')); } catch { return {}; }
}
const SITE = (argOf('--site') || process.env.UMB_SITE || remoteConf().site || 'https://umbrella4365.com').replace(/\/+$/, '');
const ADMIN_KEY = argOf('--key') || process.env.UMB_ADMIN_KEY || remoteConf().adminKey || '';

/* ---- pull：线上 → 本地镜像 ---- */
async function pull() {
  console.log(`拉取线上档案：${SITE}/api/events`);
  const res = await fetch(`${SITE}/api/events`);
  if (!res.ok) throw new Error(`GET /api/events 失败：HTTP ${res.status}`);
  const { events } = await res.json();
  if (!Array.isArray(events) || !events.length) throw new Error('线上返回 0 条档案，中止（防止误清空本地库）');

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  /* schema 与 server.js 初始化一致，本地没有库时也能直接建出来 */
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
  `);
  /* 老镜像库缺 front 列时就地补上（镜像库可随时重建，不算运行时迁移） */
  if (!db.prepare('PRAGMA table_info(events)').all().some(c => c.name === 'front')) {
    db.exec(`ALTER TABLE events ADD COLUMN front TEXT NOT NULL DEFAULT ''`);
  }
  const ins = db.prepare(
    `INSERT INTO events (id, side, date, tag, title, summary, detail, image, series, source, front, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM events');
    for (const e of events) {
      ins.run(e.id, e.side, e.date, e.tag || '', e.title, e.summary, e.detail || '',
              e.image || '', e.series || '', e.source || '', e.front || '', e.created_at || e.date, e.updated_at || e.date);
    }
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
  const main = events.filter(e => e.side === 'main').length;
  console.log(`本地镜像已重建：${events.length} 条（正史 ${main} / 野史 ${events.length - main}）→ ${DB_PATH}`);

  await pullSupply(db);
  await pullStrains(db);
  await pullPosts(db);

  /* 引用图片增量下载（只拉档案实际引用的 /uploads/*，已存在的跳过） */
  const wanted = [...new Set(events.map(e => e.image).filter(u => u && u.startsWith('/uploads/')))];
  let fetched = 0, missing = 0;
  for (const u of wanted) {
    const local = path.join(UPLOAD_DIR, path.basename(u));
    if (fs.existsSync(local)) continue;
    try {
      const r = await fetch(SITE + u);
      if (!r.ok) { console.warn(`  ⚠ 图片缺失（线上 ${r.status}）：${u}`); missing++; continue; }
      fs.writeFileSync(local, Buffer.from(await r.arrayBuffer()));
      fetched++;
    } catch (err) {
      console.warn(`  ⚠ 图片下载失败：${u}（${err.message}）`); missing++;
    }
  }
  console.log(`图片：引用 ${wanted.length} 张 · 新下载 ${fetched} 张${missing ? ` · 失败 ${missing} 张` : ''}`);
  console.log('提醒：本地库是只读镜像——改动请走后台或线上 API（逐条），不要改本地库再回推。');
}

/* ---- 补给表 supply：公开接口，作战室数据源 ---- */
async function pullSupply(db) {
  const res = await fetch(`${SITE}/api/supply`);
  if (!res.ok) { console.warn(`  ⚠ 补给表拉取失败（HTTP ${res.status}），本地 supply 保持原样`); return; }
  const { supply } = await res.json();
  if (!Array.isArray(supply)) { console.warn('  ⚠ 补给表返回格式异常，跳过'); return; }
  /* schema 与 server.js 一致 */
  db.exec(`
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
  `);
  const ins = db.prepare(
    `INSERT INTO supply (id, model, provider, tier, price, quota, status, note, sort, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM supply');
    for (const s of supply) {
      ins.run(s.id, s.model, s.provider || '', s.tier || '', s.price || '', s.quota || '',
              s.status || 'active', s.note || '', Number.isInteger(s.sort) ? s.sort : 100, s.updated_at || '');
    }
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
  const active = supply.filter(s => s.status === 'active').length;
  console.log(`补给表已镜像：${supply.length} 行（在役 ${active} / 观察 ${supply.filter(s => s.status === 'watch').length} / 撤出 ${supply.length - active - supply.filter(s => s.status === 'watch').length}）`);
}

/* ---- 毒株谱系 models / scores：公开接口，/m 专栏数据源 ---- */
async function pullStrains(db) {
  const rm = await fetch(`${SITE}/api/models`);
  if (rm.status === 404) { console.warn('  ○ 毒株谱系未镜像：线上尚未部署 /api/models'); return; }
  if (!rm.ok) { console.warn(`  ⚠ 模型表拉取失败（HTTP ${rm.status}），本地 models / scores 保持原样`); return; }
  const { models } = await rm.json();
  const rs = await fetch(`${SITE}/api/scores`);
  if (!rs.ok) { console.warn(`  ⚠ 评测记录拉取失败（HTTP ${rs.status}），本地 models / scores 保持原样`); return; }
  const { scores } = await rs.json();
  if (!Array.isArray(models) || !Array.isArray(scores)) { console.warn('  ⚠ 毒株谱系返回格式异常，跳过'); return; }
  /* schema 与 server.js 一致 */
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      slug         TEXT NOT NULL UNIQUE,
      name         TEXT NOT NULL,
      lab          TEXT NOT NULL DEFAULT 'other',
      family       TEXT NOT NULL DEFAULT '',
      date         TEXT NOT NULL,
      tier         TEXT NOT NULL DEFAULT '',
      open_weights INTEGER NOT NULL DEFAULT 0,
      context      TEXT NOT NULL DEFAULT '',
      price        TEXT NOT NULL DEFAULT '',
      status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','preview','retired')),
      summary      TEXT NOT NULL DEFAULT '',
      source       TEXT NOT NULL DEFAULT '',
      ev           INTEGER,
      created_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_models_date ON models(date DESC);
    CREATE TABLE IF NOT EXISTS scores (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id   INTEGER NOT NULL,
      bench      TEXT NOT NULL,
      score      REAL NOT NULL,
      unit       TEXT NOT NULL DEFAULT '%',
      date       TEXT NOT NULL,
      note       TEXT NOT NULL DEFAULT '',
      source     TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_scores_model ON scores(model_id);
    CREATE INDEX IF NOT EXISTS idx_scores_bench ON scores(bench, date);
  `);
  const insM = db.prepare(
    `INSERT INTO models (id, slug, name, lab, family, date, tier, open_weights, context, price, status, summary, source, ev, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insS = db.prepare(
    `INSERT INTO scores (id, model_id, bench, score, unit, date, note, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM scores; DELETE FROM models');
    for (const m of models) {
      insM.run(m.id, m.slug, m.name, m.lab || 'other', m.family || '', m.date, m.tier || '', m.open_weights ? 1 : 0,
               m.context || '', m.price || '', m.status || 'active', m.summary || '', m.source || '', m.ev ?? null,
               m.created_at || m.date, m.updated_at || m.date);
    }
    for (const s of scores) {
      insS.run(s.id, s.model_id, s.bench, s.score, s.unit || '%', s.date, s.note || '', s.source || '', s.created_at || s.date);
    }
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
  console.log(`毒株谱系已镜像：模型 ${models.length} 株 · 评测记录 ${scores.length} 条`);
}

/* ---- 刊物 posts：战报 / 特稿（含 draft 态），/api/posts 需管理密钥 ---- */
async function pullPosts(db) {
  if (!ADMIN_KEY) {
    console.warn('  ○ 刊物（战报 / 特稿）未镜像：/api/posts 需要管理密钥——配置 data/remote.json 的 "adminKey" 或 --key 后重跑即可');
    return;
  }
  const res = await fetch(`${SITE}/api/posts`, { headers: { 'X-Admin-Key': ADMIN_KEY } });
  if (res.status === 401 || res.status === 429) { console.warn(`  ⚠ 刊物拉取被拒（HTTP ${res.status}：密钥错误或已被限速），本地 posts 保持原样`); return; }
  if (!res.ok) { console.warn(`  ⚠ 刊物拉取失败（HTTP ${res.status}），本地 posts 保持原样`); return; }
  const { posts } = await res.json();
  if (!Array.isArray(posts)) { console.warn('  ⚠ 刊物返回格式异常，跳过'); return; }
  /* schema 与 server.js 一致（含期号 / slug 的部分唯一索引） */
  db.exec(`
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
  `);
  const ins = db.prepare(
    `INSERT INTO posts (id, kind, slug, issue, title, summary, content, date, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM posts');
    for (const p of posts) {
      ins.run(p.id, p.kind, p.slug || '', p.issue ?? null, p.title, p.summary || '', p.content || '',
              p.date, p.status || 'draft', p.created_at || p.date, p.updated_at || p.date);
    }
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
  const weekly = posts.filter(p => p.kind === 'weekly').length;
  const pub = posts.filter(p => p.status === 'published').length;
  console.log(`刊物已镜像：${posts.length} 篇（战报 ${weekly} / 特稿 ${posts.length - weekly}；已发布 ${pub} / 草稿 ${posts.length - pub}）`);
}

/* ---- push-image：本地图片 → 线上 uploads ---- */
async function pushImage(file) {
  if (!file) throw new Error('用法：node sync.js push-image <图片路径>');
  if (!ADMIN_KEY) throw new Error('缺少管理密钥：--key / 环境变量 UMB_ADMIN_KEY / data/remote.json 的 "adminKey"');
  const buf = fs.readFileSync(file);
  if (buf.length > 10 * 1024 * 1024) throw new Error('图片超过 10MB 上限');
  const res = await fetch(`${SITE}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
    body: JSON.stringify({ name: path.basename(file), data: buf.toString('base64') }),
  });
  const d = await res.json();
  if (!d.ok) throw new Error(`上传失败：${d.error || res.status}`);
  console.log(`已上传 → ${d.url}`);
  console.log(`完整地址：${SITE}${d.url}（录入档案时 image 字段填 ${d.url}）`);
}

/* ---- 入口 ---- */
(async () => {
  try {
    if (cmd === 'pull') await pull();
    else if (cmd === 'push-image') await pushImage(argv[1] && !argv[1].startsWith('--') ? argv[1] : '');
    else {
      console.log('UMBRELLA 4365 · 同步工具（线上库为唯一真源）');
      console.log('  node sync.js pull                    线上 → 本地：档案 + 刊物 + 补给表 + 毒株谱系镜像，引用图片');
      console.log('  node sync.js push-image <图片路径>    本地图片 → 线上 /uploads/（需密钥）');
      console.log('  可选参数：--site <url>  --key <adminKey>');
      process.exitCode = cmd ? 1 : 0;
      if (cmd) console.error(`未知命令：${cmd}`);
    }
  } catch (e) {
    console.error(`✕ ${e.message}`);
    process.exitCode = 1;
  }
})();
