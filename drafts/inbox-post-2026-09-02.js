/**
 * 把 drafts/archive-drafts-2026-09-02-b.md 的 8 条草稿投进线上收件箱（POST /api/drafts，草稿态，origin=scout）。
 * 用完即删。
 *
 *   node drafts/inbox-post-2026-09-02.js            干跑：解析并打印每条的字段摘要，不发请求
 *   node drafts/inbox-post-2026-09-02.js --apply    投递（密钥来源同 sync.js：--key / UMB_ADMIN_KEY / data/remote.json）
 *
 * 解析规则：每条草稿 = `## NN · 正史|野史 | 日期 | 标签` 标题 + ``` 围栏字段块（key: value；detail: 后为多行正文）
 * + 「核查要点：」下的 - 列表（进 verify 字段，供后台审核查看，不入正册）。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(__dirname, 'archive-drafts-2026-09-02-b.md');
const argv = process.argv.slice(2);
const argOf = f => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : ''; };
const remote = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'remote.json'), 'utf8')); } catch { return {}; } })();
const SITE = (argOf('--site') || process.env.UMB_SITE || remote.site || 'https://umbrella4365.com').replace(/\/+$/, '');
const KEY = argOf('--key') || process.env.UMB_ADMIN_KEY || remote.adminKey || '';
const APPLY = argv.includes('--apply');

const FIELD_KEYS = ['side', 'date', 'tag', 'title', 'summary', 'series', 'source', 'front', 'image'];

function parseDrafts(md) {
  const out = [];
  const re = /^## (\d+) · (正史|野史) \| (\d{4}-\d{2}-\d{2}) \| (.+?)\s*$/gm;
  const heads = [...md.matchAll(re)];
  for (let i = 0; i < heads.length; i++) {
    const start = heads[i].index;
    const end = i + 1 < heads.length ? heads[i + 1].index : md.indexOf('\n## 已消化未立档', start);
    const section = md.slice(start, end > 0 ? end : undefined);
    const fence = section.match(/```\n([\s\S]*?)\n```/);
    if (!fence) continue;
    const draft = { side: '', date: '', tag: '', title: '', summary: '', detail: '', image: '', series: '', source: '', front: '' };
    const lines = fence[1].split('\n');
    let inDetail = false;
    const detail = [];
    for (const line of lines) {
      if (inDetail) { detail.push(line); continue; }
      const m = line.match(/^([a-z]+):\s?(.*)$/);
      if (!m) continue;
      if (m[1] === 'detail') { inDetail = true; if (m[2].trim()) detail.push(m[2]); continue; }
      if (FIELD_KEYS.includes(m[1])) draft[m[1]] = m[2].trim();
    }
    draft.detail = detail.join('\n').trim();
    const vm = section.match(/核查要点：\n([\s\S]*?)(?:\n---|\n## |$)/);
    draft.verify = vm ? vm[1].trim() : '';
    draft.no = heads[i][1];
    out.push(draft);
  }
  return out;
}

const md = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const drafts = parseDrafts(md);
console.log(`解析到 ${drafts.length} 条草稿（${path.basename(FILE)}）· ${APPLY ? '投递模式' : '干跑模式'} · 目标 ${SITE}\n`);
for (const d of drafts) {
  const issues = [];
  if (!['main', 'dark'].includes(d.side)) issues.push('side');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) issues.push('date');
  if (!d.title) issues.push('title');
  if (!d.summary) issues.push('summary');
  if (!d.detail) issues.push('detail');
  console.log(`#${d.no} [${d.side}] ${d.date} · ${d.tag} · ${d.title}${d.front ? ` · front=${d.front}` : ''}${d.series ? ` · series=${d.series}` : ''}`);
  console.log(`     summary ${d.summary.length} 字 · detail ${d.detail.length} 字 · verify ${d.verify.split('\n').length} 条 · source ${d.source || '（空）'}${issues.length ? ` · ⚠ 缺 ${issues.join('/')}` : ''}`);
}

(async () => {
  if (!APPLY) { console.log('\n加 --apply 投递到收件箱。'); return; }
  if (!KEY) throw new Error('缺少管理密钥：--key / 环境变量 UMB_ADMIN_KEY / data/remote.json 的 "adminKey"');
  const headers = { 'Content-Type': 'application/json', 'X-Admin-Key': KEY };
  /* 去重：同标题的待审草稿已在收件箱则跳过（脚本可重跑） */
  const existing = await (await fetch(`${SITE}/api/drafts?state=all`, { headers })).json();
  const titles = new Set((existing.drafts || []).map(x => x.title));
  let ok = 0, skipped = 0, failed = 0;
  console.log('');
  for (const d of drafts) {
    if (titles.has(d.title)) { skipped++; console.log(`  = #${d.no} 已在收件箱，跳过 · ${d.title}`); continue; }
    const body = { side: d.side, date: d.date, tag: d.tag, title: d.title, summary: d.summary, detail: d.detail,
      image: d.image, series: d.series, source: d.source, front: d.front, verify: d.verify, origin: 'scout' };
    const r = await fetch(`${SITE}/api/drafts`, { method: 'POST', headers, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) { ok++; console.log(`  ✓ #${d.no} → 收件箱草稿 id ${j.draft.id} · ${d.title}`); }
    else { failed++; console.log(`  ✕ #${d.no} 失败 HTTP ${r.status}：${j.error || ''}`); }
  }
  const after = await (await fetch(`${SITE}/api/drafts`, { headers })).json();
  console.log(`\n投递完成：新增 ${ok} · 已存在跳过 ${skipped} · 失败 ${failed} · 收件箱当前待审 ${after.pending} 条`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error('✕', e.message); process.exitCode = 1; });
