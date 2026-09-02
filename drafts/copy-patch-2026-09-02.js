/**
 * UMBRELLA 4365 · 档案文案补丁 2026-09-02（用完即删）
 *
 * 全库 112 条通读后的修订清单，只改文本字段与线索归属，不增删档案、不改 id、不改日期：
 *   1. 空详情补写：#70（Claude 大面积报错）、#79（GitHub 连锁停摆）两条正史 detail 为空、无信源
 *   2. 线索补挂：#12/#34 试用续杯（检出→灭活）、#15/#16/#58 edu 通道（检出→变异→灭活）——
 *      三年跨度的两条公开套利窗口此前是孤条，补挂后自动进作战室「最近灭活」与 /d/windows 全史表
 *   3. 行文纪律清理：#12、#67 残留「见 YYYY-MM-DD 档案」式文字引用；#20、#67 系统备注里的线索自指
 *   4. 口径修正：#105 记录时间与档案日期不一致；#57、#65 带写作时点的「直到 8 月底」「至今」；
 *      #16「上线一周」与两条档案日期相距一日的矛盾；#25 野史里混入记者人声；#77 特稿收尾的新闻台腔
 *   5. 战区补标：#101 Devin 首秀 → devin，#22 Replit 删库 → replit（需 server.js FRONTS 已登记）
 *   6. 长摘要收紧：#47、#99、#103、#28（>125 字）
 *
 * 用法（项目根目录）：
 *   node drafts/copy-patch-2026-09-02.js            干跑：对照本地镜像（先 node sync.js pull）打印逐字段 diff
 *   node drafts/copy-patch-2026-09-02.js --apply    应用：先 POST /api/system/backup 在线备份，再逐条 PUT 线上
 *   可选：--site <url> --key <adminKey>（默认读 data/remote.json，同 sync.js）
 */
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const argOf = f => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : ''; };
const remote = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'remote.json'), 'utf8')); } catch { return {}; } })();
const SITE = (argOf('--site') || process.env.UMB_SITE || remote.site || 'https://umbrella4365.com').replace(/\/+$/, '');
const KEY = argOf('--key') || process.env.UMB_ADMIN_KEY || remote.adminKey || '';
const APPLY = argv.includes('--apply');

const STATUS_HISTORY = 'https://status.cursor.com/history';

