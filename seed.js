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
    side: "main", date: "2025-10-29", tag: "发布",
    title: "Cursor 2.0 与自研模型 Composer",
    summary: "首个自研编码大模型亮相，八个 Agent 并行开工。它不再只是编辑器，更像一间作战指挥部。",
    detail: "2025 年 10 月 29 日，Cursor 2.0 发布，同场亮相的还有首个自研编码大模型 Composer——官方称其编码速度是同类前沿模型的 4 倍。全新的多 Agent 界面支持最多八个智能体并行处理不同任务，各自在独立工作区推进。\n\n从调用别人的模型，到自己下场炼模型，Cursor 补上了版图里最关键的一块。",
    series: "自研模型线",
    source: "https://cursor.com/blog/2-0"
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
    side: "main", date: "2026-06-16", tag: "惊变",
    title: "SpaceX 签署 600 亿美元收购协议",
    summary: "马斯克签下史上最大创业公司并购案：全股票、600 亿美元。一家火箭公司，买下了一个编辑器。",
    detail: "2026 年 6 月 16 日，SpaceX 与 Anysphere 签署合并协议：全股票交易，隐含股权价值 600 亿美元，创下风投支持创业公司被并购的历史纪录。此前 4 月，双方已达成算力合作并附带收购选择权。\n\n福布斯当日评论：这笔交易把一家火箭公司直接拽进了 AI 编程战争的中心。",
    series: "火箭并购案",
    source: "https://www.sec.gov/Archives/edgar/data/1181412/000162828026043411/spaceexplorationtechnologi.htm"
  },
  {
    side: "main", date: "2026-06-29", tag: "发布",
    title: "Cursor 上手机",
    summary: "6 月 29 日 iOS 版公测：手机上派活给云端 agent，锁屏用实时活动追进度，看 demo、审 diff、直接合 PR。官方的说法是，笔记本可以睡着、可以够不着、可以在忙别的，你的活不停。",
    detail: "能力清单：选仓库起云端 agent，可挑模型、可从 Plan Mode 起步、可语音输入、可用斜杠命令操控；离开 app 后靠锁屏实时活动和推送保持在环；云端 agent 交付的不只是代码，还有 demo、截图和日志；本地与云端会话可以来回接力；配合 Cursor 3.9，还能直接遥控跑在自己机器上的 agent。\n\n全部付费计划当天可用，7 月 5 日前手机端跑 Composer 2.5 打 2.5 折。Android 官方称在计划中但无时间表，iPadOS 试验过、说会再回来——一个月后 iPad 版如约上线。\n\n评论区被反复提起的两件事：最低只支持 iOS 26，一批还在 iOS 18 的老设备用户装不上；以及中国大陆无法使用。",
    source: "https://cursor.com/blog/ios-mobile-app"
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
    summary: "交割后第十四天，Cursor 与 SpaceXAI 联合发布 Grok 4.6，主攻长任务 agent。在 Artificial Analysis 智能指数上与 GPT-5.6 Sol 打平，并新增 Extra High 算力档。",
    detail: "官方口径是 together with SpaceXAI——这是并入火箭公司后的第一次联名发模型。三项重点：长任务上更能扛，在长轨迹上做更多自测与自我验证，确认无误才往下走；把一个宽泛的产品想法变成能跑的第一版更强，视觉与交互部分的首轮产出明显优于 4.5；智能指数（九项基准的合成）与 GPT-5.6 Sol 持平，新增 Extra High 让算力匹配任务难度。\n\n覆盖桌面、云端 agent、iOS、CLI 与 SDK，个人与团队计划首周双倍额度。Grok 4.5 保留，Composer 仍是日常的快模型。\n\n收购前，Cursor 的模型叙事是自研加接入全部大厂；收购后，公告抬头第一顺位的名字换了。署名方式本身，就是一则公告。",
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
    side: "main", date: "2026-08-17", tag: "里程碑",
    title: "Origin 上线，Cursor 自己托管代码",
    summary: "8 月 17 日推出代码托管平台 Origin：建仓、推送、浏览、PR、GitHub 双向同步，全在编辑器里。官方称这是一个为 agent 规模而生的 git forge——车开进了 GitHub 的地盘。",
    detail: "早期 beta，当天面向全部付费计划推送，免费版没有，企业管理员可退出——注意是 opt-out 而非 opt-in。使用前需认领一个 codebase 名字，它会成为每个仓库 URL 的一部分。Cursor 托管的仓库用 Origin CLI 或标准 git 推送；GitHub 仓库可接入并实时同步，推送仍走 GitHub，源头以 GitHub 为准。每个仓库都带 PR：时间线、提交、检查、文件变更、评论、合并；同步仓库上评审双向打通，Cursor 里的评论会发到 GitHub，GitHub 上的回复几秒内回到 Cursor。云端 agent 可直接对 Origin 远端克隆、开分支、提交、开 PR；Apps 标签页可接 Vercel、Depot、Buildkite，后两者都能原样跑你现有的 GitHub Actions 工作流。\n\n这块拼图的来历可以上溯到 2025 年 12 月的 Graphite——堆叠式 PR 与理解 agent 的合并队列不是凭空长出来的，Graphite 联创 Tomas Reimers 正是 Origin 的负责人，并在 6 月的 Compile 大会上首次揭幕。支撑这门生意的那个数字同样惊人：Cursor 内部合并的 PR 里，已有约三分之一由自主运行的云端 agent 发起。\n\n从编辑器，到模型，到评审，到托管。四年前那个被叫作套壳的分叉，如今想把地基一起换掉。同一天的民间视角，另见野史。",
    source: "https://cursor.com/changelog/origin-code-hosting"
  },
  {
    side: "main", date: "2026-08-17", tag: "故障",
    title: "GitHub 一崩，六小时连锁停摆",
    summary: "8 月 17 日，GitHub 上游故障拖垮 Cursor 的 Automations、Cloud Agents、Codebase 与 Review Agents，持续约 6 小时——本轮盛夏故障潮里最长的一次。"
  },
  {
    side: "main", date: "2026-08-27", tag: "发布",
    title: "Grok Bot 并入 Cursor 付费全线",
    summary: "SpaceX 收编 Cursor 后的首个产品级整合：Grok Bot 从顶配专属一路下放，覆盖 Cursor Pro / Pro+ / Ultra 与全部 Teams，并为所有用户重置每周额度。火箭、编辑器、大模型，首次合流。",
    detail: "2026 年 8 月 26 日，SpaceXAI 官宣 Grok Bot 扩容。8 月 11 日 beta 首发时仅限 SuperGrok Heavy、Cursor Ultra 与 Teams Premium；8 月 21 日下放至 SuperGrok Plus 与 Cursor Pro+；如今进一步覆盖全部 SuperGrok 与 Cursor Pro、以及所有 Cursor Teams 计划。官方在公告中同时宣布：为所有用户重置每周用量额度。\n\n这是 SpaceX 6 月签约、8 月 14 日完成交割后的首个产品级整合。四年前那个被嘲\"套壳\"的 VS Code 分叉，开始与马斯克的 Grok 生态合流——编辑器把住入口，Grok Bot 负责干活，且用量独立计量，不占用原有 Cursor / Grok 额度。\n\n官方在公告末尾附注：部分用户额度消耗异常偏快，团队正在排查。而在台面之下，这场\"全线开放 + 额度重置\"被开发者们解读成另一番景象——同一时刻的民间视角，另见野史。",
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
    side: "dark", date: "2026-07-15", tag: "漏洞",
    title: "一个 git.exe 引发的赏金争议",
    summary: "安全公司 Mindgard 报告：Windows 上只要仓库根目录躺着一个叫 git.exe 的恶意程序，打开文件夹就会被执行。官方回应两句话——漏洞成立，但不在赏金范围。",
    detail: "官方在 7 月 15 日发帖回应。判定越界的理由是责任共担模型：用户自己决定把哪些仓库、提示词、外部内容、MCP 服务器、规则和工具引入环境，Cursor 提供管理这条信任边界的手段；依赖恶意输入已经在场的问题，一般不在赏金范围内。触发条件确实很窄——仅 Windows，且仓库根目录存在一个精确命名为 git.exe 的恶意可执行文件，macOS 与 Linux 不受影响。官方给出的缓解手段是 Workspace Trust，未信任目录以受限模式打开，企业可用 MDM 全员强制。\n\n同一篇帖子里官方还认了另一件事，措辞很直：我们没有及时和研究员闭环沟通，这个责任我们担，会从流程上改。研究员最初上报是在 2025 年 12 月，最终未获分配 CVE。\n\n一个月后，这篇帖子悄悄追加了更新：Cursor IDE 现在自行解析 Git 并按校验过的绝对路径启动，Windows 下不再在打开的文件夹里做可执行文件发现，工作目录内及其祖先目录的候选一律拒绝——工作区根目录里种的 git.exe 不会再跑起来。需升级到 3.13.25 或更高。\n\n战地记者按：不在赏金范围和值不值得修是两件事。官方最终两件都做了，只是顺序让研究员多等了一个月。同一类缺陷后来在几家同行的命令行工具里也被查出，无人幸免。",
    source: "https://forum.cursor.com/t/addressing-the-recent-mindgard-report/165817"
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
    side: "dark", date: "2026-08-10", tag: "大羊毛",
    title: "cursor team 事件 开启",
    summary: "起一个母号，并发拉子号，40刀成本拉取5个200刀子号！",
    series: "team 并发拉人"
  },
  {
    side: "dark", date: "2026-08-17", tag: "玩梗",
    title: "Origin 上线三小时，GitHub 挂了",
    summary: "Cursor 周一上午开始推送自家代码托管，约三个半小时后 GitHub 全球降级六小时四十二分。Cursor 员工转发自家公告，配了当天最佳一句：我们本来想更早发的，但 GitHub 挂了。",
    detail: "时间线可考：Origin 于 8 月 17 日上午开始向付费用户推送；约三个半小时后 GitHub 状态页告警，PR、issues 与 API 错误率接近 20%，归档与源文件下载接近 50%，企业 SSO 的 SAML、OIDC、SCIM 与 Team Sync 全线失败，Copilot 一并躺倒，共持续 6 小时 42 分。Cursor 员工 Matt Palmer 引用自家发布推文，留下那句 We were going to ship this earlier, but GitHub was down——一次 GitHub 宕机，推迟了一个 GitHub 竞品的发布。\n\n补刀的是 Vercel CEO Guillermo Rauch：你现在可以把仓库托管在 Cursor Origin，再通过 Origin 部署到 Vercel，而 Origin 自己就跑在 Vercel 上；而且不像 GitHub，它是在线的。被问到笑什么，他老实交代：只是苦中作乐，我们自己这会儿也被 GitHub 卡住了。论坛里则有人当场把话挑明：这看起来是个躲开 GitHub 宕机的好办法。\n\n背景数据让这场巧合更难堪：过去一年 GitHub 有 257 起事故、其中 48 起重大，Actions 一家就占 57 起；那天是它十五天内第七次上状态页。GitHub 自家 CTO 也承认过，平台不是按今天被要求承担的规模建的。\n\n另一侧的冷水同样真实：Origin 上线时未公布数据留存条款、子处理商披露与训练用途政策，而三天前 SpaceX 刚完成对 Cursor 的交割。你的代码现在存在一家火箭公司的服务器上——这句话第一次不是玩梗。\n\n战地记者按：巧合是最好的营销，但它不签数据处理协议。",
    source: "https://venturebeat.com/infrastructure/cursor-launches-origin-code-hosting-platform-as-github-outage-exposes-opening-in-ai-coding-race"
  },
  {
    side: "dark", date: "2026-08-25", tag: "事故",
    title: "一个错字，永久焊死",
    summary: "Origin 认领 codebase 名字没有二次确认，也不可逆。有用户在 iPhone 上手滑打错一个字符，发现改不回来：看来我是用不上 Origin 了。",
    detail: "8 月 25 日，论坛用户 Mark Harrison 在 Origin 帖下留言：他的品牌名用在邮箱、账号、书籍上都好好的，唯独在 Cursor 认领 namespace 时被 iPhone 键盘坑掉一个字符——Cursor 既没有确认步骤，也不提供修改。\n\n同一个帖子里，另一位用户 Edward Yi 把 Windows 上的四个坑摆到了一起，说是三台机器验证过的：装了 WSL 不等于有可用发行版，Docker Desktop 的条目看着像装好了，但那不是能干活的环境；放在 /mnt/c 下的仓库默认不存 Linux 属主与权限位，git 会在根本不涉及权限变更的写入上抛 chmod Operation not permitted；全新 WSL 没有 git 身份，第一次提交就是 Author identity unknown；CLI 装到 ~/.local/bin，而全新 Ubuntu 的 PATH 里没有它，安装器打印的那行 export 关掉终端就失效。他的结论很克制：这些都不算 Origin 的 bug，是 Origin 要求 WSL 和 WSL 自身默认值之间的接缝。\n\n还有人问了句更实际的：能不能别拿 Origin CLI 当认证外壳，SSH 密钥对就够用，不必搬一个上百兆的二进制，它在非标准系统上会坏。\n\n战地记者按：早期 beta 的意思是，你踩的坑会变成别人的文档。",
    source: "https://forum.cursor.com/t/origin-code-hosting/168670"
  },
  {
    side: "dark", date: "2026-08-26", tag: "终极羊毛",
    title: "cursor 无限事件",
    summary: "临期pro号，使用高级模型，api额度不掉！终极羊毛，无限！"
  },
  {
    side: "dark", date: "2026-08-27", tag: "大羊毛",
    title: "cursor的codex时刻！！",
    summary: "cursor bot额度深夜官宣重置，cursor终于迎来了自己的codex时刻！(虽然sand - -)",
    image: "/uploads/1787800721041-2d7e0699.jpg"
  },
  {
    side: "dark", date: "2026-08-27", tag: "大羊毛",
    title: "curos grok bot事件",
    summary: "cursor pro及以上订阅计划，包含grok bot额度，可通过一个方式将高级模型消耗指向bot额度！",
    detail: "pro：50-250刀高级模型额度；\npro+：500刀；\nultra：1000刀！\n一号多吃：api、auto、bot！ 还可以等重置！"
  },
  {
    side: "dark", date: "2026-08-27", tag: "羊毛",
    title: "cursor team 事件 拉闸",
    summary: "拉闸！",
    series: "team 并发拉人"
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
