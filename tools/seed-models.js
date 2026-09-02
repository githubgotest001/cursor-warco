/**
 * UMBRELLA 4365 · 毒株谱系初始数据（一次性，零依赖）
 *
 * 把 /m 专栏的初始「毒株登记表」与「能力评测记录」通过 API 写入（走 API 才会触发缓存失效与百度推送）。
 * 之后的维护走后台「毒株谱系」标签页逐行编辑。
 *
 * ★ 这是一份草稿（BIBLE 第 2 条：录入永远人工）——站长逐行核对下面两张表后再跑。
 *
 * 口径纪律：
 *   - 2026 年的模型与分数全部出自站内已查证档案（行末 ev = 档案 id，分数信源填档案页）；
 *   - 2023–2025 年的模型与分数出自各实验室官方发布页 / 系统卡（source 字段），
 *     只收录官方自报或第三方评测机构公开发布过的数字，记不准的宁缺毋滥；
 *   - SWE-bench Verified 的成绩一律取官方主报数字（不取并行计算 / 自定义脚手架的加成值，
 *     加成值写进 note）；Terminal-Bench 按版本分基准名（题库不可比）；
 *   - 因训练数据污染撤榜的成绩不收录（Grok 4.5 的 CursorBench）；
 *   - status：已被官方下架 / 停供的标 retired，受限通道标 preview，其余 active——
 *     早期模型的下架时间以官方弃用公告为准，记不准的保持 active。
 *
 * 用法：
 *   node tools/seed-models.js --site http://127.0.0.1:4365 --key <ADMIN_KEY>
 *   不带参数时读 data/remote.json（同 sync.js），即写线上。
 *   幂等：目标已有同名模型的跳过（不覆盖后台改过的字段），同一模型 + 基准 + 分数已存在的成绩跳过——
 *   因此本文件可以追加新行后反复执行，只会补上缺的。
 */
const fs = require('node:fs');
const path = require('node:path');

const argv = process.argv.slice(2);
const argOf = f => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : ''; };
let remote = {};
try { remote = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'remote.json'), 'utf8')); } catch {}
const SITE = (argOf('--site') || process.env.UMB_SITE || remote.site || 'https://umbrella4365.com').replace(/\/+$/, '');
const KEY = argOf('--key') || process.env.UMB_ADMIN_KEY || remote.adminKey || '';
const ARCHIVE = 'https://umbrella4365.com/ev/';   // 分数信源为站内档案时的固定前缀（线上永久 URL）