/* ---------- 补丁清单：id → 变更字段（未列字段保持线上原值） ---------- */
const PATCHES = [
  /* 1. 空详情补写 */
  {
    id: 70, why: '正史 detail 为空、无信源',
    fields: {
      source: STATUS_HISTORY,
      detail: `7 月 29 日，Cursor 状态页挂出 critical 级事件：Anthropic 的 Claude 系模型大面积报错，IDE 内的请求成批失败。官方通报没有多余解释，处置措施只有一条——请用户前往 status.claude.com 查看上游状态。故障源在墙外，Cursor 能做的是转发一个链接。

依赖结构在这一天暴露得最彻底。数日前 Opus 5 刚刚发布，Anthropic 在 Cursor 的模型选择器里排出 Fable 5、Opus 5、Sonnet 5 的完整梯队；同一时期的企业账单数据显示，这家供应商已经控制了 AI 编程品类一半的开支。主力越集中，上游一处波动就是下游的全量事故——而作为编排层，Cursor 对上游的可用性没有任何处置权。

编排层的可用性，从来等于它全部上游可用性的乘积。这一天，乘数里最大的一项掉线。`,
    },
  },
  {
    id: 79, why: '正史 detail 为空、无信源',
    fields: {
      source: STATUS_HISTORY,
      detail: `8 月 17 日（周一），GitHub 全球范围降级：PR、issues 与 API 错误率接近 20%，归档与源文件下载接近 50%，企业 SSO 的 SAML、OIDC、SCIM 与 Team Sync 全线失败，Copilot 一并不可用，前后持续 6 小时 42 分。Cursor 状态页同步挂出事件：Automations、Cloud Agents、Codebase 索引与 Review Agents 均依赖 GitHub 接口，连锁停摆约六小时——盛夏故障潮里持续最长的一次。

依赖链的形状由此清晰。云端 agent 从拉取仓库到开出 PR 的每一步都经过 GitHub；Bugbot 评审的对象是 GitHub 上的 PR，Automations 监听的触发源多半也是 GitHub 事件。上游一停，「永不下班的 agent」集体下班。背景数据让这一天不显得意外：过去一年 GitHub 录得 257 起事故、48 起重大，Actions 一家占 57 起；这是它十五天内第七次登上状态页。GitHub 自家 CTO 承认过，平台不是按今天的规模建的。

同一天上午，Cursor 刚刚向付费用户推送自家代码托管 Origin 的早期 beta，官方给出的理由之一正是「为 agent 规模而生」。故障发生的时间点，替公告完成了论证。`,
    },
  },
  { id: 71, why: '状态页数据立骨的正史，补信源', fields: { source: STATUS_HISTORY } },

  /* 2. 线索补挂：试用续杯（检出 → 灭活） */
  {
    id: 12, why: '孤条改挂线索 + 检出格式标题 + 清理「见 2026-01-14 档案」文字引用',
    fields: {
      title: '试用续杯·检出：重置指纹无限新号',
      series: '试用续杯',
      detail: `记录时间 2025 年上半年，爆发点取可考的传播峰值。工具原理：一键重置 machineId 等设备指纹，配合临时邮箱与接码平台无限注册新号，Pro 试用无限续杯。传播数据：相关仓库星标数以万计，中文教程在各封闭频道病毒式流传。

攻防同步升级：检测加严、指纹维度增加、注册风控收紧；工具侧随之迭代。双方版本号交替上升，形态为标准猫鼠游戏。

系统备注：本系统仅存档现象，不提供任何链接。检测与绕过的版本号还会交替很久；终结这类玩法的，通常不是更强的检测。后续变更将另行立档。`,
    },
  },
  {
    id: 34, why: '孤条改挂线索 + 灭活格式标题 + tag 固定为灭活',
    fields: { title: '试用续杯·灭活：7 天试用整体移除', tag: '灭活', series: '试用续杯' },
  },

  /* 2. 线索补挂：edu 通道（检出 → 变异 → 灭活） */
  {
    id: 15, why: '孤条改挂线索 + 检出格式标题',
    fields: { title: 'edu 通道·检出：学生免费一年 Pro', series: 'edu 通道' },
  },
  {
    id: 16, why: '孤条改挂线索 + 变异节点标题；「上线一周」与 05-07/05-08 两条日期相距一日矛盾，改「数日」',
    fields: {
      title: 'edu 通道·变异：验证收紧，资格复查',
      series: 'edu 通道',
      summary: '现象：滥用规模远超预期，活动上线数日即紧急收紧——审核趋严、限定北美教育域名、一批已发资格被复查取消。中文社区一夜之间从套利攻略切换为维权控诉。系统备注：官方口径前后矛盾，均已存档。',
      detail: `记录时间 2025-05-08。学生活动上线数日内滥用规模失控，Cursor 紧急收紧验证：审核趋严、限制主要面向北美教育域名、一批已通过的资格被复查取消。官方说明帖写道：已识别出一批绕过国别限制的用户并移除其 Pro 权限；10 日起陆续有人收到折扣将于 5 月 11 日终止的邮件。误伤样本：一批老实验证的真学生。

口径矛盾记录：同一份 FAQ 里，一边说已移除滥用者权限，一边说「此时决定不撤销任何计划、改为要求重新认证」——而撤销邮件确实发出去了。两种表述均已存档。

系统备注：官方后来为本通道撰写的结案词只有一句：该计划已成为欺诈者的目标。`,
    },
  },
  {
    id: 58, why: '孤条改挂线索 + 灭活格式标题 + tag 固定为灭活 + 去掉与线索时间线重复的日期回放',
    fields: {
      title: 'edu 通道·灭活：结案陈词',
      tag: '灭活',
      series: 'edu 通道',
      detail: `记录时间 2026-06-25。Cursor 官方帮助文档更新：旧版学生折扣停止接受新申请，原文写道——「该计划已成为欺诈者的目标，也阻碍了 Cursor 惠及全球学生。」已领取者可用到期；此后本科生转为校园活动发放额度，研究生与教育工作者走表单申请。

从官宣到焊死，这条通道走完了公开套利窗口的标准三段：放开、收紧、关闭。中间那段最长——官方用它确认了滥用不是偶发，而是常态。

系统备注：屠龙者未必成为恶龙，但本样本坐实了那句场外定论——「薅羊毛的人，薅死了羊」。通道关闭原因已由官方一句话盖章，本系统无需补充。`,
    },
  },

  /* 3. 行文纪律清理 */
  {
    id: 20, why: '系统备注里的线索自指（「本条为…首个节点」）改为叙事收束',
    fields: {
      detail: `记录时间 2025-06-16。Cursor 调整 Pro 定价：原「每月 500 次快速请求 + 无限慢速」改为「每月 20 美元额度按 API 费率计费」。直接后果：重度使用 Claude 最新模型的用户，几轮对话即可烧光整月额度；未设置支出上限的用户被意外扣费。

社区怒火持续三周。7 月 4 日，CEO Michael Truell 发博道歉：「我们没有处理好这次调整」，承诺为 6 月 16 日至 7 月 4 日期间的意外扣费全额退款。

系统备注：此后每一次计费口径变更，社区的第一反应都是回放本次事件。信任的折旧速度，快于额度。`,
    },
  },
  {
    id: 67, why: '清理「与 2025-06-16 档案对照阅读」文字引用',
    fields: {
      detail: `记录时间 2026-07-23。论坛用户 shuvo 的长帖被顶起：历史上 Auto 意味着可预测的、便宜的固定费率，不用管背后跑的是谁；以旧认知继续使用，是显著的财务风险。他的账号被迁到 Auto Balance，随即开始按前沿模型费率从 API 额度扣钱。他的建议很实在：把新的 Cost 档直接别名成大家熟悉的那个 Auto，别让所有人重建心智模型。他还预言了一句：这大概会招来一大堆投诉。

官方随后把计费口径讲清楚：Auto Cost 走第一方额度，Auto Intelligence 与 Auto Balance 按选中模型所属的池子计费，并且能看到实际选了哪个。另一重火力来自可用范围——功能只对 Teams 与 Enterprise 开放。有用户开火：公告里压根没提只有团队版能用，挺专业的。官方回：博客、更新日志、文档和这个帖子里都写了。也有人给了不带火气的建议：那就把「仅限团队与企业版」写进标题，别放在正文最后一行。

系统备注：一个默认值的改动，比一次明码涨价更容易伤人——它不需要用户点同意。上一次账单口径变更引发的怒火，本系统仍有存档；这一次，连横幅都省了。`,
    },
  },

  /* 4. 口径修正 */
  {
    id: 105, why: '档案日期 08-15，detail 却写「记录时间 2026-09-01 前后」',
    fields: {
      detail: `记录时间 2026-08-15 前后。封闭频道里的复测口径收束：Pro 及以上到期自动开出下月计划、卡空扣不上的那条路径还在；变的是后面那截。未扣成的订阅不再按日活着，场外计时收到约一小时。按「付费尾巴加七日」报价的货，当天重新计价。

修补方式解析：无通报。Stripe 侧仍可能按原重试表继续尝试扣款；产品侧放行付费权益的闸，提前落到第一次失败附近。两件事再次被拆开——账本可以继续催，钥匙先收回。已知：帮助页依然不写时长。传闻：有的号一小时内掉档，有的稍长，窗口不再按日卖。推论：套利计划跟着这道闸的刻度走，不跟着 Stripe 的重试表走。

系统备注：催收可以按周重试。编辑器按小时算工位。`,
    },
  },
  {
    id: 57, why: '「直到 8 月底仍未露面」带写作时点，随时间过期',
    fields: {
      detail: `6 月 16 日，旧金山，首届 Compile 大会三箭齐发。第一箭 Origin：为 agent 规模而生的 git 托管，NVMe 文件服务器加 S3 作真源，AI 自动解合并冲突，目标全球同步延迟低于 400 毫秒——现场演示模拟数千个 agent 同时读写一个仓库，宣称秋季 GA（后来提前开了 beta）。第二箭 Cursor Mobile：iOS TestFlight 公测，管理 agent、疏通卡住的任务、评审截图（6 月 29 日全量公测）。第三箭最重：Truell 官宣正在 Colossus 十万余张 GPU 上从零预训练 1.5 万亿参数级前沿模型——不再依赖任何开源底座，算力是此前所有 Cursor 模型的 10 到 20 倍，剑指编码之外的通用知识工作，「数周内发布」。

同一个下午，SpaceX 确认行使 600 亿美元收购权。主讲 Origin 的是联创 Tomas Reimers——Graphite 的创始人，去年 12 月那笔收购的用意就此揭晓。

余味留档：那个「数周内发布」的模型，此后数月未见正式露面；夏天泄露的「Vega」是不是它，无人确认。发布会的日历与交付的日历，从来不是同一本。`,
    },
  },
  {
    id: 65, why: '摘要「官方至今一言未发」带写作时点',
    fields: {
      summary: '情报：开发者 Lumina 晒出泄露 checkpoint，Cursor 疑似以代号 Vega 内测下一代模型——六个变体、四档推理，传闻对标 Opus 5 与 Sol、价格五分之一。官方未认领一字。全部按传闻处理。',
    },
  },
  {
    id: 25, why: '野史红后体里混入「本刊记者潜伏」的记者人声',
    fields: {
      detail: `记录时间 2025 年夏，样本采自多个封闭频道与场外平台。产业形态：「车头」批量注册或收购 Pro 账号，按「车位」出售，月价十余元人民币；上游另有商家倒卖 API 中转额度。

风险结构：风控扫荡时一封一大片，「车友」维权无门，「车头」换个马甲继续「发车」。损失由链条末端承担，利润向上游集中——与多数灰产同构。

系统备注：有需求就有市场，有市场就有风控，有风控就有下一代绕过方案。该循环无需外部输入即可自我维持，本系统仅记录其转速。`,
    },
  },
  {
    id: 77, why: '特稿体收尾「本刊继续跟踪报道」是新闻台腔，换冷收束',
    fields: {
      detail: `2026 年 8 月 14 日，合并正式生效。SEC 文件显示 SpaceX 增发约 3.893 亿股 A 类普通股作为对价，Anysphere 成为其全资子公司，团队并入 SpaceX 的 AI 软件部门。

从 4 月 21 日的选择权，到 6 月 16 日的签约，再到 8 月 14 日的交割，整个流程走了不到四个月。四年前那个被嘲「套壳」的 VS Code 分叉，以 600 亿美元的身价随火箭入列。从这一天起，它的增长曲线不再单独定价，而是并入一家上市公司的财报。`,
    },
  },

  /* 5. 战区补标 */
  { id: 101, why: '主角是 Cognition / Devin，不是 Cursor，应打战区徽标', fields: { front: 'devin' } },
  { id: 22, why: '主角是 Replit（detail 自述「事故主体并非 Cursor」），应打战区徽标', fields: { front: 'replit' } },

  /* 6. 长摘要收紧（>125 字） */
  {
    id: 47, why: '摘要 139 字，收紧；「三个月前」改模糊',
    fields: { summary: 'Anthropic 官宣包下 SpaceX Colossus 1 数据中心全部容量：超 300 兆瓦、逾 22 万张 NVIDIA GPU 当月到位；Claude Code 五小时限额全线翻倍，Pro 与 Max 取消高峰限流。数月前，马斯克还在公开批评这家公司。' },
  },
  {
    id: 99, why: '摘要 132 字，收紧',
    fields: { summary: '「iPadOS 会再回来」兑现：Cursor 登陆 iPad，全部付费档可用——云 agent 指挥、完整 PR 评审、收件箱、Apple Pencil 圈图批注。开发者媒体的定位：主流编码 agent 里第一个全功能平板端。' },
  },
  {
    id: 103, why: '摘要 131 字，收紧',
    fields: { summary: 'Anthropic 开发者账号官宣：9 月 14 日起 Claude Code 标准周限永久上调 25%，覆盖 Pro、Max、Team 与按席位企业档；此前的 50% 临时加码同时到期。相对用户此刻的水平，官方自己换算成约 17% 下调。同一条公告，两套分母。' },
  },
  {
    id: 28, why: '摘要 129 字，收紧',
    fields: { summary: '情报：据 The Information，Anysphere 内部考虑过将用户编码行为数据出售或授权给模型厂商，名单含 OpenAI、xAI 与 Anthropic。核查：隐私政策管住的是「训练」，不是「出售」。系统备注：金矿不响，估值先应。' },
  },
];

