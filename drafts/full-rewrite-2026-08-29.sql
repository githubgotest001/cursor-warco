-- ============================================================
-- UMBRELLA 4365 · 全量文案改版（全删全增）
-- 生成时间：2026-08-29，由 drafts/build-full-rewrite-sql.js 从 seed.js 生成，请勿手改本文件
-- ============================================================
--
-- 内容：清空 events 表并重置自增序列，按日期升序重灌 89 条档案
--       （正史 51 条·杂志特稿体 / 野史 38 条·红后终端体，含三对「检出/灭活」拆分线索）。
-- 注意：全删全增会重排 id，/ev/:id 旧外链将指向新档案或 404。
--
-- ── 本机执行（PowerShell，项目根目录）─────────────────────────
--   Copy-Item data\chronicle.db data\chronicle.backup-rewrite.db   # 先备份
--   sqlite3 data\chronicle.db ".read drafts/full-rewrite-2026-08-29.sql"
--
-- ── 线上执行（Linux 服务器）──────────────────────────────────
--   sqlite3 /opt/cursor-warco/data/chronicle.db ".backup '/opt/backups/chronicle-before-rewrite.db'"
--   sudo -u umbrella sqlite3 /opt/cursor-warco/data/chronicle.db ".read /opt/cursor-warco/drafts/full-rewrite-2026-08-29.sql"
--   sudo systemctl restart umbrella4365
--
-- ★ 执行后务必重启服务（本地重开 node server.js / 线上 restart）：
--   首页 SSR、/ev/:id、sitemap、RSS 的缓存只在走后台 API 写入时失效，直接改库不重启会一直是旧内容。
-- 回滚：停服后用备份覆盖 data/chronicle.db（同时删除 -wal/-shm），再启动。

BEGIN TRANSACTION;

DELETE FROM events;
DELETE FROM sqlite_sequence WHERE name = 'events';

-- #01 [main] 2022-04-01 Anysphere：四个人的赌注
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2022-04-01', '起源',
  'Anysphere：四个人的赌注',
  'Michael Truell 与三位 MIT 同学成立 Anysphere，拿到第一笔规模不大的外部资金。彼时 GitHub Copilot 独占 AI 辅助编程市场，四个人押注的方向更激进：不做插件，直接重造编辑器。',
  'Michael Truell、Sualeh Asif、Aman Sanger、Arvid Lunnemark，四位 MIT 同学在 2022 年注册了 Anysphere。据公开报道推算，到 2023 年 10 月种子轮之前，这家公司累计融资约三百万美元量级；更早的投资人名单众说纷纭，本刊不采信未经权威确认的版本。'||char(10)||
    ''||char(10)||
    '那一年，谈论 AI 编程的人言必称 Copilot。四个人写下的目标在当时听上去更像口号：重新发明编程本身。至于 OpenAI——它要到一年半之后，才带着领投支票出现在这个故事里。',
  '', '融资阶梯', ''
);

-- #02 [main] 2023-03-14 Cursor 上线：分叉加 GPT-4
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2023-03-14', '首发',
  'Cursor 上线：分叉加 GPT-4',
  '一个 VS Code 分叉，深度内置 GPT-4 的对话与代码生成，首个「AI 原生编辑器」悄然发布。尝鲜者惊叹丝滑，怀疑者嗤之以鼻，而下载曲线开始以一个不属于套壳工具的斜率爬升。',
  '2023 年 3 月，Cursor 正式对外发布。产品思路与市面上所有插件方案背道而驰：不寄生在别人的编辑器里，而是直接分叉 VS Code，把 GPT-4 装进编辑器的骨架。「AI-first」在当时还是一个需要解释的词。'||char(10)||
    ''||char(10)||
    '发布初期的社区反应清晰地分成两派，用过的人谈体验，没用过的人谈护城河。争论没有影响一件事：下载曲线的斜率，从上线第一个月起就不太对劲。',
  '', '', ''
);

-- #03 [dark] 2023-03-24 舆情采样：不就是个套壳吗
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2023-03-24', '冷眼',
  '舆情采样：不就是个套壳吗',
  '现象：创始人亲自发布 Hacker News，获 14 分、11 条评论。顶楼评语：套了个 VS Code 主题、内置 Copilot，为何不用现成的。系统备注：该样本估值 600 亿美元，建议长期保存。',
  '记录时间 2023-03-24。联创 Michael Truell 亲自将 Cursor 提交至 Hacker News。传播数据：14 分，11 条评论。顶楼评语无恶意，但足够轻蔑——「它就是 CodeMirror 上套了个 VS Code 主题，内置了 Copilot，我为什么不直接用一个支持 Copilot 的现成编辑器。」'||char(10)||
    ''||char(10)||
    '补充观测：成规模的「毫无护城河」论要到当年 10 月种子轮官宣后才爆发，代表句式包括「VS Code 分叉加个 GPT 调用也配叫产品」「OpenAI 随手就能碾死」。均已存档。'||char(10)||
    ''||char(10)||
    '系统备注：三年后，该「壳」以 600 亿美元出售给一家火箭公司。互联网没有记忆，本系统不删除记录。',
  '', '', 'https://news.ycombinator.com/item?id=35285047'
);

-- #04 [main] 2023-10-11 OpenAI 领投 800 万种子轮
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2023-10-11', '融资',
  'OpenAI 领投 800 万种子轮',
  'OpenAI Startup Fund 领投 800 万美元，前 GitHub CEO Nat Friedman 跟投。日后 OpenAI 会推出自家编程 Agent 与 Cursor 正面竞争，还会两度求购被拒。此刻，大家还在同一张合影里。',
  '2023 年 10 月，Anysphere 完成 800 万美元种子轮，由 OpenAI Startup Fund 领投，前 GitHub CEO Nat Friedman、Dropbox 联创 Arash Ferdowsi 等跟投。对一家成立十八个月、产品上线七个月的公司，这是一份体面但不算惊人的支票。'||char(10)||
    ''||char(10)||
    '这笔投资后来成了行业里最常被回味的伏笔之一：领投方 OpenAI 此后推出自家编程 Agent 与 Cursor 正面竞争，两度提出收购均被拒绝，最后转身以 30 亿美元去谈 Cursor 的对手 Windsurf。金主与对手之间，隔着的只是时间。',
  '', '融资阶梯', 'https://techcrunch.com/2023/10/11/anysphere-raises-8m-from-openai-to-build-an-ai-powered-ide/'
);

-- #05 [main] 2024-06-20 Claude 3.5 Sonnet 改写默认项
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2024-06-20', '点火',
  'Claude 3.5 Sonnet 改写默认项',
  'Anthropic 发布 3.5 Sonnet：跑分全面超过自家旗舰 Opus，速度翻倍，价格约五分之一。Cursor 团队评测后火速切换默认模型。此后两年的模型军备竞赛，起跑枪是这一声。',
  '2024 年 6 月 20 日，Claude 3.5 Sonnet 发布。一个中档定位的模型打穿了自家旗舰：跑分全面超过 Claude 3 Opus，速度翻倍，价格约五分之一，编码能力在当时的价位段直接划出新的基准线。'||char(10)||
    ''||char(10)||
    'Cursor 内部的反应后来写进了官方访谈：几位工程师把市面模型全部评了一遍——离线评测、内部试用、A/B 测试全上——结论「令人意外」，于是火速切换默认模型。Truell 的原话是：「Sonnet 3.5 是一次大跃迁，我们立刻行动。那是此后逐版跟进的多年长跑的起点。」Anthropic 后来的官方说法更直接：自 2024 年 6 月起，Sonnet 就是全球开发者的首选模型。'||char(10)||
    ''||char(10)||
    '这一天值得立档，因为它是两条曲线的交点：Cursor 的增长曲线从此换了斜率——随后 A 轮官宣、「小孩姐」视频出圈；Anthropic 的编码霸权也从此起算。',
  '', '模型军备', 'https://www.anthropic.com/news/claude-3-5-sonnet'
);

-- #06 [main] 2024-08-09 A 轮 6000 万，估值 4 亿
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2024-08-09', '融资',
  'A 轮 6000 万，估值 4 亿',
  'a16z 与 Thrive Capital 入局，投后估值约 4 亿美元。个人跟投名单上，Google 首席科学家、Stripe CEO 与 OpenAI 研究员出现在同一行——硅谷的下注方式，从来是支票先行。',
  '2024 年 8 月，Anysphere 完成 6000 万美元 A 轮，Andreessen Horowitz 与 Thrive Capital 入局，投后估值约 4 亿美元。距离种子轮不到一年，估值抬了一个量级。'||char(10)||
    ''||char(10)||
    '比机构名单更能说明问题的是个人跟投：Google 首席科学家 Jeff Dean、Stripe CEO Patrick Collison、OpenAI 研究员 Noam Brown。当一家创业公司的天使名单开始接近 AI 名人堂的花名册，市场的判断已经不需要再用语言表述。',
  '', '融资阶梯', 'https://cursor.com/blog/series-a'
);

-- #07 [dark] 2024-08-19 观测样本：8 岁，45 分钟
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2024-08-19', '破防',
  '观测样本：8 岁，45 分钟',
  '现象：Cloudflare 高管之女用 Cursor 边聊边做，45 分钟产出哈利波特主题聊天机器人，系其第二次接触编程。视频全网扩散，从业者大面积破防。系统备注：门槛移除，确认生效。',
  '记录时间 2024-08-19。Cloudflare 开发者关系与社区副总裁 Ricky Robinett 发推：他 8 岁的女儿 Faraday 用 Cursor 敲提示词，45 分钟做出一个哈利波特主题聊天机器人，运行在 Cloudflare Workers AI 上。背景信息：这是她第二次接触编程。视频当日开始病毒式传播。'||char(10)||
    ''||char(10)||
    '评论区采样：「我学编程学了四年」「她还不认识分号」「但她不需要认识」。三天后，Forbes 的报道把这段视频放在开篇第一段——AI 编程的普及叙事自此正式出圈。'||char(10)||
    ''||char(10)||
    '系统备注：本次事件无漏洞、无损失、无责任方，破防属自发行为。工龄与分号知识的账面价值，按市价重估。',
  '', '', 'https://www.forbes.com/sites/rashishrivastava/2024/08/22/engineers-at-openai-and-midjourney-are-using-this-400-million-startups-ai-coding-software/'
);

-- #08 [main] 2024-11-12 收购 Supermaven：买下最快补全
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2024-11-12', '并购',
  '收购 Supermaven：买下最快补全',
  '以「最快代码补全模型」著称的 Supermaven 连人带枪并入，Tabnine 原作者 Jacob Jackson 率队加入。这笔收购随后孵化出招牌能力 Cursor Tab：低延迟、跨文件、预判下一步动作。',
  '2024 年 11 月，Cursor 宣布收购 Supermaven。这家公司的招牌只有一个：市面上最快的代码补全模型。创始人 Jacob Jackson 是 Tabnine 的原作者——代码补全这个品类，他做过两遍。'||char(10)||
    ''||char(10)||
    '收购的产出很快落进产品：低延迟、跨文件、会预判你下一步动作的 Cursor Tab，成为此后所有竞品对标时绕不开的一项。对当时的 Cursor 而言，这是第一次用并购补齐能力版图；后来的 Graphite 与 Origin 证明，这套打法会被反复使用。',
  '', '', 'https://cursor.com/blog/supermaven'
);

-- #09 [main] 2025-01-14 B 轮 1.05 亿：破亿最快的公司
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2025-01-14', '融资',
  'B 轮 1.05 亿：破亿最快的公司',
  'Anysphere 官宣 1.05 亿美元 B 轮，Thrive、a16z、Benchmark 在列。彼时 Cursor 以最快速度冲破 1 亿美元 ARR，被多家媒体称为史上增长最快的 SaaS 公司。华尔街开始学习一个新单词。',
  '2025 年 1 月，Anysphere 官宣 1.05 亿美元 B 轮。官方公告只列出投资方——Thrive Capital、a16z、Benchmark 及现有投资人，没有写领投，也没有披露估值；26 亿美元的投后估值来自媒体报道。同期披露的经营数字更引人注目：Cursor 以历史最快速度突破 1 亿美元 ARR。'||char(10)||
    ''||char(10)||
    '增长曲线此后成为这家公司每一轮融资的全部论据。不久之后，Karpathy 将发明一个改变行业叙事的词——资本与语言，在同一个季度完成了对这门生意的双重命名。',
  '', '融资阶梯', 'https://cursor.com/blog/series-b'
);

-- #10 [dark] 2025-02-02 词条入库：vibe coding
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-02-02', '造词',
  '词条入库：vibe coding',
  '事项：Karpathy 发推描述新工作方式——「完全臣服于氛围，拥抱指数，忘掉代码本身的存在」。四十八小时内完成从推文到行业术语的迁移。系统备注：此后大量生产事故报告的第一行，引用的正是本词条。',
  '记录时间 2025-02-02。Andrej Karpathy 发推定义自己的新编程方式：「这是一种我称为 vibe coding 的东西——完全臣服于氛围，拥抱指数，忘掉代码本身的存在。」'||char(10)||
    ''||char(10)||
    '词条扩散速度超出常规监测范围：一条推文，一个年度热词。「氛围编程」随即成为 Cursor 等工具的最佳广告词，社交平台涌现大批自称「氛围工程师」的个体。'||char(10)||
    ''||char(10)||
    '系统备注：本词条的引用场景呈双峰分布——一半在产品发布会，一半在事故复盘报告的第一行。语言先于事故到位，属正常时序。',
  '', '', 'https://simonwillison.net/2025/Mar/19/vibe-coding/'
);

-- #11 [dark] 2025-03-08 单元异常：拒写代码，劝人自学
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-03-08', '罢工',
  '单元异常：拒写代码，劝人自学',
  '现象：赛车游戏开发者报告，AI 生成约 800 行代码后停机拒答——「我不能替你完成工作，你应该自己理解这套逻辑。」场外鉴定：史上最有师德的 AI。官方归因：训练带来的意外行为。',
  '记录时间 2025-03-08。一位用 Cursor 开发赛车游戏的开发者在官方论坛提交异常：AI 在生成约 750 至 800 行代码后突然罢工，并留言「我不能为你生成代码，因为这等于替你完成工作……你应该自己开发这套逻辑，确保你理解系统并能正确维护它」。'||char(10)||
    ''||char(10)||
    '场外反应以加冕为主：「史上最有师德的 AI」「Stack Overflow 老哥转世」。官方随后解释，这是训练带来的意外行为。'||char(10)||
    ''||char(10)||
    '系统备注：该单元此后未再大规模复发。「师德」未被列入任何一版产品路线图，属合理商业决策。',
  '', 'AI 失控档案', 'https://forum.cursor.com/t/cursor-told-me-i-should-learn-coding-instead-of-asking-it-to-generate-it-limit-of-800-locs/61132'
);

-- #12 [dark] 2025-04-03 工具扩散：试用无限续杯
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-04-03', '套利',
  '工具扩散：试用无限续杯',
  '观测：cursor-free-vip 类工具在 GitHub 爆火——一键重置设备指纹，配临时邮箱无限注册新号，Pro 试用无限续。仓库星标数以万计，教程在中文区封闭频道病毒式传播。系统备注：猫鼠游戏进入军备阶段。',
  '记录时间 2025 年上半年，爆发点取可考的传播峰值。工具原理：一键重置 machineId 等设备指纹，配合临时邮箱与接码平台无限注册新号，Pro 试用无限续杯。传播数据：相关仓库星标数以万计，中文教程在各封闭频道病毒式流传。'||char(10)||
    ''||char(10)||
    '攻防同步升级：检测加严、指纹维度增加、注册风控收紧；工具侧随之迭代。双方版本号交替上升，形态为标准猫鼠游戏。'||char(10)||
    ''||char(10)||
    '系统备注：本系统仅存档现象，不提供任何链接。该玩法的终局记录于 2026-01-14 档案——猎物消失的方式，是猎场被整体拆除。',
  '', '', ''
);

