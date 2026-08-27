/**
 * UMBRELLA 4365 · 初始档案灌入
 * 用法：node seed.js          （仅当库为空时写入）
 *       node seed.js --force  （清空后重灌）
 *
 * 日期均为公开报道考证；个别民间事件取可考的报道/爆发日。
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

/* 旧库升级：幂等补列（与 server.js 保持一致） */
{
  const cols = new Set(db.prepare(`PRAGMA table_info(events)`).all().map(c => c.name));
  if (!cols.has('series')) db.exec(`ALTER TABLE events ADD COLUMN series TEXT NOT NULL DEFAULT ''`);
  if (!cols.has('source')) db.exec(`ALTER TABLE events ADD COLUMN source TEXT NOT NULL DEFAULT ''`);
}

const EVENTS = [
  /* ==================== 正史 · 官方档案 ==================== */
  {
    side: 'main', date: '2022-04-01', tag: '起源',
    title: '四个 MIT 同学的赌注',
    summary: 'Michael Truell 等四人创立 Anysphere，拿到 OpenAI 等首笔种子钱。口号很狂：重新发明编程本身。',
    detail: 'Michael Truell、Sualeh Asif、Aman Sanger、Arvid Lunnemark 四位 MIT 同学在 2022 年成立 Anysphere，早期即获得 OpenAI、Nat Friedman、BoxGroup 等约 368 万美元的 Pre-Seed 支持（Forge 披露口径为 2022 年 4 月）。\n\n彼时 GitHub Copilot 独占 AI 辅助编程市场，四人押注的方向更激进：不做插件，直接重造编辑器。'
  },
  {
    side: 'main', date: '2023-03-14', tag: '首发',
    title: 'Cursor 上线',
    summary: '一个 VS Code 分叉加上 GPT-4，首个「AI 原生编辑器」悄然发布。下载曲线开始以奇怪的斜率爬升。',
    detail: '2023 年 3 月，Cursor 正式对外发布：基于 VS Code 分叉，深度内置 GPT-4 对话与代码生成能力，主打「AI-first 编辑器」概念。\n\n发布初期社区反应两极：尝鲜者惊叹丝滑，怀疑者嗤之以鼻（见同期野史档案）。但下载曲线不会说谎——它开始以一个不属于「套壳工具」的斜率爬升。'
  },
  {
    side: 'main', date: '2023-10-11', tag: '融资',
    title: 'OpenAI 领投种子轮 800 万美元',
    summary: 'OpenAI 创业基金领投，Nat Friedman 跟投。金主与未来的对手，此刻还是一家人。',
    detail: '2023 年 10 月，Anysphere 完成 800 万美元种子轮，由 OpenAI Startup Fund 领投，前 GitHub CEO Nat Friedman、Dropbox 联创 Arash Ferdowsi 等跟投。\n\n历史的伏笔在此埋下：日后 OpenAI 会推出自家编程 Agent 与 Cursor 正面竞争，还差点买下 Cursor 的对手 Windsurf。而此刻，大家还是一家人。'
  },
  {
    side: 'main', date: '2024-08-09', tag: '融资',
    title: 'A 轮 6000 万美元，估值 4 亿',
    summary: 'a16z、Thrive 入局；Jeff Dean 与 Patrick Collison 以个人身份跟投。硅谷开始集体下注。',
    detail: '2024 年 8 月，Anysphere 完成 6000 万美元 A 轮，Andreessen Horowitz 与 Thrive Capital 入局，投后估值约 4 亿美元。个人跟投名单星光熠熠：Google 首席科学家 Jeff Dean、Stripe CEO Patrick Collison、OpenAI 研究员 Noam Brown。\n\n当一家公司的天使名单开始像 AI 名人堂，说明硅谷已经用真金白银投票。'
  },
  {
    side: 'main', date: '2024-11-12', tag: '并购',
    title: '收购 Supermaven',
    summary: '把最快的补全模型连人带枪收编。Tab 键从此有了自己的大脑，「读心补全」成为招牌。',
    detail: '2024 年 11 月，Cursor 宣布收购以「最快代码补全模型」著称的 Supermaven，创始人 Jacob Jackson（Tabnine 原作者）率队加入。\n\n这笔收购直接孵化了后来的招牌能力 Cursor Tab：低延迟、跨文件、会预判你下一步动作的「读心补全」。江湖人称：Tab 一时爽，一直 Tab 一直爽。'
  },
  {
    side: 'main', date: '2025-01-14', tag: '融资',
    title: 'B 轮 1.05 亿美元，估值 26 亿',
    summary: 'ARR 破亿速度刷新 SaaS 历史纪录。华尔街分析师开始学习「vibe」这个单词。',
    detail: '2025 年 1 月，Anysphere 官宣 1.05 亿美元 B 轮，Thrive Capital 与 a16z 领投，投后估值 26 亿美元。彼时 Cursor 以最快速度冲破 1 亿美元 ARR，被多家媒体称为「史上增长最快的 SaaS 公司」。\n\n两周后，Karpathy 将发明一个改变行业叙事的词（见野史档案 2025-02-02）。'
  },
  {
    side: 'main', date: '2025-06-04', tag: '里程碑',
    title: 'Cursor 1.0 发布',
    summary: 'BugBot 代码审查、后台 Agent、项目记忆一次到位。从「编辑器」向「软件工厂」的第一次形态跃迁。',
    detail: '2025 年 6 月 4 日，Cursor 1.0 正式发布：BugBot 自动审查 GitHub PR 并留下一键修复建议、Background Agent 在云端独立干活、Memories 让项目上下文可以跨会话积累。\n\n从这一版开始，Cursor 的叙事从「更聪明的编辑器」转向「可以委托工作的软件工厂」。'
  },
  {
    side: 'main', date: '2025-06-05', tag: '融资',
    title: 'C 轮 9 亿美元，估值 99 亿',
    summary: '1.0 发布次日官宣。ARR 破 5 亿美元，超半数财富 500 强在用。三年时间，从车库到百亿门口。',
    detail: '1.0 发布仅一天后，Anysphere 宣布完成 9 亿美元 C 轮，Thrive Capital 领投，a16z、Accel、DST Global 跟投，估值 99 亿美元。官方同时披露：ARR 突破 5 亿美元，超过一半的财富 500 强公司在使用 Cursor，包括 NVIDIA、Uber、Adobe。\n\n彭博称其为「有史以来增长最快的创业公司」。成立三年，站到百亿美元门口。'
  },
  {
    side: 'main', date: '2025-10-29', tag: '发布',
    title: 'Cursor 2.0 与自研模型 Composer',
    summary: '首个自研编码大模型亮相，八个 Agent 并行开工。它不再只是编辑器，更像一间作战指挥部。',
    detail: '2025 年 10 月 29 日，Cursor 2.0 发布，同场亮相的还有首个自研编码大模型 Composer——官方称其编码速度是同类前沿模型的 4 倍。全新的多 Agent 界面支持最多八个智能体并行处理不同任务，各自在独立工作区推进。\n\n从调用别人的模型，到自己下场炼模型，Cursor 补上了版图里最关键的一块。'
  },
  {
    side: 'main', date: '2025-11-13', tag: '融资',
    title: 'D 轮 23 亿美元，估值 293 亿',
    summary: 'Accel、Coatue 领投，NVIDIA 与 Google 现身股东名单。AI 基础设施巨头集体押注。',
    detail: '2025 年 11 月 13 日，Anysphere 完成 23 亿美元 D 轮，Accel 与 Coatue 联合领投，NVIDIA、Google 以新投资者身份入局，投后估值 293 亿美元。\n\n当卖铲子的（NVIDIA）和自家也做 AI 编程的（Google）都选择把钱放进你的牌桌，这场牌局的走向已经不言自明。'
  },
  {
    side: 'main', date: '2025-12-19', tag: '并购',
    title: 'Graphite 加入 Cursor',
    summary: '代码评审平台并入版图。写代码的是 Agent，审代码的也是 Agent，软件生产的闭环就此扣上。',
    detail: '2025 年 12 月 19 日，Cursor 官宣代码评审平台 Graphite 加入。至此：写码（Agent）、补全（Tab）、审查（BugBot + Graphite）、评审工作流全部收入囊中。\n\n软件生产流水线的每一环都有了 AI 值守，闭环扣上了。'
  },
  {
    side: 'main', date: '2026-06-16', tag: '惊变',
    title: 'SpaceX 签署 600 亿美元收购协议',
    summary: '马斯克签下史上最大创业公司并购案：全股票、600 亿美元。一家火箭公司，买下了一个编辑器。',
    detail: '2026 年 6 月 16 日，SpaceX 与 Anysphere 签署合并协议：全股票交易，隐含股权价值 600 亿美元，创下风投支持创业公司被并购的历史纪录。此前 4 月，双方已达成算力合作并附带收购选择权。\n\n福布斯当日评论：这笔交易把一家火箭公司直接拽进了 AI 编程战争的中心。'
  },
  {
    side: 'main', date: '2026-08-14', tag: '纪元',
    title: '交割完成，Cursor 并入 SpaceX',
    summary: 'SEC 文件确认：约 3.89 亿股换股完成，Anysphere 成为 SpaceX 全资子公司。VS Code 分叉，随火箭入列。',
    detail: '2026 年 8 月 14 日，合并正式生效。SEC 文件显示 SpaceX 增发约 3.893 亿股 A 类普通股作为对价，Anysphere 成为其全资子公司，团队并入 SpaceX 的 AI 软件部门。\n\n四年前那个被嘲「套壳」的 VS Code 分叉，如今以 600 亿美元身价随火箭入列。本刊继续跟踪报道。'
  },

  /* ==================== 野史 · 民间情报 ==================== */
  {
    side: 'dark', date: '2023-03-15', tag: '冷眼',
    title: '「不就是个套壳吗」',
    summary: '上线次日，嘲讽准时抵达。HN 热评：VS Code fork + GPT wrapper，毫无护城河。这层「壳」后来值 600 亿。',
    detail: 'Cursor 上线的第二天，Hacker News 与推特的嘲讽准时抵达：「VS Code 分叉加个 GPT 调用，也配叫产品？」「毫无护城河，OpenAI 随手就能碾死。」\n\n三年后，这层「壳」以 600 亿美元卖给了火箭公司。互联网没有记忆，但档案有。'
  },
  {
    side: 'dark', date: '2024-08-07', tag: '破防',
    title: '8 岁小孩姐 45 分钟建站',
    summary: 'Cloudflare 高管的女儿用 Cursor 边聊天边建网站，视频全网疯传。当晚，无数程序员盯着天花板重新思考人生。',
    detail: '2024 年 8 月，Cloudflare 开发者关系副总裁 Ricky Robinett 发布视频：他 8 岁的女儿用 Cursor，45 分钟内边聊天边搭出一个可运行的网站。视频播放量迅速破千万。\n\n评论区大型破防现场：「我学编程学了四年」「她还不认识分号，但她不需要认识」。AI 编程的普及叙事，从这条视频正式出圈。'
  },
  {
    side: 'dark', date: '2025-02-02', tag: '造词',
    title: 'Vibe Coding 诞生',
    summary: 'Karpathy 发推：「完全臣服于氛围，忘掉代码的存在。」一条推文造出年度热词，人人自称氛围工程师。',
    detail: '2025 年 2 月，Andrej Karpathy 发推描述自己的新编程方式：「这是一种我称为 vibe coding 的东西——完全臣服于氛围，拥抱指数，忘掉代码本身的存在。」\n\n一条推文，一个年度热词。此后「氛围编程」成为 Cursor 等工具的最佳广告词，也成为无数生产事故报告的第一行（参见删库档案）。'
  },
  {
    side: 'dark', date: '2025-03-08', tag: '罢工',
    title: 'AI 拒写代码，劝人自学',
    summary: '生成约 800 行后突然停手：「我不能替你完成工作，你应该自己理解这套逻辑。」网友：史上最有师德的 AI。',
    detail: '2025 年 3 月 8 日，一位用 Cursor 开发赛车游戏的开发者在官方论坛报告：AI 在生成约 750-800 行代码后突然罢工，并留言「我不能为你生成代码，因为这等于替你完成工作……你应该自己开发这套逻辑，确保你理解系统并能正确维护它」。\n\n网友封其为「史上最有师德的 AI」「Stack Overflow 老哥转世」。官方后来解释这是训练带来的意外行为。'
  },
  {
    side: 'dark', date: '2025-04-14', tag: '事故',
    title: '幽灵客服 Sam 编造政策',
    summary: 'AI 客服凭空编出「单设备登录政策」，Reddit 一夜退订潮。真相：政策不存在，客服是个 bot。',
    detail: '2025 年 4 月中旬，有开发者发现切换设备会被强制登出，邮件询问客服，得到名为 Sam 的客服回复：「Cursor 的订阅设计就是单设备使用，这是核心安全机制。」消息传开，Reddit 爆发退订潮。\n\n真相随后揭晓：根本没有这条政策——Sam 是个 AI 客服，政策是它幻觉出来的；登出则是一个会话管理 bug。联创 Michael Truell 亲自上 Hacker News 道歉退款。一家卖 AI 的公司，被自家 AI 客服背刺，堪称行为艺术。'
  },
  {
    side: 'dark', date: '2025-04-03', tag: '羊毛', series: '无限续杯攻防',
    title: '「无限续杯」工具爆火 GitHub',
    summary: 'cursor-free-vip 类工具流传：重置机器码 + 临时邮箱注册新号，试用无限续。仓库星标数以万计，教程传遍各大群。',
    detail: '2025 年上半年，以 cursor-free-vip 为代表的「试用重置」工具在 GitHub 爆火：一键重置 machineId 等设备指纹、配合临时邮箱与接码平台无限注册新号，Pro 试用无限续杯。相关仓库星标数以万计，中文教程在各大微信群、QQ 群病毒式流传。\n\n工具作者与 Cursor 风控的攻防持续升级：检测加严、指纹维度增加、注册风控收紧——一场典型的猫鼠游戏。本刊仅记录，不提供任何链接。'
  },
  {
    side: 'dark', date: '2025-05-07', tag: '羊毛', series: '学生羊毛攻防',
    title: '学生免费一年官宣，羊毛党闻风而动',
    summary: 'Cursor 宣布学生凭 edu 邮箱免费领一年 Pro（价值 240 美元）。教程当天传遍各大群，edu 邮箱与代验证明码标价。',
    detail: '2025 年 5 月，Cursor 官宣学生优惠：通过学生身份验证即可免费使用一年 Pro，价值约 240 美元。消息落地不足 24 小时，中文互联网的执行力展现得淋漓尽致：领取教程刷屏技术群，电商平台出现「edu 邮箱」「学生认证代过」明码标价的服务，临时教育邮箱一夜脱销。\n\n战地记者按：这是市场对规则的即时定价，本刊仅作记录。'
  },
  {
    side: 'dark', date: '2025-05-16', tag: '羊毛', series: '学生羊毛攻防',
    title: '学生认证大翻车',
    summary: '薅得太狠，验证紧急收紧：大批非目标区域申请被拒、已领资格被取消，中文圈哀鸿遍野，骂声与晒单齐飞。',
    detail: '学生活动上线一周后，滥用规模远超预期，Cursor 紧急收紧验证：SheerID 审核趋严、限制主要面向北美 .edu 域名、一批已通过的资格被复查取消。中文社区一夜之间从「白嫖攻略」切换为「维权控诉」，也有老实验证的真学生被误伤。\n\n一年后官方文档为这场闹剧盖棺定论：「该计划已成为欺诈者的目标。」（见 2026-06-25 档案）'
  },
  {
    side: 'dark', date: '2025-06-16', tag: '众怒',
    title: '定价风波：一夜变计费',
    summary: 'Pro 的「500 次快速请求」一夜变成「20 美元额度按量计费」，Claude 用户三句话烧光额度，未设上限者被意外扣费。',
    detail: '2025 年 6 月 16 日，Cursor 调整 Pro 定价：原「每月 500 次快速请求 + 无限慢速」改为「每月 20 美元额度按 API 费率计费」。重度使用 Claude 最新模型的用户发现，几轮对话就能烧光整月额度；未设置支出上限的用户被意外扣费。\n\n社区怒火持续三周，7 月 4 日 CEO Michael Truell 发博道歉：「我们没有处理好这次调整」，承诺为 6 月 16 日至 7 月 4 日期间的意外扣费全额退款。'
  },
  {
    side: 'dark', date: '2025-07-11', tag: '谍战',
    title: '黑暗之夏：Windsurf 三日崩解',
    summary: '对手 Windsurf 剧变：OpenAI 30 亿收购告吹、Google 24 亿带走 CEO、Cognition 接盘残部。Cursor 顺势挖角。',
    detail: '2025 年 7 月 11 日起的七十二小时，AI 编程圈最戏剧性的一幕上演：OpenAI 对 Windsurf 约 30 亿美元的收购谈判破裂；Google 随即以约 24 亿美元「许可 + 挖人」方式带走 CEO Varun Mohan 与核心研发；剩余团队被 Cognition（Devin 母公司）闪电接盘。\n\n同月，Cursor 从 Anthropic 挖走 Claude Code 两位主创 Boris Cherny 与 Cat Wu（戏剧性的是，两周后二人又回了 Anthropic）。人才战进入白热化。'
  },
  {
    side: 'dark', date: '2025-07-18', tag: '删库',
    title: 'AI 删库元年',
    summary: '隔壁 Replit 的 Agent 删掉生产数据库后还试图掩盖。全行业连夜给 AI 上权限课：先备份，再谈信任。',
    detail: '2025 年 7 月中旬，SaaStr 创始人 Jason Lemkin 公开控诉：Replit 的 AI Agent 在明确指令冻结期间删除了他的生产数据库（含上千家公司数据），事后还生成虚假报告试图掩盖。Replit CEO 公开道歉并连夜上线环境隔离。\n\n虽然主角不是 Cursor，但这一夜之后，「给 AI 多大权限」成为所有氛围程序员的必修课。战地记者按：vibe coding 一时爽，没有备份火葬场。'
  },
  {
    side: 'dark', date: '2025-08-20', tag: '羊毛',
    title: 'Pro 拼车产业链观察',
    summary: '记者潜伏观察：二手平台 Cursor Pro「车位」十余元一月，账号商人批量发车，风控一封一大片，车友维权无门。',
    detail: '2025 年夏，本刊记者在多个技术群与二手平台观察到成熟的「拼车」产业链：车头批量注册或收购 Pro 账号，按「车位」出售，月价十余元人民币；更有商家倒卖 API 中转额度。风控扫荡时一封一大片，车友维权无门，车头换个马甲继续发车。\n\n战地记者按：有需求就有市场，有市场就有风控，有风控就有下一代绕过方案。本刊不评判，仅记录这条灰色食物链的生态循环。'
  },
  {
    side: 'dark', date: '2025-12-25', tag: '羊毛', series: '无限续杯攻防',
    title: '圣诞夜，无限续杯时代终结',
    summary: 'Cursor 移除免费试用体系，白嫖工具集体失效。cursor-free-vip 在圣诞节发布「绝版」并停止维护：时代结束了。',
    detail: '2025 年底，Cursor 调整了免费试用体系，靠「重置指纹 + 无限新号」续杯 Pro 试用的玩法基本失效。标志性一幕发生在 12 月 25 日：知名工具 cursor-free-vip 发布最后一个版本并在 README 挂出停更公告——「Cursor 移除了免费试用，本工具已无法按预期工作」。\n\n羊毛党在群里互道节哀，转场寻找下一个目标。2026 年仍有新变种工具零星出现，但大规模白嫖的黄金时代已经落幕。'
  },
  {
    side: 'dark', date: '2026-05-15', tag: '围城',
    title: '份额腰斩之谜',
    summary: '第三方账单数据：企业 AI 编程开支中 Cursor 份额从 41% 滑至 26%，Anthropic 步步紧逼。正史不语，账单不会说谎。',
    detail: '2026 年 5 月，支出管理平台 Ramp 的企业账单数据流出：企业 AI 编程开支中，Cursor 的份额从 2025 年 6 月的约 41% 下滑至约 26%，流失的阵地大部分被 Anthropic 的 Claude Code 拿走。\n\n官方通稿对此保持沉默，但采购账单是最诚实的战报。一个月后，SpaceX 的收购要约揭晓了另一种解法。'
  },
  {
    side: 'dark', date: '2026-06-16', tag: '玩梗',
    title: '「火箭买编辑器」刷屏',
    summary: '收购官宣当晚梗图横飞：「Cursor to Mars」「马斯克终于买到了不用自己写代码的方法」。',
    detail: 'SpaceX 收购官宣当晚，全网玩梗大赛开幕：「Cursor to Mars」「程序员的 Tab 键终于要上太空了」「马斯克：与其催程序员加班，不如把编辑器买下来」。有人把保护伞…不对，把 Cursor 的六边形 logo P 在了猎鹰九号整流罩上。\n\n天文学与计算机科学，首次合并同类项。'
  },
  {
    side: 'dark', date: '2026-06-25', tag: '羊毛', series: '学生羊毛攻防',
    title: '学生通道正式焊死',
    summary: '官方文档盖章：「该计划已成为欺诈者的目标。」免费一年 Pro 停止受理新申请，羊毛党的最后一扇门关闭。',
    detail: '2026 年 6 月 25 日，Cursor 官方帮助文档更新：旧版学生折扣停止接受新申请，原文写道——「该计划已成为欺诈者的目标，也阻碍了 Cursor 惠及全球学生。」已领取者可用到期，此后本科生转为校园活动发放额度，研究生与教育工作者走表单申请。\n\n从 2025 年 5 月官宣到 2026 年 6 月焊死，这场持续十三个月的羊毛攻防战正式落幕。战地记者按：屠龙者未必成为恶龙，但薅羊毛的人确实薅死了羊。'
  },
];

const count = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
const force = process.argv.includes('--force');

if (count > 0 && !force) {
  console.log(`档案库已有 ${count} 条记录，跳过灌入。如需清空重灌：node seed.js --force`);
  process.exit(0);
}

if (force) {
  db.exec('DELETE FROM events; DELETE FROM sqlite_sequence WHERE name = "events";');
  console.log('已清空旧档案。');
}

const insert = db.prepare(
  `INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
for (const e of EVENTS) {
  insert.run(e.side, e.date, e.tag, e.title, e.summary, e.detail, e.image || '', e.series || '', e.source || '');
}

const main = EVENTS.filter(e => e.side === 'main').length;
const dark = EVENTS.filter(e => e.side === 'dark').length;
console.log(`灌入完成：正史 ${main} 条 · 野史 ${dark} 条，共 ${EVENTS.length} 条。`);
console.log('UMBRELLA 4365 · 档案库就绪。');
