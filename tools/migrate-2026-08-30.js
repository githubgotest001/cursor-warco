/**
 * UMBRELLA 4365 · 一次性迁移脚本（2026-08-30 情报站升级）
 *
 * 内容：
 *   1. events 表新增 front 列（战区：'' = Cursor 主战线，其余见 server.js 的 FRONTS）
 *   2. 建四张新表：posts（刊物：战报/特稿）、drafts（草稿收件箱）、tips（读者线报）、supply（模型补给表）
 *
 * 用法（幂等，可重复执行）：
 *   本地开发机：node tools/migrate-2026-08-30.js
 *   线上服务器：cd /opt/cursor-warco && sudo -u umbrella node tools/migrate-2026-08-30.js
 *              （执行前先备份：sudo /opt/cursor-warco/backup.sh；执行后 systemctl restart umbrella4365）
 *
 * 纪律说明：schema 以 server.js 初始化建表为准、不做运行时自动迁移（PROJECT_BIBLE 第 13 条），
 * 已存在的库改结构一律走这类一次性脚本；新表的 CREATE 语句与 server.js 保持逐字一致。
 */
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, '..', 'data', 'chronicle.db');
const db = new DatabaseSync(DB_PATH);

const done = [];

/* 1. events.front */
const cols = db.prepare('PRAGMA table_info(events)').all().map(c => c.name);
if (!cols.includes('front')) {
  db.exec(`ALTER TABLE events ADD COLUMN front TEXT NOT NULL DEFAULT ''`);
  done.push('events.front 列已添加');
} else {
  done.push('events.front 已存在，跳过');
}

/* 2. 新表（与 server.js 初始化 DDL 逐字一致） */
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

  CREATE TABLE IF NOT EXISTS tips (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    content    TEXT NOT NULL,
    contact    TEXT NOT NULL DEFAULT '',
    url        TEXT NOT NULL DEFAULT '',
    ip_hash    TEXT NOT NULL DEFAULT '',
    state      TEXT NOT NULL DEFAULT 'new' CHECK(state IN ('new','read')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

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
done.push('posts / drafts / tips / supply 表已就绪');

console.log('迁移完成：');
for (const d of done) console.log('  - ' + d);
console.log('提醒：正在运行的服务不会感知直接改库，须重启（本地重跑 node server.js；线上 systemctl restart umbrella4365）。');
