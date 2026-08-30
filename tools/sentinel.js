/**
 * UMBRELLA 4365 · 信源哨兵（零依赖，Node ≥ 22.13）
 *
 * 职责：轮询已验证信源清单（warco-scout/references/sources.md 的 L0/L2/L3 + 扩战区信源），
 * 与上次快照 diff 出「新信号」，落入侦察队列并（可选）推送 Telegram 提醒站长。
 * 哨兵只发现、不判断、不写档案——判断与成稿交给 warco-scout，录入永远由站长审核。
 *
 * 用法：
 *   node tools/sentinel.js            跑一轮（首次运行只建基线不报警，之后每轮报新增）
 *   node tools/sentinel.js --list     列出全部信源
 *   node tools/sentinel.js --reset    清空全部基线（下一轮重新建立）
 *
 * 产物：
 *   data/sentinel-state.json   各信源已见条目快照（自动维护）
 *   data/sentinel-queue.md     新信号队列（追加式，供 warco-scout 增量侦察时对照消化）
 *
 * Telegram 提醒（可选）：环境变量 TG_BOT_TOKEN + TG_CHAT_ID，
 * 或 data/sentinel.json 写 { "tgBotToken": "…", "tgChatId": "…" }。未配置则只落队列。
 *
 * 定时（示例；cron 写 0-23/2 等价于每 2 小时，避免注释里出现星杠）：
 *   Linux 服务器：0 0-23/2 * * * cd /opt/cursor-warco && node tools/sentinel.js >> /var/log/umb-sentinel.log 2>&1
 *   Windows 开发机：schtasks /create /tn umb-sentinel /sc hourly /mo 2 /tr "node d:\github_code\cursor-warco\tools\sentinel.js"
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const STATE_PATH = path.join(DATA_DIR, 'sentinel-state.json');
const QUEUE_PATH = path.join(DATA_DIR, 'sentinel-queue.md');
const CONF_PATH = path.join(DATA_DIR, 'sentinel.json');

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; umbrella4365-sentinel/1.0; +https://umbrella4365.com)' };
const SEEN_CAP = 300;

/* ---- 通用抓取 ---- */
async function get(url, asJson) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000), redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return asJson ? r.json() : r.text();
}

/* HTML 里按路径前缀提取站内链接：/blog/xxx 之类（去锚点、去重、保序） */
function htmlLinks(html, base, pathPrefix, titleFallback) {
  const out = [];
  const seen = new Set();
  const re = new RegExp(`href="(${pathPrefix.replace(/\//g, '\\/')}[a-zA-Z0-9._/-]+)"`, 'g');
  let m;
  while ((m = re.exec(html))) {
    const p = m[1].split('#')[0].replace(/\/+$/, '');
    if (!p || seen.has(p)) continue;
    seen.add(p);
    out.push({ id: p, title: `${titleFallback} ${p.split('/').pop()}`, url: base + p });
  }
  return out.slice(0, 30);
}

/* RSS/Atom 极简解析（零依赖，正则级；只取 title + link） */
function rssItems(xml) {
  const out = [];
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/g) || [];
  for (const b of blocks.slice(0, 30)) {
    const title = (b.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
    const link = (b.match(/<link[^>]*href="([^"]+)"/) || b.match(/<link[^>]*>([^<]+)<\/link>/) || [])[1] || '';
    if (title && link) out.push({ id: link.trim(), title: title.trim().replace(/\s+/g, ' ').slice(0, 140), url: link.trim() });
  }
  return out;
}