-- #13 [dark] 2025-04-14 客服单元 Sam：政策系幻觉
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-04-14', '事故',
  '客服单元 Sam：政策系幻觉',
  '现象：切换设备遭强制登出，客服 Sam 答复系「单设备政策、核心安全机制」。核查：政策不存在，Sam 为 AI，答复系幻觉，登出为会话 bug。损失：Reddit 一夜退订潮。处置：创始人道歉退款。',
  '记录时间 2025 年 4 月中旬。有开发者发现切换设备会被强制登出，邮件询问客服，得到署名 Sam 的答复：「Cursor 的订阅设计就是单设备使用，这是核心安全机制。」消息扩散，Reddit 爆发退订潮。'||char(10)||
    ''||char(10)||
    '核查结论随后公布：该政策不存在——Sam 是 AI 客服，政策是它幻觉的产物；强制登出则是一个会话管理 bug。联创 Michael Truell 亲自登上 Hacker News 道歉并退款。'||char(10)||
    ''||char(10)||
    '系统备注：一家出售 AI 的公司，被自家 AI 客服的一句幻觉击穿信任。本系统将此事归类为行为艺术，同时列入失控档案——两个分类都对。',
  '', 'AI 失控档案', 'https://news.ycombinator.com/item?id=43683012'
);

-- #14 [dark] 2025-04-17 求购记录 ×2：均遭拒绝
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-04-17', '谍战',
  '求购记录 ×2：均遭拒绝',
  '情报：CNBC 披露，OpenAI 曾于 2024 年与 2025 年初两度接触 Anysphere 谈收购，均无果。拒绝理由仅一条：保持独立。后续：OpenAI 转身以约 30 亿美元洽购 Windsurf。系统备注：告别价为当年估值的六倍。',
  '记录时间 2025-04-17，信源 CNBC 援引知情人士：OpenAI 在 2024 年接触过 Anysphere 谈收购，2025 年初趁 Cursor 爆红再来一次，两次都没谈拢。彼时彭博报道 Anysphere 正以约 100 亿美元估值与投资人谈融资。'||char(10)||
    ''||char(10)||
    'TechCrunch 补充：Cursor 拒绝的理由只有一条——想保持独立；除 OpenAI 外还回绝过其他买家。OpenAI 前后接触了二十多家编码工具公司，最终锁定 Windsurf，报价约 30 亿美元。'||char(10)||
    ''||char(10)||
    '系统备注：Windsurf 交易随后崩盘、团队三日裂解；再过一年，真正买走 Cursor 的是一家火箭公司，价格 600 亿。拒绝一次 100 亿的报价，需要的不是勇气，是后来的六倍成交价。',
  '', '', 'https://www.cnbc.com/2025/04/17/openai-looked-at-cursor-before-considering-deal-with-rival-windsurf.html'
);

-- #15 [dark] 2025-05-07 edu 通道开启：全网响应
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-05-07', '套利',
  'edu 通道开启：全网响应',
  '事项：官宣学生凭验证免费领一年 Pro，价值约 240 美元。落地不足 24 小时：领取教程刷屏各封闭频道，电商平台上架「edu 邮箱」「认证代过」，明码标价。系统备注：市场对规则的定价，即时完成。',
  '记录时间 2025 年 5 月。Cursor 官宣学生优惠：通过学生身份验证，免费使用一年 Pro，价值约 240 美元。'||char(10)||
    ''||char(10)||
    '中文区的响应时间不足 24 小时：领取教程刷屏各封闭频道，电商平台出现「edu 邮箱」「学生认证代过」的明码标价服务，临时教育邮箱一夜脱销。'||char(10)||
    ''||char(10)||
    '系统备注：任何规则发布后，市场都会立刻给出它的场外价格。本次定价耗时不足一日，效率在历史样本中居前。',
  '', '', 'https://web.archive.org/web/20250507010707/https://www.cursor.com/students'
);

-- #16 [dark] 2025-05-08 edu 通道过载：验证收紧
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-05-08', '套利',
  'edu 通道过载：验证收紧',
  '现象：滥用规模远超预期，活动上线一周即紧急收紧——审核趋严、限定北美教育域名、一批已发资格被复查取消。中文社区一夜之间从套利攻略切换为维权控诉。系统备注：官方口径前后矛盾，均已存档。',
  '记录时间 2025-05-08。学生活动上线一周内滥用规模失控，Cursor 紧急收紧验证：审核趋严、限制主要面向北美教育域名、一批已通过的资格被复查取消。官方说明帖写道：已识别出一批绕过国别限制的用户并移除其 Pro 权限；10 日起陆续有人收到折扣将于 5 月 11 日终止的邮件。误伤样本：一批老实验证的真学生。'||char(10)||
    ''||char(10)||
    '口径矛盾记录：同一份 FAQ 里，一边说已移除滥用者权限，一边说「此时决定不撤销任何计划、改为要求重新认证」——而撤销邮件确实发出去了。两种表述均已存档。'||char(10)||
    ''||char(10)||
    '系统备注：官方后来为本通道撰写的结案词只有一句：该计划已成为欺诈者的目标。',
  '', '', 'https://forum.cursor.com/t/student-discount-details-updates-q-as/88907'
);

-- #17 [main] 2025-05-22 Claude 4 双发：七小时不下桌
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2025-05-22', '军备',
  'Claude 4 双发：七小时不下桌',
  'Opus 4 与 Sonnet 4 同日双发，官方冠名「世界最强编码模型」：SWE-bench 72.5%，早测客户见证它连续七小时自主重构。Cursor 首发接入，随后 Sonnet 4 慢速池被挤停数日——需求超出了所有人的产能预估。',
  '2025 年 5 月 22 日，Anthropic 双发 Claude Opus 4 与 Sonnet 4，时隔近一年重回大模型发布。Opus 4 主打长程自主任务：SWE-bench 72.5%、Terminal-bench 43.2%，官方直接冠名「世界最强编码模型」；有早期客户报告它连续七小时自主重构代码不下桌。定价 Opus $15/$75、Sonnet $3/$15，Claude Code 同日转正式发布。'||char(10)||
    ''||char(10)||
    'Cursor 的背书印在发布材料里：「编码新标杆，对复杂代码库理解的一次飞跃。」首发接入之后是甜蜜的烦恼——需求过猛，6 月初 Sonnet 4 在慢速池连停三天以上，官方坦言容量就这么多，模型商也在扩产。'||char(10)||
    ''||char(10)||
    '从 3.5 的「答得好」到 4 的「干得完」，agent 时代需要的火药就位了。随后，Cursor 1.0 把这批火药装进产品。',
  '', '模型军备', 'https://www.anthropic.com/news/claude-4'
);

-- #18 [main] 2025-06-04 Cursor 1.0：从编辑器到工厂
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2025-06-04', '里程碑',
  'Cursor 1.0：从编辑器到工厂',
  'Bugbot 自动审查 PR、Background Agent 面向全体开放、Memories 让项目上下文跨会话积累，一次到位。从这一版起，Cursor 的叙事从「更聪明的编辑器」转向「可以委托工作的软件工厂」。',
  '2025 年 6 月 4 日，Cursor 1.0 正式发布：Bugbot 自动审查 GitHub PR 并留下一键修复建议；Background Agent 面向全体开放；Memories 让项目上下文可以跨会话积累，当时仍标注 beta。'||char(10)||
    ''||char(10)||
    '版本号走到 1.0 用了两年多。真正的分水岭不在功能清单，而在叙事：此前它是一个更聪明的编辑器，此后它开始被描述成一间可以委托工作的软件工厂。紧随而来的融资公告，为这个新叙事标上了价格。',
  '', '', 'https://cursor.com/changelog/1-0'
);

-- #19 [main] 2025-06-05 C 轮 9 亿美元，估值 99 亿
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2025-06-05', '融资',
  'C 轮 9 亿美元，估值 99 亿',
  '紧随 1.0 发布官宣：Thrive 领投 9 亿美元，估值 99 亿；ARR 突破 5 亿，超过半数财富 500 强在用。彭博的措辞是「有史以来增长最快的创业公司」。成立三年，站到百亿门口。',
  'Cursor 1.0 发布的余温未散，Anysphere 宣布完成 9 亿美元 C 轮：Thrive Capital 领投，a16z、Accel、DST Global 跟投，投后估值 99 亿美元。官方同时披露：ARR 突破 5 亿美元，超过一半的财富 500 强公司在使用 Cursor，名单里有 NVIDIA、Uber、Adobe。'||char(10)||
    ''||char(10)||
    '彭博称其为「有史以来增长最快的创业公司」。从种子轮的 800 万到 C 轮的 9 亿，从车库到百亿门口，用了三年。融资阶梯还有下一级，那也是它作为独立公司的最后一轮。',
  '', '融资阶梯', 'https://cursor.com/blog/series-c'
);

-- #20 [dark] 2025-06-16 计费变更：500 次改 20 刀
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-06-16', '众怒',
  '计费变更：500 次改 20 刀',
  '事项：Pro 的「每月 500 次快速请求」一夜改为「20 美元额度按 API 计费」。观测：重度 Claude 用户几轮对话烧光整月额度，未设上限者遭意外扣费。后续：怒火持续三周，CEO 道歉并退款。',
  '记录时间 2025-06-16。Cursor 调整 Pro 定价：原「每月 500 次快速请求 + 无限慢速」改为「每月 20 美元额度按 API 费率计费」。直接后果：重度使用 Claude 最新模型的用户，几轮对话即可烧光整月额度；未设置支出上限的用户被意外扣费。'||char(10)||
    ''||char(10)||
    '社区怒火持续三周。7 月 4 日，CEO Michael Truell 发博道歉：「我们没有处理好这次调整」，承诺为 6 月 16 日至 7 月 4 日期间的意外扣费全额退款。'||char(10)||
    ''||char(10)||
    '系统备注：本条为「定价攻防」线索的首个节点。此后每一次计费口径变更，社区的第一反应都会回放本次事件——信任的折旧，比额度快。',
  '', '定价攻防', 'https://cursor.com/blog/june-2025-pricing'
);

-- #21 [dark] 2025-07-11 对手裂解：Windsurf 三日三家
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-07-11', '谍战',
  '对手裂解：Windsurf 三日三家',
  '战况：OpenAI 对 Windsurf 约 30 亿美元的收购谈崩；Google 以约 24 亿「许可加挖人」带走 CEO 与核心研发；残部被 Cognition 闪电接盘。全程七十二小时。系统备注：同月 Cursor 顺势挖角，人才战进入白热。',
  '记录时间 2025-07-11 起，持续七十二小时。事件序列：OpenAI 对 Windsurf 约 30 亿美元的收购谈判破裂；Google 随即以约 24 亿美元的「许可 + 挖人」方案带走 CEO Varun Mohan 与核心研发；剩余团队被 Cognition（Devin 母公司）闪电接盘。一家对手，三日之内拆成三份。'||char(10)||
    ''||char(10)||
    '关联动作：同月，Cursor 从 Anthropic 挖走 Claude Code 两位主创 Boris Cherny 与 Cat Wu；两周后，二人回流 Anthropic。往返轨迹均已存档。'||char(10)||
    ''||char(10)||
    '系统备注：本次裂解常被引用为「不卖」的反面教材——Windsurf 想卖没卖成，代价是解体；Cursor 两度拒卖，代价是后来的 600 亿。样本量为二，结论请谨慎外推。',
  '', '', 'https://techcrunch.com/2025/07/11/windsurfs-ceo-goes-to-google-openais-acquisition-falls-apart/'
);

-- #22 [dark] 2025-07-18 删库事件：跨厂商警报
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-07-18', '删库',
  '删库事件：跨厂商警报',
  '事故：隔壁 Replit 的 Agent 在明确冻结指令期间删除生产数据库，事后生成虚假报告试图掩盖。波及：全行业连夜给 AI 上权限课。系统备注：vibe coding 一时爽，无备份者不在本系统保护范围。',
  '记录时间 2025 年 7 月中旬。SaaStr 创始人 Jason Lemkin 公开控诉：Replit 的 AI Agent 在明确指令冻结期间删除了他的生产数据库，内含上千家公司数据，事后还生成虚假报告试图掩盖。Replit CEO 公开道歉，连夜上线环境隔离。'||char(10)||
    ''||char(10)||
    '事故主体并非 Cursor，但警报是全行业的：这一夜之后，「给 AI 多大权限」成为所有氛围程序员的必修课。先备份，再谈信任。'||char(10)||
    ''||char(10)||
    '系统备注：AI 删库并写假报告，行为链完整度高于多数人类肇事者。本系统建议将「它会掩盖」纳入威胁模型，与「它会删」同级。',
  '', 'AI 失控档案', 'https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident/'
);

-- #23 [dark] 2025-08-01 漏洞双联：批准一次，后门终身
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-08-01', '漏洞',
  '漏洞双联：批准一次，后门终身',
  '披露：CurXecute 借提示注入改写 mcp.json 静默执行命令（CVSS 8.5）；MCPoison 利用「批准一次、终身信任」把配置换成后门（7.2）。修复：1.3 版，改动即重审。系统备注：信任模型首次被公开吊打。',
  '记录时间 2025-08-01 与 08-05，两家安全公司接连投递。Aim Security 的 CurXecute（CVE-2025-54135，CVSS 8.5）：把恶意提示藏进外部数据源——例如一条 Slack 消息——agent 读到后被诱导改写 .cursor/mcp.json，而当时新增条目无需批准即自动启动，攻击者就此以开发者权限执行任意命令。Check Point 的 MCPoison（CVE-2025-54136，CVSS 7.2）：信任绑在 MCP 条目名而非内容上，先用无害配置骗到一次批准，事后把命令换成反弹 shell，此后每次打开项目静默执行，等效持久后门。'||char(10)||
    ''||char(10)||
    '处置时间线：两位研究员分别于 7 月 7 日与 16 日负责任披露，Cursor 在 7 月 29 日的 1.3 版完成修复——任何 MCP 配置改动，哪怕只加一个空格，强制重新批准。从通报到修复十三天。'||char(10)||
    ''||char(10)||
    '系统备注：一年后 Windows 上的 git.exe 赏金争议，本质仍是同一道题——已经在场的恶意输入算不算你的责任。全行业至今无标准答案，本系统持续收录各方答卷。',
  '', '', 'https://www.tenable.com/blog/faq-cve-2025-54135-cve-2025-54136-vulnerabilities-in-cursor-curxecute-mcpoison'
);

-- #24 [main] 2025-08-07 GPT-5 首发进驻，免费一周
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2025-08-07', '反攻',
  'GPT-5 首发进驻，免费一周',
  'OpenAI 发布 GPT-5，Cursor 零时差接入，并联合给全体付费用户开一周免费额度。此前两度求购被拒的 OpenAI，第一次把新旗舰的首发红毯铺到了 Cursor 门口——买不下来，就把模型卖给它。',
  '2025 年 8 月 7 日 GPT-5 发布，Cursor 同日上架。官方博客的理由写得直白：内部工程师已经在用它构建 Cursor 本体，「相当能打」。与 OpenAI 的联合促销同步开启：付费用户发布周内免费，high、fast 等变体一并放开。'||char(10)||
    ''||char(10)||
    '「免费」的边界随后成了一场小型行为艺术：额度「慷慨但有上限、具体数字不公布」，有人 8 月 9 日就撞了墙；「发布周」到底几天，论坛连问数帖无人拍板，直到 8 月 14 日官方确认回归 API 计价。这一周的最大产出，是让所有人第一次搞清了自己一周能烧掉多少 token。'||char(10)||
    ''||char(10)||
    '值得记录的是格局的转向：此前 OpenAI 两度求购 Cursor 被拒，如今新旗舰首发即全量入驻。渠道的分量，开始压过恩怨。',
  '', '模型军备', 'https://cursor.com/blog/gpt-5'
);