/* ---------- 毒株登记表 ---------- */
const MODELS = [
  /* 2023 · 始祖毒株 */
  { name: 'GPT-4', lab: 'openai', family: 'GPT', date: '2023-03-14', tier: '旗舰', context: '8K / 32K', price: '$30 / $60', status: 'retired',
    summary: 'OpenAI 多模态旗舰，模拟律师资格考试成绩进入前 10%。Cursor 初版把它深度内置进 VS Code 分叉，「AI 原生编辑器」由此起步。2025 年 4 月从 ChatGPT 退役。',
    source: 'https://openai.com/index/gpt-4-research/', ev: 2 },
  { name: 'Claude 2', lab: 'anthropic', family: 'Claude', date: '2023-07-11', tier: '旗舰', context: '100K', status: 'retired',
    summary: 'Anthropic 首个面向公众的旗舰，100K 上下文在当时是数量级领先。此后两年 Claude 谱系在编码上的统治，起点在这里还看不出来。',
    source: 'https://www.anthropic.com/news/claude-2' },
  { name: 'Llama 2', lab: 'meta', family: 'Llama', date: '2023-07-18', tier: '开源旗舰', context: '4K', open_weights: 1,
    summary: '7B / 13B / 70B 开放权重、允许商用，Meta 把开源路线正式摆上牌桌。此后每一代前沿闭源模型的价格，都多了一个来自开源的锚。',
    source: 'https://ai.meta.com/blog/llama-2/' },
  { name: 'Gemini 1.0', lab: 'google', family: 'Gemini', date: '2023-12-06', tier: '旗舰', context: '32K', status: 'retired',
    summary: 'Google 首个原生多模态模型家族，Ultra 在 MMLU 上首次宣称超过人类专家。Gemini 谱系起点；1.0 Pro 于 2025 年 2 月退役。',
    source: 'https://blog.google/technology/ai/google-gemini-ai/' },

  /* 2024 · 城市扩散 */
  { name: 'Claude 3', lab: 'anthropic', family: 'Claude', date: '2024-03-04', tier: '旗舰', context: '200K', price: '$15 / $75（Opus）', status: 'retired',
    summary: 'Opus / Sonnet / Haiku 三档齐发，Opus 在多项基准上首次全面超过 GPT-4。三档定价法从此成为行业惯例；Opus 3 于 2026 年 1 月退役。',
    source: 'https://www.anthropic.com/news/claude-3-family' },
  { name: 'Llama 3', lab: 'meta', family: 'Llama', date: '2024-04-18', tier: '开源旗舰', context: '8K', open_weights: 1,
    summary: '8B / 70B 开放权重，Meta 宣称同尺寸最强开源模型；随后的 405B 版本让开源第一次逼近闭源旗舰。',
    source: 'https://ai.meta.com/blog/meta-llama-3/' },
  { name: 'GPT-4o', lab: 'openai', family: 'GPT', date: '2024-05-13', tier: '旗舰', context: '128K', price: '$5 / $15',
    summary: '「omni」原生多模态，文本、语音、视觉在同一网络处理，速度翻倍、价格减半；ChatGPT 免费用户第一次拿到旗舰级模型。',
    source: 'https://openai.com/index/hello-gpt-4o/' },
  { name: 'Claude 3.5 Sonnet', lab: 'anthropic', family: 'Claude', date: '2024-06-20', tier: '主力', context: '200K', price: '$3 / $15', status: 'retired',
    summary: '中档定位打穿自家旗舰：跑分全面超过 Claude 3 Opus，速度翻倍，价格约五分之一。Cursor 评测后火速切换默认模型——此后两年模型军备竞赛的起跑枪。',
    source: 'https://www.anthropic.com/news/claude-3-5-sonnet', ev: 5 },
  { name: 'o1', lab: 'openai', family: 'o 系列', date: '2024-12-05', tier: '推理', context: '200K', price: '$15 / $60',
    summary: '首个把「思维链」训练进强化学习的推理模型，答题前先思考；AIME、Codeforces 成绩跃升。推理模型这条赛道由此开辟，此后各家旗舰都长出了思考档。',
    source: 'https://openai.com/index/openai-o1-system-card/' },
  { name: 'DeepSeek-V3', lab: 'deepseek', family: 'DeepSeek', date: '2024-12-26', tier: '开源旗舰', context: '128K', price: '$0.27 / $1.10', open_weights: 1,
    summary: '6710 亿参数 MoE 开放权重，技术报告披露训练用 GPU 时约合 558 万美元。开源模型第一次在多数基准上与闭源旗舰并肩，且价格低一个量级。',
    source: 'https://api-docs.deepseek.com/news/news1226' },

  /* 2025 · 全球大流行 */
  { name: 'DeepSeek-R1', lab: 'deepseek', family: 'DeepSeek', date: '2025-01-20', tier: '推理 · 开源', context: '128K', price: '$0.55 / $2.19', open_weights: 1,
    summary: 'MIT 许可的开放权重推理模型，性能对标 o1、价格约二十分之一。发布一周后引发美股 AI 板块抛售，英伟达单日市值蒸发近 6000 亿美元。',
    source: 'https://api-docs.deepseek.com/news/news250120' },
  { name: 'Claude 3.7 Sonnet', lab: 'anthropic', family: 'Claude', date: '2025-02-24', tier: '主力', context: '200K', price: '$3 / $15',
    summary: '首个「混合推理」模型：同一模型可即答或延长思考。Claude Code 同日以研究预览亮相——命令行 agent 的起点。',
    source: 'https://www.anthropic.com/news/claude-3-7-sonnet' },
  { name: 'GPT-4.5', lab: 'openai', family: 'GPT', date: '2025-02-27', tier: '旗舰 · 研究预览', context: '128K', price: '$75 / $150', status: 'retired',
    summary: '最后一代靠纯预训练放大的旗舰，主打知识面与「情商」。每百万 token 75 / 150 美元，贵到发布五个月后即从 API 下架。',
    source: 'https://openai.com/index/introducing-gpt-4-5/' },
  { name: 'Gemini 2.5 Pro', lab: 'google', family: 'Gemini', date: '2025-03-25', tier: '旗舰', context: '1M', price: '$1.25 / $10',
    summary: 'Google 首个默认带思考的旗舰，1M 上下文；发布即登 LMArena 榜首，Google 在模型大战里第一次被公认领先。',
    source: 'https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/' },
  { name: 'Llama 4', lab: 'meta', family: 'Llama', date: '2025-04-05', tier: '开源旗舰', context: '10M（宣称）', open_weights: 1,
    summary: 'Scout / Maverick 开放权重，原生多模态、宣称 10M 上下文。发布后因向 LMArena 提交「实验版」引发评测口径争议，开源阵营的旗手位置开始动摇。',
    source: 'https://ai.meta.com/blog/llama-4-multimodal-intelligence/' },
  { name: 'GPT-4.1', lab: 'openai', family: 'GPT', date: '2025-04-14', tier: '编码向 · API', context: '1M', price: '$2 / $8',
    summary: '仅面向 API 的编码向更新，1M 上下文，SWE-bench Verified 比 GPT-4o 高出二十余个百分点。「编码」第一次成为 OpenAI 旗舰迭代的主打卖点。',
    source: 'https://openai.com/index/gpt-4-1/' },
  { name: 'o3', lab: 'openai', family: 'o 系列', date: '2025-04-16', tier: '推理', context: '200K', price: '$10 / $40',
    summary: '推理模型全线接入工具：边想边搜、边写代码边跑。6 月 API 价格直降八成，推理不再是奢侈品。',
    source: 'https://openai.com/index/introducing-o3-and-o4-mini/' },
  { name: 'Qwen3', lab: 'alibaba', family: 'Qwen', date: '2025-04-29', tier: '开源旗舰', context: '128K', open_weights: 1,
    summary: '235B-A22B 旗舰领衔、八个尺寸全部开放权重，混合思考模式；阿里把开源模型的迭代节奏拉到按月计。',
    source: 'https://qwenlm.github.io/blog/qwen3/' },
  { name: 'Claude Opus 4', lab: 'anthropic', family: 'Claude', date: '2025-05-22', tier: '旗舰', context: '200K', price: '$15 / $75',
    summary: '官方冠名「世界最强编码模型」，早测客户见证它连续七小时自主重构。从 3.5 的「答得好」到 4 的「干得完」，agent 时代的火药就位。',
    source: 'https://www.anthropic.com/news/claude-4', ev: 17 },
  { name: 'Claude Sonnet 4', lab: 'anthropic', family: 'Claude', date: '2025-05-22', tier: '主力', context: '200K', price: '$3 / $15',
    summary: '与 Opus 4 同日双发，价格不变、编码成绩追平旗舰。Cursor 首发接入后需求过猛，慢速池被挤停数日。',
    source: 'https://www.anthropic.com/news/claude-4', ev: 17 },
  { name: 'Grok 4', lab: 'xai', family: 'Grok', date: '2025-07-09', tier: '旗舰', context: '256K', price: '$3 / $15',
    summary: 'xAI 旗舰，HLE 与 ARC-AGI-2 上宣称领先；「Heavy」多 agent 版随每月 300 美元的顶配订阅推出。',
    source: 'https://x.ai/news/grok-4' },
  { name: 'Kimi K2', lab: 'moonshot', family: 'Kimi', date: '2025-07-11', tier: '开源旗舰', context: '128K', open_weights: 1,
    summary: '1 万亿参数 MoE 开放权重，主打 agentic 编码。Modified MIT 许可证里的署名条款，日后成了 Composer 2 溯源风波的法理依据。',
    source: 'https://moonshotai.github.io/Kimi-K2/' },
  { name: 'Claude Opus 4.1', lab: 'anthropic', family: 'Claude', date: '2025-08-05', tier: '旗舰', context: '200K', price: '$15 / $75',
    summary: 'Opus 4 的增量升级，agentic 编码与多文件重构精度提升，价格不变。GPT-5 发布前两天落地——时间点本身就是姿态。',
    source: 'https://www.anthropic.com/news/claude-opus-4-1' },
  { name: 'GPT-5', lab: 'openai', family: 'GPT', date: '2025-08-07', tier: '旗舰', context: '400K', price: '$1.25 / $10',
    summary: 'OpenAI 统一旗舰，Cursor 零时差接入并联合开一周免费额度。此前两度求购 Cursor 被拒的 OpenAI，第一次把新旗舰的首发红毯铺到了它门口。',
    source: 'https://openai.com/index/introducing-gpt-5/', ev: 24 },
  { name: 'grok-code-fast-1', lab: 'xai', family: 'Grok', date: '2025-08-28', tier: '编码专用 · 轻快', context: '256K', price: '$0.20 / $1.50',
    summary: '先以代号 sonic 匿名混进各编辑器一周，转正当天在 Cursor 等首发伙伴限时免费。当时没人想到，这条便宜快枪是母公司系的先遣部队。',
    source: 'https://x.ai/news/grok-code-fast-1', ev: 26 },
  { name: 'Qwen3-Max', lab: 'alibaba', family: 'Qwen', date: '2025-09-24', tier: '旗舰',
    summary: '通义千问首个万亿参数旗舰，预训练 36T token，云栖大会亮相；预览版曾登 LMArena 文本榜第三。国产闭源旗舰第一次在 SWE-bench Verified 上进入全球第一梯队。',
    source: 'http://www.news.cn/tech/20250924/7f3377e5e81441eb95bc3280539b3594/c.html' },
  { name: 'Claude Sonnet 4.5', lab: 'anthropic', family: 'Claude', date: '2025-09-29', tier: '主力', context: '200K', price: '$3 / $15',
    summary: '号称当时全球最强编码模型，价格不变。彼时 GPT-5 刚在多项编码基准上挑战 Anthropic 的统治，4.5 是回应。',
    source: 'https://www.anthropic.com/news/claude-sonnet-4-5', ev: 29 },
  { name: 'Composer', lab: 'anysphere', family: 'Composer', date: '2025-10-29', tier: '自研 · 编码', price: '随订阅',
    summary: 'Cursor 首个自研编码大模型，官方称编码速度为同类前沿模型四倍，随 Cursor 2.0 的多 Agent 界面亮相。从调用别人的模型到自己下场炼模型。',
    source: 'https://cursor.com/blog/2-0', ev: 30 },
  { name: 'GPT-5.1', lab: 'openai', family: 'GPT', date: '2025-11-12', tier: '旗舰', context: '400K',
    summary: '十一月连发的第一枪：新增更自然的对话风格与自适应推理；随后补上专攻编码代理的 Codex-Max。',
    source: 'https://openai.com/index/gpt-5-1/', ev: 97 },
  { name: 'Gemini 3 Pro', lab: 'google', family: 'Gemini', date: '2025-11-18', tier: '旗舰', context: '1M',
    summary: 'Google 首次做到发布当天进驻搜索主战场，同步推出代理开发平台 Antigravity；自称「我们最智能的模型」。',
    source: 'https://blog.google/products/gemini/gemini-3/', ev: 97 },
  { name: 'GPT-5.1-Codex-Max', lab: 'openai', family: 'GPT', date: '2025-11-19', tier: '编码代理专用', context: '400K',
    summary: '专攻长程编码代理的变体，新增 xhigh 推理档，可跨多个上下文窗口持续工作。「最强」称号在这个月里三度易主，它是第一次。',
    source: 'https://openai.com/index/gpt-5-1-codex-max/', ev: 97 },
  { name: 'Claude Opus 4.5', lab: 'anthropic', family: 'Claude', date: '2025-11-24', tier: '旗舰', context: '200K', price: '$5 / $25',
    summary: '自称「世界最强编码、agent 与计算机操作模型」，定价较前代 Opus 直降三分之二。旗舰智能第一次垂到中档价位，为「拿 Opus 当日常主力」铺平了路。',
    source: 'https://www.anthropic.com/news/claude-opus-4-5', ev: 97 },

  /* 2026 · 吞并纪元（Cursor 相关出自站内档案；国产开源线出自官方发布页与权威媒体） */
  { name: 'Kimi K2.5', lab: 'moonshot', family: 'Kimi', date: '2026-01-27', tier: '开源旗舰', context: '256K', open_weights: 1,
    summary: '原生多模态，首次引入「Agent 集群」——自主创建分身、按角色组队并行作业。两个月后它以另一种身份出现在 Cursor 的 API 响应里：Composer 2 的基座。',
    source: 'https://mp.weixin.qq.com/s/Bhn43P1GnGXsvsh5MnN47Q', ev: 41 },
  { name: 'Qwen3.5', lab: 'alibaba', family: 'Qwen', date: '2026-02-16', tier: '开源旗舰', open_weights: 1,
    summary: '除夕当天发布并开源：397B-A17B MoE、激活仅 17B，官方称性能超过万亿参数的 Qwen3-Max；千问从纯文本转向原生多模态预训练，API 价格低至每百万 token 0.8 元。',
    source: 'https://qwen.ai/blog?id=qwen3.5' },
  { name: 'Composer 2', lab: 'anysphere', family: 'Composer', date: '2026-03-19', tier: '自研 · 编码', price: '$0.50 / $2.50',
    summary: '首次跑通持续预训练加强化学习的完整链路，Fast 变体设为默认。基座为月之暗面开源的 Kimi K2.5——公告里没出现的那个词，二十四小时内由社区替它说出。',
    source: 'https://cursor.com/blog/composer-2', ev: 40 },
  { name: 'Qwen3.6-Plus', lab: 'alibaba', family: 'Qwen', date: '2026-04-02', tier: '旗舰', context: '1M',
    summary: '官方称当下最强编程国产模型，100 万上下文，多项编码指标逼近 Claude 系列；随后 35B-A3B 与 27B 稠密版陆续开源。',
    source: 'https://news.aibase.com/zh/news/26810' },
  { name: 'Claude Opus 4.7', lab: 'anthropic', family: 'Claude', date: '2026-04-16', tier: '旗舰', context: '1M', price: '$5 / $25',
    summary: '六周迭代一次的又一轮，价格照旧。真正的新闻藏在措辞里：官方承认它「不如 Mythos Preview 全面」——公开卖的不是最强的，最强的在门后。',
    source: 'https://www.cnbc.com/2026/04/16/anthropic-claude-opus-4-7-model-mythos.html', ev: 44 },
  { name: 'Kimi K2.6', lab: 'moonshot', family: 'Kimi', date: '2026-04-20', tier: '开源旗舰', context: '256K', open_weights: 1,
    summary: '官方称迄今最强代码模型：可不间断编码 13 小时、改写超 4000 行；HLE、SWE-Bench Pro 等成绩持平或优于 GPT-5.4 与 Opus 4.6。Agent 集群升至 300 个子 agent 并行。',
    source: 'https://www.kejixun.co/article/750494.html' },
  { name: 'Qwen3.6-27B', lab: 'alibaba', family: 'Qwen', date: '2026-04-22', tier: '开源 · 稠密', open_weights: 1,
    summary: '270 亿参数稠密多模态模型，官方称在全部主要编程基准上超过参数量 15 倍的前代开源旗舰 Qwen3.5-397B-A17B；社区呼声最高的规格。',
    source: 'https://qwen.ai/blog?id=qwen3.6-27b' },
  { name: 'GPT-5.5', lab: 'openai', family: 'GPT', date: '2026-04-23', tier: '旗舰', context: '1M', price: '$5 / $30',
    summary: '代号 Spud，主打长程任务的持久力。官方通稿点名渠道：「这对用户托付给 Cursor 的长程工作最重要」；API 开放次日进 Cursor，联合五折促销。',
    source: 'https://forum.cursor.com/t/gpt-5-5-out-now/158953', ev: 46 },
  { name: 'Composer 2.5', lab: 'anysphere', family: 'Composer', date: '2026-05-18', tier: '自研 · 默认模型', price: '$0.50 / $2.50（Fast $3 / $15）',
    summary: '官方称最聪明的自研模型，上线即成默认。第三方评测坐三望二，每任务成本约为前两名的十分之一到六十分之一。这一次，出身写在了明面上。',
    source: 'https://cursor.com/changelog/composer-2-5', ev: 49 },
  { name: 'Claude Opus 4.8', lab: 'anthropic', family: 'Claude', date: '2026-05-28', tier: '旗舰', context: '1M', price: '$5 / $25',
    summary: 'Cursor 同日上架。值得记的细节在别处：Anthropic 的官方公告直接拿 CursorBench 当成绩单——一家编辑器公司的内部评测成了模型厂发布会的通用度量衡。',
    source: 'https://www.anthropic.com/news/claude-opus-4-8', ev: 51 },
  { name: 'Claude Fable 5', lab: 'anthropic', family: 'Claude', date: '2026-06-09', tier: '旗舰', context: '1M', price: '$10 / $50',
    summary: 'Claude 5 世代第一枪，「做了安全处理的 Mythos 级模型」。智能指数断层登顶，领先最近的非 Anthropic 模型近 5 分。它的第一个完整月，一半时间在停机。',
    source: 'https://www.anthropic.com/news/claude-fable-5-mythos-5', ev: 52 },
  { name: 'Claude Mythos 5', lab: 'anthropic', family: 'Claude', date: '2026-06-09', tier: '受限旗舰', context: '1M', status: 'preview',
    summary: '与 Fable 5 同能力、不带安全分类器，仅通过 Project Glasswing 向受审机构开放。公开市场买不到的那一档。',
    source: 'https://www.anthropic.com/news/claude-fable-5-mythos-5', ev: 52 },
  { name: 'Claude Sonnet 5', lab: 'anthropic', family: 'Claude', date: '2026-06-30', tier: '主力', context: '1M', price: '$3 / $15',
    summary: '出口管制解除当日加更：agent 能力接近 Opus 4.8，中档价再打折，Cursor 当日上架。旗舰尚未回岗，替补先把便宜的活全接了下来。',
    source: 'https://forum.cursor.com/t/claude-sonnet-5-now-available/164463', ev: 60 },
  { name: 'Grok 4.5', lab: 'xai', family: 'Grok', date: '2026-07-08', tier: '旗舰 · 联合训练', price: '$2 / $6（Fast $4 / $18）',
    summary: '算力联姻后的第一件联合作品，训练数据含数万亿 token 的 Cursor 数据，把 Opus 级智能打到地板价。发布帖脚注承认一份 Cursor 代码库快照混入训练，CursorBench 成绩撤榜。',
    source: 'https://cursor.com/blog/grok-4-5', ev: 61 },
  { name: 'GPT-5.6 Sol', lab: 'openai', family: 'GPT', date: '2026-07-09', tier: '旗舰', price: '$5 / $30',
    summary: 'GPT-5.6 家族旗舰，编码 Agent 指数刷新纪录、反超 Fable 5 且便宜三成。GA 当天 Cursor 未同步上架，数日后才进原生选择器；随后连环降价。',
    source: 'https://openai.com/index/gpt-5-6/', ev: 63 },
  { name: 'GPT-5.6 Terra', lab: 'openai', family: 'GPT', date: '2026-07-09', tier: '均衡', price: '$2 / $12',
    summary: 'GPT-5.6 家族均衡档，官方称略胜 Fable 5 而成本约十六分之一。榜首易主之后，价格战接管战场。',
    source: 'https://openai.com/index/gpt-5-6/', ev: 63 },
  { name: 'GPT-5.6 Luna', lab: 'openai', family: 'GPT', date: '2026-07-09', tier: '走量', price: '$0.2 / $1.2',
    summary: 'GPT-5.6 家族走量档，7 月 30 日再直砍八成。三连星里最便宜的一颗，也是断供通牒后最先没人惋惜的一颗。',
    source: 'https://openai.com/index/gpt-5-6/', ev: 63 },
  { name: 'Kimi K3', lab: 'moonshot', family: 'Kimi', date: '2026-07-16', tier: '开源旗舰', context: '1M', open_weights: 1,
    summary: '2.8 万亿参数 MoE、激活约 104B、1M 上下文的原生多模态旗舰，7 月 27 日开放权重与技术报告。上线即登 Artificial Analysis 榜第三，仅次于 Fable 5 与 GPT-5.6 Sol；随后有美方官员公开指其蒸馏自 Fable。',
    source: 'https://www.kimi.com/news/kimi-k3-open-source' },
  { name: 'Claude Opus 5', lab: 'anthropic', family: 'Claude', date: '2026-07-24', tier: '旗舰 · 主力', context: '1M', price: '$5 / $25',
    summary: '以 Opus 的速度和价格交付接近 Fable 5 的智能，每任务成本约一半。发布前以代号 Honeycomb 在 Cursor 里两度走光，连报错弹窗都提前泄了底。',
    source: 'https://www.anthropic.com/news/claude-opus-5', ev: 68 },
  { name: 'Grok 4.6', lab: 'xai', family: 'Grok', date: '2026-08-12', tier: '旗舰 · 长任务 agent', price: '$2 / $6（≥200K 档翻倍）',
    summary: '交割前两天的最后一次联名：主攻长任务 agent，智能指数与 GPT-5.6 Sol 打平，新增 Extra High 算力档。公告抬头第一顺位的名字，已经换了。',
    source: 'https://forum.cursor.com/t/grok-4-6-is-now-live/168189', ev: 75 },
  { name: 'Qwen3.8-Max', lab: 'alibaba', family: 'Qwen', date: '2026-08-03', tier: '旗舰', context: '1M', open_weights: 1,
    summary: '千问史上最大旗舰：2.4T 参数 MoE、激活 95B、1M 上下文；预览版 7 月 19 日先行，8 月 12 日底座权重 Qwen3.8-2.4T-A95B 开源——Max 级权重首次放出。发布当日 Arena 榜单仅次于 Claude 系列。',
    source: 'https://qwen.ai/blog?id=qwen3.8' },
  { name: 'Claude Fable 5.1', lab: 'anthropic', family: 'Claude', date: '2026-09-01', tier: '旗舰', context: '1M', price: '$10 / $50',
    summary: '与 Mythos 5.1 同一套权重、两道护栏。输入输出价格不动，缓存读取砍到四分之一；Cursor 当日上架，自家考卷上的最高分。使用须先签三十日留存条款。',
    source: 'https://www.anthropic.com/claude-fable-and-mythos-5-1', ev: 111 },
  { name: 'Claude Mythos 5.1', lab: 'anthropic', family: 'Claude', date: '2026-09-01', tier: '受限旗舰', context: '1M', status: 'preview',
    summary: '与 Fable 5.1 同权异构，仅向受审的美国机构与即将扩围的生命科学通道开放；Cursor 选择器里没有这一项。两道门：一道在仪表盘，一道在华盛顿。',
    source: 'https://www.anthropic.com/claude-fable-and-mythos-5-1', ev: 111 },

  /* ---- 国产线补录（2026-09-02 第二批：DeepSeek / 智谱 / MiniMax / 豆包 / 千问补遗 / Kimi 补遗）----
     首批种子偏西方实验室（站内档案以 Cursor 在售模型为主），此批按官方发布页与权威媒体逐条补齐 */
  { name: 'MiniMax-M1', lab: 'minimax', family: 'MiniMax M', date: '2025-06-16', tier: '推理 · 开源', context: '1M', open_weights: 1,
    summary: '官方称全球首个开源的大规模混合架构推理模型，百万上下文；长上下文任务全面超过开源模型、逼近 Gemini 2.5 Pro。MiniMax 从视频与语音赛道转身进入文本前线。',
    source: 'https://www.minimaxi.com/news/minimaxm1' },
  { name: 'Doubao-Seed-1.6', lab: 'bytedance', family: 'Doubao Seed', date: '2025-06-25', tier: '旗舰', context: '256K',
    summary: '字节 Seed 团队的多模态通用模型：自适应深度思考、图形界面操作、256K 上下文，经火山引擎开放 API。官方拿 2025 年高考真题当考卷，是当年最有中国味的一次评测。',
    source: 'https://seed.bytedance.com/zh/blog/introduction-to-techniques-used-in-seed1-6' },
  { name: 'Qwen3-Coder', lab: 'alibaba', family: 'Qwen', date: '2025-07-22', tier: '编码专用 · 开源', context: '256K', open_weights: 1,
    summary: '480B-A35B 的编码专用 MoE，靠 2 万个并行环境做长程 Agent RL；官方称开源模型在 agentic 编码上的新 SOTA，可与 Claude Sonnet 4 比肩。国产开源第一次把 SWE-bench Verified 推近 70。',
    source: 'https://qwenlm.github.io/blog/qwen3-coder/' },
  { name: 'GLM-4.5', lab: 'zhipu', family: 'GLM', date: '2025-07-28', tier: '开源旗舰', context: '128K', open_weights: 1,
    summary: '355B-A32B，推理、编码、agent 三合一的混合推理模型，MIT 许可开放权重；可直接接进 Claude Code 等编码工具。智谱把「开源即商用」写进了发布页。',
    source: 'https://z.ai/blog/glm-4.5' },
  { name: 'DeepSeek-V3.1', lab: 'deepseek', family: 'DeepSeek', date: '2025-08-21', tier: '开源旗舰', context: '128K', open_weights: 1,
    summary: '混合推理架构：一个模型同时支持思考与非思考模式，思考效率高于 R1-0528；后训练强化工具使用与 agent 任务。DeepSeek 从「V 与 R 两条线」合流为一。',
    source: 'https://api-docs.deepseek.com/zh-cn/updates' },
  { name: 'GLM-4.6', lab: 'zhipu', family: 'GLM', date: '2025-09-30', tier: '开源旗舰', context: '200K', open_weights: 1,
    summary: '官方称代码能力对齐 Claude Sonnet 4、超过 DeepSeek-V3.2-Exp；同日宣布在寒武纪芯片上实现 FP8+Int4 混合量化部署——国产模型与国产芯片第一次在发布会上同框。',
    source: 'https://developer.cloud.tencent.cn/news/3066900' },
  { name: 'MiniMax-M2', lab: 'minimax', family: 'MiniMax M', date: '2025-10-27', tier: '开源 · agent', context: '128K', open_weights: 1,
    summary: '「为 Agent 时代而生的高效模型」，主打成本与开放性，上线即限时免费两周。M2 系列此后 108 天内三次迭代，官方自称行业最快进步速度。',
    source: 'https://platform.minimax.io/docs/release-notes/models' },
  { name: 'Kimi K2 Thinking', lab: 'moonshot', family: 'Kimi', date: '2025-11-06', tier: '推理 · 开源', context: '256K', open_weights: 1,
    summary: 'K2 的思考版：可连续调用二三百次工具不中断，INT4 原生推理；带工具的 HLE 与 BrowseComp 成绩一度压过 GPT-5。开放权重第一次在 agent 基准上与闭源旗舰并列。',
    source: 'https://moonshotai.github.io/Kimi-K2/thinking.html' },
  { name: 'DeepSeek-V3.2', lab: 'deepseek', family: 'DeepSeek', date: '2025-12-01', tier: '开源旗舰', context: '128K', open_weights: 1,
    summary: '在 V3.2-Exp 的稀疏注意力基础上转正，另出面向竞赛推理的 Speciale 版；API 双端点同步升级。稀疏注意力从此成为 DeepSeek 与智谱共用的底层路线。',
    source: 'https://api-docs.deepseek.com/zh-cn/updates' },
  { name: 'GLM-4.7', lab: 'zhipu', family: 'GLM', date: '2025-12-22', tier: '开源旗舰', context: '200K', open_weights: 1,
    summary: '主攻编码：多语言 agentic 编码与终端任务全面提升，新增 Preserved Thinking 与 Turn-level Thinking，在 Claude Code、Cline、Roo Code 等框架内的复杂任务更稳。',
    source: 'https://z.ai/blog/glm-4.7' },
  { name: 'MiniMax-M2.1', lab: 'minimax', family: 'MiniMax M', date: '2025-12-23', tier: '开源 · 编码', context: '128K', open_weights: 1,
    summary: '聚焦更多编程语言与办公场景，多脚手架下 SWE-bench Verified 表现稳定；同期开源全栈应用构建基准 VIBE，自称接近 Opus 4.5 的全栈能力。',
    source: 'https://www.minimaxi.com/news/minimax-m21' },
  { name: 'GLM-5', lab: 'zhipu', family: 'GLM', date: '2026-02-12', tier: '开源旗舰', context: '200K', open_weights: 1,
    summary: '从 355B 放大到 744B-A40B、预训练 28.5T token，集成 DeepSeek 稀疏注意力，MIT 开放权重；面向复杂系统工程与长程 agent 任务——「从 Vibe Coding 到 Agentic Engineering」。',
    source: 'https://z.ai/blog/glm-5' },
  { name: 'MiniMax-M2.5', lab: 'minimax', family: 'MiniMax M', date: '2026-02-12', tier: '开源旗舰', context: '200K', open_weights: 1,
    summary: '数十万真实环境的大规模强化学习，官方称 SWE-Bench Verified 80.2% 刷新 SOTA、比 M2.1 快 37%；「每秒 100 token 连续工作一小时只需 1 美元」——第一个不必考虑成本的前沿模型。',
    source: 'https://www.minimaxi.com/news/minimax-m25' },
  { name: 'Doubao-Seed-2.0', lab: 'bytedance', family: 'Doubao Seed', date: '2026-02-14', tier: '旗舰', context: '256K',
    summary: 'Pro / Lite / Mini 三档通用模型加面向开发者的 Code 版同日上线火山引擎，Pro 与 Code 进驻豆包 App 与 TRAE。火山引擎日均 token 用量此时已较发布之初增长逾 500 倍。',
    source: 'https://seed.bytedance.com/zh/blog/seed2-0-%E6%AD%A3%E5%BC%8F%E5%8F%91%E5%B8%83' },
  { name: 'GLM-5.1', lab: 'zhipu', family: 'GLM', date: '2026-04-08', tier: '开源旗舰', context: '200K', open_weights: 1,
    summary: '官方称全球首个在真实工程任务中验证 8 小时持续自主工作的开源模型；SWE-bench Pro 上国产模型首次超过 Opus 4.6。发布当日 OpenRouter 显示再度提价 10%——开源模型开始按闭源定价。',
    source: 'https://www.stcn.com/article/detail/3731842.html' },
  { name: 'DeepSeek-V4-Pro', lab: 'deepseek', family: 'DeepSeek', date: '2026-04-24', tier: '开源旗舰', context: '1M', price: '$0.66 / $1.98（低谷价；高峰 $1.32 / $3.96）', open_weights: 1,
    summary: '1.6T-A49B MoE、1M 上下文，MIT 开放权重；4 月预览、8 月 13 日 0813 正式版随官方 harness 落地，8 月 16 日调价。第三方榜上 0813 版编码成绩仅次于 Opus 5——开源与闭源前沿的差距缩到一个百分点内。',
    source: 'https://zh.wikipedia.org/zh-hans/DeepSeek-V4' },
  { name: 'DeepSeek-V4-Flash', lab: 'deepseek', family: 'DeepSeek', date: '2026-04-24', tier: '开源 · 走量', context: '1M', price: '$0.22 / $0.66（低谷价）', open_weights: 1,
    summary: '284B-A13B，与 Pro 同日预览、7 月 31 日 0731 正式版；每项价格约为 Pro 的三分之一，8 月又加了视觉实验版。第三方智能指数与 Pro 只差 1 分，是批处理与高并发场景的默认选项。',
    source: 'https://api-docs.deepseek.com/zh-cn/updates' },
  { name: 'Qwen3.7-Max', lab: 'alibaba', family: 'Qwen', date: '2026-05-19', tier: '旗舰 · API', context: '1M', price: '$2.50 / $7.50',
    summary: '「agent 优先」的千问旗舰，1M 上下文、原生思考模式，API 先于云栖峰会一天上线；3.7 世代未开放权重——开源的牌留给了三个月后的 3.8。SWE-bench Pro 与 Terminal-Bench 2.0 上一度压过 DeepSeek V4 Pro。',
    source: 'https://www.llmreference.com/model/qwen3.7-max' },
  { name: 'MiniMax-M3', lab: 'minimax', family: 'MiniMax M', date: '2026-06-01', tier: '开源旗舰', context: '200K', open_weights: 1,
    summary: 'M 系列首个支持多模态输入的旗舰，面向 agent 推理、工具调用与长上下文；第三方 SWE-bench Verified 榜上与 DeepSeek V4-Pro、Qwen3.7 Max 在 80.5 一线挤成一团。',
    source: 'https://platform.minimax.io/docs/release-notes/models' },
  { name: 'Doubao-Seed-2.1', lab: 'bytedance', family: 'Doubao Seed', date: '2026-06-23', tier: '旗舰', context: '256K',
    summary: 'Pro 与 Turbo 两档，主打「更可靠的响应与更稳定的交付」：Workspace Bench、GDPval 等贴近真实办公任务的基准上领先，进驻豆包「办公任务」模式与 TRAE。字节的路线是把模型埋进工作流，而不是上榜。',
    source: 'https://research.doubao.com/zh/blog/seed2-1-officially-released-advancing-ai-productivity' },

  /* ---- 第三批（2026-09-02）：按实验室名册逐家核到「最新一代」补齐——国产到 GLM-5.3 / Hy4 / 文心 5.1 / Step 3.7，
     西方补 Opus 4.6、Gemini 3.1 Pro 与 3.5–3.7 Flash、GPT-5.2 / 5.4、Muse Spark、Mistral Large 3 等缺环 ---- */
  { name: 'Claude Haiku 4.5', lab: 'anthropic', family: 'Claude', date: '2025-10-15', tier: '走量', context: '200K', price: '$1 / $5',
    summary: '小杯追平五个月前的 Sonnet 4 编码水平，价格三分之一、速度两倍以上；Claude Code 里的子 agent 从此有了廉价的手脚。',
    source: 'https://www.anthropic.com/news/claude-haiku-4-5' },
  { name: 'Mistral Large 3', lab: 'mistral', family: 'Mistral Large', date: '2025-12-04', tier: '开源旗舰', context: '256K', open_weights: 1,
    summary: '675B-A41B MoE，Apache 2.0 开放权重，面向 agent 场景调优——2026 年上半年「非中国开源模型」里最强的一档，也是欧洲阵营唯一还在前沿榜上的名字。',
    source: 'https://futureagi.com/blog/best-llms-may-2026/' },
  { name: 'GPT-5.2', lab: 'openai', family: 'GPT', date: '2025-12-11', tier: '旗舰', context: '400K', status: 'retired',
    summary: '年末补位的旗舰迭代，xhigh 推理档成为对照表常客；2026 年 3 月被 GPT-5.4 取代默认位，6 月 5 日退役。半年寿命，是这条谱系里最短的一代。',
    source: 'https://llm.okamomedia.tokyo/timeline/' },
  { name: 'Claude Opus 4.6', lab: 'anthropic', family: 'Claude', date: '2026-02-05', tier: '旗舰', context: '1M', price: '$5 / $25',
    summary: 'Opus 首次带 1M 上下文，价格不动；此后每六周一迭代的节奏由它起算。SWE-bench Verified 80.8%，在 Gemini 3.1 Pro 与 GPT-5.4 的 80.6% 之上保住编码第一——领先 0.2 个百分点。',
    source: 'https://ofox.ai/zh/blog/gemini-3-1-pro-api-complete-guide-2026/' },
  { name: 'Gemini 3.1 Pro', lab: 'google', family: 'Gemini', date: '2026-02-19', tier: '旗舰', context: '1M', price: '$2 / $12',
    summary: '推理优先的升级：ARC-AGI-2 从约 35% 翻到 77.1% 登顶、GPQA Diamond 94.3% 创纪录，价格不变。Google 之后把整个上半年都交给了 Flash 线——3.5 Pro 迟迟未到。',
    source: 'https://ofox.ai/zh/blog/gemini-3-1-pro-api-complete-guide-2026/' },
  { name: 'GPT-5.4', lab: 'openai', family: 'GPT', date: '2026-03-05', tier: '旗舰', context: '256K', price: '$2.50 / $15',
    summary: '首个原生带 Computer Use API 的 GPT 旗舰，取代 5.2 成为 ChatGPT 默认；SWE-bench Verified 80.6% 与 Gemini 3.1 Pro 打平。Cursor 一侧 5.4-mini 零时差进选择器。',
    source: 'https://ofox.ai/zh/blog/gemini-3-1-pro-api-complete-guide-2026/' },
  { name: 'MiniMax-M2.7', lab: 'minimax', family: 'MiniMax M', date: '2026-03-18', tier: '旗舰 · agent', context: '200K',
    summary: '官方称「第一个深度参与迭代自己的模型」：模型与组织一起开启自我进化。M2 系列的收官之作，两个半月后被 M3 换代。',
    source: 'https://www.minimaxi.com/news/minimax-m27-zh' },
  { name: 'Claude Mythos Preview', lab: 'anthropic', family: 'Claude', date: '2026-04-07', tier: '受限旗舰', status: 'preview',
    summary: '通过网络安全计划 Project Glasswing 仅向少数机构开放的受限旗舰；九天后发布的 Opus 4.7 被官方明说「不如它全面」。公开卖的不是最强的，最强的在门后。',
    source: 'https://www.cnbc.com/2026/04/16/anthropic-claude-opus-4-7-model-mythos.html', ev: 44 },
  { name: 'Meta Muse Spark', lab: 'meta', family: 'Muse', date: '2026-04-08', tier: '旗舰 · 闭源',
    summary: 'Meta 超级智能实验室从零训练的第一个模型，也是 Meta 史上第一个不开放权重的模型：AA 智能指数 52 分（Llama 4 Maverick 为 18）。开源旗手的转身，三天前刚发完 Llama 4 的 MoE 版。',
    source: 'https://www.buildfastwithai.com/blogs/latest-ai-models-april-2026' },
  { name: 'ERNIE 5.1', lab: 'baidu', family: '文心 ERNIE', date: '2026-05-08', tier: '旗舰',
    summary: '继承文心 5.0 知识，总参数压到约三分之一、激活约二分之一，预训练算力成本仅同规模的约 6%；Arena 搜索榜 1223 分全球第四、国内第一。百度选择的赛道是效价比而非榜首。',
    source: 'https://ernie.baidu.com/blog/zh/posts/ernie-5.1-0508-release/' },
  { name: 'Gemini 3.5 Flash', lab: 'google', family: 'Gemini', date: '2026-05-19', tier: '主力 · Flash', context: '2M',
    summary: 'I/O 2026 上以 Flash 之名先行的 3.5 世代：Terminal-Bench 2.1 76.2% 超过 3.1 Pro，成为 Gemini 应用与搜索 AI 模式的默认模型；官方称 3.5 Pro「下个月推出」——此后数月未见。',
    source: 'https://blog.google/intl/zh-tw/products/explore-get-answers/gemini-3-5/' },
  { name: 'Step 3.7 Flash', lab: 'stepfun', family: 'Step', date: '2026-05-29', tier: '开源 · Flash', open_weights: 1,
    summary: '196B-A11B 稀疏 MoE 加 1.88B 视觉编码器，最高 400 token/s，面向高频多轮低延迟的 agent 工作流；兼容 Claude Code、OpenClaw、Hermes Agent。阶跃把「快」做成了产品线。',
    source: 'https://news.qq.com/rain/a/20260529A04XCA00' },
  { name: 'Kimi K2.7 Code', lab: 'moonshot', family: 'Kimi', date: '2026-06-12', tier: '编码专用 · 开源', context: '256K', open_weights: 1,
    summary: '专为编程智能体设计的代码模型，仅在思考模式下生效；高速版峰值 260 token/s。K3 上线后与其并列为 Kimi Code 的两个可选模型。',
    source: 'https://www.kimi.com/code/docs/kimi-code/whats-new.html' },
  { name: 'GLM-5.2', lab: 'zhipu', family: 'GLM', date: '2026-06-17', tier: '开源旗舰', context: '1M', open_weights: 1,
    summary: '专为长程任务而生：Solid 1M 上下文、Day 0 跑在国产算力平台，MIT 协议无地域限制。Artificial Analysis 综合榜 51 分与 Anthropic、OpenAI 同列前三，开源 SOTA；Code Arena 全球可用模型第一。',
    source: 'https://z.ai/blog/glm-5.2' },
  { name: 'Hunyuan Hy3', lab: 'tencent', family: 'Hunyuan Hy', date: '2026-07-06', tier: '旗舰',
    summary: '混元底层基础设施全面重建后的第一代正式版：4 月 preview、7 月 6 日转正，发布一周调用量较 Hy2 涨逾 68 倍。腾讯撤销十年 AI Lab、由 28 岁的姚顺雨统管底模研发之后的首份答卷。',
    source: 'https://www.jiemian.com/article/15036222.html' },
  { name: 'Gemini 3.6 Flash', lab: 'google', family: 'Gemini', date: '2026-07-21', tier: '主力 · Flash',
    summary: '与 3.5 Flash-Lite、3.5 Flash Cyber 同日上线的 Flash 线小步迭代；Google 用两个月一版的 Flash 节奏对冲迟到的 3.5 Pro。',
    source: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions?hl=zh-cn' },
  { name: 'GLM-5.3', lab: 'zhipu', family: 'GLM', date: '2026-08-14', tier: '开源旗舰', context: '1M', open_weights: 1,
    summary: '沿用 GLM-5.2 底座、只做后训练的继任者，定位 agentic 编码与网络防御，753B 总参数。因「网络能力增长快于预期」权重延后两周至 8 月 28 日放出，许可证从 MIT 改为带营收门槛安全审查条款的自定义协议——开源第一次学会了留一手。',
    source: 'https://z.ai/blog/glm-5.3' },
  { name: 'Gemini 3.7 Flash', lab: 'google', family: 'Gemini', date: '2026-08-14', tier: '主力 · Flash',
    summary: '被称为「编码与 agent 最强 Flash」的又一版；3.5 Pro 依旧未至。',
    source: 'https://llm.okamomedia.tokyo/timeline/' },
  { name: 'GLM-5.3-Flash', lab: 'zhipu', family: 'GLM', date: '2026-08-26', tier: '开源 · Flash', open_weights: 1,
    summary: '320B 原生多模态的轻量版，比旗舰早两天放出，且沿用无修改的 MIT 许可——同一家公司同一周内对开源许可做了两次不同的选择。',
    source: 'https://z.ai/blog/glm-5.3-flash' },
  { name: 'Hunyuan Hy4 preview', lab: 'tencent', family: 'Hunyuan Hy', date: '2026-08-28', tier: '开源旗舰 · 预览', context: '1M', open_weights: 1, status: 'preview',
    summary: '深夜一篇文章加一个开源仓库：770B-A49B、1M 上下文、Apache 2.0 全开放，首发进 WorkBuddy / CodeBuddy 与元宝；上线即排队、三天紧急扩容。Arena 代码榜第五、开源第三——「混元是不是废物」的舆论至此翻案。',
    source: 'https://www.tencent.com/zh-cn/tencent-releases-and-open-sources-tencent-hy4-preview/' },
];

/* ---------- 能力评测记录（model 按名称匹配上表；date 留空 = 模型发布日） ---------- */
const SCORES = [
  /* SWE-bench Verified：官方主报数字 */
  { model: 'GPT-4o', bench: 'SWE-bench Verified', score: 33.2, date: '2024-08-13', note: 'OpenAI 发布 Verified 子集时的基线成绩', source: 'https://openai.com/index/introducing-swe-bench-verified/' },
  { model: 'Claude 3.5 Sonnet', bench: 'SWE-bench Verified', score: 49.0, date: '2024-10-22', note: '10 月升级版（官方自报）', source: 'https://www.anthropic.com/news/3-5-models-and-computer-use' },
  { model: 'o1', bench: 'SWE-bench Verified', score: 48.9, note: 'o1 系统卡 · Agentless 脚手架', source: 'https://openai.com/index/openai-o1-system-card/' },
  { model: 'DeepSeek-V3', bench: 'SWE-bench Verified', score: 42.0, note: '技术报告自报', source: 'https://api-docs.deepseek.com/news/news1226' },
  { model: 'DeepSeek-R1', bench: 'SWE-bench Verified', score: 49.2, note: '技术报告自报', source: 'https://api-docs.deepseek.com/news/news250120' },
  { model: 'Claude 3.7 Sonnet', bench: 'SWE-bench Verified', score: 62.3, note: '官方自报；自定义脚手架下 70.3%', source: 'https://www.anthropic.com/news/claude-3-7-sonnet' },
  { model: 'GPT-4.5', bench: 'SWE-bench Verified', score: 38.0, note: '系统卡自报', source: 'https://openai.com/index/introducing-gpt-4-5/' },
  { model: 'Gemini 2.5 Pro', bench: 'SWE-bench Verified', score: 63.8, note: '官方自报 · 自定义 agent 配置', source: 'https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/' },
  { model: 'GPT-4.1', bench: 'SWE-bench Verified', score: 54.6, note: '官方自报', source: 'https://openai.com/index/gpt-4-1/' },
  { model: 'o3', bench: 'SWE-bench Verified', score: 69.1, note: '官方自报', source: 'https://openai.com/index/introducing-o3-and-o4-mini/' },
  { model: 'Claude Opus 4', bench: 'SWE-bench Verified', score: 72.5, note: '官方自报；并行计算加成下 79.4%', source: 'https://www.anthropic.com/news/claude-4' },
  { model: 'Claude Sonnet 4', bench: 'SWE-bench Verified', score: 72.7, note: '官方自报；并行计算加成下 80.2%', source: 'https://www.anthropic.com/news/claude-4' },
  { model: 'Kimi K2', bench: 'SWE-bench Verified', score: 65.8, note: '官方自报 · agentic 单次', source: 'https://moonshotai.github.io/Kimi-K2/' },
  { model: 'Claude Opus 4.1', bench: 'SWE-bench Verified', score: 74.5, note: '官方自报', source: 'https://www.anthropic.com/news/claude-opus-4-1' },
  { model: 'GPT-5', bench: 'SWE-bench Verified', score: 74.9, note: '官方自报（477 题可复现子集）', source: 'https://openai.com/index/introducing-gpt-5/' },
  { model: 'grok-code-fast-1', bench: 'SWE-bench Verified', score: 70.8, note: '官方自报 · 内部 harness', source: 'https://x.ai/news/grok-code-fast-1' },
  { model: 'Claude Sonnet 4.5', bench: 'SWE-bench Verified', score: 77.2, note: '官方自报；并行计算加成下 82.0%', source: 'https://www.anthropic.com/news/claude-sonnet-4-5' },
  { model: 'Gemini 3 Pro', bench: 'SWE-bench Verified', score: 76.2, note: '官方自报', source: 'https://blog.google/products/gemini/gemini-3/' },
  { model: 'Qwen3-Max', bench: 'SWE-bench Verified', score: 69.6, note: 'Instruct 版 · 官方自报（云栖大会）', source: 'http://www.news.cn/tech/20250924/7f3377e5e81441eb95bc3280539b3594/c.html' },
  { model: 'GPT-5.1-Codex-Max', bench: 'SWE-bench Verified', score: 77.9, note: 'xhigh 档 · 官方自报', source: ARCHIVE + '97' },
  { model: 'Claude Opus 4.5', bench: 'SWE-bench Verified', score: 80.9, note: '官方自报', source: 'https://www.anthropic.com/news/claude-opus-4-5' },
  { model: 'Claude Fable 5', bench: 'SWE-bench Verified', score: 95.5, note: '官方自报', source: ARCHIVE + '52' },

  /* SWE-bench Pro */
  { model: 'Claude Fable 5', bench: 'SWE-bench Pro', score: 80.3, note: '官方自报', source: ARCHIVE + '52' },

  /* Terminal-Bench（按版本分列） */
  { model: 'Claude Opus 4', bench: 'Terminal-Bench', score: 43.2, note: '2025 年初版题库 · 官方自报', source: 'https://www.anthropic.com/news/claude-4' },
  { model: 'Gemini 3 Pro', bench: 'Terminal-Bench 2.0', score: 54.2, note: '官方自报', source: 'https://blog.google/products/gemini/gemini-3/' },
  { model: 'Claude Fable 5', bench: 'Terminal-Bench 2.1', score: 88, note: '官方自报', source: ARCHIVE + '52' },
  { model: 'Claude Fable 5', bench: 'Terminal-Bench 4.0', score: 42.0, date: '2026-09-01', note: '据 Fable 5.1 发布材料的对照数字', source: ARCHIVE + '111' },
  { model: 'Claude Fable 5.1', bench: 'Terminal-Bench 4.0', score: 55.8, note: '官方自报', source: ARCHIVE + '111' },
  { model: 'Claude Mythos 5.1', bench: 'Terminal-Bench 4.0', score: 60.9, note: '官方自报（受限通道模型）', source: ARCHIVE + '111' },

  /* CursorBench：Cursor 自家考卷（Grok 4.5 因训练数据污染撤榜，不收录） */
  { model: 'Claude Sonnet 5', bench: 'CursorBench', score: 57, note: '官方自报 · 版本未注明；对照上代 Sonnet 4.6 为 49%', source: ARCHIVE + '60' },
  { model: 'GPT-5.6 Sol', bench: 'CursorBench', score: 67.2, date: '2026-09-01', note: 'CursorBench 3.2 · 据 Fable 5.1 发布对照表', source: ARCHIVE + '111' },
  { model: 'Claude Opus 5', bench: 'CursorBench', score: 70.0, date: '2026-09-01', note: 'CursorBench 3.2 满力档 · 据 Fable 5.1 发布对照表', source: ARCHIVE + '111' },
  { model: 'Claude Fable 5', bench: 'CursorBench', score: 70.5, date: '2026-09-01', note: 'CursorBench 3.2 满力档 · 据 Fable 5.1 发布对照表', source: ARCHIVE + '111' },
  { model: 'Claude Fable 5.1', bench: 'CursorBench', score: 73.4, note: 'CursorBench 3.2 满力档 · Cursor 员工论坛公告', source: ARCHIVE + '111' },

  /* Terminal-Bench-Science 0.1（科研 agent；Fable 5.1 发布材料对照表） */
  { model: 'Claude Fable 5.1', bench: 'Terminal-Bench-Science 0.1', score: 52.6, note: '官方自报', source: ARCHIVE + '111' },
  { model: 'Claude Fable 5', bench: 'Terminal-Bench-Science 0.1', score: 24.7, date: '2026-09-01', note: '据 Fable 5.1 发布材料的对照数字', source: ARCHIVE + '111' },
  { model: 'Claude Opus 5', bench: 'Terminal-Bench-Science 0.1', score: 29.0, date: '2026-09-01', note: '据 Fable 5.1 发布材料的对照数字', source: 'https://www.gate.com/zh/news/detail/anthropic-releases-claude-fable-51-with-526-terminal-bench-score-23932728' },

  /* Artificial Analysis 智能指数（第三方；指数随版本重算，总榜取各模型最近一次） */
  { model: 'Claude Fable 5', bench: 'AA Intelligence Index', score: 64.9, unit: '分', note: '发布时口径：断层登顶，领先 GPT-5.5 近 5 分', source: ARCHIVE + '52' },
  { model: 'Claude Fable 5.1', bench: 'AA Intelligence Index', score: 66, unit: '分', date: '2026-09-01', note: '2026-09 版指数 · 第一', source: 'https://www.163.com/dy/article/L5QGBGGU051180F7.html' },
  { model: 'Claude Opus 5', bench: 'AA Intelligence Index', score: 63, unit: '分', date: '2026-09-01', note: '2026-09 版指数', source: 'https://www.163.com/dy/article/L5QGBGGU051180F7.html' },
  { model: 'Claude Fable 5', bench: 'AA Intelligence Index', score: 62, unit: '分', date: '2026-09-01', note: '2026-09 版指数（发布时口径为 64.9，指数已重算）', source: 'https://www.163.com/dy/article/L5QGBGGU051180F7.html' },
  { model: 'GPT-5.6 Sol', bench: 'AA Intelligence Index', score: 61, unit: '分', date: '2026-09-01', note: '2026-09 版指数', source: 'https://www.163.com/dy/article/L5QGBGGU051180F7.html' },
  { model: 'Grok 4.6', bench: 'AA Intelligence Index', score: 61, unit: '分', date: '2026-09-01', note: '2026-09 版指数', source: 'https://www.163.com/dy/article/L5QGBGGU051180F7.html' },
  { model: 'Composer 2.5', bench: 'AA Coding Agent Index', score: 62, unit: '分', note: '第三方 · 仅次于 Opus 4.7 与 GPT-5.5', source: ARCHIVE + '49' },
  { model: 'GPT-5.6 Sol', bench: 'AA Coding Agent Index', score: 80, unit: '分', note: '第三方 · 刷新纪录，超 Fable 5 约 2.8 分', source: ARCHIVE + '63' },

  /* HLE（无工具口径） */
  { model: 'Gemini 2.5 Pro', bench: 'HLE', score: 18.8, note: '无工具 · 官方自报', source: 'https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/' },
  { model: 'o3', bench: 'HLE', score: 20.3, note: '无工具 · 官方自报', source: 'https://openai.com/index/introducing-o3-and-o4-mini/' },
  { model: 'Grok 4', bench: 'HLE', score: 25.4, note: '无工具 · 官方自报（带工具 38.6%）', source: 'https://x.ai/news/grok-4' },
  { model: 'GPT-5', bench: 'HLE', score: 24.8, note: '无工具 · 官方自报', source: 'https://openai.com/index/introducing-gpt-5/' },
  { model: 'Gemini 3 Pro', bench: 'HLE', score: 37.5, note: '无工具 · 官方自报', source: 'https://blog.google/products/gemini/gemini-3/' },

  /* ---- 国产线补录（2026-09-02 第二批）：SWE-bench Verified ---- */
  { model: 'MiniMax-M1', bench: 'SWE-bench Verified', score: 56.0, note: 'M1-80k · 官方自报', source: 'https://www.minimaxi.com/news/minimaxm1' },
  { model: 'Qwen3-Coder', bench: 'SWE-bench Verified', score: 69.6, note: '480B-A35B-Instruct · 官方发布图表 · 无测试时扩展', source: 'https://qwenlm.github.io/blog/qwen3-coder/' },
  { model: 'GLM-4.5', bench: 'SWE-bench Verified', score: 64.2, note: '官方自报 · OpenHands 脚手架', source: 'https://z.ai/blog/glm-4.5' },
  { model: 'DeepSeek-V3.1', bench: 'SWE-bench Verified', score: 66.0, note: '官方更新日志自报', source: 'https://api-docs.deepseek.com/zh-cn/updates' },
  { model: 'GLM-4.6', bench: 'SWE-bench Verified', score: 68.0, date: '2025-12-22', note: '据 GLM-4.7 发布对照表 · OpenHands 口径', source: 'https://z.ai/blog/glm-4.7' },
  { model: 'Kimi K2 Thinking', bench: 'SWE-bench Verified', score: 71.3, note: '官方自报', source: 'https://moonshotai.github.io/Kimi-K2/thinking.html' },
  { model: 'DeepSeek-V3.2', bench: 'SWE-bench Verified', score: 73.1, date: '2026-02-12', note: '据智谱 GLM-5 发布对照表 · OpenHands 口径（Thinking）', source: 'https://z.ai/blog/glm-5' },
  { model: 'GLM-4.7', bench: 'SWE-bench Verified', score: 73.8, note: '官方自报 · OpenHands 口径', source: 'https://z.ai/blog/glm-4.7' },
  { model: 'Kimi K2.5', bench: 'SWE-bench Verified', score: 76.8, date: '2026-02-12', note: '据智谱 GLM-5 发布对照表 · OpenHands 口径（Thinking）', source: 'https://z.ai/blog/glm-5' },
  { model: 'GLM-5', bench: 'SWE-bench Verified', score: 77.8, note: '官方自报 · OpenHands 口径（Thinking）', source: 'https://z.ai/blog/glm-5' },
  { model: 'MiniMax-M2.5', bench: 'SWE-bench Verified', score: 80.2, note: '官方自报 · Claude Code 脚手架 · 四次均值', source: 'https://www.minimaxi.com/news/minimax-m25' },
  { model: 'DeepSeek-V4-Flash', bench: 'SWE-bench Verified', score: 73.7, note: '技术报告自报（第三方 tracker 另录 79.0）', source: 'https://www.morphllm.com/deepseek-v4' },
  { model: 'DeepSeek-V4-Pro', bench: 'SWE-bench Verified', score: 80.6, date: '2026-06-01', note: 'V4-Pro-Max 预览版配置 · llm-stats 第三方 tracker（2026-06）', source: 'https://www.morphllm.com/deepseek-v4' },
  { model: 'MiniMax-M3', bench: 'SWE-bench Verified', score: 80.5, date: '2026-06-01', note: 'llm-stats 第三方 tracker（2026-06）', source: 'https://www.morphllm.com/deepseek-v4' },
  { model: 'Qwen3.7-Max', bench: 'SWE-bench Verified', score: 80.4, date: '2026-06-07', note: '第三方 tracker 观测（llmreference · 全榜第 9）', source: 'https://www.llmreference.com/model/qwen3.7-max' },
  { model: 'Claude Opus 4.7', bench: 'SWE-bench Verified', score: 87.6, date: '2026-06-01', note: 'llm-stats 第三方 tracker（2026-06）', source: 'https://www.morphllm.com/deepseek-v4' },
  { model: 'Claude Opus 4.8', bench: 'SWE-bench Verified', score: 88.6, date: '2026-06-01', note: 'llm-stats 第三方 tracker（2026-06）', source: 'https://www.morphllm.com/deepseek-v4' },
  { model: 'DeepSeek-V4-Pro', bench: 'SWE-bench Verified', score: 96.4, date: '2026-08-19', note: 'V4-Pro-0813 · Vals AI 第三方统一 harness（bash-only）· 榜上第二、开源第一', source: 'https://codersera.com/blog/deepseek-v4-pro-0813-guide-2026/' },
  { model: 'Claude Opus 5', bench: 'SWE-bench Verified', score: 97.0, date: '2026-08-19', note: 'Vals AI 第三方统一 harness（bash-only）· 榜首', source: 'https://codersera.com/blog/deepseek-v4-pro-0813-guide-2026/' },

  /* ---- 国产线补录：SWE-bench Pro / Terminal-Bench / HLE ---- */
  { model: 'GLM-5.1', bench: 'SWE-bench Pro', score: 58.4, note: '官方自报 · 国产首次超过 Opus 4.6', source: 'https://www.stcn.com/article/detail/3731842.html' },
  { model: 'MiniMax-M3', bench: 'SWE-bench Pro', score: 59.0, note: '官方自报', source: 'https://platform.minimax.io/docs/release-notes/models' },
  { model: 'Qwen3.7-Max', bench: 'SWE-bench Pro', score: 60.6, date: '2026-05-20', note: '第三方 tracker 观测（llmreference）', source: 'https://www.llmreference.com/model/qwen3.7-max' },
  { model: 'DeepSeek-V3.1', bench: 'Terminal-Bench', score: 31.3, note: '初版题库 · 官方更新日志自报', source: 'https://api-docs.deepseek.com/zh-cn/updates' },
  { model: 'GLM-4.7', bench: 'Terminal-Bench 2.0', score: 41.0, note: '官方自报', source: 'https://z.ai/blog/glm-4.7' },
  { model: 'DeepSeek-V4-Pro', bench: 'Terminal-Bench 2.0', score: 67.9, note: '预览版 · 发布材料', source: 'https://zh.wikipedia.org/zh-hans/DeepSeek-V4' },
  { model: 'Qwen3.7-Max', bench: 'Terminal-Bench 2.0', score: 69.7, date: '2026-05-20', note: 'Terminus 脚手架 · 第三方 tracker 观测（llmreference）', source: 'https://www.llmreference.com/model/qwen3.7-max' },
  { model: 'DeepSeek-V4-Flash', bench: 'Terminal-Bench 2.1', score: 82.7, date: '2026-07-31', note: 'V4-Flash-0731 · 官方更新日志自报', source: 'https://api-docs.deepseek.com/zh-cn/updates' },
  { model: 'DeepSeek-V4-Pro', bench: 'Terminal-Bench 2.1', score: 87.9, date: '2026-08-13', note: 'V4-Pro-0813 · 官方更新日志自报', source: 'https://api-docs.deepseek.com/zh-cn/updates' },
  { model: 'DeepSeek-V3.2', bench: 'HLE', score: 25.1, date: '2026-02-12', note: '无工具 · 据智谱 GLM-5 发布对照表', source: 'https://z.ai/blog/glm-5' },
  { model: 'Kimi K2.5', bench: 'HLE', score: 31.5, date: '2026-02-12', note: '无工具 · 据智谱 GLM-5 发布对照表', source: 'https://z.ai/blog/glm-5' },
  { model: 'GLM-5', bench: 'HLE', score: 30.5, note: '无工具 · 官方自报', source: 'https://z.ai/blog/glm-5' },
  { model: 'Qwen3.7-Max', bench: 'HLE', score: 41.4, date: '2026-06-07', note: '无工具 · 第三方 tracker 观测（llmreference）', source: 'https://www.llmreference.com/model/qwen3.7-max' },
  { model: 'DeepSeek-V4-Pro', bench: 'HLE', score: 42.7, date: '2026-08-13', note: 'V4-Pro-0813 · 无工具 · 官方更新日志自报（带工具 60.0）', source: 'https://api-docs.deepseek.com/zh-cn/updates' },

  /* ---- 第三批（2026-09-02）---- */
  { model: 'Claude Haiku 4.5', bench: 'SWE-bench Verified', score: 73.3, note: '官方自报', source: 'https://www.anthropic.com/news/claude-haiku-4-5' },
  { model: 'GPT-5.2', bench: 'SWE-bench Verified', score: 80.0, date: '2026-02-12', note: 'xhigh 档 · 据智谱 GLM-5 发布对照表', source: 'https://z.ai/blog/glm-5' },
  { model: 'GPT-5.2', bench: 'HLE', score: 35.4, date: '2026-02-12', note: '无工具 · 据智谱 GLM-5 发布对照表', source: 'https://z.ai/blog/glm-5' },
  { model: 'Claude Opus 4.6', bench: 'SWE-bench Verified', score: 80.8, date: '2026-02-19', note: '据 Gemini 3.1 Pro 发布对照 / llm-stats tracker', source: 'https://ofox.ai/zh/blog/gemini-3-1-pro-api-complete-guide-2026/' },
  { model: 'Gemini 3.1 Pro', bench: 'SWE-bench Verified', score: 80.6, note: '官方发布对照 · 与 GPT-5.4 持平', source: 'https://ofox.ai/zh/blog/gemini-3-1-pro-api-complete-guide-2026/' },
  { model: 'GPT-5.4', bench: 'SWE-bench Verified', score: 80.6, note: '据 Gemini 3.1 Pro 发布对照', source: 'https://ofox.ai/zh/blog/gemini-3-1-pro-api-complete-guide-2026/' },
  { model: 'Meta Muse Spark', bench: 'AA Intelligence Index', score: 52, unit: '分', note: '发布时口径（Llama 4 Maverick 为 18）', source: 'https://www.buildfastwithai.com/blogs/latest-ai-models-april-2026' },
  { model: 'Gemini 3.5 Flash', bench: 'Terminal-Bench 2.1', score: 76.2, note: '官方自报', source: 'https://blog.google/intl/zh-tw/products/explore-get-answers/gemini-3-5/' },
  { model: 'GLM-5.2', bench: 'AA Intelligence Index', score: 51, unit: '分', note: '发布时口径 · 开源 SOTA，与 Anthropic、OpenAI 同列前三', source: 'https://z.ai/blog/glm-5.2' },
  /* Kimi K3 技术报告（arXiv 2607.24653，2026-07-16）对照表：Kimi 自测，reasoning effort max */
  { model: 'Kimi K3', bench: 'Terminal-Bench 2.1', score: 88.3, note: '技术报告自报 · max 档', source: 'https://arxiv.org/html/2607.24653v2' },
  { model: 'GPT-5.6 Sol', bench: 'Terminal-Bench 2.1', score: 88.8, date: '2026-07-16', note: '据 Kimi K3 技术报告对照表 · max 档', source: 'https://arxiv.org/html/2607.24653v2' },
  { model: 'Claude Opus 4.8', bench: 'Terminal-Bench 2.1', score: 84.6, date: '2026-07-16', note: '据 Kimi K3 技术报告对照表 · max 档', source: 'https://arxiv.org/html/2607.24653v2' },
  { model: 'GPT-5.5', bench: 'Terminal-Bench 2.1', score: 83.4, date: '2026-07-16', note: '据 Kimi K3 技术报告对照表 · xhigh 档', source: 'https://arxiv.org/html/2607.24653v2' },
  { model: 'GLM-5.2', bench: 'Terminal-Bench 2.1', score: 82.7, date: '2026-07-16', note: '据 Kimi K3 技术报告对照表 · max 档', source: 'https://arxiv.org/html/2607.24653v2' },
  { model: 'Kimi K3', bench: 'HLE', score: 43.5, note: '无工具 · 技术报告自报（带工具 56.0）', source: 'https://arxiv.org/html/2607.24653v2' },
  { model: 'Claude Fable 5', bench: 'HLE', score: 53.3, date: '2026-07-16', note: '无工具 · 据 Kimi K3 技术报告对照表（带工具 63.0）', source: 'https://arxiv.org/html/2607.24653v2' },
  { model: 'GPT-5.6 Sol', bench: 'HLE', score: 44.5, date: '2026-07-16', note: '无工具 · 据 Kimi K3 技术报告对照表（带工具 58.0）', source: 'https://arxiv.org/html/2607.24653v2' },
  { model: 'Claude Opus 4.8', bench: 'HLE', score: 49.8, date: '2026-07-16', note: '无工具 · 据 Kimi K3 技术报告对照表（带工具 57.9）', source: 'https://arxiv.org/html/2607.24653v2' },
  { model: 'GPT-5.5', bench: 'HLE', score: 41.4, date: '2026-07-16', note: '无工具 · 据 Kimi K3 技术报告对照表（带工具 52.2）', source: 'https://arxiv.org/html/2607.24653v2' },
  /* Terminal-Bench 3.0：GLM-5.3 发布材料给出的前后代对照 */
  { model: 'GLM-5.2', bench: 'Terminal-Bench 3.0', score: 4.6, date: '2026-08-14', note: '据 GLM-5.3 发布材料对照', source: 'https://www.digitalapplied.com/blog/glm-5-3-weights-bespoke-license-not-mit' },
  { model: 'GLM-5.3', bench: 'Terminal-Bench 3.0', score: 28.3, note: '官方发布材料', source: 'https://www.digitalapplied.com/blog/glm-5-3-weights-bespoke-license-not-mit' },
];

(async () => {
  if (!KEY) { console.error('缺少管理密钥：--key / UMB_ADMIN_KEY / data/remote.json'); process.exitCode = 1; return; }
  const hdr = { 'Content-Type': 'application/json', 'X-Admin-Key': KEY };
  const existing = await (await fetch(`${SITE}/api/models`)).json();
  const ids = new Map((existing.models || []).map(m => [m.name, m.id]));
  let okM = 0, skipM = 0;
  for (const row of MODELS) {
    if (ids.has(row.name)) { skipM++; continue; }
    const r = await fetch(`${SITE}/api/models`, { method: 'POST', headers: hdr, body: JSON.stringify(row) });
    const d = await r.json();
    if (d.ok) { okM++; ids.set(row.name, d.row.id); console.log(`+ ${row.name} → /m/${d.row.slug}`); }
    else console.error(`✕ ${row.name}: ${d.error || r.status}`);
  }
  const have = await (await fetch(`${SITE}/api/scores`)).json();
  const seen = new Set((have.scores || []).map(s => `${s.model_id}|${s.bench}|${s.score}`));
  let okS = 0, skipS = 0;
  for (const s of SCORES) {
    const model_id = ids.get(s.model);
    if (!model_id) { console.error(`✕ 成绩未录：模型「${s.model}」未登记`); continue; }
    if (seen.has(`${model_id}|${s.bench}|${s.score}`)) { skipS++; continue; }
    const r = await fetch(`${SITE}/api/scores`, { method: 'POST', headers: hdr, body: JSON.stringify({ ...s, model_id }) });
    const d = await r.json();
    if (d.ok) { okS++; console.log(`  · ${s.model} @ ${s.bench} = ${s.score}`); }
    else console.error(`✕ ${s.model} @ ${s.bench}: ${d.error || r.status}`);
  }
  console.log(`完成：模型 新增 ${okM} / 已有跳过 ${skipM} · 成绩 新增 ${okS} / 已有跳过 ${skipS} → ${SITE}/m`);
})();