/* ---------- 干跑：对照本地镜像打印 diff ---------- */
const FIELDS = ['side', 'date', 'tag', 'title', 'summary', 'detail', 'image', 'series', 'source', 'front'];
function loadLocal() {
  const db = new DatabaseSync(path.join(ROOT, 'data', 'chronicle.db'), { readOnly: true });
  const map = new Map();
  for (const r of db.prepare('SELECT * FROM events').all()) map.set(r.id, r);
  return map;
}
function shortDiff(a, b) {
  a = String(a ?? ''); b = String(b ?? '');
  const one = s => s.replace(/\s+/g, ' ');
  if (a.length + b.length < 240) return `\n      - ${one(a)}\n      + ${one(b)}`;
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const ctx = 30;
  return `\n      - …${one(a.slice(Math.max(0, i - ctx), i + 110))}…\n      + …${one(b.slice(Math.max(0, i - ctx), i + 110))}…`;
}
function dryRun() {
  const local = loadLocal();
  let changed = 0, noop = 0;
  for (const p of PATCHES) {
    const row = local.get(p.id);
    if (!row) { console.log(`#${p.id}  ⚠ 本地镜像里不存在（先 node sync.js pull）`); continue; }
    const diffs = Object.entries(p.fields).filter(([k, v]) => String(row[k] ?? '') !== String(v));
    if (!diffs.length) { noop++; console.log(`#${p.id}  = 已是目标值（跳过）· ${row.title}`); continue; }
    changed++;
    console.log(`#${p.id}  [${row.side}] ${row.date} · ${row.title}\n    why: ${p.why}`);
    for (const [k, v] of diffs) console.log(`    ${k}:${shortDiff(row[k], v)}`);
  }
  console.log(`\n共 ${PATCHES.length} 条补丁：${changed} 条有变更，${noop} 条已同步。${APPLY ? '' : '加 --apply 应用到线上（会先在线备份）。'}`);
  return changed;
}