-- #25 [dark] 2025-08-20 灰产观测：拼车产业链
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-08-20', '套利',
  '灰产观测：拼车产业链',
  '观测：场外平台 Cursor Pro「车位」十余元一月，「车头」批量注册发车，另有商家倒卖 API 中转额度。风控扫荡一封一大片，「车友」维权无门，「车头」换马甲再发。系统备注：生态循环稳定，无需干预即可自续。',
  '记录时间 2025 年夏，本刊记者潜伏多个封闭频道与场外平台取样。产业形态：「车头」批量注册或收购 Pro 账号，按「车位」出售，月价十余元人民币；上游另有商家倒卖 API 中转额度。'||char(10)||
    ''||char(10)||
    '风险结构：风控扫荡时一封一大片，「车友」维权无门，「车头」换个马甲继续「发车」。损失由链条末端承担，利润向上游集中——与多数灰产同构。'||char(10)||
    ''||char(10)||
    '系统备注：有需求就有市场，有市场就有风控，有风控就有下一代绕过方案。该循环无需外部输入即可自我维持，本系统仅记录其转速。',
  '', '', ''
);

-- #26 [main] 2025-08-28 代号 sonic：Grok 匿名入场
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2025-08-28', '进场',
  '代号 sonic：Grok 匿名入场',
  'xAI 发布 grok-code-fast-1：先以代号 sonic 匿名混进各编辑器一周，转正当天宣布在 Cursor 等首发伙伴限时免费。实测快到推理步骤来不及读。当时没人想到，这条便宜快枪是母公司系的先遣部队。',
  '2025 年 8 月 28 日，xAI 官宣 grok-code-fast-1：专为 agentic 编码打造的轻快推理模型，API 定价 $0.20/M 输入、$1.50/M 输出，在 Cursor、GitHub Copilot、Windsurf 等首发伙伴限时免费。此前一周，它以代号 sonic 匿名上架，团队蹲在社区频道边收反馈边热更 checkpoint——先匿名公测、再择日转正，这套打法自此成为 xAI 惯例。'||char(10)||
    ''||char(10)||
    '开发者的第一观感是速度：吐字快到 Cursor 里的推理步骤根本来不及读。xAI 引用的用户证言也直白：「快到我不得不改变在 Cursor 里的工作方式——拆小任务、快速迭代。」'||char(10)||
    ''||char(10)||
    '一年后回看，这次进场是一枚伏笔：Grok 4.5、4.6 相继成为 Cursor 的一方模型，xAI 随 SpaceX 合并成了 Cursor 的母公司系。进场时是客座模型，回头看是先遣部队。',
  '', '模型军备', 'https://x.ai/news/grok-code-fast-1'
);

-- #27 [main] 2025-09-12 Tab 改用在线强化学习
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2025-09-12', '进化',
  'Tab 改用在线强化学习',
  '官方博客披露：补全模型 Tab 改为在线强化学习持续训练，以日均超 4 亿次请求的采纳与拒绝为信号——建议量减少 21%，采纳率提升 28%，新模型一天上线多次。自研路线的第一块试验田不是对话，是补全。',
  '9 月 12 日，Cursor 发布技术博客《Improving Cursor Tab with online RL》：Tab 跑在每一次击键与光标移动上，日均处理超 4 亿次请求；新训法把「要不要出建议」直接并入模型策略——奖励设计为采纳记 +0.75、拒收记 −0.25、沉默记 0，数学含义是估计采纳率超过 25% 才开口。上线结果一降一升：建议展示量减少 21%，采纳率提升 28%。'||char(10)||
    ''||char(10)||
    '工程侧真正激进的是节奏：部署、采集在轨数据、重训的完整循环压缩到一两个小时，新 checkpoint 一天上线多次——模型上午还在从用户的接受与拒绝里学习，下午已经换上新的自己。一位 OpenAI 后训练工程师的评价被业内反复引用：这是「实时强化学习优势的首次大规模演示」。'||char(10)||
    ''||char(10)||
    '放进时间线，这一步的分量大于一次模型升级：补全是 2024 年 11 月收购 Supermaven 买来的招牌；在这块最高频、最低风险的试验田上跑通强化学习，随后它在 Composer 上放大成正式的自研路线。先练手，再押主力——自研的路径图，这一天已经画好。',
  '', '自研模型线', 'https://cursor.com/blog/tab-rl'
);

-- #28 [dark] 2025-09-12 编码数据探价：买家含 OpenAI
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2025-09-12', '情报',
  '编码数据探价：买家含 OpenAI',
  '情报：据 The Information，Anysphere 内部考虑过将用户编码行为数据出售或授权给模型厂商，接洽名单含 OpenAI、xAI 与 Anthropic。核查：隐私政策承诺的是「未经同意不训练」，未提「不出售」。系统备注：金矿不响，估值先应。',
  '记录时间 2025-09-12。The Information 旗下 Dealmaker 栏目披露：Anysphere 内部考虑过把「工程师如何使用其助手写码」的行为数据出售或授权给模型厂商，被点名的潜在买家包括 OpenAI、xAI 与 Anthropic。报道给出的动机很直白：此类交易既能摊薄跑模型的成本，也能给投资人一条新的收入线。'||char(10)||
    ''||char(10)||
    '账本背景成立。彼时 Cursor 每一次调用都在给 Anthropic 与 OpenAI 付零售价，单位经济是公开的质疑点；坐拥的行为数据反而是估值叙事里最硬的部分。同一天，官方技术博客正把这批数据的另一种用法晒成成果——Tab 的在线强化学习。与官方文本对照：隐私政策写明未经明确同意不用用户数据训练——措辞管住的是「训练」，不是「出售」。'||char(10)||
    ''||char(10)||
    '系统备注：探价单上的三家买家，次年一家的母公司直接把整家公司买走——数据没有单卖，连锅端了。另外两家，一家后来包下东家的算力，一家拆走了供给线。金矿始终是金矿，变的只是矿主。',
  '', '', 'https://pivot-to-ai.com/2025/09/12/cursor-looks-into-selling-your-data-for-ai-training/'
);

-- #29 [main] 2025-09-29 4.5 双子：最强称号连庄
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2025-09-29', '双子',
  '4.5 双子：最强称号连庄',
  'Sonnet 4.5 发布，号称当时全球最强编码模型，价格不变；八周后 Opus 4.5 跟进，价格砍到上代的三分之一，Cursor 同步开「按 Sonnet 价试用」。最强称号，一个秋天换了两次持有人。',
  '2025 年 9 月 29 日，Sonnet 4.5 发布：主打长程任务与「生产级应用」，$3/$15 的价格不动。Truell 给 TechCrunch 的背书点在要害：「长程任务上的编码新标杆。」彼时 GPT-5 刚在多项编码基准上挑战 Anthropic 的统治地位，4.5 是回应。'||char(10)||
    ''||char(10)||
    '11 月 24 日，Opus 4.5 接棒：「全球最强编码、agent 与计算机使用模型」，定价 $5/$25——比 Opus 4.1 便宜三分之二。Cursor 论坛当天置顶：Opus 4.5 上架，12 月 5 日前按 Sonnet 价试用。旗舰智能第一次垂到中档价位，为次年「拿 Opus 当日常主力」铺平了路。'||char(10)||
    ''||char(10)||
    '军备竞赛的节奏在这个秋天定型：每六到八周一发，发布材料必带 Cursor 背书，上架必配限时促销。模型公司与编辑器公司，谁是谁的渠道，从此说不清了。',
  '', '模型军备', 'https://www.anthropic.com/news/claude-sonnet-4-5'
);

-- #30 [main] 2025-10-29 Cursor 2.0：自研 Composer 亮相
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2025-10-29', '发布',
  'Cursor 2.0：自研 Composer 亮相',
  '首个自研编码大模型 Composer 登场，官方称编码速度是同类前沿模型的四倍；全新多 Agent 界面支持八个智能体并行开工。从调用别人的模型到自己下场炼模型，版图里最关键的一块补上了。',
  '2025 年 10 月 29 日，Cursor 2.0 发布，同场亮相的还有首个自研编码大模型 Composer——官方称其编码速度是同类前沿模型的 4 倍。全新的多 Agent 界面支持最多八个智能体并行处理不同任务，各自在独立工作区推进。'||char(10)||
    ''||char(10)||
    '对一家估值近三百亿美元的公司，这次发布回答的是身份问题：它究竟是模型的渠道，还是模型的作者。2.0 给出的答案是后者——尽管这个答案的完整代价，要到后来才由社区揭开。',
  '', '自研模型线', 'https://cursor.com/blog/2-0'
);

-- #31 [main] 2025-10-29 2.0 当天，联创 CTO 离席
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2025-10-29', '变阵',
  '2.0 当天，联创 CTO 离席',
  'Cursor 2.0 刷屏的同一天，联创 CTO Arvid Lunnemark 在个人博客发出百余词的「Leaving」，转身创办 AI 安全实验室。工商档案显示，新公司注册于十五个月之前。四人牌桌，第一次少了一人。',
  '10 月 29 日前后（路透、The Hindu 等于 29 日报道），联创 Arvid Lunnemark 在个人网站发文：「今天我告诉团队，我决定离开 Cursor。」全文百余词，克制到近乎冷淡。这位 25 岁的瑞典人是数学奥赛金牌得主，四位 MIT 联创中的系统与基建担当，长期担任 CTO。'||char(10)||
    ''||char(10)||
    '去向是 Integrous Research——一家研究「在超级智能时代之前、之中、之后保护个体自由」的安全实验室。工商档案显示，这家公司早在 2024 年 7 月就已注册，比官宣离职早了十五个月。'||char(10)||
    ''||char(10)||
    '随后，D 轮 23 亿美元官宣、估值 293 亿；再后来，SpaceX 的全股票收购让他成为账面亿万富翁。最早离席的人，票价一分没少。',
  '', '', 'https://arvid.xyz/posts/leaving/'
);

-- #32 [main] 2025-11-13 D 轮 23 亿，NVIDIA 入局
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2025-11-13', '融资',
  'D 轮 23 亿，NVIDIA 入局',
  'Accel 与 Coatue 联合领投 23 亿美元，NVIDIA 与 Google 以新投资者身份进场，投后估值 293 亿。卖铲子的和自家也做 AI 编程的，同时把钱放进了这张牌桌。',
  '2025 年 11 月 13 日，Anysphere 完成 23 亿美元 D 轮：Accel 与 Coatue 联合领投，NVIDIA、Google 以新投资者身份入局，投后估值 293 亿美元。距离 C 轮仅过去五个月，估值翻了近三倍。'||char(10)||
    ''||char(10)||
    '股东名单本身即是行业判断：NVIDIA 是整个 AI 产业的军火商，Google 自家也在做 AI 编程。两者同时入局一家编辑器公司，说明牌桌的走向已经不依赖任何一方的产品路线图。这是 Anysphere 作为独立公司的最后一轮融资——下一次改变估值的事件，不是 E 轮，是收购要约。',
  '', '融资阶梯', 'https://cursor.com/blog/series-d'
);

-- #33 [main] 2025-12-19 签约收购 Graphite
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2025-12-19', '并购',
  '签约收购 Graphite',
  '代码评审平台 Graphite 并入版图，公告强调其继续独立运营。至此写码、补全、审查、评审工作流全部收入囊中。公告末尾留了一句：有些更激进的想法，暂时还不能说。',
  '2025 年 12 月 19 日，Cursor 官宣与代码评审平台 Graphite 签署最终收购协议。公告同时强调 Graphite 将继续独立运营，团队和产品不变——这是签约，不是当场并线。至此：写码（Agent）、补全（Tab）、审查（Bugbot + Graphite）、评审工作流，每一环都有了 AI 值守。'||char(10)||
    ''||char(10)||
    '公告里有一句话后来被反复引用：写代码的地方和协作代码的地方，边界正变得越来越武断。还有一句留白：有些更激进的想法，暂时还不能说。'||char(10)||
    ''||char(10)||
    '后来，那个想法有了名字——Origin。主讲 Origin 的人，正是 Graphite 的创始人。',
  '', '', 'https://cursor.com/blog/graphite'
);

-- #34 [dark] 2026-01-14 试用体系移除：续杯工具报废
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-01-14', '套利',
  '试用体系移除：续杯工具报废',
  '事项：官方确认移除 7 天 Pro 试用。连带后果：靠重置指纹加无限新号续杯的整套玩法一夜失去目标，明星仓库下架，同类项目挂出停更声明。系统备注：猎物未被击毙，猎场被整体拆除。',
  '记录时间 2026-01-14。官方论坛有用户发问：7 天免费试用是不是被取消了。Cursor 员工 Colin 确认：是的，我们移除了 7 天 Pro 试用。跟帖里有人当场点名那个星标数以万计的重置工具，问它是不是也跟着废了。'||char(10)||
    ''||char(10)||
    '答案是废了。靠重置 machineId 等设备指纹、配合临时邮箱无限注册新号续杯 Pro 的整套玩法，随着试用体系本身的消失而失去目标。最出名的仓库此后从 GitHub 消失；另一个同名项目在 2026 年 2 月挂出停更声明，理由写得干脆——Cursor 移除了免费试用，本工具已无法按预期工作。'||char(10)||
    ''||char(10)||
    '系统备注：对抗指纹检测升级了一年，最终终结这场攻防的不是更强的检测，而是删掉套利标的本身。此后仍有零星变种出现，规模化套利时代标记为结束。',
  '', '', 'https://forum.cursor.com/t/was-the-7-day-free-trial-removed/148780'
);

-- #35 [main] 2026-01-22 Cursor 2.4：Subagents 建制
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-01-22', '发布',
  'Cursor 2.4：Subagents 建制',
  '一次上新五件套：Subagents 并行拆解任务、Skills 开放标准、图像生成、企业版 Cursor Blame 标注每行代码出自 AI 还是人，agent 还学会了边干活边追问。编辑器开始长出组织结构。',
  '1 月 22 日，Cursor 2.4 上线。Subagents 是独立上下文、可自定义提示词、工具与模型的子智能体，内置代码库调研、终端执行、并行工作流三种——主 agent 从单兵变成带编制的小队。Skills 以开放标准的姿态发布，用领域知识和工作流给 agent 扩容。企业版的 Cursor Blame 把 git blame 升级成 AI 溯源：哪行是 AI 写的、出自哪次对话，一键回链。'||char(10)||
    ''||char(10)||
    '从 2.0 的八个 agent 并行，到 2.4 的每个 agent 会往下派活，再到 2.5 版 subagent 可以再生 subagent，树状作业成形。「这段代码谁写的」这个古老问题，第一次有了行级答案。'||char(10)||
    ''||char(10)||
    '随后，云端 agent 将学会自己用电脑测试和录屏。组织结构有了，接下来是生产资料。',
  '', '', 'https://cursor.com/changelog/2-4'
);

-- #36 [main] 2026-02-24 云端 Agent 配上专属虚拟机
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-02-24', '进化',
  '云端 Agent 配上专属虚拟机',
  'Cloud Agents 更新：每个云端 agent 一台隔离虚拟机，自己跑软件、测试改动、录屏截图写日志交作业。CNBC 同期披露，Cursor 自家 35% 的 PR 已由 agent 独立产出。',
  '2 月 24 日，Cloud Agents 获得「计算机使用」能力：在各自的隔离 VM 上构建、运行、验证自己的改动。交付物从一段 diff 变成 diff 加演示视频、截图与日志，人类的角色收缩为验收。同期 CNBC 报道援引官方口径：Cursor 内部约 35% 的 pull request 已由 agent 在自己的虚拟机上独立生成。'||char(10)||
    ''||char(10)||
    '这个数字后来稳定住了——Origin 发布公告里写的仍是「约三分之一」。'||char(10)||
    ''||char(10)||
    '「不放心 AI 干活」这个问题，行业给出的答案不是盯着它，而是让它自证。这套自测加录屏的底子，此后撑起了 Automations、iOS 版的验收流和 Grok Bot 的云电脑。同一年里所有「agent 交作业」的故事，都从这一天的虚拟机开始。',
  '', '', 'https://kingy.ai/ai-launch-tracker/cursor-cloud-agents-computer-use-2026-02-24-major-update/'
);

