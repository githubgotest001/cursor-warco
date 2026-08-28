/**
 * 从 seed.js 的 EVENTS 生成「全删全增」SQL：drafts/full-rewrite-2026-08-28.sql
 * 用法：node drafts/build-full-rewrite-sql.js
 *
 * - 条目顺序即 seed.js 中的顺序（日期升序），全删全增后 id = 时间序（1..N）；
 * - detail/summary 中的换行一律转成 char(10) 拼接，SQL 文件行尾格式（CRLF/LF）不影响入库内容；
 * - 单引号按 SQLite 规则转义。
 */
const path = require('node:path');
const fs = require('node:fs');
const { EVENTS } = require(path.join(__dirname, '..', 'seed.js'));

const q = s => String(s ?? '').replace(/'/g, "''");
const lit = s => {
  const str = String(s ?? '');
  if (!str.includes('\n')) return `'${q(str)}'`;
  return str.split('\n').map(p => `'${q(p)}'`).join('||char(10)||\n    ');
};

const main = EVENTS.filter(e => e.side === 'main').length;
const dark = EVENTS.filter(e => e.side === 'dark').length;

const lines = [];
lines.push(`-- ============================================================`);
lines.push(`-- UMBRELLA 4365 · 全量文案改版（全删全增）`);
lines.push(`-- 生成时间：${new Date().toISOString().slice(0, 10)}，由 drafts/build-full-rewrite-sql.js 从 seed.js 生成，请勿手改本文件`);
lines.push(`-- ============================================================`);
lines.push(`--`);
lines.push(`-- 内容：清空 events 表并重置自增序列，按日期升序重灌 ${EVENTS.length} 条档案`);
lines.push(`--       （正史 ${main} 条·杂志特稿体 / 野史 ${dark} 条·红后终端体，含三对「开闸/拉闸」拆分线索）。`);
lines.push(`-- 注意：全删全增会重排 id，/ev/:id 旧外链将指向新档案或 404。`);
lines.push(`--`);
lines.push(`-- ── 本机执行（PowerShell，项目根目录）─────────────────────────`);
lines.push(`--   Copy-Item data\\chronicle.db data\\chronicle.backup-rewrite.db   # 先备份`);
lines.push(`--   sqlite3 data\\chronicle.db ".read drafts/full-rewrite-2026-08-28.sql"`);
lines.push(`--`);
lines.push(`-- ── 线上执行（Linux 服务器）──────────────────────────────────`);
lines.push(`--   sqlite3 /opt/cursor-warco/data/chronicle.db ".backup '/opt/backups/chronicle-before-rewrite.db'"`);
lines.push(`--   sqlite3 /opt/cursor-warco/data/chronicle.db ".read /opt/cursor-warco/drafts/full-rewrite-2026-08-28.sql"`);
lines.push(`--   sudo systemctl restart umbrella4365`);
lines.push(`--`);
lines.push(`-- ★ 执行后务必重启服务（本地重开 node server.js / 线上 restart）：`);
lines.push(`--   首页 SSR、/ev/:id、sitemap、RSS 的缓存只在走后台 API 写入时失效，直接改库不重启会一直是旧内容。`);
lines.push(`-- 回滚：停服后用备份覆盖 data/chronicle.db（同时删除 -wal/-shm），再启动。`);
lines.push(``);
lines.push(`BEGIN TRANSACTION;`);
lines.push(``);
lines.push(`DELETE FROM events;`);
lines.push(`DELETE FROM sqlite_sequence WHERE name = 'events';`);
lines.push(``);

EVENTS.forEach((e, i) => {
  lines.push(`-- #${String(i + 1).padStart(2, '0')} [${e.side}] ${e.date} ${e.title}`);
  lines.push(`INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (`);
  lines.push(`  '${q(e.side)}', '${q(e.date)}', '${q(e.tag || '')}',`);
  lines.push(`  ${lit(e.title)},`);
  lines.push(`  ${lit(e.summary)},`);
  lines.push(`  ${lit(e.detail || '')},`);
  lines.push(`  '${q(e.image || '')}', '${q(e.series || '')}', '${q(e.source || '')}'`);
  lines.push(`);`);
  lines.push(``);
});

lines.push(`COMMIT;`);
lines.push(``);
lines.push(`-- ============================================================`);
lines.push(`-- 执行后自检（可整段复制进 sqlite3 交互执行）`);
lines.push(`-- ============================================================`);
lines.push(`-- 总数应为 ${EVENTS.length}（正史 ${main} · 野史 ${dark}）：`);
lines.push(`--   SELECT side, COUNT(*) FROM events GROUP BY side;`);
lines.push(`-- 三对开闸/拉闸线索应各 2 条：`);
lines.push(`--   SELECT series, date, title FROM events WHERE series IN ('临期锁额','Team 席位差','假焚诀') ORDER BY series, date;`);
lines.push(`-- id 应为时间序（1..${EVENTS.length}，日期升序无乱序）：`);
lines.push(`--   SELECT COUNT(*) FROM events a JOIN events b ON a.id = b.id - 1 WHERE a.date > b.date;   -- 应为 0`);
lines.push(`-- 页面验收：重启服务后，详情页「事件线索」节点可点击跳转，/ev/:id 页有红色「返回完整时间树」按钮。`);
lines.push(``);

const out = path.join(__dirname, 'full-rewrite-2026-08-28.sql');
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`已生成 ${out}`);
console.log(`共 ${EVENTS.length} 条（正史 ${main} · 野史 ${dark}）`);
