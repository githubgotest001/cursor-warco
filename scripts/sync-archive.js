#!/usr/bin/env node
/**
 * UMBRELLA 4365 · 档案同步
 *
 * 通过 HTTP API 写库，因此线上线下同一份代码，只换 --base。
 * 幂等：靠 side + date + title 三元组比对，重复执行不会产生重复档案。
 *
 * 用法
 *   node scripts/sync-archive.js --base=https://umbrella4365.com --key=<ADMIN_KEY> --dry-run
 *   node scripts/sync-archive.js --base=https://umbrella4365.com --key=<ADMIN_KEY>
 *
 * 参数
 *   --base=<url>          站点地址，默认 http://localhost:4365，也可用环境变量 WARCO_BASE
 *   --key=<key>           管理密钥，也可用环境变量 ADMIN_KEY
 *   --dry-run             只打印将要发生的改动，不写库
 *   --only=new|patch|correct|all  只跑某一类，默认 all
 *   --with-corrections    额外执行事实订正（会改动已发布的日期与文案，默认不跑）
 *   --no-color            强制关闭彩色输出（非 TTY 时自动关闭）
 */
const { NEW_EVENTS, PATCHES, CORRECTIONS } = require('./archive-data.js');

const argv = process.argv.slice(2);
const has = name => argv.includes(`--${name}`);
const val = (name, dflt) => {
  const pre = `--${name}=`;
  const hit = argv.find(a => a.startsWith(pre));
  return hit ? hit.slice(pre.length) : dflt;
};

const BASE = String(val('base', process.env.WARCO_BASE || 'http://localhost:4365')).replace(/\/+$/, '');
const KEY = String(val('key', process.env.ADMIN_KEY || ''));
const DRY = has('dry-run');
const ONLY = val('only', 'all');
const WITH_CORRECTIONS = has('with-corrections');

const FIELDS = ['side', 'date', 'tag', 'title', 'summary', 'detail', 'image', 'series', 'source'];
const keyOf = e => `${e.side}|${e.date}|${e.title}`;