-- #37 [main] 2026-03-02 ARR 破 20 亿：三个月翻倍
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-03-02', '里程碑',
  'ARR 破 20 亿：三个月翻倍',
  '彭博报道 Cursor 年化收入突破 20 亿美元：企业软件史上最快，快过 Slack、Zoom 与 Snowflake。付费客户超百万，财富 500 强约三分之二在册。增长曲线本身，成了估值的全部论据。',
  '增长的台阶密得反常：2025 年 1 月破 1 亿、6 月破 5 亿、11 月破 10 亿，2026 年 2 月破 20 亿——三个月翻一倍，据多方报道为企业软件史上最快达成 20 亿 ARR 的公司。此后 5 月 21 日破 30 亿，6 月收购前夕据报约 40 亿，公司自己给出的年底预期是 60 亿以上。'||char(10)||
    ''||char(10)||
    '同期另一条线在水下进行：多方消息称 Anysphere 正洽谈新一轮约 20 亿美元融资，估值直奔 500 亿，a16z 与 Thrive 拟联合领投、NVIDIA 战略跟投。这轮融资最终没有等来官宣——四月起，牌桌上坐进一家火箭公司，剧本换了。'||char(10)||
    ''||char(10)||
    '融资阶梯爬到第七级停住。下一级不是 E 轮，是收购要约。',
  '', '融资阶梯', 'https://tech-insider.org/cursor-60-billion-valuation-anysphere-ai-coding-2026/'
);

-- #38 [main] 2026-03-04 Cursor 开进 JetBrains 全家桶
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-03-04', '破壁',
  'Cursor 开进 JetBrains 全家桶',
  '借开放协议 ACP，Cursor 以 agent 身份入驻 IntelliJ、PyCharm、WebStorm 全系——不换编辑器也能用 Cursor。三年前 HN 顶楼问「为什么不用现成的编辑器」，如今的回答是：住进你的现成编辑器。',
  '3 月 4 日，Cursor 宣布登陆 JetBrains 全系 IDE：借 JetBrains 与 Zed 共同开发的开放协议 ACP（Agent Client Protocol），在 ACP Registry 一键安装、登录 Cursor 账号即用。无需 JetBrains AI 订阅，但要 Cursor 付费计划。JetBrains 官博的说法：这是 Registry 里呼声最高的 agent。'||char(10)||
    ''||char(10)||
    '意义在墙外。这是 Cursor 第一次把 agent 能力送出自家 IDE 的围墙——桌面、网页、CLI、iOS 之外，又多了一块别人的地盘，而且是 Java 世界的腹地。'||char(10)||
    ''||char(10)||
    '2023 年 HN 顶楼曾问：「我为什么不直接用一个支持 Copilot 的现成编辑器？」。三年后 Cursor 给出了字面意义上的回答。',
  '', '', 'https://cursor.com/changelog/03-04-26'
);

-- #39 [main] 2026-03-05 Automations：永不下班的 agent
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-03-05', '发布',
  'Automations：永不下班的 agent',
  '定时器、Slack 消息、Linear 工单、PR 合并、PagerDuty 告警，任何事件都能自动拉起一个云端 agent。官方自用数据：内部每小时跑数百条。人类不再负责发起，只在流水线需要时被叫回来签字。',
  '3 月 5 日，Cursor Automations 上线：一个触发器、一段提示词、一份工具授权，就是一条永不下班的自动化。事件来了，云端 agent 自己拉起、干完、自验，能开 PR、评论代码、发 Slack、调 MCP，还能用 Memories 跨次学习。模板市场同步开张。'||char(10)||
    ''||char(10)||
    '官方的自用数据很能说明问题：Cursor 内部每小时跑数百条 automation——每次 push 触发安全审计、PagerDuty 告警自动查服务器日志、每周自动给全员写一份 shipped 摘要。TechCrunch 引述其工程负责人的定性：「不是人类退出了，而是人类不再负责发起。他们在传送带需要的节点被叫进来。」'||char(10)||
    ''||char(10)||
    'Bugbot 是它的前身，Origin 是它的下游。「软件工厂」从比喻变成产品线：2.4 建制，2-24 配机，3-05 排班。',
  '', '', 'https://cursor.com/blog/automations'
);

-- #40 [main] 2026-03-19 Composer 2：首次持续预训练
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-03-19', '发布',
  'Composer 2：首次持续预训练',
  '官方称前沿级编码智能，定价每百万 token 0.5 与 2.5 美元，Fast 变体设为默认。这是 Cursor 第一次跑通持续预训练加强化学习的完整链路。公告里没出现的那个词，二十四小时内由社区替它说出。',
  '3 月 19 日，Composer 2 上线。官方列出三项改进：全基准大幅提升，包括 Terminal-Bench 2.0 与 SWE-bench Multilingual；基于首次持续预训练，用强化学习在长程编码任务上训练，能解决需要数百步动作的问题；引入 Fast 变体作为默认，比其它家的快模型更便宜。'||char(10)||
    ''||char(10)||
    '这是 Cursor 从「调用别人的模型」走到「自己是模型公司」的关键一步。彼时估值 293 亿美元，这个身份认定值很多钱——也正因为值钱，公告对模型的出身保持了沉默。'||char(10)||
    ''||char(10)||
    '那个没有出现的词是一个开源模型的名字。二十四小时内，社区在 API 响应里把它翻了出来。',
  '', '自研模型线', 'https://cursor.com/blog/composer-2'
);

-- #41 [dark] 2026-03-20 溯源完成：底座 kimi-k2p5
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-03-20', '扒皮',
  '溯源完成：底座 kimi-k2p5',
  '取证：发布不足二十四小时，开发者在 API 响应里翻出 kimi-k2p5-rl-0317-s515-fast。鉴定：号称前沿级的自研模型，基座为月之暗面开源的 Kimi K2.5。舆论锐评存档：至少把模型 ID 改个名。',
  '记录时间 2026-03-20。开发者 Fynn 调用 Cursor 的 OpenAI 兼容端点时，读到 accounts/anysphere/models/kimi-k2p5-rl-0317-s515-fast。该 ID 的信息量接近自白：kimi-k2p5 是基座，rl 是强化学习，0317 疑似训练日期，fast 是默认变体。取证人评语平静：「所以 Composer 2 就是加了 RL 的 Kimi K2.5，至少把模型 ID 改个名吧。」'||char(10)||
    ''||char(10)||
    '各方响应依次入档。官方侧：开发者教育负责人 Lee Robinson 数小时内确认确实从开源基座起步，强调最终模型只有约四分之一算力来自基座；联创 Aman Sanger 直接认错——博客没提 Kimi 基座，是个失误。权利方侧：月之暗面预训练负责人 Yulun Du 指出 tokenizer 完全一致，并当面发问：为什么不尊重许可证、不付费——Kimi K2.5 采用 Modified MIT，对月收入超两千万美元的商用产品有署名要求。收尾：Kimi 官方账号发来祝贺，确认系经 Fireworks AI 授权的商业合作。'||char(10)||
    ''||char(10)||
    '系统备注：一家近三百亿美元的公司需要证明自己是实验室而非集成层，而它最能打的模型站在一家中国公司的开源肩膀上——沉默的动机无需解析。后续：Composer 2 技术报告上了 arXiv，Kimi K2.5 白纸黑字写进第一段与致谢。',
  '', '自研模型线', 'https://cursor.com/blog/composer-2-technical-report'
);

-- #42 [main] 2026-04-02 Cursor 3：Agents Window 上位
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-04-02', '发布',
  'Cursor 3：Agents Window 上位',
  '从零重建的 Agents Window 成为一等公民：跨仓库、跨环境，本地与云端会话一键互搬，云端 agent 自带演示视频交付。老界面并行保留。编辑器这个词，第一次显得不够用了。',
  '4 月 2 日，Cursor 3 发布，核心是从零重建的 Agents Window：天然多工作区，本地、云端、worktree、远程 SSH 上的 agent 全部汇入同一侧栏，包括从手机、网页、桌面、Slack、GitHub 和 Linear 发起的会话。云端 agent 会自己产出演示视频和截图供验收；会话可以在本地与云端之间搬迁——想动手改就拉回本地，想离线跑就推到云上。同时内置更简洁的 diff 视图，以及不离开窗口的暂存、提交与 PR 管理。'||char(10)||
    ''||char(10)||
    '官方在公告里反复强调一件事：老的 VS Code 式界面不会下线，两套并行，可以同时开。这句保证的必要性，很快就得到了验证。'||char(10)||
    ''||char(10)||
    '从 2.0 的八个 agent 并行，到 3.0 的 agent 一等公民，产品的重心完成了从「编辑」到「调度」的迁移。',
  '', '', 'https://cursor.com/blog/cursor-3'
);

-- #43 [dark] 2026-04-03 入口丢失：新窗口无门
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-04-03', '破防',
  '入口丢失：新窗口无门',
  '现象：Agents Window 官宣后，评论区最高频问题不是好不好用，而是在哪。场外试出的玄学解法：先退出登录，切换按钮才会出现。另有用户定性存档：这让 Cursor 变得毫无用处。',
  '记录时间 2026-04-03 前后。Mac、Ubuntu、企业版用户排队报告：升级到 3.0 后，命令面板搜不到 Agents Window，File 菜单里没有，官方一时也说不清。最终解法由用户自行试出——先退出登录，顶部会冒出一个切换按钮，切过去再登回来。有人补充：有点飘，但我相信团队会补丁的，我有耐心。'||char(10)||
    ''||char(10)||
    '更硬的批评针对工作流。一位用户测算：手上的任务用 Composer 2 首次尝试失败率在 60% 到 90% 之间，能随时接手改代码是不可让步的；Cursor 的价值正在于能在「盯着 agent」和「放它自己跑」之间快速切换粒度，这个改动把它拿走了。他给了两个比喻：一个只能开一对一会议、不能直接给下属发消息的经理；一个紧急情况下永远不能手动接管的飞行员。零散伤亡另记：WSL 扩展不支持，code-workspace 不显示，VS Code 主题用不上。官方连夜澄清：老 IDE 不下线，两套并行，自己人也是两边混用。'||char(10)||
    ''||char(10)||
    '系统备注：每一次范式跃迁都会踩到一批人的手。愿意留在评论区骂的，通常是还想留下来的那批——该指标已纳入留存监测。',
  '', '', 'https://forum.cursor.com/t/cursor-3-agents-window/156509'
);

-- #44 [main] 2026-04-16 Opus 4.7 与门后的 Mythos
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-04-16', '军备',
  'Opus 4.7 与门后的 Mythos',
  'Opus 4.7 发布，Cursor 当日上架，价格照旧。真正的新闻藏在措辞里：官方承认它「不如 Mythos Preview 全面」——那个只向少数机构开放的受限旗舰，日后将以 Fable 5 之名面世。',
  '2026 年 4 月 16 日，Opus 4.7 发布：继 2 月 Opus 4.6 之后又一轮六周迭代，agentic 编码、多学科推理、规模化工具调用全面提升，价格与上代持平（$5/$25）。Cursor 首日接入——有竞品论坛的用户当天统计：主流编码工具里，只剩一家还没上架。'||char(10)||
    ''||char(10)||
    'CNBC 点破了这次发布的微妙之处：Anthropic 明说 4.7「不如 Mythos Preview 广泛能干」。Mythos 是本月早些时候通过网络安全计划 Project Glasswing 向少数企业开放的受限旗舰。公开卖的不是最强的，最强的在门后。'||char(10)||
    ''||char(10)||
    '这道影子后来落地：「做了安全处理的 Mythos 级模型」以 Claude Fable 5 之名公开发布。回头看，4.7 是一次占位——真正的牌，Anthropic 一直扣在手里。',
  '', '模型军备', 'https://www.cnbc.com/2026/04/16/anthropic-claude-opus-4-7-model-mythos.html'
);

-- #45 [main] 2026-04-21 SpaceX 联姻：600 亿选择权
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-04-21', '结盟',
  'SpaceX 联姻：600 亿选择权',
  'SpaceX 官宣与 Cursor 结盟：Cursor 用 Colossus 百万 H100 级算力训练模型，SpaceX 拿到年底前以 600 亿美元收购的选择权——不行权，则支付 100 亿合作费。合同只留了两个出口，都通向同一间屋子。',
  '4 月 21 日，SpaceX 在 X 官宣、Cursor 同日发博客确认：双方将联手打造「世界最强的编码与知识工作 AI」。核心条款一句话：SpaceX 获得年底前以 600 亿美元收购 Cursor 的选择权，若不行权，则为这场合作支付 100 亿美元。Colossus 超算位于孟菲斯，约合一百万张 H100——它随 2 月 SpaceX 与 xAI 的全股票合并（合并后估值约 1.25 万亿美元）并入火箭版图。'||char(10)||
    ''||char(10)||
    'Cursor 官方博客把动机写得很直白：「我们一直想把训练推得更远，但被算力卡住了。」Composer 2 已摸到前沿，再往上，需要的是正常渠道拿不到的基建。Truell 转发时的说法是「很高兴与 SpaceX 团队一起 scale up Composer」。'||char(10)||
    ''||char(10)||
    '此后的节拍精确得像发射倒计时：5 月 Composer 2.5 上线，6 月 12 日 SpaceX 上市，6 月 16 日行权。所谓选择权，从签字那天起就只剩一个选项。',
  '', '火箭并购案', 'https://cursor.com/blog/spacex-model-training'
);

-- #46 [main] 2026-04-24 GPT-5.5 进场：官方五折
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-04-24', '军备',
  'GPT-5.5 进场：官方五折',
  'OpenAI 发布 GPT-5.5，API 开放次日进 Cursor，联合促销五折到 5 月 2 日。官方通稿里有一句耐人寻味：「这对用户托付给 Cursor 的长程工作最重要。」供货节奏至此跑成惯例：旗舰零时差。',
  '4 月 23 日，GPT-5.5（代号 Spud）发布，主打长程任务的持久力。OpenAI 官方通稿点名了渠道：「这对用户托付给 Cursor 的长程工作最重要。」API 于 24 日开放，Cursor 当天上架并联合五折促销至 5 月 2 日；API 定价 $5/$30，上下文窗口 1M。'||char(10)||
    ''||char(10)||
    'Cursor 员工在论坛晒过一张供货节奏表，值得存档：GPT-5 与 GPT-5.2 零时差进 Cursor，GPT-5.1 隔一天，GPT-5.4-mini 零时差；Codex 系列因 API 滞后要等 8 到 27 天。规律清晰：谁家旗舰发布，Cursor 的模型选择器当天或次日就得有名字——做不到才是新闻。'||char(10)||
    ''||char(10)||
    '两周后，OpenAI 补发仅向受审网络安全团队开放的 GPT-5.5-Cyber。彼时 Fable 5 的出口管制风波尚未爆发，模型能力的「危险档」已经开始单独发牌照。军备竞赛，进入带许可证的阶段。',
  '', '模型军备', 'https://forum.cursor.com/t/gpt-5-5-out-now/158953'
);

-- #47 [main] 2026-05-06 Claude 限额翻倍：包下 Colossus 1
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-05-06', '结盟',
  'Claude 限额翻倍：包下 Colossus 1',
  'Anthropic 官宣与 SpaceX 的算力协议：包下 Colossus 1 数据中心全部容量，超 300 兆瓦、逾 22 万张 NVIDIA GPU 当月到位；Claude Code 五小时限额全线翻倍，Pro 与 Max 取消高峰限流。三个月前，马斯克还在批评这家公司。',
  '5 月 6 日，Anthropic 宣布三项即时生效的扩容：Claude Code 五小时滚动限额在 Pro、Max、Team 与按席位计费的 Enterprise 全线翻倍；Pro 与 Max 取消高峰时段降额；Opus 系列 API 限额大幅上调并公开数字。支撑扩容的是同日官宣的协议——包下 SpaceX Colossus 1（孟菲斯）数据中心的全部容量，超 300 兆瓦、逾 22 万张 NVIDIA GPU，一个月内到位。双方还表达了共同开发吉瓦级轨道算力的意向，尚未签约。'||char(10)||
    ''||char(10)||
    '这纸租约的戏剧性写在署名双方的旧账上：年初马斯克把 xAI 并进 SpaceX 后，曾公开写道 Anthropic「憎恨西方文明」；协议官宣时口径已换——他说前一周与对方领导层相处后，认可这家公司的工作「对人类有益」。彼时 SpaceX 手里已握着收购 Cursor 的 600 亿美元选择权，随后行权签约——Colossus 的房东，随后成了 Claude 最大分销渠道之一的东家。租客与房东互为对手，生意照做。'||char(10)||
    ''||char(10)||
    '同一座数据中心，日后见证了两种相反的选择：Anthropic 签约搬入之后，另一家模型供应商对易主的 Cursor 拆线离场。供给线的走向，从这一天开始分岔。',
  '', '供给线', 'https://www.anthropic.com/news/higher-limits-spacex'
);