/* ---- 信源清单（key 用于状态存储；tolerant——单源失败不影响整轮） ---- */
const SOURCES = [
  { key: 'cursor-blog', name: 'Cursor Blog（L0）', async items() {
    return htmlLinks(await get('https://cursor.com/blog'), 'https://cursor.com', '/blog/', 'Blog');
  } },
  { key: 'cursor-changelog', name: 'Cursor Changelog（L0）', async items() {
    return htmlLinks(await get('https://cursor.com/changelog'), 'https://cursor.com', '/changelog/', 'Changelog');
  } },
  { key: 'cursor-status', name: 'Cursor Status 事故（L0）', async items() {
    const j = await get('https://status.cursor.com/api/v2/incidents.json', true);
    return (j.incidents || []).slice(0, 15).map(i => ({
      id: i.id, title: `[${i.impact}] ${i.name}（${String(i.created_at).slice(0, 10)}）`, url: i.shortlink || 'https://status.cursor.com',
    }));
  } },
  { key: 'cursor-forum-ann', name: 'Cursor 论坛公告区（L0）', async items() {
    let j;
    try { j = await get('https://forum.cursor.com/c/announcements.json', true); }
    catch { j = await get('https://forum.cursor.com/latest.json', true); }
    const topics = (j.topic_list && j.topic_list.topics) || [];
    return topics.slice(0, 20).map(t => ({
      id: 'topic-' + t.id, title: t.title, url: `https://forum.cursor.com/t/${t.slug}/${t.id}`,
    }));
  } },
  { key: 'xai-news', name: 'SpaceXAI 新闻（L0）', async items() {
    return htmlLinks(await get('https://x.ai/news'), 'https://x.ai', '/news/', 'x.ai');
  } },
  { key: 'anthropic-news', name: 'Anthropic 新闻（L0 · 模型厂商战区）', async items() {
    return htmlLinks(await get('https://www.anthropic.com/news'), 'https://www.anthropic.com', '/news/', 'Anthropic');
  } },
  { key: 'openai-news', name: 'OpenAI 新闻（L0 · Codex 战区）', async items() {
    const html = await get('https://openai.com/news/');
    return [...htmlLinks(html, 'https://openai.com', '/index/', 'OpenAI'), ...htmlLinks(html, 'https://openai.com', '/blog/', 'OpenAI')];
  } },
  { key: 'github-changelog', name: 'GitHub Changelog · Copilot（Copilot 战区）', async items() {
    return rssItems(await get('https://github.blog/changelog/feed/')).filter(i => /copilot/i.test(i.title));
  } },
  { key: 'hn-cursor', name: 'Hacker News · cursor ≥30 分（L2）', async items() {
    const j = await get('https://hn.algolia.com/api/v1/search?query=cursor&tags=story&numericFilters=points%3E%3D30&hitsPerPage=15', true);
    return (j.hits || []).map(h => ({
      id: 'hn-' + h.objectID, title: `[${h.points}pts] ${h.title}`, url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    }));
  } },
  { key: 'hn-aicoding', name: 'Hacker News · AI 编程圈 ≥80 分（L2 · 扩战区）', async items() {
    /* Algolia 不支持 OR 语法：分两次查询后合并（claude code / windsurf） */
    const qs = ['%22claude%20code%22', 'windsurf'];
    const out = [];
    for (const q of qs) {
      const j = await get(`https://hn.algolia.com/api/v1/search?query=${q}&tags=story&numericFilters=points%3E%3D80&hitsPerPage=8`, true);
      for (const h of j.hits || []) out.push({ id: 'hn-' + h.objectID, title: `[${h.points}pts] ${h.title}`, url: `https://news.ycombinator.com/item?id=${h.objectID}` });
    }
    return out;
  } },
  { key: 'reddit-cursor', name: 'r/cursor 热帖 ≥80 分（L2）', async items() {
    let j;
    try { j = await get('https://www.reddit.com/r/cursor/hot.json?limit=25', true); }
    catch { j = await get('https://old.reddit.com/r/cursor/hot.json?limit=25', true); }
    return ((j.data && j.data.children) || [])
      .map(c => c.data)
      .filter(d => d && !d.stickied && d.score >= 80)
      .map(d => ({ id: d.id, title: `[${d.score}pts] ${d.title}`.slice(0, 140), url: 'https://www.reddit.com' + d.permalink }));
  } },
];

/* ---- 状态 ---- */
function readJSONFile(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function nowStr() {
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---- Telegram 提醒（可选） ---- */
async function tgNotify(text) {
  const conf = readJSONFile(CONF_PATH, {});
  const token = process.env.TG_BOT_TOKEN || conf.tgBotToken || '';
  const chat = process.env.TG_CHAT_ID || conf.tgChatId || '';
  if (!token || !chat) return false;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3900), disable_web_page_preview: true }),
    });
    return true;
  } catch (e) {
    console.warn(`  ⚠ TG 提醒失败：${e.message}`);
    return false;
  }
}

/* ---- 主流程 ---- */
(async () => {
  const argv = process.argv.slice(2);
  if (argv.includes('--list')) {
    for (const s of SOURCES) console.log(`${s.key.padEnd(18)} ${s.name}`);
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (argv.includes('--reset')) {
    try { fs.unlinkSync(STATE_PATH); } catch {}
    console.log('基线已清空，下一轮重新建立。');
    return;
  }

  const state = readJSONFile(STATE_PATH, {});
  const fresh = [];   // { source, title, url }
  let baselined = 0, failed = 0;

  for (const s of SOURCES) {
    try {
      const items = await s.items();
      if (!items.length) { console.log(`- ${s.key}: 0 条（页面结构变了？）`); continue; }
      const entry = state[s.key];
      if (!entry) {
        state[s.key] = { seen: items.map(i => i.id).slice(0, SEEN_CAP), updatedAt: nowStr() };
        baselined++;
        console.log(`- ${s.key}: 首次运行，建立基线 ${items.length} 条`);
        continue;
      }
      const seen = new Set(entry.seen);
      const news = items.filter(i => !seen.has(i.id));
      for (const n of news) fresh.push({ source: s.name, title: n.title, url: n.url });
      state[s.key] = { seen: [...items.map(i => i.id), ...entry.seen].slice(0, SEEN_CAP), updatedAt: nowStr() };
      console.log(`- ${s.key}: ${items.length} 条 · 新增 ${news.length}`);
    } catch (e) {
      failed++;
      console.warn(`- ${s.key}: ✕ ${e.message}（单源失败不影响整轮）`);
    }
  }

  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

  if (fresh.length) {
    const block = [
      `## ${nowStr()} · 新信号 ${fresh.length} 条`,
      '',
      ...fresh.map(f => `- 【${f.source}】${f.title}\n  ${f.url}`),
      '',
    ].join('\n');
    fs.appendFileSync(QUEUE_PATH, (fs.existsSync(QUEUE_PATH) ? '\n' : `# 哨兵侦察队列（sentinel 自动追加 · scout 消化后可清理旧段落）\n\n`) + block);
    console.log(`\n★ 新信号 ${fresh.length} 条 → ${QUEUE_PATH}`);
    const sent = await tgNotify([`🔺 UMBRELLA 4365 哨兵 · 新信号 ${fresh.length} 条`, '', ...fresh.slice(0, 15).map(f => `· ${f.title}\n${f.url}`)].join('\n'));
    console.log(sent ? '  TG 提醒已发送' : '  （TG 未配置，仅落队列）');
  } else {
    console.log(`\n无新信号${baselined ? `（${baselined} 个信源建立基线）` : ''}${failed ? ` · ${failed} 个信源失败` : ''}`);
  }
})();
