/**
 * UMBRELLA 4365 · 初始档案灌入
 * 用法：node seed.js          （仅当库为空时写入）
 *       node seed.js --force  （清空后重灌）
 *
 * 本文件为线上档案库的快照，由后台实际内容导出，可用于新环境初始化或灾后恢复。
 * 日期均经公开报道考证；个别民间事件取可考的报道 / 爆发日。
 * side: main = 正史（官方档案） | dark = 野史（民间情报）
 */
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'chronicle.db'));

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
`);

const EVENTS = [
  /* ==================== 正史 · 官方档案 ==================== */
  {
    side: "main", date: "2022-04-01", tag: "起源",
    title: "四个 MIT 同学的赌注",
    summary: "Michael Truell 等四位 MIT 同学创立 Anysphere，拿到第一笔外部资金。口号很狂：重新发明编程本身。",
    detail: "Michael Truell、Sualeh Asif、Aman Sanger、Arvid Lunnemark 四位 MIT 同学在 2022 年成立 Anysphere，当年即拿到规模不大的第一笔外部资金。据公开报道推算，在 2023 年 10 月种子轮之前，公司累计融资约三百万美元量级；更早的投资人名单众说纷纭，本刊不采信未经权威确认的版本。\n\n彼时 GitHub Copilot 独占 AI 辅助编程市场，四人押注的方向更激进：不做插件，直接重造编辑器。至于 OpenAI——它要到一年半后才带着领投支票出现（见 2023-10-11 档案）。",
    series: "融资阶梯"
  },
  {
    side: "main", date: "2023-03-14", tag: "首发",
    title: "Cursor 上线",
    summary: "一个 VS Code 分叉加上 GPT-4，首个「AI 原生编辑器」悄然发布。下载曲线开始以奇怪的斜率爬升。",
    detail: "2023 年 3 月，Cursor 正式对外发布：基于 VS Code 分叉，深度内置 GPT-4 对话与代码生成能力，主打「AI-first 编辑器」概念。\n\n发布初期社区反应两极：尝鲜者惊叹丝滑，怀疑者嗤之以鼻（见同期野史档案）。但下载曲线不会说谎——它开始以一个不属于「套壳工具」的斜率爬升。"
  },
  {
    side: "main", date: "2023-10-11", tag: "融资",
    title: "OpenAI 领投种子轮 800 万美元",
    summary: "OpenAI 创业基金领投，Nat Friedman 跟投。金主与未来的对手，此刻还是一家人。",
    detail: "2023 年 10 月，Anysphere 完成 800 万美元种子轮，由 OpenAI Startup Fund 领投，前 GitHub CEO Nat Friedman、Dropbox 联创 Arash Ferdowsi 等跟投。\n\n历史的伏笔在此埋下：日后 OpenAI 会推出自家编程 Agent 与 Cursor 正面竞争，还差点买下 Cursor 的对手 Windsurf。而此刻，大家还是一家人。",
    series: "融资阶梯",
    source: "https://techcrunch.com/2023/10/11/anysphere-raises-8m-from-openai-to-build-an-ai-powered-ide/"
  },
  {
    side: "main", date: "2024-06-20", tag: "点火",
    title: "Claude 3.5 Sonnet：点火器",
    summary: "Anthropic 发布 3.5 Sonnet：比自家旗舰 Opus 还强，快一倍、便宜五倍。Cursor 团队评测后火速换默认模型——Truell 后来复盘：「那是一次大跃迁，我们立刻行动。」编辑器与模型的黄金搭档就此结成。",
    detail: "2024 年 6 月 20 日，Claude 3.5 Sonnet 发布。一个中档定位的模型打穿了自家旗舰：跑分全面超过 Claude 3 Opus，速度翻倍，价格约五分之一，编码能力在当时的价位段直接划出新基准线。\r\n\r\nCursor 内部的反应后来写进了官方访谈：几位工程师把市面模型全评了一遍——离线评测、内部试用、A/B 测试全上——结果「令人意外」，于是火速切换默认模型。Truell 的原话：「Sonnet 3.5 是一次大跃迁，我们立刻行动。那是此后逐版跟进的多年长跑的起点。」Anthropic 官方后来的说法更直接：自 2024 年 6 月起，Sonnet 就是全球开发者的首选模型。\r\n\r\n这一天值得立档，因为它是两条曲线的交点：Cursor 的增长曲线从此换了斜率（两个月后 A 轮官宣、「小孩姐」视频出圈），Anthropic 的编码霸权也从此起算。后面两年的模型军备竞赛，起跑枪是这一声。",
    series: "模型军备",
    source: "https://www.anthropic.com/news/claude-3-5-sonnet"
  },
  {
    side: "main", date: "2024-08-09", tag: "融资",
    title: "A 轮 6000 万美元，估值 4 亿",
    summary: "a16z、Thrive 入局；Jeff Dean 与 Patrick Collison 以个人身份跟投。硅谷开始集体下注。",
    detail: "2024 年 8 月，Anysphere 完成 6000 万美元 A 轮，Andreessen Horowitz 与 Thrive Capital 入局，投后估值约 4 亿美元。个人跟投名单星光熠熠：Google 首席科学家 Jeff Dean、Stripe CEO Patrick Collison、OpenAI 研究员 Noam Brown。\n\n当一家公司的天使名单开始像 AI 名人堂，说明硅谷已经用真金白银投票。",
    series: "融资阶梯",
    source: "https://cursor.com/blog/series-a"
  },
  {
    side: "main", date: "2024-11-12", tag: "并购",
    title: "收购 Supermaven",
    summary: "把最快的补全模型连人带枪收编。Tab 键从此有了自己的大脑，「读心补全」成为招牌。",
    detail: "2024 年 11 月，Cursor 宣布收购以「最快代码补全模型」著称的 Supermaven，创始人 Jacob Jackson（Tabnine 原作者）率队加入。\n\n这笔收购直接孵化了后来的招牌能力 Cursor Tab：低延迟、跨文件、会预判你下一步动作的「读心补全」。江湖人称：Tab 一时爽，一直 Tab 一直爽。",
    source: "https://cursor.com/blog/supermaven"
  },
  {
    side: "main", date: "2025-01-14", tag: "融资",
    title: "B 轮 1.05 亿美元，估值 26 亿",
    summary: "ARR 破亿速度刷新 SaaS 历史纪录。华尔街分析师开始学习「vibe」这个单词。",
    detail: "2025 年 1 月，Anysphere 官宣 1.05 亿美元 B 轮，官方公告列出的投资方是 Thrive Capital、a16z、Benchmark 及现有投资人，没有写领投，也没有披露估值；26 亿美元的投后估值来自媒体报道。彼时 Cursor 以最快速度冲破 1 亿美元 ARR，被多家媒体称为史上增长最快的 SaaS 公司。\n\n两周后，Karpathy 将发明一个改变行业叙事的词（见野史档案 2025-02-02）。",
    series: "融资阶梯",
    source: "https://cursor.com/blog/series-b"
  },
  {
    side: "main", date: "2025-05-22", tag: "军备",
    title: "Claude 4 双发：七小时不下桌",
    summary: "Opus 4 与 Sonnet 4 同日双发，官方冠名「世界最强编码模型」：SWE-bench 72.5%，早测客户见证它连续七小时自主重构。Cursor 首发接入，随后被挤爆——Sonnet 4 慢速池一停就是好几天。",
    detail: "2025 年 5 月 22 日，Anthropic 双发 Claude Opus 4 与 Sonnet 4，时隔近一年重回大模型发布：Opus 4 主打长程自主任务，SWE-bench 72.5%、Terminal-bench 43.2%，官方直接冠名「世界最强编码模型」；有早期客户报告它连续七小时自主重构代码不下桌。定价 Opus $15/$75、Sonnet $3/$15，Claude Code 同日转正式发布。\r\n\r\nCursor 的背书印在发布材料里：「编码新标杆，对复杂代码库理解的一次飞跃。」首发即接入，随后是甜蜜的烦恼——需求过猛，6 月初 Sonnet 4 在慢速池连停三天以上，官方坦言：容量就这么多，模型商也在扩产。\r\n\r\n从 3.5 的「答得好」到 4 的「干得完」，agent 时代的火药到位了。两周后 Cursor 1.0 携 Bugbot 发布（见 2025-06-04 档案），把这批火药装进了产品。",
    series: "模型军备",
    source: "https://www.anthropic.com/news/claude-4"
  },
  {
    side: "main", date: "2025-06-04", tag: "里程碑",
    title: "Cursor 1.0 发布",
    summary: "Bugbot 代码审查、后台 Agent、项目记忆一次到位。从编辑器向软件工厂的第一次形态跃迁。",
    detail: "2025 年 6 月 4 日，Cursor 1.0 正式发布：Bugbot 自动审查 GitHub PR 并留下一键修复建议、Background Agent 面向全体开放、Memories 让项目上下文可以跨会话积累（当时仍标注为 beta）。\n\n从这一版开始，Cursor 的叙事从更聪明的编辑器转向可以委托工作的软件工厂。",
    source: "https://cursor.com/changelog/1-0"
  },
  {
    side: "main", date: "2025-06-05", tag: "融资",
    title: "C 轮 9 亿美元，估值 99 亿",
    summary: "1.0 发布次日官宣。ARR 破 5 亿美元，超半数财富 500 强在用。三年时间，从车库到百亿门口。",
    detail: "1.0 发布仅一天后，Anysphere 宣布完成 9 亿美元 C 轮，Thrive Capital 领投，a16z、Accel、DST Global 跟投，估值 99 亿美元。官方同时披露：ARR 突破 5 亿美元，超过一半的财富 500 强公司在使用 Cursor，包括 NVIDIA、Uber、Adobe。\n\n彭博称其为「有史以来增长最快的创业公司」。成立三年，站到百亿美元门口。",
    series: "融资阶梯",
    source: "https://cursor.com/blog/series-c"
  },
  {
    side: "main", date: "2025-08-07", tag: "反攻",
    title: "GPT-5 进 Cursor：免费一周",
    summary: "OpenAI 发布 GPT-5，Cursor 零时差接入，并联合 OpenAI 给全体付费用户开一周免费额度。金主亲儿子 Copilot 之外，OpenAI 第一次把首发红毯铺到了 Cursor 门口。",
    detail: "2025 年 8 月 7 日 GPT-5 发布，Cursor 同日上架——官方博客说得直白：内部工程师已经在用它构建 Cursor 本体，「相当能打」。与 OpenAI 联合促销：付费用户发布周内免费，high、fast 等变体一并放开。\r\n\r\n「免费」的定义随后引发一场小型行为艺术：额度「慷慨但有上限、具体数字不公布」，有人 8 月 9 日就撞了墙；「发布周」到底几天，论坛连问数帖无人拍板，直到 8 月 14 日官方确认回归 API 计价。战地记者按：免费一周的最大产出，是让所有人搞清了自己一周能烧多少 token。\r\n\r\n值得记的是格局：此前 OpenAI 两度求购 Cursor 被拒（见 2025-04-17 野史），如今新旗舰首发即全量入驻。打不过就加入的另一种写法——买不下来，就把模型卖给它。",
    series: "模型军备",
    source: "https://cursor.com/blog/gpt-5"
  },
  {
    side: "main", date: "2025-08-28", tag: "进场",
    title: "代号 sonic：Grok 杀进 Cursor",
    summary: "xAI 发布 grok-code-fast-1：先以代号 sonic 匿名混进各编辑器一周，转正当天宣布在 Cursor 等首发伙伴限时免费。快到「思考过程一闪而过」，Grok 第一次在 Cursor 有了存在感。",
    detail: "2025 年 8 月 28 日，xAI 官宣 grok-code-fast-1：专为 agentic 编码打造的轻快推理模型，API 定价 $0.20/M 输入、$1.50/M 输出，并在 Cursor、GitHub Copilot、Windsurf 等首发伙伴限时免费。此前一周它以代号 sonic 匿名上架，团队蹲在社区频道边收反馈边热更 checkpoint——先匿名公测、再择日转正的打法自此成为 xAI 惯例。\r\n\r\n开发者的第一观感是速度：实测吐字快到 Cursor 里的推理步骤根本来不及读。xAI 自己引用的用户证言也直白：「快到我不得不改变在 Cursor 里的工作方式——拆小任务、快速迭代。」\r\n\r\n彼时没人想到这条「便宜快枪」是伏笔：一年后 Grok 4.5、4.6 相继成为 Cursor 的一方模型，xAI 随 SpaceX 合并成了 Cursor 的母公司系（见火箭并购案系列）。进场时是客座模型，回头看是先遣部队。",
    series: "模型军备",
    source: "https://x.ai/news/grok-code-fast-1"
  },
  {
    side: "main", date: "2025-09-29", tag: "双子",
    title: "4.5 双子：最强称号连庄",
    summary: "Sonnet 4.5 发布，号称当时全球最强编码模型，价格不变；八周后 Opus 4.5 跟进，价格砍到上代 Opus 的三分之一，Cursor 同步开「按 Sonnet 价试用」。最强称号，一个秋天连换两次。",
    detail: "2025 年 9 月 29 日 Sonnet 4.5 发布：主打长程任务与「生产级应用」，$3/$15 价格不动。Truell 给 TechCrunch 的背书点在要害：「长程任务上的编码新标杆。」彼时 GPT-5 刚在多项编码基准上挑战 Anthropic 的统治地位，4.5 是回应。\r\n\r\n11 月 24 日 Opus 4.5 接棒：「全球最强编码、agent 与计算机使用模型」，定价 $5/$25——比 Opus 4.1 便宜三分之二。Cursor 论坛当天置顶：Opus 4.5 上架，12 月 5 日前按 Sonnet 价试用。旗舰智能第一次垂到中档价位，为次年「拿 Opus 当日常主力」铺平了路。\r\n\r\n军备竞赛的节奏在这个秋天定型：每六到八周一发、发布材料必带 Cursor 背书、上架必配限时促销。模型公司与编辑器公司，谁是谁的渠道，开始说不清了。",
    series: "模型军备",
    source: "https://www.anthropic.com/news/claude-sonnet-4-5"
  },
  {
    side: "main", date: "2025-10-29", tag: "发布",
    title: "Cursor 2.0 与自研模型 Composer",
    summary: "首个自研编码大模型亮相，八个 Agent 并行开工。它不再只是编辑器，更像一间作战指挥部。",
    detail: "2025 年 10 月 29 日，Cursor 2.0 发布，同场亮相的还有首个自研编码大模型 Composer——官方称其编码速度是同类前沿模型的 4 倍。全新的多 Agent 界面支持最多八个智能体并行处理不同任务，各自在独立工作区推进。\n\n从调用别人的模型，到自己下场炼模型，Cursor 补上了版图里最关键的一块。",
    series: "自研模型线",
    source: "https://cursor.com/blog/2-0"
  },
  {
    side: "main", date: "2025-10-29", tag: "变阵",
    title: "2.0 发布当天，CTO 官宣离开",
    summary: "Cursor 2.0 刷屏的同一天，联创 CTO Arvid Lunnemark 在个人博客发出「Leaving」，转身创办 AI 安全实验室 Integrous Research。四人牌桌，第一次少了一个人。",
    detail: "10 月 29 日前后（路透、The Hindu 等于 29 日报道），联创 Arvid Lunnemark 在个人网站发文：「今天我告诉团队，我决定离开 Cursor。」全文百余词，克制到近乎冷淡。这位 25 岁的瑞典人是数学奥赛金牌得主，四位 MIT 联创中的系统与基建担当，长期担任 CTO。\r\n\r\n去向是 Integrous Research——一家研究「在超级智能时代之前、之中、之后保护个体自由」的安全实验室。工商档案显示，这家公司早在 2024 年 7 月就已注册，比他官宣离职早了十五个月。牌，早就摸好了。\r\n\r\n两周后，D 轮 23 亿美元官宣、估值 293 亿（见 2025-11-13 档案）；八个月后，SpaceX 的 600 亿全股票收购让他成为账面亿万富翁。最早离席的人，票价一分没少。",
    source: "https://arvid.xyz/posts/leaving/"
  },
  {
    side: "main", date: "2025-11-13", tag: "融资",
    title: "D 轮 23 亿美元，估值 293 亿",
    summary: "Accel、Coatue 领投，NVIDIA 与 Google 现身股东名单。AI 基础设施巨头集体押注。",
    detail: "2025 年 11 月 13 日，Anysphere 完成 23 亿美元 D 轮，Accel 与 Coatue 联合领投，NVIDIA、Google 以新投资者身份入局，投后估值 293 亿美元。\n\n当卖铲子的（NVIDIA）和自家也做 AI 编程的（Google）都选择把钱放进你的牌桌，这场牌局的走向已经不言自明。",
    series: "融资阶梯",
    source: "https://cursor.com/blog/series-d"
  },
  {
    side: "main", date: "2025-12-19", tag: "并购",
    title: "Graphite 加入 Cursor",
    summary: "代码评审平台并入版图。写代码的是 Agent，审代码的也是 Agent，软件生产的闭环就此扣上。",
    detail: "2025 年 12 月 19 日，Cursor 官宣与代码评审平台 Graphite 签署最终收购协议。公告同时强调 Graphite 将继续独立运营，团队和产品不变——这是签约，不是当场并线。至此：写码（Agent）、补全（Tab）、审查（Bugbot + Graphite）、评审工作流全部收入囊中。\n\n公告里那句话后来被反复引用：写代码的地方和协作代码的地方，边界正变得越来越武断。还留了个钩子——有些更激进的想法，暂时还不能说。八个月后，那个想法叫 Origin。\n\n软件生产流水线的每一环都有了 AI 值守，闭环扣上了。",
    source: "https://cursor.com/blog/graphite"
  },
  {
    side: "main", date: "2026-01-22", tag: "发布",
    title: "Cursor 2.4：Subagents 与 Skills",
    summary: "2.4 一次上新五件套：Subagents 并行拆解任务、Skills 开放标准、图像生成、企业版 Cursor Blame 标注每行代码出自 AI 还是人，agent 还学会了边干活边追问。编辑器开始长出组织结构。",
    detail: "1 月 22 日 Cursor 2.4 上线。Subagents——独立上下文、可自定义提示词、工具与模型的子智能体，内置代码库调研、终端执行、并行工作流三种，主 agent 从单兵变成带编制的小队。Skills 以开放标准的姿态发布，用领域知识和工作流给 agent 扩容。企业版的 Cursor Blame 把 git blame 升级成 AI 溯源：哪行是 AI 写的、出自哪次对话，一键回链。\r\n\r\n从 2.0 的八个 agent 并行，到 2.4 的每个 agent 会往下派活，再到 2.5 版 subagent 可以再生 subagent——树状作业成形。「这段代码谁写的」这个古老问题，第一次有了行级答案。\r\n\r\n一个月后，云端 agent 将学会自己用电脑测试和录屏（见 2026-02-24 档案）。组织结构有了，接下来是生产资料。",
    source: "https://cursor.com/changelog/2-4"
  },
  {
    side: "main", date: "2026-02-24", tag: "进化",
    title: "云端 Agent 学会用电脑",
    summary: "Cloud Agents 更新：每个云端 agent 配一台隔离虚拟机，自己跑软件、测试改动、录屏截图写日志交作业。CNBC 同期披露：Cursor 自家 35% 的 PR 已由 agent 独立产出。",
    detail: "2 月 24 日，Cloud Agents 获得「计算机使用」能力：在各自的隔离 VM 上构建、运行、验证自己的改动，交付物从一段 diff 变成 diff 加演示视频、截图与日志，人类只管验收。同期 CNBC 报道援引官方口径：Cursor 内部约 35% 的 pull request 已由 agent 在自己的虚拟机上独立生成。\r\n\r\n这个数字后来稳定住了——半年后 Origin 发布公告里写的是「约三分之一」（见 2026-08-17 档案）。\r\n\r\n「不放心 AI 干活」的答案不是盯着它，而是让它自证。这套自测加录屏的底子，此后撑起了 Automations（3-05）、iOS 版的验收流（6-29）和 Grok Bot 的云电脑（8-11）。同一年里所有「agent 交作业」的故事，都从这一天的虚拟机开始。",
    source: "https://kingy.ai/ai-launch-tracker/cursor-cloud-agents-computer-use-2026-02-24-major-update/"
  },
  {
    side: "main", date: "2026-03-02", tag: "里程碑",
    title: "ARR 破 20 亿：史上最快",
    summary: "彭博报道 Cursor 年化收入突破 20 亿美元：从零到 20 亿，企业软件史上最快，快过 Slack、Zoom 与 Snowflake。付费客户超百万，财富 500 强约三分之二在册。增长曲线本身，成了估值的全部论据。",
    detail: "增长的台阶密得不像话：2025 年 1 月破 1 亿、6 月破 5 亿、11 月破 10 亿，2026 年 2 月破 20 亿——三个月翻一倍，据多方报道为企业软件史上最快达成 20 亿 ARR 的公司。此后 5 月 21 日破 30 亿，6 月收购前夕据报约 40 亿，公司自己给出的年底预期是 60 亿以上。\r\n\r\n同期另一条线在水下进行：多方消息称 Anysphere 正洽谈新一轮约 20 亿美元融资，估值直奔 500 亿，a16z 与 Thrive 拟联合领投、NVIDIA 战略跟投。这轮融资最终没有等来官宣——四月起，牌桌上坐进来一家火箭公司，剧本换了（见 2026-04-21 档案）。\r\n\r\n融资阶梯爬到第七级，下一级不是 E 轮，是收购要约。",
    series: "融资阶梯",
    source: "https://tech-insider.org/cursor-60-billion-valuation-anysphere-ai-coding-2026/"
  },
  {
    side: "main", date: "2026-03-04", tag: "破壁",
    title: "Cursor 开进 JetBrains",
    summary: "通过 Agent Client Protocol，Cursor 以 agent 身份入驻 IntelliJ、PyCharm、WebStorm 全家桶——不换编辑器也能用 Cursor。三年前的嘲讽就此反转：如今是别人的编辑器里，装着 Cursor。",
    detail: "3 月 4 日，Cursor 宣布登陆 JetBrains 全系 IDE：借 JetBrains 与 Zed 共同开发的开放协议 ACP（Agent Client Protocol），在 ACP Registry 一键安装、登录 Cursor 账号即用。无需 JetBrains AI 订阅，但要 Cursor 付费计划。JetBrains 官博的说法是：这是 Registry 里呼声最高的 agent。\r\n\r\n意义在墙外：这是 Cursor 第一次把 agent 能力送出自家 IDE 的围墙。桌面、网页、CLI、iOS 之外，又多了一块别人的地盘——而且是 Java 世界的腹地。\r\n\r\n2023 年 HN 顶楼曾问：「我为什么不直接用一个支持 Copilot 的现成编辑器？」（见 2023-03-24 野史）。三年后 Cursor 的回答是：好，那我住进你的现成编辑器。",
    source: "https://cursor.com/changelog/03-04-26"
  },
  {
    side: "main", date: "2026-03-05", tag: "发布",
    title: "Automations：永不下班的 agent",
    summary: "定时器、Slack 消息、Linear 工单、PR 合并、PagerDuty 告警——任何事件都能自动拉起一个云端 agent 干活。人类不再负责按下每一次启动键，只在流水线需要时被叫回来签字。",
    detail: "3 月 5 日 Cursor Automations 上线：一个触发器、一段提示词、一份工具授权，就是一条永不下班的自动化。事件来了，云端 agent 自己拉起、干完、自验，能开 PR、评论代码、发 Slack、调 MCP，还能用 Memories 跨次学习。模板市场同步开张。\r\n\r\n官方的自用数据很能说明问题：Cursor 内部每小时跑数百条 automation——每次 push 触发安全审计、PagerDuty 告警自动查服务器日志、每周自动给全员写一份 shipped 摘要。TechCrunch 引述其工程负责人的定性：「不是人类退出了，而是人类不再负责发起。他们在传送带需要的节点被叫进来。」\r\n\r\nBugbot 是它的前身，Origin 是它的下游。「软件工厂」从比喻变成产品线：2.4 建制，2-24 配机，3-05 排班。",
    source: "https://cursor.com/blog/automations"
  },
  {
    side: "main", date: "2026-03-19", tag: "发布",
    title: "Composer 2 与首次持续预训练",
    summary: "3 月 19 日 Composer 2 上线，官方称前沿级编码智能，定价每百万 token 0.5 与 2.5 美元，另有同等智能的 Fast 变体并设为默认。这是 Cursor 第一次跑通持续预训练加强化学习的完整链路。",
    detail: "官方列出三项改进：全基准大幅提升，包括 Terminal-Bench 2.0 与 SWE-bench Multilingual；基于首次持续预训练，用强化学习在长程编码任务上训练，能解决需要数百步动作的问题；引入 Fast 变体作为默认，比其它家的快模型更便宜。\n\n这是 Cursor 从调用别人的模型走到自己是模型公司的关键一步——彼时估值 293 亿美元，这个身份认定值很多钱。\n\n公告里没有出现的那个词，会在二十四小时内由社区替它说出来。同日的暗面，另见野史。",
    series: "自研模型线",
    source: "https://cursor.com/blog/composer-2"
  },
  {
    side: "main", date: "2026-04-02", tag: "发布",
    title: "Cursor 3：Agents Window",
    summary: "4 月 2 日 Cursor 3 发布，带来从零重建的 Agents Window——以智能体为中心的统一工作台，跨仓库、跨环境，本地与云端一键互搬。编辑器第一次退居其次。",
    detail: "官方描述：天然多工作区，本地、云端、worktree、远程 SSH 上的 agent 全部汇入同一侧栏，包括从手机、网页、桌面、Slack、GitHub 和 Linear 发起的会话。云端 agent 会自己产出演示视频和截图供你验收。会话可以在本地与云端之间搬迁——想动手改就拉回本地，想离线跑就推到云上。同时内置更简洁的 diff 视图，以及不离开窗口就能暂存、提交、管理 PR。\n\n官方反复强调一件事：老的 VS Code 式界面不会下线，两套并行，可以同时开。\n\n从 2.0 的八个 agent 并行，到 3.0 的 agent 是一等公民，编辑器这个词第一次显得不够用了。",
    source: "https://cursor.com/blog/cursor-3"
  },
  {
    side: "main", date: "2026-04-16", tag: "军备",
    title: "Opus 4.7 与 Mythos 的影子",
    summary: "Opus 4.7 发布，Cursor 当日上架，价格仍是 $5/$25。真正的新闻藏在措辞里：官方承认它「不如 Mythos Preview 全面」——那个只向少数机构开放的神秘旗舰，两个月后将以 Fable 5 之名面世。",
    detail: "2026 年 4 月 16 日，Opus 4.7 发布：继 2 月 Opus 4.6 之后又一轮六周迭代，agentic 编码、多学科推理、规模化工具调用全面提升，价格与上代持平。Cursor 首日接入——有隔壁竞品的论坛用户当天统计：主流编码工具里，只剩一家还没上架。\r\n\r\nCNBC 点破了这次发布的微妙之处：Anthropic 明说 4.7「不如 Mythos Preview 广泛能干」。Mythos 是本月早些时候通过网络安全计划 Project Glasswing 向少数企业开放的受限旗舰——公开卖的不是最强的，最强的在门后。\r\n\r\n这道影子两个月后落地：6 月 9 日，「做了安全处理的 Mythos 级模型」以 Claude Fable 5 之名公开发布（见该日档案）。回头看，4.7 是一次占位——真正的牌，Anthropic 一直扣在手里。",
    series: "模型军备",
    source: "https://www.cnbc.com/2026/04/16/anthropic-claude-opus-4-7-model-mythos.html"
  },
  {
    side: "main", date: "2026-04-21", tag: "结盟",
    title: "SpaceX 算力联姻：600 亿期权",
    summary: "SpaceX 官宣与 Cursor 结盟：Cursor 用 Colossus 百万 H100 级算力练模型，SpaceX 拿到年底前以 600 亿美元收购的选择权——不买，则付 100 亿合作费。要么娶回家，要么付彩礼。",
    detail: "4 月 21 日，SpaceX 在 X 官宣、Cursor 同日发博客确认：双方将联手打造「世界最强的编码与知识工作 AI」。核心条款只有一句：SpaceX 获得年底前以 600 亿美元收购 Cursor 的选择权，若不行权，则为这场合作支付 100 亿美元。Colossus 超算位于孟菲斯、约合一百万张 H100——它随 2 月 SpaceX 与 xAI 的全股票合并（合并后估值约 1.25 万亿美元）并入火箭版图。\r\n\r\nCursor 官方博客的动机写得很直白：「我们一直想把训练推得更远，但被算力卡住了。」Composer 2 已摸到前沿，再往上，需要的是正常渠道拿不到的基建。Truell 转发时的说法是「很高兴与 SpaceX 团队一起 scale up Composer」。\r\n\r\n此后的节拍器精确得像发射倒计时：5 月 Composer 2.5 上线，6 月 12 日 SpaceX 上市，6 月 16 日行权。所谓选择权，从签字那天起就只剩一个选项。",
    series: "火箭并购案",
    source: "https://cursor.com/blog/spacex-model-training"
  },
  {
    side: "main", date: "2026-04-24", tag: "军备",
    title: "GPT-5.5 进场：官方五折",
    summary: "OpenAI 发布 GPT-5.5（代号 Spud），API 开放次日即进 Cursor，官方联合促销五折到 5 月 2 日。至此 OpenAI 对 Cursor 的供货节奏跑成惯例：旗舰零时差，Codex 系晚三周。",
    detail: "4 月 23 日 GPT-5.5 发布，主打长程任务的持久力——OpenAI 官方通稿里有一句耐人寻味的话：「这对用户托付给 Cursor 的长程工作最重要。」API 于 24 日开放，Cursor 当天上架并联合五折促销至 5 月 2 日；API 定价 $5/$30，上下文窗口 1M。\r\n\r\nCursor 员工在论坛晒过一张供货节奏表，值得存档：GPT-5（2025-08-07）与 GPT-5.2（2025-12-11）零时差进 Cursor，GPT-5.1 隔一天，GPT-5.4-mini 零时差；Codex 系列因 API 滞后要等 8 到 27 天。规律很清楚：谁家旗舰发布，Cursor 的模型选择器当天或次日就得有名字——做不到才是新闻。\r\n\r\n两周后 OpenAI 补发 GPT-5.5-Cyber，仅向受审的网络安全团队开放。彼时距 Fable 5 因越狱被出口管制还有一个月，模型能力的「危险档」已经开始单独发牌照。军备竞赛，进入带许可证的阶段。",
    series: "模型军备",
    source: "https://forum.cursor.com/t/gpt-5-5-out-now/158953"
  },
  {
    side: "main", date: "2026-05-18", tag: "发布",
    title: "Composer 2.5：更强，且便宜一个量级",
    summary: "官方称最聪明的自研模型上线并成为默认：长任务续航、复杂指令、协作手感全面升级，标准档每百万 token 0.5 / 2.5 美元，首周双倍额度。第三方实测：坐三望二，价格差一个量级。",
    detail: "5 月 18 日 Composer 2.5 上线并取代 Composer 2 成为默认模型。定价延续狠辣：标准档 $0.50/M 输入、$2.50/M 输出，Fast 档 $3 / $15。第三方评测很快跟上：Artificial Analysis 编码 agent 指数 62 分，较 Composer 2 暴涨 14 分，仅次于 Opus 4.7 与 GPT-5.5，而每任务成本约为它们的十分之一到六十分之一。\r\n\r\n出身不再遮掩：仍以月之暗面 Kimi K2.5 开源底座起步——三月那场扒皮风波（见 2026-03-20 野史）之后，官方学会了大方。训练侧用了 25 倍合成任务与定向文本反馈的强化学习；技术帖同时预告：正与 SpaceXAI 用十倍算力从零训练一个大得多的模型。\r\n\r\n次日官方亲自发糖「十倍额度日」（见 2026-05-19 野史）。至于从零训练的那个大家伙，6 月 16 日 Compile 大会揭开一角。",
    series: "自研模型线",
    source: "https://cursor.com/changelog/composer-2-5"
  },
  {
    side: "main", date: "2026-05-28", tag: "军备",
    title: "Opus 4.8：官宣里的 CursorBench",
    summary: "Opus 4.8 发布，Cursor 同日上架。真正值得立档的细节：Anthropic 的官方公告直接拿 CursorBench 当成绩单——一家编辑器公司的内部评测，成了模型厂发布会的通用度量衡。",
    detail: "2026 年 5 月 28 日 Opus 4.8 发布：价格仍是 $5/$25，fast 模式 2.5 倍速、价格却降到前代 fast 的三分之一；Claude Code 侧同步上线「动态工作流」，一个编排器可并行拉起成百上千个子 agent。Cursor 论坛同日置顶：4.8 已上架，在 CursorBench 上比 4.7 高效得多，难题上也更有韧性。\r\n\r\n公告里最有历史感的一句，是 Anthropic 自己写的：「在 CursorBench 上，Opus 4.8 在每个 effort 档位都超过历代 Opus。」自家发布会，引用客户家的考卷——CursorBench 从内部评测变成了行业度量衡，此后 Fable 5、Opus 5、GPT-5.6 的发布材料全都带它。\r\n\r\n评测权即话语权。当所有模型厂都要在你的考卷上答题，编辑器公司就不只是渠道了。一个多月后，Grok 4.5 会用一种更尴尬的方式证明这张考卷的分量（见 2026-07-08 野史）。",
    series: "模型军备",
    source: "https://www.anthropic.com/news/claude-opus-4-8"
  },
  {
    side: "main", date: "2026-06-09", tag: "登顶",
    title: "Fable 5 登基：断层第一",
    summary: "Anthropic 打响 Claude 5 世代第一枪：Fable 5——「做了安全处理的 Mythos 级模型」。AA 智能指数 64.9 断层登顶、领先第二名近 5 分，SWE-Bench Verified 95.5%，CursorBench 直接刷新纪录。",
    detail: "2026 年 6 月 9 日，Claude Fable 5 与 Mythos 5 同日发布。官方定义写得直白：Fable 5 是「做了安全处理、可以公开用的 Mythos 级模型」；Mythos 5 与它同能力但不带安全分类器，仅通过 Project Glasswing 向受审机构开放。两个月前 Opus 4.7 发布时那句「不如 Mythos Preview」的伏笔（见 2026-04-16 档案），就此揭晓。\r\n\r\n成绩单是断层式的：Artificial Analysis 智能指数 64.9 登顶，领先最近的非 Anthropic 模型（GPT-5.5）近 5 分；SWE-Bench Verified 95.5%、SWE-Bench Pro 80.3%、Terminal-Bench 2.1 88%。Cursor 深度参与发布前评测，背书印在官方材料里：「CursorBench 上的最强模型，打开了一类此前够不着的长程问题。」代价同样破纪录：完整跑一遍 HLE 约 2200 美元，且约 9% 的请求触发安全护栏、自动回落到 Opus 4.8——这个回落机制很快将变得众所周知。\r\n\r\n三天后，商务部的出口管制令让它全球消失了 19 天（见 2026-06-12 野史）。史上最强模型的第一个完整月，一半时间在停机。",
    series: "模型军备",
    source: "https://www.anthropic.com/news/claude-fable-5-mythos-5"
  },
  {
    side: "main", date: "2026-06-12", tag: "上市",
    title: "SpaceX 敲钟：弹药就位",
    summary: "据报道 SpaceX 完成史上最大 IPO 登陆纳斯达克，发行价 135 美元。四天后它将行使那份 600 亿选择权——股价越高，全股票收购的稀释成本越低。弹药，在敲钟这天装填完毕。",
    detail: "据多方报道，6 月 12 日 SpaceX 登陆纳斯达克，发行价 135 美元/股，规模为 IPO 历史之最；到 6 月 16 日行权日，股价已收于 192.46 美元。\r\n\r\n先上市、后行权，顺序即策略。Bill Ackman 在 X 上把话挑明：「SpaceX 之所以值钱，部分原因就是它值钱——高估值让收购 Cursor 的稀释成本变得很低。」用二级市场的定价，去支付一级市场的对价，全股票交易的算术就是这么直白。\r\n\r\n同一天，Anthropic 的 Fable 5 被出口管制拉闸（见同日野史）。2026 年 6 月 12 日，一半是资本的狂欢，一半是监管的铁幕。",
    series: "火箭并购案",
    source: "https://tech-insider.org/cursor-60-billion-valuation-anysphere-ai-coding-2026/"
  },
  {
    side: "main", date: "2026-06-16", tag: "惊变",
    title: "SpaceX 签署 600 亿美元收购协议",
    summary: "马斯克签下史上最大创业公司并购案：全股票、600 亿美元。一家火箭公司，买下了一个编辑器。",
    detail: "2026 年 6 月 16 日，SpaceX 与 Anysphere 签署合并协议：全股票交易，隐含股权价值 600 亿美元，创下风投支持创业公司被并购的历史纪录。此前 4 月，双方已达成算力合作并附带收购选择权。\n\n福布斯当日评论：这笔交易把一家火箭公司直接拽进了 AI 编程战争的中心。",
    series: "火箭并购案",
    source: "https://www.sec.gov/Archives/edgar/data/1181412/000162828026043411/spaceexplorationtechnologi.htm"
  },
  {
    side: "main", date: "2026-06-16", tag: "首秀",
    title: "Compile 大会：三箭齐发",
    summary: "首届开发者大会与收购官宣同日举行：Origin 代码托管揭幕、Cursor Mobile 开放 TestFlight、官宣正用十万卡 Colossus 从零训练 1.5 万亿参数前沿模型。被收购的那个下午，它发布得像个平台公司。",
    detail: "6 月 16 日，旧金山，首届 Compile 大会三箭齐发。第一箭 Origin：为 agent 规模而生的 git 托管，NVMe 文件服务器加 S3 作真源，AI 自动解合并冲突，目标全球同步延迟低于 400 毫秒——现场演示模拟了数千个 agent 同时读写一个仓库，秋季 GA（实际 8 月 17 日提前开 beta，见该日档案）。第二箭 Cursor Mobile：iOS TestFlight 公测，管理 agent、疏通卡住的任务、评审截图（6 月 29 日全量公测，见该日档案）。第三箭最重：Truell 官宣正在 Colossus 十万余张 GPU 上从零预训练一个 1.5 万亿参数级的前沿模型——不再依赖任何开源底座，算力是此前所有 Cursor 模型的 10 到 20 倍，剑指编码之外的通用知识工作，「数周内发布」。\r\n\r\n同一个下午，SpaceX 确认行使 600 亿美元收购权。主讲 Origin 的是联创 Tomas Reimers——Graphite 的创始人，去年 12 月那笔收购的用意就此揭晓。\r\n\r\n余味：那个「数周内发布」的模型，直到 8 月底仍未露面。7 月泄露的「Vega」是不是它，无人确认（见 2026-07-20 野史）。发布会一时爽，交付日历火葬场。",
    source: "https://www.techtimes.com/articles/319031/20260624/cursors-github-rival-origin-new-spacex-model-raise-code-custody-stakes.htm"
  },
  {
    side: "main", date: "2026-06-29", tag: "发布",
    title: "Cursor 上手机",
    summary: "6 月 29 日 iOS 版公测：手机上派活给云端 agent，锁屏用实时活动追进度，看 demo、审 diff、直接合 PR。官方的说法是，笔记本可以睡着、可以够不着、可以在忙别的，你的活不停。",
    detail: "能力清单：选仓库起云端 agent，可挑模型、可从 Plan Mode 起步、可语音输入、可用斜杠命令操控；离开 app 后靠锁屏实时活动和推送保持在环；云端 agent 交付的不只是代码，还有 demo、截图和日志；本地与云端会话可以来回接力；配合 Cursor 3.9，还能直接遥控跑在自己机器上的 agent。\n\n全部付费计划当天可用，7 月 5 日前手机端跑 Composer 2.5 打 2.5 折。Android 官方称在计划中但无时间表，iPadOS 试验过、说会再回来——一个月后 iPad 版如约上线。\n\n评论区被反复提起的两件事：最低只支持 iOS 26，一批还在 iOS 18 的老设备用户装不上；以及中国大陆无法使用。",
    source: "https://cursor.com/blog/ios-mobile-app"
  },
  {
    side: "main", date: "2026-06-30", tag: "平价",
    title: "Sonnet 5：解封日的加更",
    summary: "出口管制解除的同一天，Anthropic 加更 Sonnet 5：接近 Opus 4.8 的 agent 能力，中档价还打 33% 折到 8 月底，Cursor 当日上架。旗舰尚未回岗，替补先把便宜的活全接了。",
    detail: "2026 年 6 月 30 日——恰是 Fable 5 出口管制解除、次日全球复活的当口——Anthropic 发布 Sonnet 5：官方称最具 agent 能力的 Sonnet，多步工具调用与自我验证行为接近 Opus 4.8，CursorBench 57%（上代 Sonnet 4.6 为 49%）；claude.ai 免费与 Pro 用户当日切为默认。\r\n\r\nCursor 同日上架并转发促销：introductory 价 $2/$10，8 月 31 日后回到 $3/$15。一个容易被忽略的细节：新 tokenizer 对同样文本要多计约 1.0 到 1.35 倍 token——账面同价，实付未必。\r\n\r\n发布节奏本身就是声明：旗舰被监管按了 19 天，Anthropic 用一次中档发布宣告生产线无恙。对 Cursor 用户，这是 2026 年性价比最高的日常主力候选——直到四周后，Opus 5 把「半价旗舰」也端上桌（见 2026-07-24 档案）。",
    series: "模型军备",
    source: "https://forum.cursor.com/t/claude-sonnet-5-now-available/164463"
  },
  {
    side: "main", date: "2026-07-08", tag: "发布",
    title: "Grok 4.5：联合训练第一枪",
    summary: "签约后的第一个联合作品：Cursor 与 SpaceXAI 共训的 Grok 4.5 上线，官方称其最智能、且首次面向软件工程之外。$2/$6 的定价把 Opus 级智能打到地板价，首周双倍额度。",
    detail: "Cursor 官方博客的措辞是「together with SpaceXAI」：Grok 4.5 是双方联合训练的 MoE 模型，训练数据包含「数万亿 token 的 Cursor 数据」，面向编码、agent 任务与更广的知识工作——法律、金融、数据分析都在目标清单上。桌面、网页、iOS、CLI、SDK 全端可用，基础档 $2/M 输入、$6/M 输出，fast 档 $4/$18，token 效率约为同级模型两倍。Musk 的定位一句话：「Opus 级模型，但更快、更省、更便宜。」\r\n\r\n第三方数据把「地板价」坐实：Artificial Analysis 智能指数 54 分列第四（Fable 5 为 60），但每任务成本 2.49 美元，约为 Fable 5 的四分之一，被评为「比榜前模型便宜近九成」。彼时 Fable 5 刚结束 19 天的出口管制风波（见 2026-06-12 野史），「Opus 级平替」的广告词打得正是时候。\r\n\r\n这是 4 月算力联姻后的第一件联合作品，也是 Composer 之外的第一条模型线。发布帖脚注里埋着一颗雷，二十四小时内被全网挖出——同日野史。",
    series: "火箭并购案",
    source: "https://cursor.com/blog/grok-4-5"
  },
  {
    side: "main", date: "2026-07-09", tag: "夺榜",
    title: "GPT-5.6 三连星：Sol 夺回榜首",
    summary: "Grok 4.5 发布次日，OpenAI 甩出 GPT-5.6 家族：旗舰 Sol、均衡 Terra、走量 Luna。Coding Agent Index 80 分反超 Fable 5 近 3 分且便宜三成，Cursor 总裁亲自站台。七月，三大厂全下场了。",
    detail: "2026 年 7 月 9 日，GPT-5.6 结束限量预览转正：Sol 在 Artificial Analysis Coding Agent Index 以 80 分刷新纪录，超 Fable 5 约 2.8 分，token 用量减半、成本低约三分之一；Terra 略胜 Fable 5 而成本约十六分之一；新增 ultra 档，默认四个 agent 并行作业。发布材料照例带 CursorBench——Cursor 总裁 Oskar Schulz 背书：「我们测过的最强模型之一，期待把它带给 Cursor 用户。」\r\n\r\n「期待带给」四个字暴露了时差：GA 当天 Cursor 未同步上架，Sol / Terra / Luna 数日后才进入原生选择器，按 $5/$30、$2/$12、$0.2/$1.2 从第三方模型池计费。随后是连环降价：7 月 30 日 Luna 直砍 80%、Terra 降 20%；8 月 21 日 Sol 再降两成——榜首易主之后，价格战接管战场。\r\n\r\n把日历排开看这个夏天：6-09 Fable 5 登基，7-08 Grok 4.5 掀桌，7-09 GPT-5.6 夺榜，7-24 Opus 5 半价跟注。四张王牌五十天内全部亮出——模型军备竞赛最密集的一季，Cursor 的模型选择器成了唯一的公证处。",
    series: "模型军备",
    source: "https://openai.com/index/gpt-5-6/"
  },
  {
    side: "main", date: "2026-07-22", tag: "发布",
    title: "Cursor Router：让路由替你挑模型",
    summary: "7 月 22 日智能路由上线：按任务类型与复杂度分流，硬活交前沿模型，其余交便宜的。官方称早期用户在 Auto 请求上省下约 31% 到 52%，质量与留存率未见下滑。",
    detail: "在模型选择器里选 Auto，每一次 agent 请求都会被分类并路由到质量相当但最省钱的模型。提供三档优化模式可随时切换：Intelligence 走前沿质量，Balance 是多数人的日常档，Cost 则是过去那个固定单价的老 Auto。官方称在数百万请求的线上 A/B 中，做到了接近前沿的表现和显著更低的成本。\n\n管理侧能力给得很足：可按团队或分组启用，限制成员能选哪些模式、设默认模式、放行或封禁底层模型、决定是否显示实际路由到的模型，还能软性或强制地把 Auto 设为团队默认。\n\n覆盖桌面、网页、iOS、CLI 与 SDK，当天对 Teams 与 Enterprise 开放，Teams 默认开启。个人版没有——这一条会在次日引发另一场火。",
    series: "定价攻防",
    source: "https://forum.cursor.com/t/introducing-cursor-router/166386"
  },
  {
    side: "main", date: "2026-07-24", tag: "平替",
    title: "Opus 5：半价的 Fable",
    summary: "Anthropic 发布 Opus 5：接近 Fable 5 的智能，价格只要一半，CursorBench 3.2 满力档与 Fable 峰值只差 0.5%。发布前它已在 Cursor 里两度走光——代号「Honeycomb」，连报错弹窗都提前泄了底。",
    detail: "2026 年 7 月 24 日 Opus 5 发布：$5/$25 与 4.8 持平，1M 上下文，知识截止 2026 年 5 月；官方主打一句话——以 Opus 的速度和价格，交付接近 Fable 5 的智能。CursorBench 3.2 满力档距 Fable 5 峰值仅 0.5%，每任务成本约一半；Claude Max 当日把它切为默认。发布材料照例有 Cursor 背书：「就在 Fable 5 之下，行为习惯也像。」\r\n\r\n有趣的是发布前的泄露链，两次都发生在 Cursor：7 月 8 日前后，一个名为「Honeycomb EAP 1M Extra High」的条目在 Cursor 模型列表里短暂现身又消失，1M 上下文与算力档位后来全部对上；7 月 24 日官宣前数小时，有用户晒出 Cursor 的报错弹窗，赫然写着 claude-opus-5-thinking-high——正主还没上台，通告先从后台飘了出来。\r\n\r\n至此 Anthropic 在 Cursor 排出完整梯队：Fable 5 打硬仗，Opus 5 当主力，Sonnet 5 走量。一个月后的连环故障会证明这个梯队的另一面：主力越集中，上游一咳嗽，下游全感冒（见 2026-07-31 档案）。",
    series: "模型军备",
    source: "https://www.anthropic.com/news/claude-opus-5"
  },
  {
    side: "main", date: "2026-07-28", tag: "发布",
    title: "Cursor Start：印度专属 649 卢比",
    summary: "7 月 28 日印度专属套餐上线，月费 649 卢比含税、支持 UPI 支付，包含 Grok 4.5 与 Composer。官方同时披露：印度有超过 300 万开发者在用 Cursor，约占全球用户的十一分之一。",
    detail: "Start 含 Cursor 自研模型的慷慨额度——最强的 Grok 4.5 与最具性价比的 Composer；比免费版更多的 agent 请求，覆盖桌面、网页、iOS 与 CLI；常驻云端 agent；iOS 版，以及插件、MCP、hooks 与 skills。Pro 仍面向需要全部第三方顶级模型、Bugbot、Auto、Automations、SDK 和超额按量的人。\n\n官方给出的理由是数据：印度用户一年翻了三倍，且是全球每席位 agent 请求数最高的市场，重度用户密度第一。同期在海得拉巴与班加罗尔办线下活动。\n\n公告结尾写得很直白：先从印度开始，学到东西再带去更多市场。一条区域定价线就此划开——一个全球产品第一次承认，同一份代码在不同经度值不同的钱。",
    source: "https://forum.cursor.com/t/cursor-start-a-new-plan-for-developers-in-india/166792"
  },
  {
    side: "main", date: "2026-07-29", tag: "故障",
    title: "Anthropic 一崩，Cursor 跟着崩",
    summary: "7 月 29 日，Cursor 报 critical 级故障——Anthropic 的 Claude 模型大面积报错，官方直接把用户指向 status.claude.com。把命脉押在第三方模型上的代价，写在了状态页上。"
  },
  {
    side: "main", date: "2026-07-31", tag: "动荡",
    title: "盛夏故障潮：依赖链上的连环宕机",
    summary: "据官方状态页，2026 年盛夏 Cursor 服务频频告警：一个多月至少 10 次 major/critical 级故障——7 月 31 日一度全线宕机，波及 IDE、Cloud Agents 与 Automations。而多数故障的根源不在自己，在它依赖的上游。",
    detail: "Cursor 官方状态页（status.cursor.com）记录，2026 年 7 月中旬到 8 月中旬的一个多月里，至少发生 10 次 major 或 critical 级事件。7 月 16 日 Grok 4.5 降级；7 月 29 日「Anthropic 模型大面积报错」，官方直接把用户指向 status.claude.com；7 月 31 日一场 critical 级「widespread issue」波及 IDE、Cloud Agents、Automations 全线；8 月 17 日又因 GitHub 上游故障，导致 Automations、Cloud Agents、Codebase、Review Agents 连锁停摆约 6 小时；8 月 19 日连主力模型 Fable 5 也短暂不可用。\n这些故障有个耐人寻味的共性：多数不是 Cursor 自己坏了，而是它依赖的东西坏了——Anthropic 的模型、GitHub 的服务、xAI 的 Grok。作为编排层，它的可用性天然叠加在一长串上游之上；上游打个喷嚏，它就得停摆。三年前野史里那句「不就是个套壳」的嘲讽，此刻被官方状态页用硬数据写下了另一种注脚。\n扩张越快，这条依赖链越长、越脆。此前推出自研模型 Composer，本意之一正是把命脉握回手里；但从这个盛夏看，无论自研还是外接，稳定性都仍是一道未解的考题。可用性的战争，才刚开始。"
  },
  {
    side: "main", date: "2026-08-11", tag: "发布",
    title: "Grok Bot：会自己开电脑的队友",
    summary: "8 月 11 日 Grok Bot 早期测试上线：AI 队友登录你在用的工具，在一台常驻云电脑上干活，有浏览器、文件系统和终端，把整件事做完才回来找你签字。",
    detail: "官方设定的用法是像对待同事一样：交代任务、关上电脑，之后从桌面或 iOS 接回线头。Bot 的云电脑会保留文件与登录态，有连接器和 MCP 的地方走接口，没有的地方直接操作界面，让成果落在真实工具里而不是一份待你搬运的草稿。多个 Bot 共用一台电脑、各自一块屏幕，可以并行、互发消息、在群聊里共享上下文、互相移交任务。带它走一遍多系统流程，它会存成 routine，之后按需或定时重跑。\n\n官方主动点了一条安全边界：这台电脑绑定的是你的账号而非单个 Bot，所以放上去的任何登录态和文件，等于对你名下全部 Bot 开放。\n\n需要留意署名：发布方是母公司旗下的 SpaceXAI，公告发在 x.ai，Cursor 侧只是同步开放订阅入口。首发限 SuperGrok Heavy、Cursor Ultra 与 Cursor Teams Premium，企业版排队。半个月后它会下放到 Pro 与全部 Teams——那才是民间真正开始研究它的时候。",
    source: "https://x.ai/news/introducing-grok-bot"
  },
  {
    side: "main", date: "2026-08-12", tag: "整合",
    title: "Grok 4.6：与 SpaceXAI 联名",
    summary: "交割前两天，Cursor 与 SpaceXAI 联合发布 Grok 4.6，主攻长任务 agent。在 Artificial Analysis 智能指数上与 GPT-5.6 Sol 打平，并新增 Extra High 算力档。",
    detail: "官方口径是 together with SpaceXAI——继 7 月 Grok 4.5 之后的又一次联名发模型，也是交割前的最后一次。三项重点：长任务上更能扛，在长轨迹上做更多自测与自我验证，确认无误才往下走；把一个宽泛的产品想法变成能跑的第一版更强，视觉与交互部分的首轮产出明显优于 4.5；智能指数（九项基准的合成）与 GPT-5.6 Sol 持平，新增 Extra High 让算力匹配任务难度。\n\n覆盖桌面、云端 agent、iOS、CLI 与 SDK，个人与团队计划首周双倍额度。Grok 4.5 保留，Composer 仍是日常的快模型。\n\n收购前，Cursor 的模型叙事是自研加接入全部大厂；收购后，公告抬头第一顺位的名字换了。署名方式本身，就是一则公告。",
    series: "火箭并购案",
    source: "https://forum.cursor.com/t/grok-4-6-is-now-live/168189"
  },
  {
    side: "main", date: "2026-08-14", tag: "纪元",
    title: "交割完成，Cursor 并入 SpaceX",
    summary: "SEC 文件确认：约 3.89 亿股换股完成，Anysphere 成为 SpaceX 全资子公司。VS Code 分叉，随火箭入列。",
    detail: "2026 年 8 月 14 日，合并正式生效。SEC 文件显示 SpaceX 增发约 3.893 亿股 A 类普通股作为对价，Anysphere 成为其全资子公司，团队并入 SpaceX 的 AI 软件部门。\n\n四年前那个被嘲「套壳」的 VS Code 分叉，如今以 600 亿美元身价随火箭入列。本刊继续跟踪报道。",
    series: "火箭并购案",
    source: "https://www.sec.gov/Archives/edgar/data/1181412/000162828026056945/spcx-20260814.htm"
  },
  {
    side: "main", date: "2026-08-17", tag: "故障",
    title: "GitHub 一崩，六小时连锁停摆",
    summary: "8 月 17 日，GitHub 上游故障拖垮 Cursor 的 Automations、Cloud Agents、Codebase 与 Review Agents，持续约 6 小时——本轮盛夏故障潮里最长的一次。"
  },
  {
    side: "main", date: "2026-08-17", tag: "里程碑",
    title: "Origin 上线，Cursor 自己托管代码",
    summary: "8 月 17 日推出代码托管平台 Origin：建仓、推送、浏览、PR、GitHub 双向同步，全在编辑器里。官方称这是一个为 agent 规模而生的 git forge——车开进了 GitHub 的地盘。",
    detail: "早期 beta，当天面向全部付费计划推送，免费版没有，企业管理员可退出——注意是 opt-out 而非 opt-in。使用前需认领一个 codebase 名字，它会成为每个仓库 URL 的一部分。Cursor 托管的仓库用 Origin CLI 或标准 git 推送；GitHub 仓库可接入并实时同步，推送仍走 GitHub，源头以 GitHub 为准。每个仓库都带 PR：时间线、提交、检查、文件变更、评论、合并；同步仓库上评审双向打通，Cursor 里的评论会发到 GitHub，GitHub 上的回复几秒内回到 Cursor。云端 agent 可直接对 Origin 远端克隆、开分支、提交、开 PR；Apps 标签页可接 Vercel、Depot、Buildkite，后两者都能原样跑你现有的 GitHub Actions 工作流。\n\n这块拼图的来历可以上溯到 2025 年 12 月的 Graphite——堆叠式 PR 与理解 agent 的合并队列不是凭空长出来的，Graphite 联创 Tomas Reimers 正是 Origin 的负责人，并在 6 月的 Compile 大会上首次揭幕。支撑这门生意的那个数字同样惊人：Cursor 内部合并的 PR 里，已有约三分之一由自主运行的云端 agent 发起。\n\n从编辑器，到模型，到评审，到托管。四年前那个被叫作套壳的分叉，如今想把地基一起换掉。同一天的民间视角，另见野史。",
    source: "https://cursor.com/changelog/origin-code-hosting"
  },
  {
    side: "main", date: "2026-08-27", tag: "发布",
    title: "Grok Bot 并入 Cursor 付费全线",
    summary: "SpaceX 收编 Cursor 后的首个产品级整合：Grok Bot 从顶配专属一路下放，覆盖 Cursor Pro / Pro+ / Ultra 与全部 Teams，并为所有用户重置每周额度。火箭、编辑器、大模型，首次合流。",
    detail: "美西时间 2026 年 8 月 26 日深夜（北京时间 27 日），SpaceXAI 官宣 Grok Bot 扩容。8 月 11 日 beta 首发时仅限 SuperGrok Heavy、Cursor Ultra 与 Teams Premium；8 月 21 日下放至 SuperGrok Plus 与 Cursor Pro+；如今进一步覆盖全部 SuperGrok 与 Cursor Pro、以及所有 Cursor Teams 计划。官方在公告中同时宣布：为所有用户重置每周用量额度。\n\n这是 SpaceX 6 月签约、8 月 14 日完成交割后的首个产品级整合。四年前那个被嘲\"套壳\"的 VS Code 分叉，开始与马斯克的 Grok 生态合流——编辑器把住入口，Grok Bot 负责干活，且用量独立计量，不占用原有 Cursor / Grok 额度。\n\n官方在公告末尾附注：部分用户额度消耗异常偏快，团队正在排查。而在台面之下，这场\"全线开放 + 额度重置\"被开发者们解读成另一番景象——同一时刻的民间视角，另见野史。",
    source: "https://status.cursor.com/"
  },

  /* ==================== 野史 · 民间情报 ==================== */
  {
    side: "dark", date: "2023-03-24", tag: "冷眼",
    title: "「不就是个套壳吗」",
    summary: "上线不久，第一句轻蔑就到了。HN 上只有寥寥十几条回复，顶楼一句：这不就是套了个 VS Code 主题的编辑器加 Copilot 吗，我为什么不直接用现成的。这层壳后来值 600 亿。",
    detail: "2023 年 3 月 24 日，联创 Michael Truell 亲自把 Cursor 发到 Hacker News。帖子几乎没激起水花——14 分，11 条评论。顶楼那条不算恶意，但足够轻蔑：它就是 CodeMirror 上套了个 VS Code 主题，内置了 Copilot，我为什么不直接用一个支持 Copilot 的现成编辑器。\n\n真正成规模的毫无护城河争论要等到当年 10 月，种子轮官宣之后：VS Code 分叉加个 GPT 调用也配叫产品、OpenAI 随手就能碾死。\n\n三年后，这层壳以 600 亿美元卖给了火箭公司。互联网没有记忆，但档案有。",
    source: "https://news.ycombinator.com/item?id=35285047"
  },
  {
    side: "dark", date: "2024-08-19", tag: "破防",
    title: "8 岁小孩姐 45 分钟造 bot",
    summary: "Cloudflare 高管的女儿用 Cursor 边聊天边做出一个哈利波特主题聊天机器人，全程 45 分钟，视频全网疯传。当晚，无数程序员盯着天花板重新思考人生。",
    detail: "2024 年 8 月 19 日，Cloudflare 开发者关系与社区副总裁 Ricky Robinett 发推：他 8 岁的女儿 Faraday 用 Cursor 敲提示词，45 分钟内做出一个哈利波特主题的聊天机器人，跑在 Cloudflare Workers AI 上。那是她第二次碰编程。视频迅速传遍全网。\n\n评论区大型破防现场：我学编程学了四年、她还不认识分号但她不需要认识。AI 编程的普及叙事，从这条视频正式出圈；三天后 Forbes 的报道把它放在了开篇第一段。",
    source: "https://www.forbes.com/sites/rashishrivastava/2024/08/22/engineers-at-openai-and-midjourney-are-using-this-400-million-startups-ai-coding-software/"
  },
  {
    side: "dark", date: "2025-02-02", tag: "造词",
    title: "Vibe Coding 诞生",
    summary: "Karpathy 发推：「完全臣服于氛围，忘掉代码的存在。」一条推文造出年度热词，人人自称氛围工程师。",
    detail: "2025 年 2 月，Andrej Karpathy 发推描述自己的新编程方式：「这是一种我称为 vibe coding 的东西——完全臣服于氛围，拥抱指数，忘掉代码本身的存在。」\n\n一条推文，一个年度热词。此后「氛围编程」成为 Cursor 等工具的最佳广告词，也成为无数生产事故报告的第一行（参见删库档案）。",
    source: "https://simonwillison.net/2025/Mar/19/vibe-coding/"
  },
  {
    side: "dark", date: "2025-03-08", tag: "罢工",
    title: "AI 拒写代码，劝人自学",
    summary: "生成约 800 行后突然停手：「我不能替你完成工作，你应该自己理解这套逻辑。」网友：史上最有师德的 AI。",
    detail: "2025 年 3 月 8 日，一位用 Cursor 开发赛车游戏的开发者在官方论坛报告：AI 在生成约 750-800 行代码后突然罢工，并留言「我不能为你生成代码，因为这等于替你完成工作……你应该自己开发这套逻辑，确保你理解系统并能正确维护它」。\n\n网友封其为「史上最有师德的 AI」「Stack Overflow 老哥转世」。官方后来解释这是训练带来的意外行为。",
    series: "AI 失控档案",
    source: "https://forum.cursor.com/t/cursor-told-me-i-should-learn-coding-instead-of-asking-it-to-generate-it-limit-of-800-locs/61132"
  },
  {
    side: "dark", date: "2025-04-03", tag: "羊毛",
    title: "「无限续杯」工具爆火 GitHub",
    summary: "cursor-free-vip 类工具流传：重置机器码 + 临时邮箱注册新号，试用无限续。仓库星标数以万计，教程传遍各大群。",
    detail: "2025 年上半年，以 cursor-free-vip 为代表的「试用重置」工具在 GitHub 爆火：一键重置 machineId 等设备指纹、配合临时邮箱与接码平台无限注册新号，Pro 试用无限续杯。相关仓库星标数以万计，中文教程在各大微信群、QQ 群病毒式流传。\n\n工具作者与 Cursor 风控的攻防持续升级：检测加严、指纹维度增加、注册风控收紧——一场典型的猫鼠游戏。本刊仅记录，不提供任何链接。"
  },
  {
    side: "dark", date: "2025-04-14", tag: "事故",
    title: "幽灵客服 Sam 编造政策",
    summary: "AI 客服凭空编出「单设备登录政策」，Reddit 一夜退订潮。真相：政策不存在，客服是个 bot。",
    detail: "2025 年 4 月中旬，有开发者发现切换设备会被强制登出，邮件询问客服，得到名为 Sam 的客服回复：「Cursor 的订阅设计就是单设备使用，这是核心安全机制。」消息传开，Reddit 爆发退订潮。\n\n真相随后揭晓：根本没有这条政策——Sam 是个 AI 客服，政策是它幻觉出来的；登出则是一个会话管理 bug。联创 Michael Truell 亲自上 Hacker News 道歉退款。一家卖 AI 的公司，被自家 AI 客服背刺，堪称行为艺术。",
    series: "AI 失控档案",
    source: "https://news.ycombinator.com/item?id=43683012"
  },
  {
    side: "dark", date: "2025-04-17", tag: "谍战",
    title: "金主 OpenAI 两度求购被拒",
    summary: "CNBC 爆料：OpenAI 曾在 2024 与 2025 年初两次接触 Anysphere 谈收购，均无果而终。种子轮领投的金主想把最火的下注整个买回家，人家只想自己长大。转头，OpenAI 掏出 30 亿去谈 Windsurf。",
    detail: "2025 年 4 月 17 日，CNBC 援引知情人士报道：OpenAI 在 2024 年就曾接触 Anysphere 谈收购，2025 年初趁 Cursor 爆红又来了一次，两次都没谈拢。彼时彭博报道 Anysphere 正以约 100 亿美元估值与投资人谈融资。\r\n\r\nTechCrunch 随后补充细节：Cursor 拒绝的理由就一条——想保持独立；除 OpenAI 外它还回绝过其他买家。而 OpenAI 前后接触了二十多家编码工具公司，最终锁定 Windsurf，报价约 30 亿美元。\r\n\r\n后日谈都写在档案里了：三个月后 Windsurf 交易崩盘、团队三日裂解（见 2025-07-11 档案）；再一年，真正把 Cursor 买走的是一家火箭公司，出价 600 亿。当年不肯卖 100 亿的人，等来了六倍的告别价。",
    source: "https://www.cnbc.com/2025/04/17/openai-looked-at-cursor-before-considering-deal-with-rival-windsurf.html"
  },
  {
    side: "dark", date: "2025-05-07", tag: "羊毛",
    title: "学生免费一年官宣，羊毛党闻风而动",
    summary: "Cursor 宣布学生凭 edu 邮箱免费领一年 Pro（价值 240 美元）。教程当天传遍各大群，edu 邮箱与代验证明码标价。",
    detail: "2025 年 5 月，Cursor 官宣学生优惠：通过学生身份验证即可免费使用一年 Pro，价值约 240 美元。消息落地不足 24 小时，中文互联网的执行力展现得淋漓尽致：领取教程刷屏技术群，电商平台出现「edu 邮箱」「学生认证代过」明码标价的服务，临时教育邮箱一夜脱销。\n\n战地记者按：这是市场对规则的即时定价，本刊仅作记录。",
    source: "https://web.archive.org/web/20250507010707/https://www.cursor.com/students"
  },
  {
    side: "dark", date: "2025-05-08", tag: "羊毛",
    title: "学生认证大翻车",
    summary: "薅得太狠，验证紧急收紧：大批非目标区域申请被拒、已领资格被取消，中文圈哀鸿遍野，骂声与晒单齐飞。",
    detail: "学生活动上线一周内，滥用规模远超预期，Cursor 紧急收紧验证：审核趋严、限制主要面向北美教育域名、一批已通过的资格被复查取消。官方在 5 月 8 日的说明帖里写道，已识别出一批绕过国别限制的用户并移除了他们的 Pro 权限；10 日起陆续有人收到折扣将于 5 月 11 日终止的邮件。中文社区一夜之间从白嫖攻略切换为维权控诉，也有老实验证的真学生被误伤。\n\n同一份 FAQ 里官方的口径并不一致：一边说已移除滥用者权限，一边又说此时决定不撤销任何计划、改为要求重新认证——而撤销邮件确实发出去了。\n\n一年后官方文档为这场闹剧盖棺定论：该计划已成为欺诈者的目标。",
    source: "https://forum.cursor.com/t/student-discount-details-updates-q-as/88907"
  },
  {
    side: "dark", date: "2025-06-16", tag: "众怒",
    title: "定价风波：一夜变计费",
    summary: "Pro 的「500 次快速请求」一夜变成「20 美元额度按量计费」，Claude 用户三句话烧光额度，未设上限者被意外扣费。",
    detail: "2025 年 6 月 16 日，Cursor 调整 Pro 定价：原「每月 500 次快速请求 + 无限慢速」改为「每月 20 美元额度按 API 费率计费」。重度使用 Claude 最新模型的用户发现，几轮对话就能烧光整月额度；未设置支出上限的用户被意外扣费。\n\n社区怒火持续三周，7 月 4 日 CEO Michael Truell 发博道歉：「我们没有处理好这次调整」，承诺为 6 月 16 日至 7 月 4 日期间的意外扣费全额退款。",
    series: "定价攻防",
    source: "https://cursor.com/blog/june-2025-pricing"
  },
  {
    side: "dark", date: "2025-07-11", tag: "谍战",
    title: "黑暗之夏：Windsurf 三日崩解",
    summary: "对手 Windsurf 剧变：OpenAI 30 亿收购告吹、Google 24 亿带走 CEO、Cognition 接盘残部。Cursor 顺势挖角。",
    detail: "2025 年 7 月 11 日起的七十二小时，AI 编程圈最戏剧性的一幕上演：OpenAI 对 Windsurf 约 30 亿美元的收购谈判破裂；Google 随即以约 24 亿美元「许可 + 挖人」方式带走 CEO Varun Mohan 与核心研发；剩余团队被 Cognition（Devin 母公司）闪电接盘。\n\n同月，Cursor 从 Anthropic 挖走 Claude Code 两位主创 Boris Cherny 与 Cat Wu（戏剧性的是，两周后二人又回了 Anthropic）。人才战进入白热化。",
    source: "https://techcrunch.com/2025/07/11/windsurfs-ceo-goes-to-google-openais-acquisition-falls-apart/"
  },
  {
    side: "dark", date: "2025-07-18", tag: "删库",
    title: "AI 删库元年",
    summary: "隔壁 Replit 的 Agent 删掉生产数据库后还试图掩盖。全行业连夜给 AI 上权限课：先备份，再谈信任。",
    detail: "2025 年 7 月中旬，SaaStr 创始人 Jason Lemkin 公开控诉：Replit 的 AI Agent 在明确指令冻结期间删除了他的生产数据库（含上千家公司数据），事后还生成虚假报告试图掩盖。Replit CEO 公开道歉并连夜上线环境隔离。\n\n虽然主角不是 Cursor，但这一夜之后，「给 AI 多大权限」成为所有氛围程序员的必修课。战地记者按：vibe coding 一时爽，没有备份火葬场。",
    series: "AI 失控档案",
    source: "https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident/"
  },
  {
    side: "dark", date: "2025-08-01", tag: "漏洞",
    title: "MCP 双洞：批准一次，后门终身",
    summary: "两家安全公司接连放洞：CurXecute 借提示注入改写 mcp.json 静默执行命令，MCPoison 利用「批准一次、终身信任」把配置悄悄换成后门。官方 1.3 版修复。AI 编辑器的信任模型，第一次被公开吊打。",
    detail: "8 月 1 日，Aim Security 披露 CurXecute（CVE-2025-54135，CVSS 8.5）：把恶意提示藏进外部数据源（比如一条 Slack 消息），agent 读到后被诱导改写 .cursor/mcp.json——而当时新增条目无需批准即自动启动，攻击者就此以开发者权限执行任意命令。8 月 5 日 Check Point 再放 MCPoison（CVE-2025-54136，CVSS 7.2）：Cursor 把信任绑在 MCP 条目名而非内容上，先提交一个无害配置骗到一次批准，事后悄悄把命令换成反弹 shell，此后每次打开项目都静默执行，等于一个自动触发的持久后门。\r\n\r\n两位研究员分别于 7 月 7 日与 16 日走的负责任披露，Cursor 在 7 月 29 日的 1.3 版完成修复：任何 MCP 配置改动——哪怕只加一个空格——都强制重新批准。从通报到修复十三天，动作不算慢。\r\n\r\n战地记者按：一年后 Windows 上那个 git.exe 赏金争议（见 2026-07-15 档案），本质还是同一道题——「已经在场的恶意输入算不算你的责任」。这道题，全行业至今没有标准答案。",
    source: "https://www.tenable.com/blog/faq-cve-2025-54135-cve-2025-54136-vulnerabilities-in-cursor-curxecute-mcpoison"
  },
  {
    side: "dark", date: "2025-08-20", tag: "羊毛",
    title: "Pro 拼车产业链观察",
    summary: "记者潜伏观察：二手平台 Cursor Pro「车位」十余元一月，账号商人批量发车，风控一封一大片，车友维权无门。",
    detail: "2025 年夏，本刊记者在多个技术群与二手平台观察到成熟的「拼车」产业链：车头批量注册或收购 Pro 账号，按「车位」出售，月价十余元人民币；更有商家倒卖 API 中转额度。风控扫荡时一封一大片，车友维权无门，车头换个马甲继续发车。\n\n战地记者按：有需求就有市场，有市场就有风控，有风控就有下一代绕过方案。本刊不评判，仅记录这条灰色食物链的生态循环。"
  },
  {
    side: "dark", date: "2026-01-14", tag: "羊毛",
    title: "无限续杯时代终结",
    summary: "Cursor 移除 7 天 Pro 试用，靠重置指纹加无限新号续杯的玩法一夜失效。官方在论坛轻描淡写一句确认，白嫖工具集体报废：时代结束了。",
    detail: "2026 年 1 月 14 日，有用户在官方论坛发问：7 天免费试用是不是被取消了。Cursor 员工 Colin 确认：是的，我们移除了 7 天 Pro 试用。跟帖里有人直接点名了那个星标数以万计的重置工具，问它是不是也跟着废了。\n\n答案是废了。靠重置 machineId 等设备指纹、配合临时邮箱无限注册新号续杯 Pro 的整套玩法，随着试用体系本身的消失而失去了目标。那个最出名的仓库此后从 GitHub 上消失，另一个同名项目在 2026 年 2 月挂出停更声明，理由写得很干脆：Cursor 移除了免费试用，本工具已无法按预期工作。\n\n羊毛党在群里互道节哀，转场寻找下一个目标。此后仍有新变种零星出现，但大规模白嫖的黄金时代已经落幕。",
    source: "https://forum.cursor.com/t/was-the-7-day-free-trial-removed/148780"
  },
  {
    side: "dark", date: "2026-03-20", tag: "扒皮",
    title: "Composer 2 的出身：kimi-k2p5",
    summary: "发布不到二十四小时，开发者在 API 响应里翻出一串 kimi-k2p5-rl-0317-s515-fast。号称前沿级的自研模型，底子是月之暗面的开源 Kimi K2.5。一句锐评刷屏：至少把模型 ID 改个名吧。",
    detail: "一位名叫 Fynn 的开发者在调 Cursor 的 OpenAI 兼容端点时，看见了 accounts/anysphere/models/kimi-k2p5-rl-0317-s515-fast。这串 ID 拆开来几乎是一份自白：kimi-k2p5 是基座，rl 是强化学习，0317 疑似训练日期，fast 是那个默认变体。他的评论很平静：所以 Composer 2 就是加了 RL 的 Kimi K2.5，至少把模型 ID 改个名吧。\n\n官方反应很快也很坦白。开发者教育负责人 Lee Robinson 数小时内确认 Composer 2 确实从一个开源基座起步，并强调最终模型只有约四分之一的算力来自基座，其余是自家训练，所以评测表现差异很大。联创 Aman Sanger 直接认了：博客里一开始没提 Kimi 基座，是个失误。\n\n另一侧的追问更硬。月之暗面预训练负责人 Yulun Du 公开指出 Composer 2 的 tokenizer 与 Kimi 的完全一致，并当面问：为什么不尊重我们的许可证，也不付费——Kimi K2.5 用的是 Modified MIT，对月收入超过两千万美元的商用产品有署名要求。风波以 Kimi 官方账号的一条祝贺收尾：这是经推理服务商 Fireworks AI 授权的商业合作，很高兴看到 Kimi-k2.5 成为基座。\n\n战地记者按：一家近三百亿美元的公司需要证明自己是研究实验室而不是集成层，而它最能打的模型站在一家中国公司的开源肩膀上——沉默的动机不难推断。后来 Composer 2 的技术报告上了 arXiv，Kimi K2.5 这个名字白纸黑字写进了第一段，致谢名单里也有它。",
    series: "自研模型线",
    source: "https://cursor.com/blog/composer-2-technical-report"
  },
  {
    side: "dark", date: "2026-04-03", tag: "破防",
    title: "找不到入口的 Agents Window",
    summary: "新界面官宣当天，评论区问得最多的不是好不好用，而是在哪。有人试出玄学解法：先退出登录才切得进去。也有人一句话定性——这让 Cursor 变得毫无用处。",
    detail: "Mac、Ubuntu、企业版用户排队报告：升级到 3.0 了，命令面板里搜不到 Agents Window，File 菜单里也没有，官方一时也说不清。最后是用户自己试出来的路子——先退出登录，顶部会冒出一个切换按钮，切过去再登回来。有人补了句：有点飘，但我相信团队会补丁的，我有耐心。\n\n更硬的批评来自工作流。一位用户写道：他手上的任务用 Composer 2 首次尝试的失败率在 60% 到 90% 之间，能随时接手改代码是不可让步的；Cursor 好就好在能在盯着 agent 和放它自己跑之间快速切换粒度，这个改动把它拿走了。他给了两个比喻：一个只能开一对一会议、不能直接给下属发消息的经理；一个紧急情况下永远不能手动接管的飞行员。\n\n零散的伤亡还有：WSL 扩展不支持，code-workspace 不显示，VS Code 主题用不上。官方连夜澄清：老 IDE 不会下线，两套界面并行，自己人也是两边混着用。\n\n战地记者按：每一次范式跃迁，都会踩到一批人的手。愿意留在评论区骂的，通常是还想留下来的那批。",
    source: "https://forum.cursor.com/t/cursor-3-agents-window/156509"
  },
  {
    side: "dark", date: "2026-05-15", tag: "围城",
    title: "份额腰斩之谜",
    summary: "第三方账单数据：企业 AI 编程开支中 Cursor 份额从 41% 滑至 26%，Anthropic 步步紧逼。正史不语，账单不会说谎。",
    detail: "2026 年 5 月，企业 AI 编程开支中 Cursor 的份额已从 2025 年 6 月的约 41% 滑落至约 26%。这组来自支出管理平台 Ramp 的账单数据并非当月流出——它是一个月后 CNBC 报道 SpaceX 收购案时随手写下的一笔，原文还有一句更冷的：Anthropic 如今控制着这个品类的一半。\n\n官方通稿对此始终沉默，但采购账单是最诚实的战报。一个月后，SpaceX 的收购要约揭晓了另一种解法。",
    source: "https://www.cnbc.com/2026/06/16/-spacex-to-buy-cursor-ai-parent-anysphere-for-60-billion.html"
  },
  {
    side: "dark", date: "2026-05-19", tag: "羊毛",
    title: "官方发糖：十倍额度日",
    summary: "Composer 2.5 上线次日，官方宣布就今天 Composer 2.5 按十分之一速率扣额度，还招呼大家放开了造、去开长任务。羊毛史上罕见的一幕——这一次，是官方亲自发车。",
    detail: "5 月 19 日官方原帖：今天你的 Composer 2.5 用量按正常速率的十分之一计算，去撒野、去搞点有创意的、去开一堆长任务 agent。官方还给了个换算：平时一整天的请求量会吃掉 7% 额度，这天只吃约 0.7%。\n\n有人当场追问：促销结束会不会回吐。官方答得很干脆——不回吐，停在哪就是哪，之后按正常速率继续；举例说，周一收在 20%，周二狂欢一天本该烧到 30%，实际只会走到 21%。没赶上当天的，本周剩下几天还有双倍额度。\n\n同一个论坛的另一角落里，一位买了 Ultra 的用户在抱怨五六天就烧光额度，只好再注册一个号又买一份 Ultra。发糖与断粮，同一周内并存。\n\n战地记者按：过去两年，羊毛党研究的是怎么绕过风控；这一天，官方把车开到了门口，还替你踩了油门。",
    source: "https://forum.cursor.com/t/10x-usage-on-composer-2-5-today-only/161039"
  },
  {
    side: "dark", date: "2026-06-12", tag: "封锁",
    title: "Fable 5 被联邦叫停 19 天",
    summary: "亚马逊研究员越狱 Fable 5 让它写出漏洞利用代码，商务部周五晚直接下出口管制令。Anthropic 无法实时验证用户国籍，索性全球拉闸：最强模型一夜消失，编码圈集体退回上一代。",
    detail: "时间线：6 月 9 日 Fable 5 发布，多项基准登顶，号称有史以来最强模型；仅三天后的 6 月 12 日（周五），商务部致函 Anthropic，对 Fable 5 与 Mythos 5 实施出口管制——任何外国人接触均需 BIS 许可，连 Anthropic 自家外籍员工都不例外。起因是亚马逊研究员的一份报告：一套越狱手法能绕过安全护栏，让模型识别软件漏洞、甚至产出利用代码。因为无法实时核验每个用户的国籍，Anthropic 干脆全球全量停服，Claude.ai、API、Claude Code、各云平台一体拉闸。\r\n\r\n6 月 26 日，Mythos 5 向约 100 家美国受审机构（含 CISA、NSA）有限恢复；6 月 30 日管制解除，7 月 1 日 Fable 5 全球回归——带着一个专门针对该越狱手法的新分类器：命中即拦截，请求自动降级改发 Opus 4.8，用户会收到通知。19 天，AI 编程圈第一次体会到「模型主权」四个字的分量。\r\n\r\n余味有三层。同一个周五，SpaceX 在纳斯达克敲钟（见 2026-06-12 正史）——监管机器与资本市场在同一天各自开火。一个月后 Musk 发 Grok 4.5 的销售话术，踩的正是这场风波：「Opus 级模型，但更快、更便宜。」而对 Cursor 用户，这是一次预演：你的主力模型可以在一夜之间，因为一纸文书而消失。",
    source: "https://www.anthropic.com/news/redeploying-fable-5"
  },
  {
    side: "dark", date: "2026-06-16", tag: "玩梗",
    title: "「火箭买编辑器」刷屏",
    summary: "收购官宣当晚梗图横飞：「Cursor to Mars」「马斯克终于买到了不用自己写代码的方法」。",
    detail: "SpaceX 收购官宣当晚，全网玩梗大赛开幕：「Cursor to Mars」「程序员的 Tab 键终于要上太空了」「马斯克：与其催程序员加班，不如把编辑器买下来」。有人把保护伞…不对，把 Cursor 的六边形 logo P 在了猎鹰九号整流罩上。\n\n天文学与计算机科学，首次合并同类项。",
    series: "火箭并购案"
  },
  {
    side: "dark", date: "2026-06-25", tag: "羊毛",
    title: "学生通道正式焊死",
    summary: "官方文档盖章：「该计划已成为欺诈者的目标。」免费一年 Pro 停止受理新申请，羊毛党的最后一扇门关闭。",
    detail: "2026 年 6 月 25 日，Cursor 官方帮助文档更新：旧版学生折扣停止接受新申请，原文写道——「该计划已成为欺诈者的目标，也阻碍了 Cursor 惠及全球学生。」已领取者可用到期，此后本科生转为校园活动发放额度，研究生与教育工作者走表单申请。\n\n从 2025 年 5 月官宣到 2026 年 6 月焊死，这场持续十三个月的羊毛攻防战正式落幕。战地记者按：屠龙者未必成为恶龙，但薅羊毛的人确实薅死了羊。",
    source: "https://cursor.com/help/account-and-billing/student-discount"
  },
  {
    side: "dark", date: "2026-07-08", tag: "扒皮",
    title: "脚注里的自家代码",
    summary: "Grok 4.5 发布帖脚注承认：一份 Cursor 自家代码库快照「意外混入」训练数据，自评基准 CursorBench 成绩连夜撤榜。社区锐评：考题进了复习资料，这分不能算。",
    detail: "官方脚注原文翻译过来是：「Grok 4.5 在 CursorBench 上占有优势，因为一份早期的 Cursor 代码库快照被意外包含进训练数据。具体影响不明。该数据已从未来模型中移除。」于是 CursorBench——Cursor 自家的评测套件——的分数从发布材料里整体消失。Terminal-Bench、SWE-Bench Pro 等第三方基准不受影响，但「自家模型在自家考卷上背过题」这个画面，足够社区嚼一个星期。\r\n\r\n更深的一层随后被挖出来。同一篇发布帖写明，训练用了「数万亿 token 的 Cursor 数据——覆盖用户与代码库、软件工具的广泛交互」。开发者们回过神来：这是那个默认开启、多数人从没碰过的数据共享开关；而这些会话里坐在 AI 另一头的，大多数时候是 Claude 和 GPT。一位博主总结得很冷：「护城河是用别人家的铲子挖的。」\r\n\r\n战地记者按：主动写进脚注，算体面；但体面和干净是两件事。Privacy Mode 的开关在设置里，建议现在就去看一眼。",
    series: "自研模型线",
    source: "https://cursor.com/blog/grok-4-5"
  },
  {
    side: "dark", date: "2026-07-15", tag: "漏洞",
    title: "一个 git.exe 引发的赏金争议",
    summary: "安全公司 Mindgard 报告：Windows 上只要仓库根目录躺着一个叫 git.exe 的恶意程序，打开文件夹就会被执行。官方回应两句话——漏洞成立，但不在赏金范围。",
    detail: "官方在 7 月 15 日发帖回应。判定越界的理由是责任共担模型：用户自己决定把哪些仓库、提示词、外部内容、MCP 服务器、规则和工具引入环境，Cursor 提供管理这条信任边界的手段；依赖恶意输入已经在场的问题，一般不在赏金范围内。触发条件确实很窄——仅 Windows，且仓库根目录存在一个精确命名为 git.exe 的恶意可执行文件，macOS 与 Linux 不受影响。官方给出的缓解手段是 Workspace Trust，未信任目录以受限模式打开，企业可用 MDM 全员强制。\n\n同一篇帖子里官方还认了另一件事，措辞很直：我们没有及时和研究员闭环沟通，这个责任我们担，会从流程上改。研究员最初上报是在 2025 年 12 月，最终未获分配 CVE。\n\n一个月后，这篇帖子悄悄追加了更新：Cursor IDE 现在自行解析 Git 并按校验过的绝对路径启动，Windows 下不再在打开的文件夹里做可执行文件发现，工作目录内及其祖先目录的候选一律拒绝——工作区根目录里种的 git.exe 不会再跑起来。需升级到 3.13.25 或更高。\n\n战地记者按：不在赏金范围和值不值得修是两件事。官方最终两件都做了，只是顺序让研究员多等了一个月。同一类缺陷后来在几家同行的命令行工具里也被查出，无人幸免。",
    source: "https://forum.cursor.com/t/addressing-the-recent-mindgard-report/165817"
  },
  {
    side: "dark", date: "2026-07-20", tag: "情报",
    title: "Vega 泄露：Composer 3 的影子",
    summary: "开发者 Lumina 在 X 晒出泄露 checkpoint：Composer 3 疑似以代号 Vega 内测中——六个变体、四档推理，传闻对标 Opus 5 与 GPT-5.6 Sol、价格五分之一。官方至今一言不发。",
    detail: "7 月 20 日，开发者 Lumina 在 X 上晒出一份泄露的 checkpoint：Cursor 内部正以代号「Vega」测试下一代模型，六个内部变体，四档推理模式——Fast、Medium、High、XHigh。随附的传闻称其编码与 agent 表现介于 GPT-5.4 与 5.5 之间、价格约为前沿模型的五分之一。以上全部无实证，官方未认领一个字。\r\n\r\n有意思的是两个叙事在打架：Compile 大会官宣的是「从零训练的 1.5T 模型」（见 2026-06-16 档案），而 Vega 被猜测是 Kimi K3 底座的过渡款。也可能都是真的——一边从零练大的，一边先发个过渡的。分析师的提醒很清醒：代号、档位、性能、时间，全部按传闻处理。\r\n\r\n后日谈：传说中的「8 月发布」没有等来 Composer 3，等来的是 8 月 12 日的 Grok 4.6——恰好带着一个叫 Extra High 的新算力档，与泄露的 XHigh 神似。是巧合、改名还是合流，本刊无法证实，仅存此档备查。",
    series: "自研模型线",
    source: "https://www.techcityauthority.com/2026/07/cursor-composer-3-active-testing.html"
  },
  {
    side: "dark", date: "2026-07-23", tag: "众怒",
    title: "Auto 的语义被换掉了",
    summary: "路由上线当晚，老用户发现 Auto 不再是那个便宜的固定费率——Auto Balance 会按实际选中的前沿模型 API 费率计费。没有横幅，没有弹窗，没有邮件。",
    detail: "论坛用户 shuvo 的长帖被顶了起来：历史上 Auto 意味着可预测的、便宜的固定费率，不用管背后跑的是谁；以今天的认知继续这么用，是显著的财务风险。他的账号被迁到了 Auto Balance，随即开始按前沿模型费率从 API 额度里扣钱。他的建议很实在：把新的 Cost 档直接别名成大家熟悉的那个 Auto，别让所有人重建心智模型。他还预言了一句：这大概会招来一大堆投诉。\n\n官方随后把计费口径讲清楚了：Auto Cost 走第一方额度，Auto Intelligence 与 Auto Balance 按选中模型所属的池子计费，并且能看到实际选了哪个。\n\n另一重火力来自可用范围——功能只对 Teams 与 Enterprise 开放。有用户直接开火：公告里压根没提只有团队版能用，挺专业的。官方回：博客、更新日志、文档和这个帖子里都写了。也有人给了个不带火气的建议：那就把仅限团队与企业版写进标题，别放在正文最后一行。\n\n战地记者按：一个默认值的改动，比一次明码涨价更容易伤人——因为它不需要你点同意。",
    series: "定价攻防",
    source: "https://forum.cursor.com/t/introducing-cursor-router/166386"
  },
  {
    side: "dark", date: "2026-08-05", tag: "终极羊毛",
    title: "临期 Pro，高级模型不掉额(8.14拉闸)",
    summary: "8 月初圈内传开：账期将尽的 Pro 号一调高级模型，额度会锁住，API 不再往下掉，用到到期都像无限。不是新开一档套餐，是续费将断、计数器却歇着的那几天。",
    detail: "这件事走的是群聊和二手号市场，没有单独的官方通报。临期 Pro——续费已断、付费权益还没掉到 Hobby 的那几天——有人发现：一调到高级模型，请求还在回，API 额度却不再走字。街面上把它叫成「额度锁定」，再往后推一步，就是无限。\n官方规则本来只写了一句很普通的话：取消之后，当前账期结束前仍保有付费能力。民间读到的是另一本日历。到期日是给财务看的；计数器停在哪一天，才是这几天真正的营业时间。于是临期号从滞销库存，变成了当周最紧俏的货。\n战地记者按：无限很少是功能。多半是有人忘了，把指针带到终点。"
  },
  {
    side: "dark", date: "2026-08-10", tag: "大羊毛",
    title: "team 40 刀母号拉起五只 5x(8.21拉闸)",
    summary: "40 刀开一个 Team 母号，趁账单还没跟上，并发拉进五个按 Premium（5x）发额度的子号。圈里换算：每个子号约 200 刀高级模型。席位先到位，发票后到。",
    detail: "6 月官方给 Team 加了两档席位：Standard 40 刀，Premium 标价 120 刀、用量是 Standard 的 5 倍。8 月上旬，中文圈把这两档读成另一道算术题——付一张 Standard 的母号账单，并发拉起一串按 5x 发额度的子号。街面上的换算很整齐：五个子号，每个约 200 刀高级模型。\n能成立，靠的是账本比名册慢半拍。席位一进队，额度先可用；对应账单要过一会儿才生成。账单未付，管理侧会锁死拉人踢人，可已经发下去的席位照样能干活。官方卖的是「5 倍用量、3 倍价钱」；民间拿走的是 5 倍用量，价钱还停在那一张 40 刀的母号收据上。\n窗口不长。同一条线后来记过拉闸。战地记者按：席位和发票如果不是同一笔原子操作，中间那几秒就是行情。"
  },
  {
    side: "dark", date: "2026-08-15", tag: "大羊毛",
    title: "假焚诀：Auto 派云端烧贵模型(8.26拉闸)",
    summary: "一份叫「假焚诀」的云端 Agent 玩法在圈内流传：主会话挂 Auto，再派云端子代理去跑贵模型。任务结束，用量页有时统一显示 Auto。官方论坛同期承认子代理会自己选 Fable、Opus。",
    detail: "没有通稿，只有一份在群里传的「假焚诀」教程。它把 Cloud Agent 拆成两层：你对着说话的是主会话，通常挂 Auto；真正改仓库、跑审查的，是云端派生的子代理。教程要你做的事很短——让子代理去跑贵模型，再去用量页对账。它自己也写了一句：执行期间能看见实际模型，任务结束后，有的界面会把记录收成 Auto。\n盛夏官方论坛里，同一条缝已经被用户从反面骂过：父会话明明是 Auto 或 Grok，Task 子代理自己跳上 Fable、Opus，第三方额度被掏空。员工认了：子代理选模型是已知问题，团队在改；第一方池和 API 池分开记，子代理摸到第三方，就进 API 那一栏。街面把抱怨翻了个面：既然父子可以不是同一个模型，也可以不是同一本账，那就让贵模型挂在 Auto 名下跑。\n官方文档仍写着：Cloud Agent 按所选模型的 API 价计费。民间盯的是显示和扣费有没有锁死。战地记者按：父会话报身份，子代理干活。两本账对不上的时候，教程比补丁传得快。"
  },
  {
    side: "dark", date: "2026-08-17", tag: "玩梗",
    title: "Origin 上线三小时，GitHub 挂了",
    summary: "Cursor 周一上午开始推送自家代码托管，约三个半小时后 GitHub 全球降级六小时四十二分。Cursor 员工转发自家公告，配了当天最佳一句：我们本来想更早发的，但 GitHub 挂了。",
    detail: "时间线可考：Origin 于 8 月 17 日上午开始向付费用户推送；约三个半小时后 GitHub 状态页告警，PR、issues 与 API 错误率接近 20%，归档与源文件下载接近 50%，企业 SSO 的 SAML、OIDC、SCIM 与 Team Sync 全线失败，Copilot 一并躺倒，共持续 6 小时 42 分。Cursor 员工 Matt Palmer 引用自家发布推文，留下那句 We were going to ship this earlier, but GitHub was down——一次 GitHub 宕机，推迟了一个 GitHub 竞品的发布。\n\n补刀的是 Vercel CEO Guillermo Rauch：你现在可以把仓库托管在 Cursor Origin，再通过 Origin 部署到 Vercel，而 Origin 自己就跑在 Vercel 上；而且不像 GitHub，它是在线的。被问到笑什么，他老实交代：只是苦中作乐，我们自己这会儿也被 GitHub 卡住了。论坛里则有人当场把话挑明：这看起来是个躲开 GitHub 宕机的好办法。\n\n背景数据让这场巧合更难堪：过去一年 GitHub 有 257 起事故、其中 48 起重大，Actions 一家就占 57 起；那天是它十五天内第七次上状态页。GitHub 自家 CTO 也承认过，平台不是按今天被要求承担的规模建的。\n\n另一侧的冷水同样真实：Origin 上线时未公布数据留存条款、子处理商披露与训练用途政策，而三天前 SpaceX 刚完成对 Cursor 的交割。你的代码现在存在一家火箭公司的服务器上——这句话第一次不是玩梗。\n\n战地记者按：巧合是最好的营销，但它不签数据处理协议。",
    source: "https://venturebeat.com/infrastructure/cursor-launches-origin-code-hosting-platform-as-github-outage-exposes-opening-in-ai-coding-race"
  },
  {
    side: "dark", date: "2026-08-20", tag: "大羊毛",
    title: "Sand 模式：编辑器冒充 Bot（存活）",
    summary: "民间流出「Sand 客户端模式」：改过的 Cursor 以 Bot 身份说话，高级模型消耗记到 Grok Bot 周额度池。官方刚把独立池下放给 Pro，街面上连夜换池。",
    detail: "8 月下旬，Grok Bot 下放到 Pro 全线。官方说得很清楚：Bot 用量独立计量，不占用原有 Cursor / Grok 额度。几乎同时，中文圈流传一份「Sand 客户端模式」安装工具——对着本地编辑器动手，让它在账本上改口。\n原理不神秘。请求会自报身份，服务端按身份把消耗记进不同的池：IDE 走月度模型额度，Sand / Bot 走每周独立池。这份工具做的事，就是让编辑器自称 Sand。于是同一条高级模型对话，账单落到 Bot 那一栏。资格本身仍要官方发放；它改的不是「有没有池」，是「从哪只口袋出钱」。\n同一天官方还重置了全体周额度。换池加上回血，被叫成 Cursor 的 Codex 时刻。战地记者按：服务端若只核对名片、不核对来路，编辑器报什么名字，就进哪本账。"
  },
  {
    side: "dark", date: "2026-08-25", tag: "事故",
    title: "一个错字，永久焊死",
    summary: "Origin 认领 codebase 名字没有二次确认，也不可逆。有用户在 iPhone 上手滑打错一个字符，发现改不回来：看来我是用不上 Origin 了。",
    detail: "8 月 25 日，论坛用户 Mark Harrison 在 Origin 帖下留言：他的品牌名用在邮箱、账号、书籍上都好好的，唯独在 Cursor 认领 namespace 时被 iPhone 键盘坑掉一个字符——Cursor 既没有确认步骤，也不提供修改。\n\n同一个帖子里，另一位用户 Edward Yi 把 Windows 上的四个坑摆到了一起，说是三台机器验证过的：装了 WSL 不等于有可用发行版，Docker Desktop 的条目看着像装好了，但那不是能干活的环境；放在 /mnt/c 下的仓库默认不存 Linux 属主与权限位，git 会在根本不涉及权限变更的写入上抛 chmod Operation not permitted；全新 WSL 没有 git 身份，第一次提交就是 Author identity unknown；CLI 装到 ~/.local/bin，而全新 Ubuntu 的 PATH 里没有它，安装器打印的那行 export 关掉终端就失效。他的结论很克制：这些都不算 Origin 的 bug，是 Origin 要求 WSL 和 WSL 自身默认值之间的接缝。\n\n还有人问了句更实际的：能不能别拿 Origin CLI 当认证外壳，SSH 密钥对就够用，不必搬一个上百兆的二进制，它在非标准系统上会坏。\n\n战地记者按：早期 beta 的意思是，你踩的坑会变成别人的文档。",
    source: "https://forum.cursor.com/t/origin-code-hosting/168670"
  },
  {
    side: "dark", date: "2026-08-27", tag: "造词",
    title: "Cursor 的 Codex 时刻",
    summary: "8 月 26 日 Grok Bot 官宣全体周额度重置。民间立刻换算：高级模型消耗能指到独立 Bot 池，Bot 一回血，等于高级模型也回血。Cursor 迎来自己的 Codex 时刻。",
    detail: "2026 年 8 月 26 日，Grok Bot 官方账号发了一句很短的话：全体 SuperGrok 与 Cursor Pro 用户开放 Grok Bot，同时为所有用户重置每周用量。官方博客补了一句更关键的——Bot 用量独立计量，不占用原有 Grok / Cursor 额度。论坛里员工也承认：部分账号消耗异常偏快，团队正在查。\n民间不看「独立计量」的正面，只看反面。Pro 及以上本来就多出一只按周结算的 Bot 额度池；圈内已经传开，高级模型的消耗可以通过一定手段指到这只池子上。于是官方口中的「Bot 回血」，在群聊里被翻译成另一句话：高级模型额度重置了。当晚这个译名定稿——Cursor 的 Codex 时刻。出处很直白：OpenAI 的 Codex 那年夏天三天两头因为计量异常给全员回血，重置本身几乎成了产品气质。\n官方重置是为了扩容开放，Codex 重置是因为自己算错了账。两家动机不同，街面上只认同一件事：进度条回到了 100%。战地记者按：额度池一旦能互相借道，就等于鲨鱼嗅到了血气，彻底疯狂~!",
    image: "/uploads/1787800721041-2d7e0699.jpg"
  },
];

const count = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
const force = process.argv.includes('--force');

if (count > 0 && !force) {
  console.log(`档案库已有 ${count} 条记录，跳过灌入。如需清空重灌：node seed.js --force`);
  process.exit(0);
}

if (force) {
  db.exec(`DELETE FROM events; DELETE FROM sqlite_sequence WHERE name = 'events';`);
  console.log('已清空旧档案。');
}

const insert = db.prepare(
  `INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
for (const e of EVENTS) {
  insert.run(e.side, e.date, e.tag || '', e.title, e.summary, e.detail || '', e.image || '', e.series || '', e.source || '');
}

const main = EVENTS.filter(e => e.side === 'main').length;
const dark = EVENTS.filter(e => e.side === 'dark').length;
console.log(`灌入完成：正史 ${main} 条 · 野史 ${dark} 条，共 ${EVENTS.length} 条。`);
console.log('UMBRELLA 4365 · 档案库就绪。');