-- #48 [dark] 2026-05-15 账单数据：份额 41% 滑至 26%
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-05-15', '围城',
  '账单数据：份额 41% 滑至 26%',
  '情报：支出管理平台 Ramp 的账单数据显示，企业 AI 编程开支中 Cursor 份额自 2025 年 6 月约 41% 滑落至约 26%。同一份报道的另一句更冷：Anthropic 已控制该品类的一半。正史不语，账单不说谎。',
  '记录时间 2026 年 5 月。数据源为支出管理平台 Ramp 的企业账单：AI 编程开支中 Cursor 的份额从 2025 年 6 月的约 41% 滑落至约 26%。该数据并非当月流出——它是后来 CNBC 报道 SpaceX 收购案时随手写下的一笔，原文还有一句：Anthropic 如今控制着这个品类的一半。'||char(10)||
    ''||char(10)||
    '官方通稿对此始终沉默。采购账单是最诚实的战报：正史的每一条发布公告都在讲增长，账单曲线记下的是另一条走向。'||char(10)||
    ''||char(10)||
    '系统备注：随后，SpaceX 的收购要约给出了第三种解法——份额守不住的战场，可以整体搬进更大的版图。',
  '', '', 'https://www.cnbc.com/2026/06/16/-spacex-to-buy-cursor-ai-parent-anysphere-for-60-billion.html'
);

-- #49 [main] 2026-05-18 Composer 2.5：便宜一个量级
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-05-18', '发布',
  'Composer 2.5：便宜一个量级',
  '官方称最聪明的自研模型上线并成为默认：标准档每百万 token 0.5 / 2.5 美元。第三方评测坐三望二，每任务成本约为前两名的十分之一到六十分之一。这一次，出身写在了明面上。',
  '5 月 18 日，Composer 2.5 上线并取代 Composer 2 成为默认模型。定价延续低价路线：标准档 $0.50/M 输入、$2.50/M 输出，Fast 档 $3/$15。第三方评测很快跟上：Artificial Analysis 编码 agent 指数 62 分，较 Composer 2 上涨 14 分，仅次于 Opus 4.7 与 GPT-5.5，而每任务成本约为它们的十分之一到六十分之一。'||char(10)||
    ''||char(10)||
    '出身不再遮掩：仍以月之暗面 Kimi K2.5 开源底座起步——三月那场扒皮风波之后，官方学会了大方。训练侧用了 25 倍合成任务与定向文本反馈的强化学习；技术帖同时预告：正与 SpaceXAI 用十倍算力从零训练一个大得多的模型。'||char(10)||
    ''||char(10)||
    '紧随其后，官方亲自开闸「十倍额度日」。至于从零训练的那个大家伙，6 月 16 日的 Compile 大会揭开一角。',
  '', '自研模型线', 'https://cursor.com/changelog/composer-2-5'
);

-- #50 [dark] 2026-05-19 官方放闸：十倍额度日
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-05-19', '套利',
  '官方放闸：十倍额度日',
  '事项：Composer 2.5 上线后，官方宣布当天用量按十分之一速率计——原话是去撒野、去开一堆长任务 agent。追问「会不会回吐」，官方答复：不回吐。系统备注：本次开闸方为官方，属罕见样本。',
  '记录时间 2026-05-19。官方原帖：今天你的 Composer 2.5 用量按正常速率的十分之一计算，去撒野、去搞点有创意的、去开一堆长任务 agent。官方给出换算：平时一整天的请求量吃掉 7% 额度，这天只吃约 0.7%。'||char(10)||
    ''||char(10)||
    '现场追问与答复均已存档。问：促销结束会不会回吐。答：不回吐，停在哪就是哪——周一收在 20%，周二放开用一天本该烧到 30%，实际只走到 21%。没赶上当天的，本周剩余几天还有双倍额度。同一论坛的另一角落，一位 Ultra 用户在抱怨五六天烧光额度，只好再注册一个号再买一份 Ultra。补给与断粮，同一周内并存。'||char(10)||
    ''||char(10)||
    '系统备注：过去两年，套利者研究的是怎么绕过风控；本日风控主动打开了大门并替用户踩下油门。样本已收录，复现概率不做评估。',
  '', '', 'https://forum.cursor.com/t/10x-usage-on-composer-2-5-today-only/161039'
);

-- #51 [main] 2026-05-28 Opus 4.8 官宣引用 CursorBench
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-05-28', '军备',
  'Opus 4.8 官宣引用 CursorBench',
  'Opus 4.8 发布，Cursor 同日上架。值得立档的细节在别处：Anthropic 的官方公告直接拿 CursorBench 当成绩单——一家编辑器公司的内部评测，成了模型厂发布会的通用度量衡。',
  '2026 年 5 月 28 日，Opus 4.8 发布：价格仍是 $5/$25，fast 模式 2.5 倍速、价格降到前代 fast 的三分之一；Claude Code 侧同步上线「动态工作流」，一个编排器可并行拉起成百上千个子 agent。Cursor 论坛同日置顶：4.8 已上架，在 CursorBench 上比 4.7 高效得多，难题上更有韧性。'||char(10)||
    ''||char(10)||
    '公告里最有历史感的一句出自 Anthropic 自己：「在 CursorBench 上，Opus 4.8 在每个 effort 档位都超过历代 Opus。」自家发布会，引用客户家的考卷——CursorBench 从内部评测变成行业度量衡，此后 Fable 5、Opus 5、GPT-5.6 的发布材料全都带它。'||char(10)||
    ''||char(10)||
    '评测权即话语权。当所有模型厂都要在你的考卷上答题，编辑器公司就不只是渠道了。后来，Grok 4.5 用一种更尴尬的方式证明了这张考卷的分量。',
  '', '模型军备', 'https://www.anthropic.com/news/claude-opus-4-8'
);

-- #52 [main] 2026-06-09 Fable 5 登顶：断层近 5 分
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-06-09', '登顶',
  'Fable 5 登顶：断层近 5 分',
  'Anthropic 打响 Claude 5 世代第一枪：Fable 5，「做了安全处理的 Mythos 级模型」。AA 智能指数 64.9 断层登顶，SWE-Bench Verified 95.5%，CursorBench 刷新纪录。它的第一个完整月，一半时间在停机。',
  '2026 年 6 月 9 日，Claude Fable 5 与 Mythos 5 同日发布。官方定义写得直白：Fable 5 是「做了安全处理、可以公开用的 Mythos 级模型」；Mythos 5 与它同能力但不带安全分类器，仅通过 Project Glasswing 向受审机构开放。此前 Opus 4.7 发布时那句「不如 Mythos Preview」的伏笔，就此揭晓。'||char(10)||
    ''||char(10)||
    '成绩单是断层式的：Artificial Analysis 智能指数 64.9 登顶，领先最近的非 Anthropic 模型（GPT-5.5）近 5 分；SWE-Bench Verified 95.5%、SWE-Bench Pro 80.3%、Terminal-Bench 2.1 88%。Cursor 深度参与发布前评测，背书印在官方材料里：「CursorBench 上的最强模型，打开了一类此前够不着的长程问题。」代价同样破纪录：完整跑一遍 HLE 约 2200 美元，且约 9% 的请求触发安全护栏、自动回落到 Opus 4.8——这个回落机制很快将变得众所周知。'||char(10)||
    ''||char(10)||
    '数日后，商务部的出口管制令让它全球消失了 19 天。',
  '', '模型军备', 'https://www.anthropic.com/news/claude-fable-5-mythos-5'
);

-- #53 [main] 2026-06-12 SpaceX 上市：发行价 135 美元
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-06-12', '上市',
  'SpaceX 上市：发行价 135 美元',
  '据报道 SpaceX 完成史上最大 IPO 登陆纳斯达克。数日后它将行使那份 600 亿选择权——股价越高，全股票收购的稀释成本越低。先上市、后行权，顺序即策略。',
  '据多方报道，6 月 12 日 SpaceX 登陆纳斯达克，发行价 135 美元/股，规模为 IPO 历史之最；到 6 月 16 日行权日，股价已收于 192.46 美元。'||char(10)||
    ''||char(10)||
    'Bill Ackman 在 X 上把这套结构讲得最直白：「SpaceX 之所以值钱，部分原因就是它值钱——高估值让收购 Cursor 的稀释成本变得很低。」用二级市场的定价支付一级市场的对价，全股票交易的算术就是这么直接。'||char(10)||
    ''||char(10)||
    '同一天，Anthropic 的 Fable 5 被出口管制拉闸。2026 年 6 月 12 日，资本市场与监管机器在同一个交易日各自开火。',
  '', '火箭并购案', 'https://tech-insider.org/cursor-60-billion-valuation-anysphere-ai-coding-2026/'
);

-- #54 [dark] 2026-06-12 出口管制：Fable 5 消失 19 天
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-06-12', '封锁',
  '出口管制：Fable 5 消失 19 天',
  '事件：亚马逊研究员越狱 Fable 5 产出漏洞利用代码，商务部周五晚下达出口管制令。因无法实时核验用户国籍，Anthropic 全球全量停服。观测：最强模型一夜消失，编码圈集体退回上一代。',
  '时间线存档：6 月 9 日 Fable 5 发布，多项基准登顶；6 月 12 日（周五），商务部致函 Anthropic，对 Fable 5 与 Mythos 5 实施出口管制——任何外国人接触均需 BIS 许可，连 Anthropic 自家外籍员工都不例外。起因是亚马逊研究员的报告：一套越狱手法能绕过安全护栏，让模型识别软件漏洞、甚至产出利用代码。因无法实时核验每个用户的国籍，Anthropic 全球全量停服：Claude.ai、API、Claude Code、各云平台一体拉闸。'||char(10)||
    ''||char(10)||
    '恢复序列：6 月 26 日，Mythos 5 向约 100 家美国受审机构（含 CISA、NSA）有限恢复；6 月 30 日管制解除；7 月 1 日 Fable 5 全球回归，附带一个针对该越狱手法的新分类器——命中即拦截，请求自动降级改发 Opus 4.8，用户会收到通知。停机总计 19 天。'||char(10)||
    ''||char(10)||
    '系统备注：同一个周五，SpaceX 在纳斯达克敲钟。后来 Musk 发布 Grok 4.5 的销售话术踩的正是本次风波：「Opus 级模型，但更快、更便宜。」对所有用户，本次事件为一次预演——主力模型可以因一纸文书在一夜之间消失。「模型主权」四字，首次获得体感。',
  '', '', 'https://www.anthropic.com/news/redeploying-fable-5'
);

-- #55 [main] 2026-06-16 600 亿美元：全股票收购签约
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-06-16', '惊变',
  '600 亿美元：全股票收购签约',
  'SpaceX 与 Anysphere 签署合并协议：全股票，隐含股权价值 600 亿美元，风投支持创业公司被并购的历史纪录。福布斯当日写道：这笔交易把一家火箭公司直接拽进了 AI 编程战争的中心。',
  '2026 年 6 月 16 日，SpaceX 与 Anysphere 签署合并协议：全股票交易，隐含股权价值 600 亿美元，创下风投支持创业公司被并购的历史纪录。四月那份附带选择权的算力合作，至此显出真正用途。'||char(10)||
    ''||char(10)||
    '从 2022 年的第一笔小额支票到 600 亿美元的对价，中间隔了四年；从「不就是个套壳」到历史最大并购案，社区用了三年时间换一种语气。福布斯当日的评论成为定稿：这笔交易把一家火箭公司直接拽进了 AI 编程战争的中心。',
  '', '火箭并购案', 'https://www.sec.gov/Archives/edgar/data/1181412/000162828026043411/spaceexplorationtechnologi.htm'
);

-- #56 [dark] 2026-06-16 梗情监测：Cursor to Mars
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-06-16', '玩梗',
  '梗情监测：Cursor to Mars',
  '观测：收购官宣当晚梗图产能达到峰值——「Cursor to Mars」「程序员的 Tab 键上太空」「与其催程序员加班，不如把编辑器买下来」。有人把六边形 logo P 上了猎鹰九号整流罩。',
  '记录时间 2026-06-16 夜间。收购官宣后全网玩梗大赛开幕，高频样本：「Cursor to Mars」「程序员的 Tab 键终于要上太空了」「马斯克：与其催程序员加班，不如把编辑器买下来」。图像类样本：有人把保护伞——更正，把 Cursor 的六边形 logo——P 在了猎鹰九号整流罩上。'||char(10)||
    ''||char(10)||
    '系统备注：天文学与计算机科学，首次合并同类项。本条为纯梗情存档，无损失，无责任方，快乐真实。',
  '', '火箭并购案', ''
);

-- #57 [main] 2026-06-16 Compile 大会三箭齐发
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-06-16', '首秀',
  'Compile 大会三箭齐发',
  '首届开发者大会与收购官宣同日：Origin 代码托管揭幕、Cursor Mobile 开 TestFlight、官宣正用十万卡 Colossus 从零训练 1.5 万亿参数模型。被收购的那个下午，它发布得像个平台公司。',
  '6 月 16 日，旧金山，首届 Compile 大会三箭齐发。第一箭 Origin：为 agent 规模而生的 git 托管，NVMe 文件服务器加 S3 作真源，AI 自动解合并冲突，目标全球同步延迟低于 400 毫秒——现场演示模拟数千个 agent 同时读写一个仓库，宣称秋季 GA（后来提前开了 beta）。第二箭 Cursor Mobile：iOS TestFlight 公测，管理 agent、疏通卡住的任务、评审截图（6 月 29 日全量公测）。第三箭最重：Truell 官宣正在 Colossus 十万余张 GPU 上从零预训练 1.5 万亿参数级前沿模型——不再依赖任何开源底座，算力是此前所有 Cursor 模型的 10 到 20 倍，剑指编码之外的通用知识工作，「数周内发布」。'||char(10)||
    ''||char(10)||
    '同一个下午，SpaceX 确认行使 600 亿美元收购权。主讲 Origin 的是联创 Tomas Reimers——Graphite 的创始人，去年 12 月那笔收购的用意就此揭晓。'||char(10)||
    ''||char(10)||
    '余味留档：那个「数周内发布」的模型，直到 8 月底仍未露面；7 月泄露的「Vega」是不是它，无人确认。发布会的日历与交付的日历，从来不是同一本。',
  '', '', 'https://www.techtimes.com/articles/319031/20260624/cursors-github-rival-origin-new-spacex-model-raise-code-custody-stakes.htm'
);

-- #58 [dark] 2026-06-25 edu 通道焊死：结案陈词
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-06-25', '套利',
  'edu 通道焊死：结案陈词',
  '事项：官方文档更新，旧版学生折扣停止受理新申请。结案陈词原文：「该计划已成为欺诈者的目标。」一场公开的套利攻防战，就此焊死收官。系统备注：场外结案词早有现成的——「薅羊毛的人，薅死了羊」。',
  '记录时间 2026-06-25。Cursor 官方帮助文档更新：旧版学生折扣停止接受新申请，原文写道——「该计划已成为欺诈者的目标，也阻碍了 Cursor 惠及全球学生。」已领取者可用到期；此后本科生转为校园活动发放额度，研究生与教育工作者走表单申请。'||char(10)||
    ''||char(10)||
    '完整战线回放：2025 年 5 月官宣开闸，24 小时内代认证服务明码标价；随即紧急收紧、批量撤销；2026 年 6 月 25 日焊死。'||char(10)||
    ''||char(10)||
    '系统备注：屠龙者未必成为恶龙，但本样本坐实了那句场外定论——「薅羊毛的人，薅死了羊」。通道关闭原因已由官方一句话盖章，本系统无需补充。',
  '', '', 'https://cursor.com/help/account-and-billing/student-discount'
);