/* ---------- 应用：在线备份 → 逐条 PUT ---------- */
async function apply() {
  if (!KEY) throw new Error('缺少管理密钥：--key / 环境变量 UMB_ADMIN_KEY / data/remote.json 的 "adminKey"');
  const headers = { 'Content-Type': 'application/json', 'X-Admin-Key': KEY };
  console.log(`\n→ 在线备份 ${SITE}/api/system/backup`);
  const bk = await (await fetch(`${SITE}/api/system/backup`, { method: 'POST', headers })).json();
  if (!bk.ok) throw new Error(`备份失败，中止：${bk.error || JSON.stringify(bk)}`);
  console.log(`  ✓ ${bk.file}（${bk.sizeMb} MB，保留 ${bk.kept} 份）`);

  /* 战区代号要先在线上 server.js 的 FRONTS 登记（部署后生效），否则 PUT 会被 validateEvent 拒绝——
     未登记的先跳过并提示，部署后重跑本脚本即可（已同步的条目会自动跳过） */
  const meta = await (await fetch(`${SITE}/api/meta`)).json();
  const remoteFronts = new Set(Object.keys((meta && meta.fronts) || {}));

  let ok = 0, skipped = 0, failed = 0, deferred = 0;
  for (const p of PATCHES) {
    if (p.fields.front && !remoteFronts.has(p.fields.front)) {
      deferred++;
      console.log(`  ○ #${p.id} 战区代号 ${p.fields.front} 线上尚未登记（需先部署新 server.js），本次跳过，部署后重跑`);
      continue;
    }
    const cur = await (await fetch(`${SITE}/api/events/${p.id}`)).json();
    if (!cur.ok) { failed++; console.log(`  ✕ #${p.id} 线上不存在：${cur.error}`); continue; }
    const diffs = Object.keys(p.fields).filter(k => String(cur.event[k] ?? '') !== String(p.fields[k]));
    if (!diffs.length) { skipped++; console.log(`  = #${p.id} 已同步`); continue; }
    const res = await fetch(`${SITE}/api/events/${p.id}`, { method: 'PUT', headers, body: JSON.stringify(p.fields) });
    const d = await res.json();
    if (d.ok) { ok++; console.log(`  ✓ #${p.id} 已更新 [${diffs.join(', ')}] · ${d.event.title}`); }
    else { failed++; console.log(`  ✕ #${p.id} 失败：${d.error || res.status}`); }
  }
  console.log(`\n应用完成：更新 ${ok} · 已同步跳过 ${skipped} · 待部署后重跑 ${deferred} · 失败 ${failed}。随后请 node sync.js pull 刷新本地镜像。`);
  if (failed) process.exitCode = 1;
}

(async () => {
  try {
    console.log(`UMBRELLA 4365 · 文案补丁 2026-09-02 · ${APPLY ? '应用模式' : '干跑模式'} · 目标 ${SITE}\n`);
    const changed = dryRun();
    if (APPLY && changed) await apply();
  } catch (e) {
    console.error(`✕ ${e.message}`);
    process.exitCode = 1;
  }
})();
