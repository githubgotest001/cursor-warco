/**
 * UMBRELLA 4365 · 模型补给表初始数据（一次性，零依赖）
 *
 * 把作战室「模型补给表」的初始行通过 API 写入（走 API 才会触发缓存失效）。
 * 初始数据全部出自站内已查证档案（价格 = 每百万 token 输入/输出），未知处标「—」，
 * 之后的维护走后台「补给线」标签页逐行编辑。
 *
 * 用法：
 *   node tools/seed-supply.js --site http://127.0.0.1:4365 --key <ADMIN_KEY>
 *   不带参数时读 data/remote.json（同 sync.js），即写线上。
 *   目标已有补给行时中止；--force 跳过检查继续追加。
 */
const fs = require('node:fs');
const path = require('node:path');

const argv = process.argv.slice(2);
const argOf = f => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : ''; };
let remote = {};
try { remote = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'remote.json'), 'utf8')); } catch {}
const SITE = (argOf('--site') || process.env.UMB_SITE || remote.site || 'https://umbrella4365.com').replace(/\/+$/, '');
const KEY = argOf('--key') || process.env.UMB_ADMIN_KEY || remote.adminKey || '';

/* 口径出处：站内档案 A-049（Composer 2.5 定价）、A-086（Grok Bot 下放）、A-075（Grok 4.6）、
   A-061（Grok 4.5 定价）、A-052/A-060（Fable 5 与出口管制）、A-068（Opus 5）、A-060（Sonnet 5 定价）、
   A-046（GPT-5.5 定价）、A-063（GPT-5.6 家族）、A-088（OpenAI 断供通牒 11-12） */
const ROWS = [
  { model: 'Composer 2.5', provider: 'Anysphere 自研', tier: '全线 · 默认模型', price: '$0.50 / $2.50（Fast $3 / $15）', quota: '计入订阅额度', status: 'active', note: '', sort: 10 },
  { model: 'Grok Bot', provider: 'SpaceXAI', tier: 'Pro / Pro+ / Ultra / Teams', price: '随订阅', quota: '独立周池 · 8.27 起付费全线每周重置', status: 'active', note: '', sort: 20 },
  { model: 'Grok 4.6', provider: 'SpaceXAI', tier: '全线', price: '—', quota: '计入订阅额度 · 新增 Extra High 算力档', status: 'active', note: '交割前最后一次联名发布', sort: 30 },
  { model: 'Grok 4.5', provider: 'SpaceXAI', tier: '全线', price: '$2 / $6（Fast $4 / $18）', quota: '计入订阅额度', status: 'active', note: '联合训练第一枪', sort: 40 },
  { model: 'Fable 5', provider: 'Anthropic', tier: '全线', price: '—', quota: '计入订阅额度', status: 'active', note: '6 月曾因出口管制停供 19 天', sort: 50 },
  { model: 'Opus 5', provider: 'Anthropic', tier: '全线', price: '$5 / $25 · 2M 上下文', quota: '计入订阅额度', status: 'active', note: '', sort: 60 },
  { model: 'Sonnet 5', provider: 'Anthropic', tier: '全线', price: '$3 / $15', quota: '计入订阅额度', status: 'active', note: '介绍价 $2/$10 已于 7.31 结束', sort: 70 },
  { model: 'GPT-5.6（Sol / Terra / Luna）', provider: 'OpenAI', tier: '全线', price: '—', quota: '计入订阅额度', status: 'watch', note: '断供通牒：2026-11-12 起停止供应', sort: 80 },
  { model: 'GPT-5.5', provider: 'OpenAI', tier: '全线', price: '$5 / $30 · 1M 上下文', quota: '计入订阅额度', status: 'watch', note: '断供通牒：2026-11-12 起停止供应', sort: 90 },
];

(async () => {
  if (!KEY) { console.error('缺少管理密钥：--key / UMB_ADMIN_KEY / data/remote.json'); process.exitCode = 1; return; }
  const existing = await (await fetch(`${SITE}/api/supply`)).json();
  if ((existing.supply || []).length && !argv.includes('--force')) {
    console.error(`目标已有 ${existing.supply.length} 行补给，中止（要追加请加 --force）`);
    process.exitCode = 1;
    return;
  }
  let ok = 0;
  for (const row of ROWS) {
    const r = await fetch(`${SITE}/api/supply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': KEY },
      body: JSON.stringify(row),
    });
    const d = await r.json();
    if (d.ok) { ok++; console.log(`+ ${row.model}`); }
    else console.error(`✕ ${row.model}: ${d.error || r.status}`);
  }
  console.log(`完成：${ok}/${ROWS.length} 行 → ${SITE}/warroom`);
})();