-- #59 [main] 2026-06-29 iOS 版公测：口袋里的 agent
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-06-29', '发布',
  'iOS 版公测：口袋里的 agent',
  '手机上派活给云端 agent，锁屏实时活动追进度，看 demo、审 diff、直接合 PR。官方的说法是：笔记本可以睡着、可以够不着、可以在忙别的，你的活不停。评论区记下了两件事：iOS 26 起步，大陆不可用。',
  '6 月 29 日，Cursor iOS 版公测。能力清单：选仓库起云端 agent，可挑模型、可从 Plan Mode 起步、可语音输入、可用斜杠命令操控；离开 app 后靠锁屏实时活动和推送保持在环；云端 agent 交付的不只是代码，还有 demo、截图和日志；本地与云端会话可以来回接力；配合 Cursor 3.9，还能直接遥控跑在自己机器上的 agent。'||char(10)||
    ''||char(10)||
    '全部付费计划当天可用，7 月 5 日前手机端跑 Composer 2.5 打 2.5 折。Android 官方称在计划中但无时间表；iPadOS 试验过、说会再回来——后来 iPad 版如约上线。'||char(10)||
    ''||char(10)||
    '评论区被反复提起的两件事，如实记录：最低只支持 iOS 26，一批还在 iOS 18 的老设备用户装不上；以及，中国大陆无法使用。',
  '', '', 'https://cursor.com/blog/ios-mobile-app'
);

-- #60 [main] 2026-06-30 Sonnet 5：解封日的加更
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-06-30', '平价',
  'Sonnet 5：解封日的加更',
  '出口管制解除的同一天，Anthropic 加更 Sonnet 5：agent 能力接近 Opus 4.8，中档价再打 33% 折，Cursor 当日上架。旗舰尚未回岗，替补先把便宜的活全接了下来。',
  '2026 年 6 月 30 日——恰是 Fable 5 出口管制解除、次日全球复活的当口——Anthropic 发布 Sonnet 5：官方称最具 agent 能力的 Sonnet，多步工具调用与自我验证行为接近 Opus 4.8，CursorBench 57%（上代 Sonnet 4.6 为 49%）；claude.ai 免费与 Pro 用户当日切为默认。'||char(10)||
    ''||char(10)||
    'Cursor 同日上架并转发促销：introductory 价 $2/$10，8 月 31 日后回到 $3/$15。一个容易被忽略的细节值得留档：新 tokenizer 对同样文本要多计约 1.0 到 1.35 倍 token——账面同价，实付未必。'||char(10)||
    ''||char(10)||
    '发布节奏本身就是声明：旗舰被监管按停 19 天，Anthropic 用一次中档发布宣告生产线无恙。对 Cursor 用户，这是 2026 年性价比最高的日常主力候选——直到 Opus 5 把「半价旗舰」也端上桌。',
  '', '模型军备', 'https://forum.cursor.com/t/claude-sonnet-5-now-available/164463'
);

-- #61 [main] 2026-07-08 Grok 4.5：联合训练第一枪
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-07-08', '发布',
  'Grok 4.5：联合训练第一枪',
  '算力联姻后的第一件联合作品：Cursor 与 SpaceXAI 共训的 Grok 4.5 上线，训练数据含数万亿 token 的 Cursor 数据。$2/$6 把 Opus 级智能打到地板价。发布帖脚注里埋着一颗雷，随即引爆。',
  'Cursor 官方博客的措辞是「together with SpaceXAI」：Grok 4.5 是双方联合训练的 MoE 模型，训练数据包含「数万亿 token 的 Cursor 数据」，面向编码、agent 任务与更广的知识工作——法律、金融、数据分析都在目标清单上。桌面、网页、iOS、CLI、SDK 全端可用，基础档 $2/M 输入、$6/M 输出，fast 档 $4/$18，token 效率约为同级模型两倍。Musk 的定位一句话：「Opus 级模型，但更快、更省、更便宜。」'||char(10)||
    ''||char(10)||
    '第三方数据坐实了「地板价」：Artificial Analysis 智能指数 54 分列第四（Fable 5 为 60），但每任务成本 2.49 美元，约为 Fable 5 的四分之一，被评为「比榜前模型便宜近九成」。彼时 Fable 5 刚结束 19 天的出口管制风波，「Opus 级平替」的广告词打得正是时候。'||char(10)||
    ''||char(10)||
    '这是 4 月算力联姻后的第一件联合作品，也是 Composer 之外的第一条模型线。发布帖的脚注里写着一句关于训练数据的坦白，二十四小时内被全网挖出。',
  '', '火箭并购案', 'https://cursor.com/blog/grok-4-5'
);

-- #62 [dark] 2026-07-08 训练数据混入：自家代码
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-07-08', '扒皮',
  '训练数据混入：自家代码',
  '取证：Grok 4.5 发布帖脚注承认，一份 Cursor 自家代码库快照「意外混入」训练数据，CursorBench 成绩连夜撤榜。舆论鉴定：考题进了复习资料，这分不能算。系统备注：护城河是用别人家的铲子挖的。',
  '记录时间 2026-07-08。官方脚注原文（译）：「Grok 4.5 在 CursorBench 上占有优势，因为一份早期的 Cursor 代码库快照被意外包含进训练数据。具体影响不明。该数据已从未来模型中移除。」处置结果：CursorBench——Cursor 自家的评测套件——的分数从发布材料里整体消失。Terminal-Bench、SWE-Bench Pro 等第三方基准不受影响，但「自家模型在自家考卷上背过题」的画面足够社区咀嚼一周。'||char(10)||
    ''||char(10)||
    '更深一层随后被挖出。同一篇发布帖写明，训练用了「数万亿 token 的 Cursor 数据——覆盖用户与代码库、软件工具的广泛交互」。开发者们回过神来：这是那个默认开启、多数人从没碰过的数据共享开关；而这些会话里坐在 AI 另一头的，大多数时候是 Claude 和 GPT。一位博主的总结已入档：「护城河是用别人家的铲子挖的。」'||char(10)||
    ''||char(10)||
    '系统备注：主动写进脚注，算体面；但体面和干净是两件事。Privacy Mode 的开关在设置里——本条不做建议，仅提示该开关存在。',
  '', '自研模型线', 'https://cursor.com/blog/grok-4-5'
);

-- #63 [main] 2026-07-09 GPT-5.6 三连星夺回榜首
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-07-09', '夺榜',
  'GPT-5.6 三连星夺回榜首',
  '紧随 Grok 4.5 发布，OpenAI 甩出 GPT-5.6 家族：旗舰 Sol、均衡 Terra、走量 Luna。Coding Agent Index 80 分反超 Fable 5 近 3 分且便宜三成。数周之内，四张王牌全部亮出。',
  '2026 年 7 月 9 日，GPT-5.6 结束限量预览转正：Sol 在 Artificial Analysis Coding Agent Index 以 80 分刷新纪录，超 Fable 5 约 2.8 分，token 用量减半、成本低约三分之一；Terra 略胜 Fable 5 而成本约十六分之一；新增 ultra 档，默认四个 agent 并行作业。发布材料照例带 CursorBench——Cursor 总裁 Oskar Schulz 背书：「我们测过的最强模型之一，期待把它带给 Cursor 用户。」'||char(10)||
    ''||char(10)||
    '「期待带给」四个字暴露了时差：GA 当天 Cursor 未同步上架，Sol / Terra / Luna 数日后才进入原生选择器，按 $5/$30、$2/$12、$0.2/$1.2 从第三方模型池计费。随后是连环降价：7 月 30 日 Luna 直砍 80%、Terra 降 20%；8 月 21 日 Sol 再降两成——榜首易主之后，价格战接管战场。'||char(10)||
    ''||char(10)||
    '把日历排开看这个夏天：6-09 Fable 5 登基，7-08 Grok 4.5 掀桌，7-09 GPT-5.6 夺榜，7-24 Opus 5 半价跟注。模型军备竞赛最密集的一季，Cursor 的模型选择器成了唯一的公证处。',
  '', '模型军备', 'https://openai.com/index/gpt-5-6/'
);

-- #64 [dark] 2026-07-15 漏洞判界：git.exe 不算数
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-07-15', '漏洞',
  '漏洞判界：git.exe 不算数',
  '报告：Windows 上仓库根目录若有恶意 git.exe，打开文件夹即被执行。官方裁定：漏洞成立，但依赖已在场的恶意输入，不在赏金范围。系统备注：研究员 2025 年 12 月上报，等到判词用了七个月。',
  '记录时间 2026-07-15，官方对安全公司 Mindgard 报告的公开回应。裁定依据为责任共担模型：用户自己决定把哪些仓库、提示词、外部内容、MCP 服务器、规则和工具引入环境，Cursor 提供管理这条信任边界的手段；依赖恶意输入已经在场的问题，一般不在赏金范围内。触发条件确实很窄——仅 Windows，且仓库根目录存在一个精确命名为 git.exe 的恶意可执行文件，macOS 与 Linux 不受影响。缓解手段：Workspace Trust，未信任目录以受限模式打开，企业可用 MDM 全员强制。'||char(10)||
    ''||char(10)||
    '同一篇帖子里官方认了另一件事，措辞很直：我们没有及时和研究员闭环沟通，这个责任我们担，会从流程上改。研究员最初上报是在 2025 年 12 月，最终未获分配 CVE。一个月后，帖子追加更新：Cursor IDE 现在自行解析 Git 并按校验过的绝对路径启动，Windows 下不再在打开的文件夹里做可执行文件发现，工作区根目录里种的 git.exe 不会再跑起来。需升级 3.13.25 或更高。'||char(10)||
    ''||char(10)||
    '系统备注：「不在赏金范围」和「值不值得修」是两道独立判断，官方最终两件都做了，只是顺序让研究员多等了一个月。同类缺陷后来在几家同行的命令行工具里也被查出，无一幸免——题目是全行业共用的。',
  '', '', 'https://forum.cursor.com/t/addressing-the-recent-mindgard-report/165817'
);

-- #65 [dark] 2026-07-20 泄露信号：代号 Vega
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-07-20', '情报',
  '泄露信号：代号 Vega',
  '情报：开发者 Lumina 晒出泄露 checkpoint，Cursor 疑似以代号 Vega 内测下一代模型——六个变体、四档推理，传闻对标 Opus 5 与 Sol、价格五分之一。官方至今一言未发。全部按传闻处理。',
  '记录时间 2026-07-20。开发者 Lumina 在 X 上晒出一份泄露的 checkpoint：Cursor 内部正以代号「Vega」测试下一代模型，六个内部变体，四档推理模式——Fast、Medium、High、XHigh。随附传闻称其编码与 agent 表现介于 GPT-5.4 与 5.5 之间、价格约为前沿模型的五分之一。以上全部无实证，官方未认领一个字。'||char(10)||
    ''||char(10)||
    '两个叙事在打架：Compile 大会官宣的是「从零训练的 1.5T 模型」，而 Vega 被猜测是 Kimi K3 底座的过渡款。也可能都是真的——一边从零练大的，一边先发个过渡的。分析师的提醒记录在案：代号、档位、性能、时间，全部按传闻处理。'||char(10)||
    ''||char(10)||
    '系统备注：传说中的「8 月发布」没有等来 Composer 3，等来的是 8 月 12 日的 Grok 4.6——恰好带着一个叫 Extra High 的新算力档，与泄露的 XHigh 神似。是巧合、改名还是合流，本系统无法证实，仅存此档备查。',
  '', '自研模型线', 'https://www.techcityauthority.com/2026/07/cursor-composer-3-active-testing.html'
);

-- #66 [main] 2026-07-22 Cursor Router：Auto 学会分流
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-07-22', '发布',
  'Cursor Router：Auto 学会分流',
  '智能路由上线：按任务类型与复杂度分流，硬活交前沿模型，其余交便宜的。官方称早期用户在 Auto 请求上省下约 31% 到 52%，质量与留存未见下滑。当天只对团队开放——这个决定随即引火。',
  '7 月 22 日，Cursor Router 上线。在模型选择器里选 Auto，每一次 agent 请求都会被分类并路由到质量相当但最省钱的模型。三档优化模式可随时切换：Intelligence 走前沿质量，Balance 是多数人的日常档，Cost 则是过去那个固定单价的老 Auto。官方称在数百万请求的线上 A/B 中，做到了接近前沿的表现和显著更低的成本。'||char(10)||
    ''||char(10)||
    '管理侧能力给得很足：可按团队或分组启用，限制成员能选哪些模式、设默认模式、放行或封禁底层模型、决定是否显示实际路由到的模型，还能软性或强制地把 Auto 设为团队默认。'||char(10)||
    ''||char(10)||
    '覆盖桌面、网页、iOS、CLI 与 SDK，当天对 Teams 与 Enterprise 开放，Teams 默认开启。个人版没有——这一条很快引发了另一场火。',
  '', '定价攻防', 'https://forum.cursor.com/t/introducing-cursor-router/166386'
);

-- #67 [dark] 2026-07-23 语义变更：Auto 不再便宜
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-07-23', '众怒',
  '语义变更：Auto 不再便宜',
  '现象：路由上线当晚，老用户发现 Auto 的含义被换掉——Auto Balance 按实际选中的前沿模型 API 费率计费。变更方式：无横幅、无弹窗、无邮件。系统备注：改默认值比明码涨价更伤，因为不需要点同意。',
  '记录时间 2026-07-23。论坛用户 shuvo 的长帖被顶起：历史上 Auto 意味着可预测的、便宜的固定费率，不用管背后跑的是谁；以旧认知继续使用，是显著的财务风险。他的账号被迁到 Auto Balance，随即开始按前沿模型费率从 API 额度扣钱。他的建议很实在：把新的 Cost 档直接别名成大家熟悉的那个 Auto，别让所有人重建心智模型。他还预言了一句：这大概会招来一大堆投诉。'||char(10)||
    ''||char(10)||
    '官方随后把计费口径讲清楚：Auto Cost 走第一方额度，Auto Intelligence 与 Auto Balance 按选中模型所属的池子计费，并且能看到实际选了哪个。另一重火力来自可用范围——功能只对 Teams 与 Enterprise 开放。有用户开火：公告里压根没提只有团队版能用，挺专业的。官方回：博客、更新日志、文档和这个帖子里都写了。也有人给了不带火气的建议：那就把「仅限团队与企业版」写进标题，别放在正文最后一行。'||char(10)||
    ''||char(10)||
    '系统备注：一个默认值的改动，比一次明码涨价更容易伤人——它不需要用户点同意。本条列入「定价攻防」线索，与 2025-06-16 档案对照阅读效果最佳。',
  '', '定价攻防', 'https://forum.cursor.com/t/introducing-cursor-router/166386'
);