/* 重定向到日志文件时不写 ANSI 转义，否则 journalctl / cron 日志里全是乱码 */
const COLOR = process.stdout.isTTY && !has('no-color') && process.env.NO_COLOR === undefined;
const paint = code => s => (COLOR ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const C = {
  dim: paint(2), red: paint(31), green: paint(32),
  yellow: paint(33), cyan: paint(36), bold: paint(1),
};

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(KEY ? { 'X-Admin-Key': KEY } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* 非 JSON 响应交给下面统一报错 */ }
  if (!res.ok || !json || json.ok === false) {
    const msg = (json && json.error) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

/* 只挑出真正会变的字段，避免无意义的 PUT 把 updated_at 刷掉 */
function diffOf(row, set) {
  const out = {};
  for (const [k, v] of Object.entries(set)) {
    if (!FIELDS.includes(k)) continue;
    if (String(row[k] ?? '') !== String(v ?? '')) out[k] = v;
  }
  return out;
}

const preview = s => {
  const t = String(s).replace(/\s+/g, ' ');
  return t.length > 58 ? t.slice(0, 57) + '…' : t;
};

async function main() {
  console.log(C.bold('\nUMBRELLA 4365 · 档案同步'));
  console.log(`  目标 ${C.cyan(BASE)}`);
  console.log(`  模式 ${DRY ? C.yellow('DRY RUN（不写库）') : C.red('实际写入')}` +
              `　范围 ${ONLY}${WITH_CORRECTIONS ? ' + 事实订正' : ''}\n`);

  if (!DRY && !KEY) {
    console.error(C.red('缺少管理密钥。用 --key=<ADMIN_KEY> 或环境变量 ADMIN_KEY 提供。'));
    process.exit(1);
  }

  let existing;
  try {
    existing = (await api('GET', '/api/events')).events;
  } catch (e) {
    console.error(C.red(`读取档案库失败：${e.message}`));
    console.error(C.dim(`确认 ${BASE} 可访问；本地请先 node server.js`));
    process.exit(1);
  }
  const index = new Map(existing.map(e => [keyOf(e), e]));
  console.log(C.dim(`档案库现有 ${existing.length} 条（正史 ${existing.filter(e => e.side === 'main').length} · 野史 ${existing.filter(e => e.side === 'dark').length}）\n`));

  const stat = { created: 0, updated: 0, skipped: 0, missing: 0, failed: 0 };

  /* ---------- 新增档案 ---------- */
  if (ONLY === 'all' || ONLY === 'new') {
    console.log(C.bold('▍新增档案'));
    for (const ev of NEW_EVENTS) {
      const label = `${ev.side === 'main' ? '正史' : '野史'} ${ev.date} ${ev.title}`;
      if (index.has(keyOf(ev))) {
        stat.skipped++;
        console.log(`  ${C.dim('已存在')} ${C.dim(label)}`);
        continue;
      }
      if (DRY) {
        stat.created++;
        console.log(`  ${C.green('将新建')} ${label}`);
        continue;
      }
      try {
        const { event } = await api('POST', '/api/events', ev);
        index.set(keyOf(event), event);
        stat.created++;
        console.log(`  ${C.green('已新建')} ${label} ${C.dim(`#${event.id}`)}`);
      } catch (e) {
        stat.failed++;
        console.log(`  ${C.red('失败')}　 ${label} ${C.red(e.message)}`);
      }
    }
    console.log('');
  }

  /* ---------- 补 source / series ---------- */
  if (ONLY === 'all' || ONLY === 'patch') {
    console.log(C.bold('▍补充信源与事件线索'));
    for (const p of PATCHES) {
      const label = `${p.match.side === 'main' ? '正史' : '野史'} ${p.match.date} ${p.match.title}`;
      const row = index.get(keyOf(p.match));
      if (!row) {
        stat.missing++;
        console.log(`  ${C.yellow('未找到')} ${label} ${C.dim('（标题或日期可能已被改动）')}`);
        continue;
      }
      const delta = diffOf(row, p.set);
      if (!Object.keys(delta).length) {
        stat.skipped++;
        console.log(`  ${C.dim('无变化')} ${C.dim(label)}${p.note ? C.dim('　※ ' + p.note) : ''}`);
        continue;
      }
      const what = Object.keys(delta).join(' + ');
      if (DRY) {
        stat.updated++;
        console.log(`  ${C.green('将补充')} ${label}　${C.cyan(what)}`);
        continue;
      }
      try {
        await api('PUT', `/api/events/${row.id}`, delta);
        stat.updated++;
        console.log(`  ${C.green('已补充')} ${label}　${C.cyan(what)}`);
      } catch (e) {
        stat.failed++;
        console.log(`  ${C.red('失败')}　 ${label} ${C.red(e.message)}`);
      }
    }
    console.log('');
  }

  /* ---------- 事实订正 ---------- */
  if (WITH_CORRECTIONS) {
    console.log(C.bold('▍事实订正') + C.dim('（改动已发布内容）'));
    for (const c of CORRECTIONS) {
      const label = `${c.match.side === 'main' ? '正史' : '野史'} ${c.match.date} ${c.match.title}`;
      let row = index.get(keyOf(c.match));
      if (!row && c.after) row = index.get(keyOf(c.after));
      if (!row) {
        stat.missing++;
        console.log(`  ${C.yellow('未找到')} ${label}`);
        continue;
      }
      const delta = diffOf(row, c.set);
      if (!Object.keys(delta).length) {
        stat.skipped++;
        console.log(`  ${C.dim('已订正')} ${C.dim(label)}`);
        continue;
      }
      console.log(`  ${DRY ? C.green('将订正') : C.green('订正中')} ${label}`);
      console.log(`      ${C.dim('理由 ' + c.why)}`);
      for (const [k, v] of Object.entries(delta)) {
        console.log(`      ${C.cyan(k.padEnd(7))} ${C.red(preview(row[k] || '（空）'))}`);
        console.log(`      ${' '.repeat(7)} ${C.green(preview(v))}`);
      }
      if (DRY) { stat.updated++; continue; }
      try {
        await api('PUT', `/api/events/${row.id}`, delta);
        stat.updated++;
      } catch (e) {
        stat.failed++;
        console.log(`      ${C.red('失败 ' + e.message)}`);
      }
    }
    console.log('');
  } else if (CORRECTIONS.length) {
    console.log(C.dim(`▍另有 ${CORRECTIONS.length} 条事实订正待处理，加 --with-corrections 查看与执行\n`));
  }

  /* ---------- 汇总 ---------- */
  console.log(C.bold('▍汇总'));
  console.log(`  新建 ${stat.created}　更新 ${stat.updated}　跳过 ${stat.skipped}　未匹配 ${stat.missing}　失败 ${stat.failed}`);
  if (stat.missing) {
    console.log(C.yellow('  未匹配的条目说明库里对应档案的 side/date/title 与脚本预期不一致，'));
    console.log(C.yellow('  多半是手动编辑过。可在后台核对后改 scripts/archive-data.js 里的 match 再跑。'));
  }
  if (DRY) console.log(C.yellow('\n  以上均未写库。确认无误后去掉 --dry-run 重跑。'));
  console.log('');
  process.exit(stat.failed ? 1 : 0);
}

main().catch(e => {
  console.error(C.red(`\n执行中断：${e.message}\n`));
  process.exit(1);
});