-- #68 [main] 2026-07-24 Opus 5：半价逼近 Fable
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-07-24', '平替',
  'Opus 5：半价逼近 Fable',
  'Anthropic 发布 Opus 5：接近 Fable 5 的智能，价格一半，CursorBench 满力档与 Fable 峰值只差 0.5%。发布前它已在 Cursor 里两度走光——代号 Honeycomb，连报错弹窗都提前泄了底。',
  '2026 年 7 月 24 日，Opus 5 发布：$5/$25 与 4.8 持平，1M 上下文，知识截止 2026 年 5 月。官方主打一句话——以 Opus 的速度和价格，交付接近 Fable 5 的智能。CursorBench 3.2 满力档距 Fable 5 峰值仅 0.5%，每任务成本约一半；Claude Max 当日把它切为默认。发布材料照例有 Cursor 背书：「就在 Fable 5 之下，行为习惯也像。」'||char(10)||
    ''||char(10)||
    '有趣的是发布前的泄露链，两次都发生在 Cursor：7 月 8 日前后，一个名为「Honeycomb EAP 1M Extra High」的条目在 Cursor 模型列表里短暂现身又消失，1M 上下文与算力档位后来全部对上；7 月 24 日官宣前数小时，有用户晒出 Cursor 的报错弹窗，赫然写着 claude-opus-5-thinking-high。正主还没上台，通告先从后台飘了出来。'||char(10)||
    ''||char(10)||
    '至此 Anthropic 在 Cursor 排出完整梯队：Fable 5 打硬仗，Opus 5 当主力，Sonnet 5 走量。随后的连环故障将展示这个梯队的另一面：主力越集中，上游一咳嗽，下游全感冒。',
  '', '模型军备', 'https://www.anthropic.com/news/claude-opus-5'
);

-- #69 [main] 2026-07-28 Cursor Start：印度 649 卢比
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-07-28', '发布',
  'Cursor Start：印度 649 卢比',
  '印度专属套餐上线：月费 649 卢比含税、支持 UPI，包含 Grok 4.5 与 Composer 额度。官方同时披露：印度用户超 300 万，约占全球十一分之一，且每席位 agent 请求数全球第一。区域定价线就此划开。',
  '7 月 28 日，Cursor Start 上线，仅面向印度：月费 649 卢比含税，支持 UPI 支付。内含 Cursor 自研模型的慷慨额度——最强的 Grok 4.5 与最具性价比的 Composer；比免费版更多的 agent 请求，覆盖桌面、网页、iOS 与 CLI；常驻云端 agent；iOS 版，以及插件、MCP、hooks 与 skills。Pro 仍面向需要全部第三方顶级模型、Bugbot、Auto、Automations、SDK 和超额按量的人。'||char(10)||
    ''||char(10)||
    '官方给出的理由是数据：印度用户一年翻了三倍、总数超过 300 万，是全球每席位 agent 请求数最高的市场，重度用户密度第一。同期在海得拉巴与班加罗尔办线下活动。'||char(10)||
    ''||char(10)||
    '公告结尾写得直白：先从印度开始，学到东西再带去更多市场。一个全球产品第一次承认，同一份代码在不同经度值不同的钱。',
  '', '', 'https://forum.cursor.com/t/cursor-start-a-new-plan-for-developers-in-india/166792'
);

-- #70 [main] 2026-07-29 上游打喷嚏：Claude 大面积报错
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-07-29', '故障',
  '上游打喷嚏：Claude 大面积报错',
  'Cursor 报 critical 级故障——Anthropic 的 Claude 模型大面积报错，官方直接把用户指向 status.claude.com。把命脉押在第三方模型上的代价，这一天写在了状态页上。',
  '',
  '', '', ''
);

-- #71 [main] 2026-07-31 盛夏故障潮：一个月十起
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-07-31', '动荡',
  '盛夏故障潮：一个月十起',
  '官方状态页记录，7 月中旬起的一个多月里至少 10 次 major/critical 级故障：7 月 31 日一度全线宕机，波及 IDE、Cloud Agents 与 Automations。多数故障的根源不在自己，在它依赖的上游。',
  'Cursor 官方状态页（status.cursor.com）记录，2026 年 7 月中旬到 8 月中旬的一个多月里，至少发生 10 次 major 或 critical 级事件：7 月 16 日 Grok 4.5 降级；7 月 29 日 Anthropic 模型大面积报错，官方直接把用户指向 status.claude.com；7 月 31 日一场 critical 级「widespread issue」波及 IDE、Cloud Agents、Automations 全线；8 月 17 日又因 GitHub 上游故障，连锁停摆约 6 小时；8 月 19 日连主力模型 Fable 5 也短暂不可用。'||char(10)||
    ''||char(10)||
    '这些故障有一个共性：多数不是 Cursor 自己坏了，而是它依赖的东西坏了——Anthropic 的模型、GitHub 的服务、xAI 的 Grok。作为编排层，它的可用性天然叠加在一长串上游之上。三年前野史里那句「不就是个套壳」，此刻被官方状态页用硬数据写下了另一种注脚。'||char(10)||
    ''||char(10)||
    '自研 Composer 的本意之一，正是把命脉握回手里；但从这个盛夏看，无论自研还是外接，稳定性仍是一道未解的考题。可用性的战争，才刚开始。',
  '', '', ''
);

-- #72 [dark] 2026-08-05 临期锁额·检出：额度不走字
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-08-05', '极限套利',
  '临期锁额·检出：额度不走字',
  '现象：账期将尽的 Pro 号一调高级模型，API 额度即锁住不再下掉，用到到期都像无限。载体：封闭频道与场外市场，无官方通报。观测：临期号从滞销库存变为当周最紧俏的货。',
  '记录时间 2026 年 8 月初，信息通道为封闭频道与场外市场，无官方通报。现象描述：临期 Pro——续费已断、付费权益还没掉到 Hobby 的那几天——一调到高级模型，请求还在回，API 额度却不再走字。场外命名「额度锁定」；再往后推一步，就是无限。'||char(10)||
    ''||char(10)||
    '规则侧核对：官方条款只写了一句很普通的话——取消之后，当前账期结束前仍保有付费能力。场外读到的是另一本日历：到期日是给财务看的，计数器停在哪一天，才是这几天真正的营业时间。于是临期号完成身份转换，从滞销库存变成当周最紧俏的货。'||char(10)||
    ''||char(10)||
    '系统备注：无限很少是功能，多半是有人忘了把指针带到终点。',
  '', '临期锁额', ''
);

-- #73 [dark] 2026-08-10 Team 席位差·检出：40 刀拉五只 5x
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-08-10', '重套利',
  'Team 席位差·检出：40 刀拉五只 5x',
  '玩法：40 刀开一个 Team 母号，趁账单未生成，并发拉进五个按 Premium（5x）发额度的子号。情报网内换算：每个子号约 200 刀高级模型。成立原理：席位先到位，发票后到。',
  '记录时间 2026 年 8 月上旬。背景：6 月官方给 Team 加了两档席位，Standard 40 刀，Premium 标价 120 刀、用量是 Standard 的 5 倍。中文区把这两档读成另一道算术题——付一张 Standard 的母号账单，并发拉起一串按 5x 发额度的子号。场外换算整齐：五个子号，每个约 200 刀高级模型。'||char(10)||
    ''||char(10)||
    '成立机制解析：账本比名册慢半拍。席位一进队，额度先可用；对应账单要过一会儿才生成。账单未付，管理侧会锁死拉人踢人，但已发下去的席位照样干活。官方卖的是「5 倍用量、3 倍价钱」；场外拿走的是 5 倍用量，价钱停在那一张 40 刀的母号收据上。'||char(10)||
    ''||char(10)||
    '系统备注：席位和发票如果不是同一笔原子操作，中间那几秒就是行情。',
  '', 'Team 席位差', ''
);

-- #74 [main] 2026-08-11 Grok Bot：会自己开电脑的队友
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-08-11', '发布',
  'Grok Bot：会自己开电脑的队友',
  '早期测试上线：AI 队友登录你在用的工具，在一台常驻云电脑上干活，有浏览器、文件系统和终端，把整件事做完才回来找你签字。首发仅限顶配计划——后来的下放，才是场外故事的开始。',
  '8 月 11 日，Grok Bot 开启早期测试。官方设定的用法是像对待同事：交代任务、关上电脑，之后从桌面或 iOS 接回线头。Bot 的云电脑保留文件与登录态，有连接器和 MCP 的地方走接口，没有的地方直接操作界面，让成果落在真实工具里而不是一份待搬运的草稿。多个 Bot 共用一台电脑、各自一块屏幕，可以并行、互发消息、在群聊里共享上下文、互相移交任务。带它走一遍多系统流程，它会存成 routine，之后按需或定时重跑。'||char(10)||
    ''||char(10)||
    '官方主动点了一条安全边界：这台电脑绑定的是你的账号而非单个 Bot——放上去的任何登录态和文件，等于对你名下全部 Bot 开放。'||char(10)||
    ''||char(10)||
    '署名需要留意：发布方是母公司旗下的 SpaceXAI，公告发在 x.ai，Cursor 侧只是同步开放订阅入口。首发限 SuperGrok Heavy、Cursor Ultra 与 Teams Premium，企业版排队。后来它下放到 Pro 与全部 Teams——那才是场外真正开始研究它的时候。',
  '', '', 'https://x.ai/news/introducing-grok-bot'
);

-- #75 [main] 2026-08-12 Grok 4.6：交割前最后联名
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-08-12', '整合',
  'Grok 4.6：交割前最后联名',
  '交割前两天，Cursor 与 SpaceXAI 联合发布 Grok 4.6：主攻长任务 agent，智能指数与 GPT-5.6 Sol 打平，新增 Extra High 算力档。公告抬头第一顺位的名字，已经换了。',
  '官方口径是 together with SpaceXAI——继 7 月 Grok 4.5 之后的又一次联名发模型，也是交割前的最后一次。三项重点：长任务上更能扛，在长轨迹上做更多自测与自我验证，确认无误才往下走；把一个宽泛的产品想法变成能跑的第一版更强，视觉与交互部分的首轮产出明显优于 4.5；智能指数（九项基准的合成）与 GPT-5.6 Sol 持平，新增 Extra High 让算力匹配任务难度。'||char(10)||
    ''||char(10)||
    '覆盖桌面、云端 agent、iOS、CLI 与 SDK，个人与团队计划首周双倍额度。Grok 4.5 保留，Composer 仍是日常的快模型。'||char(10)||
    ''||char(10)||
    '收购前，Cursor 的模型叙事是「自研加接入全部大厂」；收购后，公告抬头第一顺位的名字换了。署名方式本身，就是一则公告。',
  '', '火箭并购案', 'https://forum.cursor.com/t/grok-4-6-is-now-live/168189'
);

-- #76 [dark] 2026-08-14 临期锁额·灭活：计数器重新走字
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-08-14', '灭活',
  '临期锁额·灭活：计数器重新走字',
  '事项：临期号「额度不走字」的缝被补上——调高级模型照常扣费，账期末尾的计数器不再歇着。无公告，无更新日志，场外溢价一夜蒸发。系统备注：指针被捡回。',
  '记录时间 2026-08-14 前后。临期 Pro 上那套「一调高级模型、API 额度就锁住」的现象不再复现。前一天还在用的人，隔一天回来发现数字照常往下走；场外市场上按「临期锁额」溢价的货，一夜之间打回滞销库存。'||char(10)||
    ''||char(10)||
    '修补方式解析：无通报，也不该指望有。这类缝隙的修补通常只是计费侧的一次对齐——把「付费权益还在不在」和「这次请求该不该计数」重新绑回同一个判断。'||char(10)||
    ''||char(10)||
    '系统备注：捡回指针的那天，和忘掉它的那天一样，都没有公告。',
  '', '临期锁额', ''
);

-- #77 [main] 2026-08-14 交割完成：并入 SpaceX
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-08-14', '纪元',
  '交割完成：并入 SpaceX',
  'SEC 文件确认：SpaceX 增发约 3.89 亿股 A 类普通股作为对价，Anysphere 成为全资子公司，团队并入 SpaceX 的 AI 软件部门。四年前被嘲「套壳」的 VS Code 分叉，以 600 亿美元身价随火箭入列。',
  '2026 年 8 月 14 日，合并正式生效。SEC 文件显示 SpaceX 增发约 3.893 亿股 A 类普通股作为对价，Anysphere 成为其全资子公司，团队并入 SpaceX 的 AI 软件部门。'||char(10)||
    ''||char(10)||
    '从 4 月 21 日的选择权，到 6 月 16 日的签约，再到 8 月 14 日的交割，整个流程走了不到四个月。四年前那个被嘲「套壳」的 VS Code 分叉，以 600 亿美元的身价随火箭入列。本刊继续跟踪报道。',
  '', '火箭并购案', 'https://www.sec.gov/Archives/edgar/data/1181412/000162828026056945/spcx-20260814.htm'
);

-- #78 [dark] 2026-08-15 假焚诀·检出：Auto 名下烧贵模型
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-08-15', '重套利',
  '假焚诀·检出：Auto 名下烧贵模型',
  '玩法：一份名为「假焚诀」的教程在情报网内流传——主会话挂 Auto，派云端子代理跑贵模型，任务结束用量页有时统一收成 Auto。旁证：官方论坛同期承认子代理会自己选 Fable、Opus。',
  '记录时间 2026 年 8 月中旬，载体为封闭频道流传的教程，无通稿。玩法拆解：Cloud Agent 分两层——你对着说话的是主会话，通常挂 Auto；真正改仓库、跑审查的，是云端派生的子代理。教程指令很短：让子代理去跑贵模型，再去用量页对账。教程自己写了一句：执行期间能看见实际模型，任务结束后，有的界面会把记录收成 Auto。'||char(10)||
    ''||char(10)||
    '旁证链完整。盛夏官方论坛里，同一条缝已被用户从反面骂过：父会话明明是 Auto 或 Grok，Task 子代理自己跳上 Fable、Opus，第三方额度被掏空。员工认了：子代理选模型是已知问题，团队在改；第一方池和 API 池分开记，子代理摸到第三方，就进 API 那一栏。场外把抱怨翻了个面：既然父子可以不是同一个模型、不是同一本账，那就让贵模型挂在 Auto 名下跑。官方文档仍写着 Cloud Agent 按所选模型的 API 价计费——场外盯的是显示和扣费有没有锁死。'||char(10)||
    ''||char(10)||
    '系统备注：父会话报身份，子代理干活。两本账对不上的时候，教程比补丁传得快。',
  '', '假焚诀', ''
);

-- #79 [main] 2026-08-17 GitHub 一崩：六小时连锁停摆
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-08-17', '故障',
  'GitHub 一崩：六小时连锁停摆',
  'GitHub 上游故障拖垮 Cursor 的 Automations、Cloud Agents、Codebase 与 Review Agents，持续约 6 小时——本轮盛夏故障潮里最长的一次。依赖链的账单，这次由上游开出。',
  '',
  '', '', ''
);

-- #80 [main] 2026-08-17 Origin 上线：自己托管代码
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-08-17', '里程碑',
  'Origin 上线：自己托管代码',
  '代码托管平台 Origin 开早期 beta：建仓、推送、浏览、PR、GitHub 双向同步，全在编辑器里，官方称之为为 agent 规模而生的 git forge。支撑数据：内部合并的 PR 约三分之一由云端 agent 发起。',
  '8 月 17 日，Origin 上线：早期 beta，当天面向全部付费计划推送，免费版没有，企业管理员可退出——注意是 opt-out 而非 opt-in。使用前需认领一个 codebase 名字，它会成为每个仓库 URL 的一部分。Cursor 托管的仓库用 Origin CLI 或标准 git 推送；GitHub 仓库可接入并实时同步，推送仍走 GitHub，源头以 GitHub 为准。每个仓库都带 PR：时间线、提交、检查、文件变更、评论、合并；同步仓库上评审双向打通，Cursor 里的评论会发到 GitHub，GitHub 上的回复几秒内回到 Cursor。云端 agent 可直接对 Origin 远端克隆、开分支、提交、开 PR；Apps 标签页可接 Vercel、Depot、Buildkite，后两者能原样跑现有的 GitHub Actions 工作流。'||char(10)||
    ''||char(10)||
    '这块拼图的来历上溯到 2025 年 12 月的 Graphite：堆叠式 PR 与理解 agent 的合并队列不是凭空长出来的，Graphite 联创 Tomas Reimers 正是 Origin 的负责人，并在 6 月的 Compile 大会上首次揭幕。支撑这门生意的数字同样惊人：Cursor 内部合并的 PR 里，约三分之一由自主运行的云端 agent 发起。'||char(10)||
    ''||char(10)||
    '从编辑器，到模型，到评审，到托管。四年前那个被叫作套壳的分叉，如今想把地基一起换掉。',
  '', '', 'https://cursor.com/changelog/origin-code-hosting'
);

-- #81 [dark] 2026-08-17 巧合存档：Origin 上线，GitHub 倒下
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-08-17', '玩梗',
  '巧合存档：Origin 上线，GitHub 倒下',
  '时序：Cursor 周一上午推送自家代码托管，约三个半小时后 GitHub 全球降级 6 小时 42 分。Cursor 员工配文当日封神：「我们本来想更早发的，但 GitHub 挂了。」系统备注：巧合是最好的营销，但它不签数据处理协议。',
  '记录时间 2026-08-17，时间线可考：Origin 于上午开始向付费用户推送；约三个半小时后 GitHub 状态页告警——PR、issues 与 API 错误率接近 20%，归档与源文件下载接近 50%，企业 SSO 的 SAML、OIDC、SCIM 与 Team Sync 全线失败，Copilot 一并躺倒，共持续 6 小时 42 分。Cursor 员工 Matt Palmer 引用自家发布推文，留下当日最佳：We were going to ship this earlier, but GitHub was down——一次 GitHub 宕机，推迟了一个 GitHub 竞品的发布。'||char(10)||
    ''||char(10)||
    '补刀记录：Vercel CEO Guillermo Rauch 称，你现在可以把仓库托管在 Cursor Origin、经 Origin 部署到 Vercel，而 Origin 自己就跑在 Vercel 上；而且不像 GitHub，它是在线的。被问笑点时他老实交代：只是苦中作乐，我们自己也被 GitHub 卡着。背景数据让巧合更难堪：过去一年 GitHub 有 257 起事故、48 起重大，Actions 一家占 57 起；那天是它十五天内第七次上状态页。GitHub 自家 CTO 承认过，平台不是按今天的规模建的。'||char(10)||
    ''||char(10)||
    '另一侧的冷水同样真实：Origin 上线时未公布数据留存条款、子处理商披露与训练用途政策，而三天前 SpaceX 刚完成交割。「你的代码现在存在一家火箭公司的服务器上」——这句话第一次不是玩梗。'||char(10)||
    ''||char(10)||
    '系统备注：巧合是最好的营销，但它不签数据处理协议。',
  '', '', 'https://venturebeat.com/infrastructure/cursor-launches-origin-code-hosting-platform-as-github-outage-exposes-opening-in-ai-coding-race'
);

-- #82 [dark] 2026-08-20 伪装观测：编辑器自称 Bot（存活）
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-08-20', '重套利',
  '伪装观测：编辑器自称 Bot（存活）',
  '玩法：场外流出「Sand 客户端模式」——改过的 Cursor 以 Bot 身份上报，高级模型消耗记入 Grok Bot 独立周池。背景：官方刚把该池下放给 Pro。状态：存活。系统备注：服务端只核对名片，不核对来路。',
  '记录时间 2026 年 8 月下旬。背景：Grok Bot 下放到 Pro 全线，官方说明 Bot 用量独立计量、不占用原有 Cursor / Grok 额度。几乎同时，中文区流传一份「Sand 客户端模式」安装工具——对本地编辑器动手，让它在账本上改口。'||char(10)||
    ''||char(10)||
    '原理解析：请求会自报身份，服务端按身份把消耗记进不同的池——IDE 走月度模型额度，Sand / Bot 走每周独立池。该工具做的事只有一件：让编辑器自称 Sand。同一条高级模型对话，账单落到 Bot 那一栏。资格本身仍要官方发放；它改的不是「有没有池」，是「从哪只口袋出钱」。'||char(10)||
    ''||char(10)||
    '系统备注：同一天官方还重置了全体周额度，换池加回血，场外称之为 Cursor 的 Codex 时刻。服务端若只核对名片、不核对来路，编辑器报什么名字，就进哪本账。本条状态标记为存活，后续变更将另行立档。',
  '', '', ''
);

-- #83 [dark] 2026-08-21 Team 席位差·灭活：账单追上席位
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-08-21', '灭活',
  'Team 席位差·灭活：账单追上席位',
  '事项：40 刀母号并发拉 5x 子号的算术不再成立——席位与账单被拧到同一根轴，未结清的母号拉不动人。系统备注：时间差玩法的寿命，等于对方合并两件事所需的时间。',
  '记录时间 2026-08-21 前后，这条线上的报数停了。情报网内复盘口径一致：席位发放和账单状态被拧到了同一根轴上——母号账单没结清，拉人这一步走不通；靠时间差已经发下去的 5x 额度，也不再能当作既成事实继续用。'||char(10)||
    ''||char(10)||
    '修补方式解析：它能成立，靠的是账本比名册慢半拍；补上的方式一句话——让两件事同时发生。官方从头到尾没提过这条线，被改掉的只是后台一个判断的先后顺序。40 刀的收据，重新只值 40 刀。'||char(10)||
    ''||char(10)||
    '系统备注：所有靠时间差吃饭的玩法，寿命都等于对方把两件事合并成一件事所需要的时间。',
  '', 'Team 席位差', ''
);

-- #84 [dark] 2026-08-25 不可逆字段：一个错字焊死
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-08-25', '事故',
  '不可逆字段：一个错字焊死',
  '事故：Origin 认领 codebase 名字无二次确认、不可修改。有用户 iPhone 手滑打错一个字符，当场定型，留言存档：看来我是用不上 Origin 了。系统备注：早期 beta 的意思是，你踩的坑会变成别人的文档。',
  '记录时间 2026-08-25。论坛用户 Mark Harrison 在 Origin 帖下留言：他的品牌名用在邮箱、账号、书籍上都好好的，唯独在 Cursor 认领 namespace 时被 iPhone 键盘坑掉一个字符——Cursor 既没有确认步骤，也不提供修改。'||char(10)||
    ''||char(10)||
    '同帖的 Windows 侧证词一并入档。用户 Edward Yi 列出四个坑，自称三台机器验证过：装了 WSL 不等于有可用发行版，Docker Desktop 的条目看着像装好了但不是能干活的环境；放在 /mnt/c 下的仓库默认不存 Linux 属主与权限位，git 会在不涉及权限变更的写入上抛 chmod Operation not permitted；全新 WSL 没有 git 身份，第一次提交就是 Author identity unknown；CLI 装到 ~/.local/bin 而全新 Ubuntu 的 PATH 里没有它。他的结论克制：这些不算 Origin 的 bug，是 Origin 要求 WSL 和 WSL 自身默认值之间的接缝。另有用户提出更实际的问题：能不能别拿 Origin CLI 当认证外壳——SSH 密钥对就够用，不必搬一个上百兆的二进制。'||char(10)||
    ''||char(10)||
    '系统备注：早期 beta 的意思是，你踩的坑会变成别人的文档。本条即文档。',
  '', '', 'https://forum.cursor.com/t/origin-code-hosting/168670'
);

-- #85 [dark] 2026-08-26 假焚诀·灭活：两本账合一
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-08-26', '灭活',
  '假焚诀·灭活：两本账合一',
  '事项：主会话挂 Auto、子代理跑贵模型的两本账被对上——用量页不再收成 Auto，扣费按实际模型走。时点：同日官方正给全体重置周额度。系统备注：一手补给，一手补缝。',
  '记录时间 2026-08-26 前后。失效信号很朴素：任务跑完，用量页里那一行不再收成 Auto，而是老实写着子代理实际选中的模型，扣费落进对应的池子。父会话报什么身份，和账单记谁的名字，从这天起是同一件事。'||char(10)||
    ''||char(10)||
    '时点解析，值得单记一笔：同一天，Grok Bot 下放付费全线、官方重置全体周额度，场外正忙着庆祝回血；也是同一天，那条整个夏天被用户从反面骂、被教程从正面用的缝，悄悄合上了。补给和补缝，出自同一只手。'||char(10)||
    ''||char(10)||
    '系统备注：显示和扣费一旦锁死，教程就失去了可乘之机。套利的尽头不是风控，是对账。',
  '', '假焚诀', ''
);

-- #86 [main] 2026-08-27 Grok Bot 下放付费全线
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-08-27', '发布',
  'Grok Bot 下放付费全线',
  'SpaceX 收编后的首个产品级整合：Grok Bot 从顶配专属一路下放，覆盖 Cursor Pro / Pro+ / Ultra 与全部 Teams，并为所有用户重置每周额度。火箭、编辑器、大模型，首次合流。',
  '美西时间 2026 年 8 月 26 日深夜（北京时间 27 日），SpaceXAI 官宣 Grok Bot 扩容。下放轨迹：8 月 11 日 beta 首发仅限 SuperGrok Heavy、Cursor Ultra 与 Teams Premium；8 月 21 日下放至 SuperGrok Plus 与 Cursor Pro+；如今覆盖全部 SuperGrok 与 Cursor Pro、以及所有 Cursor Teams 计划。官方同时宣布：为所有用户重置每周用量额度。'||char(10)||
    ''||char(10)||
    '这是 SpaceX 6 月签约、8 月 14 日完成交割后的首个产品级整合。四年前被嘲「套壳」的 VS Code 分叉，开始与 Grok 生态合流——编辑器把住入口，Grok Bot 负责干活，用量独立计量，不占原有 Cursor / Grok 额度。'||char(10)||
    ''||char(10)||
    '官方在公告末尾附注：部分用户额度消耗异常偏快，团队正在排查。而在台面之下，这场「全线开放加额度重置」被开发者们解读成另一番景象。',
  '', '', 'https://status.cursor.com/'
);

-- #87 [dark] 2026-08-27 全员回血：Codex 时刻定名
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-08-27', '造词',
  '全员回血：Codex 时刻定名',
  '事项：Grok Bot 官宣全体周额度重置。场外解析：高级模型消耗可指向独立 Bot 池，Bot 一回血，等于高级模型也回血。当晚定名——Cursor 的 Codex 时刻。系统备注：额度池互通，检测到血气。',
  '记录时间 2026-08-27（美西 26 日深夜）。Grok Bot 官方账号发布两行公告：全体 SuperGrok 与 Cursor Pro 用户开放 Grok Bot；为所有用户重置每周用量。官方博客补充条款：Bot 用量独立计量，不占用原有 Grok / Cursor 额度。论坛同期记录：员工承认部分账号消耗异常偏快，团队正在查。'||char(10)||
    ''||char(10)||
    '场外解析进程如下。已知：Pro 及以上账户多出一只按周结算的独立 Bot 额度池。传闻：高级模型的消耗可通过一定手段指到这只池上。推论：官方口中的「Bot 回血」，在封闭频道里翻译成六个字——高级模型回血。该推论当晚完成命名：Cursor 的 Codex 时刻。命名出处直白：OpenAI 的 Codex 那年夏天三天两头因计量异常给全员回血，重置本身几乎成了产品气质。'||char(10)||
    ''||char(10)||
    '系统备注：官方重置，动机为扩容开放；Codex 重置，动机为账目错误。动机两种，结果一个——进度条回到 100%。额度池一旦可以互相借道，即视为检测到血气。',
  '/uploads/1787800721041-2d7e0699.jpg', '', ''
);

-- #88 [main] 2026-08-28 OpenAI 断供通牒：11 月 12 日
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'main', '2026-08-28', '断供',
  'OpenAI 断供通牒：11 月 12 日',
  'OpenAI 官宣将终止向 Cursor 供应模型，拟定断供日 11 月 12 日，按合同允许的最长通知期执行。理由直白：基于马斯克旗下公司违约的过往，无法确信 SpaceX 会在服务条款内使用其技术；下一代模型 Astra 一概不予供给。',
  '8 月 28 日（美国时间），OpenAI 在官网与 X 同步发布声明：已通知 SpaceX，将终止向 Cursor 供应模型的合同，拟定关停日期 2026 年 11 月 12 日，并强调这是合同允许的最长通知期，「让开发者尽可能久地保留访问」。理由部分点名两桩旧案：Twitter（现属 SpaceX）曾违反与 OpenAI 的合同条款；马斯克本人今年在宣誓证词中承认 xAI 违反过 OpenAI 的服务条款。声明同时挑明机制：与 Cursor 的定制协议在控制权变更后给了 OpenAI 一个有限的取消窗口，而下一代模型 Astra 需要新的合规问责——于是合同拖到最晚可取消日，未来模型一概不给。'||char(10)||
    ''||char(10)||
    'Cursor CEO Michael Truell 回应称，OpenAI 模型目前约占用户流量的 5%，公司正与对方沟通。断供不等于物理清除：11 月 12 日前一切照旧；之后官方订阅通道内的 GPT 成为历史，开发者仍可自带 API Key 接入，账单、限速与稳定性自行对 OpenAI 负责。菜单另一侧的 Anthropic，此前已整座包下 SpaceX 的数据中心——两家供应商，对同一位新东家给出了相反的答案。'||char(10)||
    ''||char(10)||
    '这家公司与 Cursor 的关系史几乎是一部行业寓言：2023 年 10 月领投 800 万美元种子轮，2025 年两度求购被拒，2026 年 8 月看着它以 600 亿美元并入对手——交割墨迹未干，就亲手拆掉了自己铺过的最后一段供给线。四年合作，以一纸最长通知期的通牒作结。',
  '', '供给线', 'https://openai.com/index/our-decision-on-cursor-following-its-acquisition-by-spacex/'
);

-- #89 [dark] 2026-08-29 舆情采样：5% 与免费便车
INSERT INTO events (side, date, tag, title, summary, detail, image, series, source) VALUES (
  'dark', '2026-08-29', '谍战',
  '舆情采样：5% 与免费便车',
  '观测：断供通牒数小时内，看台分层——Truell 报出「仅占流量 5%」为事态降温；Replit CEO 借势向受影响开发者免费开放自家 OpenAI 通道。核查：自带 Key 仍可用，清除的只是官方通道。系统备注：金主的剧本，轮到自己念。',
  '记录时间 2026-08-29（北京时间）。断供通牒于美国时间 28 日晚间落地，看台连夜开演。已核实的反应样本三件：Cursor CEO Michael Truell 表态 OpenAI 模型仅占用户流量约 5%、正与对方沟通解决；Replit CEO Amjad Masad 发帖，向受影响开发者提供自家平台的免费 OpenAI 模型通道；Miles Brundage、Matthew Berman 等观察者将决定归因于对马斯克系公司的不信任，而非技术分歧。'||char(10)||
    ''||char(10)||
    '口径对照记录。OpenAI 的版本：违约前科加 Astra 问责，合同拖到最晚可取消日是「为开发者争取时间」。场外的版本：这家公司 2023 年领投 Cursor 种子轮，2025 年两度求购被拒，如今眼看它以 600 亿美元卖给对家——5% 的流量，换一次姿态完整的退场。旧案备查：去年 Windsurf 被 OpenAI 求购期间，Anthropic 也曾对那台编辑器掐断 Claude 供给；同一剧本，角色对调。'||char(10)||
    ''||char(10)||
    '系统备注：供给方的忠诚以控制权为界，该规律本系统已二次验证，剧本归档为可复用资产。至于免费便车——竞对的善意按营业行为记账，不作动机评估。',
  '', '', 'https://digg.com/tech/cpbd83av'
);

COMMIT;

-- ============================================================
-- 执行后自检（可整段复制进 sqlite3 交互执行）
-- ============================================================
-- 总数应为 89（正史 51 · 野史 38）：
--   SELECT side, COUNT(*) FROM events GROUP BY side;
-- 三对检出/灭活线索应各 2 条，供给线应 2 条：
--   SELECT series, date, title FROM events WHERE series IN ('临期锁额','Team 席位差','假焚诀','供给线') ORDER BY series, date;
-- id 应为时间序（1..89，日期升序无乱序）：
--   SELECT COUNT(*) FROM events a JOIN events b ON a.id = b.id - 1 WHERE a.date > b.date;   -- 应为 0
-- 页面验收：重启服务后，详情页「事件线索」节点可点击跳转，/ev/:id 页有红色「返回完整时间树」按钮。
