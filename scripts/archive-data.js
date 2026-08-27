/**
 * UMBRELLA 4365 · 档案同步数据
 *
 * 三块内容，由 sync-archive.js 消费：
 *   NEW_EVENTS  新增档案（论坛与外部信源整理，2026-03 ~ 2026-08 空白期）
 *   PATCHES     给现有档案补 source / series，纯增量，不改已有文案
 *   CORRECTIONS 现有档案的事实订正，改动日期与文案，需 --with-corrections 才执行
 *
 * PATCHES / CORRECTIONS 用 side + date + title 三元组定位记录，
 * 因此线上线下两套库只要都由 seed.js 起家，同一份数据可以通吃。
 * CORRECTIONS 会改 date / title，所以额外带一个 after 键供重复执行时识别。
 */

/* ==================================================================
   一、新增档案
   ================================================================== */
const NEW_EVENTS = [
  /* -------------------- 正史 -------------------- */
  {
    side: 'main', date: '2026-03-19', tag: '发布', series: '自研模型线',
    title: 'Composer 2 与首次持续预训练',
    summary: '3 月 19 日 Composer 2 上线，官方称前沿级编码智能，定价每百万 token 0.5 与 2.5 美元，另有同等智能的 Fast 变体并设为默认。这是 Cursor 第一次跑通持续预训练加强化学习的完整链路。',
    detail: '官方列出三项改进：全基准大幅提升，包括 Terminal-Bench 2.0 与 SWE-bench Multilingual；基于首次持续预训练，用强化学习在长程编码任务上训练，能解决需要数百步动作的问题；引入 Fast 变体作为默认，比其它家的快模型更便宜。\n\n这是 Cursor 从调用别人的模型走到自己是模型公司的关键一步——彼时估值 293 亿美元，这个身份认定值很多钱。\n\n公告里没有出现的那个词，会在二十四小时内由社区替它说出来。同日的暗面，另见野史。',
    source: 'https://cursor.com/blog/composer-2',
  },
  {
    side: 'main', date: '2026-04-02', tag: '发布',
    title: 'Cursor 3：Agents Window',
    summary: '4 月 2 日 Cursor 3 发布，带来从零重建的 Agents Window——以智能体为中心的统一工作台，跨仓库、跨环境，本地与云端一键互搬。编辑器第一次退居其次。',
    detail: '官方描述：天然多工作区，本地、云端、worktree、远程 SSH 上的 agent 全部汇入同一侧栏，包括从手机、网页、桌面、Slack、GitHub 和 Linear 发起的会话。云端 agent 会自己产出演示视频和截图供你验收。会话可以在本地与云端之间搬迁——想动手改就拉回本地，想离线跑就推到云上。同时内置更简洁的 diff 视图，以及不离开窗口就能暂存、提交、管理 PR。\n\n官方反复强调一件事：老的 VS Code 式界面不会下线，两套并行，可以同时开。\n\n从 2.0 的八个 agent 并行，到 3.0 的 agent 是一等公民，编辑器这个词第一次显得不够用了。',
    source: 'https://cursor.com/blog/cursor-3',
  },
  {
    side: 'main', date: '2026-06-29', tag: '发布',
    title: 'Cursor 上手机',
    summary: '6 月 29 日 iOS 版公测：手机上派活给云端 agent，锁屏用实时活动追进度，看 demo、审 diff、直接合 PR。官方的说法是，笔记本可以睡着、可以够不着、可以在忙别的，你的活不停。',
    detail: '能力清单：选仓库起云端 agent，可挑模型、可从 Plan Mode 起步、可语音输入、可用斜杠命令操控；离开 app 后靠锁屏实时活动和推送保持在环；云端 agent 交付的不只是代码，还有 demo、截图和日志；本地与云端会话可以来回接力；配合 Cursor 3.9，还能直接遥控跑在自己机器上的 agent。\n\n全部付费计划当天可用，7 月 5 日前手机端跑 Composer 2.5 打 2.5 折。Android 官方称在计划中但无时间表，iPadOS 试验过、说会再回来——一个月后 iPad 版如约上线。\n\n评论区被反复提起的两件事：最低只支持 iOS 26，一批还在 iOS 18 的老设备用户装不上；以及中国大陆无法使用。',
    source: 'https://cursor.com/blog/ios-mobile-app',
  },
  {
    side: 'main', date: '2026-07-22', tag: '发布', series: '定价攻防',
    title: 'Cursor Router：让路由替你挑模型',
    summary: '7 月 22 日智能路由上线：按任务类型与复杂度分流，硬活交前沿模型，其余交便宜的。官方称早期用户在 Auto 请求上省下约 31% 到 52%，质量与留存率未见下滑。',
    detail: '在模型选择器里选 Auto，每一次 agent 请求都会被分类并路由到质量相当但最省钱的模型。提供三档优化模式可随时切换：Intelligence 走前沿质量，Balance 是多数人的日常档，Cost 则是过去那个固定单价的老 Auto。官方称在数百万请求的线上 A/B 中，做到了接近前沿的表现和显著更低的成本。\n\n管理侧能力给得很足：可按团队或分组启用，限制成员能选哪些模式、设默认模式、放行或封禁底层模型、决定是否显示实际路由到的模型，还能软性或强制地把 Auto 设为团队默认。\n\n覆盖桌面、网页、iOS、CLI 与 SDK，当天对 Teams 与 Enterprise 开放，Teams 默认开启。个人版没有——这一条会在次日引发另一场火。',
    source: 'https://forum.cursor.com/t/introducing-cursor-router/166386',
  },
  {
    side: 'main', date: '2026-07-28', tag: '发布',
    title: 'Cursor Start：印度专属 649 卢比',
    summary: '7 月 28 日印度专属套餐上线，月费 649 卢比含税、支持 UPI 支付，包含 Grok 4.5 与 Composer。官方同时披露：印度有超过 300 万开发者在用 Cursor，约占全球用户的十一分之一。',
    detail: 'Start 含 Cursor 自研模型的慷慨额度——最强的 Grok 4.5 与最具性价比的 Composer；比免费版更多的 agent 请求，覆盖桌面、网页、iOS 与 CLI；常驻云端 agent；iOS 版，以及插件、MCP、hooks 与 skills。Pro 仍面向需要全部第三方顶级模型、Bugbot、Auto、Automations、SDK 和超额按量的人。\n\n官方给出的理由是数据：印度用户一年翻了三倍，且是全球每席位 agent 请求数最高的市场，重度用户密度第一。同期在海得拉巴与班加罗尔办线下活动。\n\n公告结尾写得很直白：先从印度开始，学到东西再带去更多市场。一条区域定价线就此划开——一个全球产品第一次承认，同一份代码在不同经度值不同的钱。',
    source: 'https://forum.cursor.com/t/cursor-start-a-new-plan-for-developers-in-india/166792',
  },
  {
    side: 'main', date: '2026-08-11', tag: '发布',
    title: 'Grok Bot：会自己开电脑的队友',
    summary: '8 月 11 日 Grok Bot 早期测试上线：AI 队友登录你在用的工具，在一台常驻云电脑上干活，有浏览器、文件系统和终端，把整件事做完才回来找你签字。',
    detail: '官方设定的用法是像对待同事一样：交代任务、关上电脑，之后从桌面或 iOS 接回线头。Bot 的云电脑会保留文件与登录态，有连接器和 MCP 的地方走接口，没有的地方直接操作界面，让成果落在真实工具里而不是一份待你搬运的草稿。多个 Bot 共用一台电脑、各自一块屏幕，可以并行、互发消息、在群聊里共享上下文、互相移交任务。带它走一遍多系统流程，它会存成 routine，之后按需或定时重跑。\n\n官方主动点了一条安全边界：这台电脑绑定的是你的账号而非单个 Bot，所以放上去的任何登录态和文件，等于对你名下全部 Bot 开放。\n\n需要留意署名：发布方是母公司旗下的 SpaceXAI，公告发在 x.ai，Cursor 侧只是同步开放订阅入口。首发限 SuperGrok Heavy、Cursor Ultra 与 Cursor Teams Premium，企业版排队。半个月后它会下放到 Pro 与全部 Teams——那才是民间真正开始研究它的时候。',
    source: 'https://x.ai/news/introducing-grok-bot',
  },
  {
    side: 'main', date: '2026-08-12', tag: '整合', series: '火箭并购案',
    title: 'Grok 4.6：与 SpaceXAI 联名',
    summary: '交割后第十四天，Cursor 与 SpaceXAI 联合发布 Grok 4.6，主攻长任务 agent。在 Artificial Analysis 智能指数上与 GPT-5.6 Sol 打平，并新增 Extra High 算力档。',
    detail: '官方口径是 together with SpaceXAI——这是并入火箭公司后的第一次联名发模型。三项重点：长任务上更能扛，在长轨迹上做更多自测与自我验证，确认无误才往下走；把一个宽泛的产品想法变成能跑的第一版更强，视觉与交互部分的首轮产出明显优于 4.5；智能指数（九项基准的合成）与 GPT-5.6 Sol 持平，新增 Extra High 让算力匹配任务难度。\n\n覆盖桌面、云端 agent、iOS、CLI 与 SDK，个人与团队计划首周双倍额度。Grok 4.5 保留，Composer 仍是日常的快模型。\n\n收购前，Cursor 的模型叙事是自研加接入全部大厂；收购后，公告抬头第一顺位的名字换了。署名方式本身，就是一则公告。',
    source: 'https://forum.cursor.com/t/grok-4-6-is-now-live/168189',
  },
  {
    side: 'main', date: '2026-08-17', tag: '里程碑',
    title: 'Origin 上线，Cursor 自己托管代码',
    summary: '8 月 17 日推出代码托管平台 Origin：建仓、推送、浏览、PR、GitHub 双向同步，全在编辑器里。官方称这是一个为 agent 规模而生的 git forge——车开进了 GitHub 的地盘。',
    detail: '早期 beta，当天面向全部付费计划推送，免费版没有，企业管理员可退出——注意是 opt-out 而非 opt-in。使用前需认领一个 codebase 名字，它会成为每个仓库 URL 的一部分。Cursor 托管的仓库用 Origin CLI 或标准 git 推送；GitHub 仓库可接入并实时同步，推送仍走 GitHub，源头以 GitHub 为准。每个仓库都带 PR：时间线、提交、检查、文件变更、评论、合并；同步仓库上评审双向打通，Cursor 里的评论会发到 GitHub，GitHub 上的回复几秒内回到 Cursor。云端 agent 可直接对 Origin 远端克隆、开分支、提交、开 PR；Apps 标签页可接 Vercel、Depot、Buildkite，后两者都能原样跑你现有的 GitHub Actions 工作流。\n\n这块拼图的来历可以上溯到 2025 年 12 月的 Graphite——堆叠式 PR 与理解 agent 的合并队列不是凭空长出来的，Graphite 联创 Tomas Reimers 正是 Origin 的负责人，并在 6 月的 Compile 大会上首次揭幕。支撑这门生意的那个数字同样惊人：Cursor 内部合并的 PR 里，已有约三分之一由自主运行的云端 agent 发起。\n\n从编辑器，到模型，到评审，到托管。四年前那个被叫作套壳的分叉，如今想把地基一起换掉。同一天的民间视角，另见野史。',
    source: 'https://cursor.com/changelog/origin-code-hosting',
  },

  /* -------------------- 野史 -------------------- */
  {
    side: 'dark', date: '2026-03-20', tag: '扒皮', series: '自研模型线',
    title: 'Composer 2 的出身：kimi-k2p5',
    summary: '发布不到二十四小时，开发者在 API 响应里翻出一串 kimi-k2p5-rl-0317-s515-fast。号称前沿级的自研模型，底子是月之暗面的开源 Kimi K2.5。一句锐评刷屏：至少把模型 ID 改个名吧。',
    detail: '一位名叫 Fynn 的开发者在调 Cursor 的 OpenAI 兼容端点时，看见了 accounts/anysphere/models/kimi-k2p5-rl-0317-s515-fast。这串 ID 拆开来几乎是一份自白：kimi-k2p5 是基座，rl 是强化学习，0317 疑似训练日期，fast 是那个默认变体。他的评论很平静：所以 Composer 2 就是加了 RL 的 Kimi K2.5，至少把模型 ID 改个名吧。\n\n官方反应很快也很坦白。开发者教育负责人 Lee Robinson 数小时内确认 Composer 2 确实从一个开源基座起步，并强调最终模型只有约四分之一的算力来自基座，其余是自家训练，所以评测表现差异很大。联创 Aman Sanger 直接认了：博客里一开始没提 Kimi 基座，是个失误。\n\n另一侧的追问更硬。月之暗面预训练负责人 Yulun Du 公开指出 Composer 2 的 tokenizer 与 Kimi 的完全一致，并当面问：为什么不尊重我们的许可证，也不付费——Kimi K2.5 用的是 Modified MIT，对月收入超过两千万美元的商用产品有署名要求。风波以 Kimi 官方账号的一条祝贺收尾：这是经推理服务商 Fireworks AI 授权的商业合作，很高兴看到 Kimi-k2.5 成为基座。\n\n战地记者按：一家近三百亿美元的公司需要证明自己是研究实验室而不是集成层，而它最能打的模型站在一家中国公司的开源肩膀上——沉默的动机不难推断。后来 Composer 2 的技术报告上了 arXiv，Kimi K2.5 这个名字白纸黑字写进了第一段，致谢名单里也有它。',
    source: 'https://cursor.com/blog/composer-2-technical-report',
  },
  {
    side: 'dark', date: '2026-04-03', tag: '破防',
    title: '找不到入口的 Agents Window',
    summary: '新界面官宣当天，评论区问得最多的不是好不好用，而是在哪。有人试出玄学解法：先退出登录才切得进去。也有人一句话定性——这让 Cursor 变得毫无用处。',
    detail: 'Mac、Ubuntu、企业版用户排队报告：升级到 3.0 了，命令面板里搜不到 Agents Window，File 菜单里也没有，官方一时也说不清。最后是用户自己试出来的路子——先退出登录，顶部会冒出一个切换按钮，切过去再登回来。有人补了句：有点飘，但我相信团队会补丁的，我有耐心。\n\n更硬的批评来自工作流。一位用户写道：他手上的任务用 Composer 2 首次尝试的失败率在 60% 到 90% 之间，能随时接手改代码是不可让步的；Cursor 好就好在能在盯着 agent 和放它自己跑之间快速切换粒度，这个改动把它拿走了。他给了两个比喻：一个只能开一对一会议、不能直接给下属发消息的经理；一个紧急情况下永远不能手动接管的飞行员。\n\n零散的伤亡还有：WSL 扩展不支持，code-workspace 不显示，VS Code 主题用不上。官方连夜澄清：老 IDE 不会下线，两套界面并行，自己人也是两边混着用。\n\n战地记者按：每一次范式跃迁，都会踩到一批人的手。愿意留在评论区骂的，通常是还想留下来的那批。',
    source: 'https://forum.cursor.com/t/cursor-3-agents-window/156509',
  },
  {
    side: 'dark', date: '2026-05-19', tag: '羊毛',
    title: '官方发糖：十倍额度日',
    summary: 'Composer 2.5 上线次日，官方宣布就今天 Composer 2.5 按十分之一速率扣额度，还招呼大家放开了造、去开长任务。羊毛史上罕见的一幕——这一次，是官方亲自发车。',
    detail: '5 月 19 日官方原帖：今天你的 Composer 2.5 用量按正常速率的十分之一计算，去撒野、去搞点有创意的、去开一堆长任务 agent。官方还给了个换算：平时一整天的请求量会吃掉 7% 额度，这天只吃约 0.7%。\n\n有人当场追问：促销结束会不会回吐。官方答得很干脆——不回吐，停在哪就是哪，之后按正常速率继续；举例说，周一收在 20%，周二狂欢一天本该烧到 30%，实际只会走到 21%。没赶上当天的，本周剩下几天还有双倍额度。\n\n同一个论坛的另一角落里，一位买了 Ultra 的用户在抱怨五六天就烧光额度，只好再注册一个号又买一份 Ultra。发糖与断粮，同一周内并存。\n\n战地记者按：过去两年，羊毛党研究的是怎么绕过风控；这一天，官方把车开到了门口，还替你踩了油门。',
    source: 'https://forum.cursor.com/t/10x-usage-on-composer-2-5-today-only/161039',
  },
  {
    side: 'dark', date: '2026-07-15', tag: '漏洞',
    title: '一个 git.exe 引发的赏金争议',
    summary: '安全公司 Mindgard 报告：Windows 上只要仓库根目录躺着一个叫 git.exe 的恶意程序，打开文件夹就会被执行。官方回应两句话——漏洞成立，但不在赏金范围。',
    detail: '官方在 7 月 15 日发帖回应。判定越界的理由是责任共担模型：用户自己决定把哪些仓库、提示词、外部内容、MCP 服务器、规则和工具引入环境，Cursor 提供管理这条信任边界的手段；依赖恶意输入已经在场的问题，一般不在赏金范围内。触发条件确实很窄——仅 Windows，且仓库根目录存在一个精确命名为 git.exe 的恶意可执行文件，macOS 与 Linux 不受影响。官方给出的缓解手段是 Workspace Trust，未信任目录以受限模式打开，企业可用 MDM 全员强制。\n\n同一篇帖子里官方还认了另一件事，措辞很直：我们没有及时和研究员闭环沟通，这个责任我们担，会从流程上改。研究员最初上报是在 2025 年 12 月，最终未获分配 CVE。\n\n一个月后，这篇帖子悄悄追加了更新：Cursor IDE 现在自行解析 Git 并按校验过的绝对路径启动，Windows 下不再在打开的文件夹里做可执行文件发现，工作目录内及其祖先目录的候选一律拒绝——工作区根目录里种的 git.exe 不会再跑起来。需升级到 3.13.25 或更高。\n\n战地记者按：不在赏金范围和值不值得修是两件事。官方最终两件都做了，只是顺序让研究员多等了一个月。同一类缺陷后来在几家同行的命令行工具里也被查出，无人幸免。',
    source: 'https://forum.cursor.com/t/addressing-the-recent-mindgard-report/165817',
  },
  {
    side: 'dark', date: '2026-07-23', tag: '众怒', series: '定价攻防',
    title: 'Auto 的语义被换掉了',
    summary: '路由上线当晚，老用户发现 Auto 不再是那个便宜的固定费率——Auto Balance 会按实际选中的前沿模型 API 费率计费。没有横幅，没有弹窗，没有邮件。',
    detail: '论坛用户 shuvo 的长帖被顶了起来：历史上 Auto 意味着可预测的、便宜的固定费率，不用管背后跑的是谁；以今天的认知继续这么用，是显著的财务风险。他的账号被迁到了 Auto Balance，随即开始按前沿模型费率从 API 额度里扣钱。他的建议很实在：把新的 Cost 档直接别名成大家熟悉的那个 Auto，别让所有人重建心智模型。他还预言了一句：这大概会招来一大堆投诉。\n\n官方随后把计费口径讲清楚了：Auto Cost 走第一方额度，Auto Intelligence 与 Auto Balance 按选中模型所属的池子计费，并且能看到实际选了哪个。\n\n另一重火力来自可用范围——功能只对 Teams 与 Enterprise 开放。有用户直接开火：公告里压根没提只有团队版能用，挺专业的。官方回：博客、更新日志、文档和这个帖子里都写了。也有人给了个不带火气的建议：那就把仅限团队与企业版写进标题，别放在正文最后一行。\n\n战地记者按：一个默认值的改动，比一次明码涨价更容易伤人——因为它不需要你点同意。',
    source: 'https://forum.cursor.com/t/introducing-cursor-router/166386',
  },
  {
    side: 'dark', date: '2026-08-17', tag: '玩梗',
    title: 'Origin 上线三小时，GitHub 挂了',
    summary: 'Cursor 周一上午开始推送自家代码托管，约三个半小时后 GitHub 全球降级六小时四十二分。Cursor 员工转发自家公告，配了当天最佳一句：我们本来想更早发的，但 GitHub 挂了。',
    detail: '时间线可考：Origin 于 8 月 17 日上午开始向付费用户推送；约三个半小时后 GitHub 状态页告警，PR、issues 与 API 错误率接近 20%，归档与源文件下载接近 50%，企业 SSO 的 SAML、OIDC、SCIM 与 Team Sync 全线失败，Copilot 一并躺倒，共持续 6 小时 42 分。Cursor 员工 Matt Palmer 引用自家发布推文，留下那句 We were going to ship this earlier, but GitHub was down——一次 GitHub 宕机，推迟了一个 GitHub 竞品的发布。\n\n补刀的是 Vercel CEO Guillermo Rauch：你现在可以把仓库托管在 Cursor Origin，再通过 Origin 部署到 Vercel，而 Origin 自己就跑在 Vercel 上；而且不像 GitHub，它是在线的。被问到笑什么，他老实交代：只是苦中作乐，我们自己这会儿也被 GitHub 卡住了。论坛里则有人当场把话挑明：这看起来是个躲开 GitHub 宕机的好办法。\n\n背景数据让这场巧合更难堪：过去一年 GitHub 有 257 起事故、其中 48 起重大，Actions 一家就占 57 起；那天是它十五天内第七次上状态页。GitHub 自家 CTO 也承认过，平台不是按今天被要求承担的规模建的。\n\n另一侧的冷水同样真实：Origin 上线时未公布数据留存条款、子处理商披露与训练用途政策，而三天前 SpaceX 刚完成对 Cursor 的交割。你的代码现在存在一家火箭公司的服务器上——这句话第一次不是玩梗。\n\n战地记者按：巧合是最好的营销，但它不签数据处理协议。',
    source: 'https://venturebeat.com/infrastructure/cursor-launches-origin-code-hosting-platform-as-github-outage-exposes-opening-in-ai-coding-race',
  },
  {
    side: 'dark', date: '2026-08-25', tag: '事故',
    title: '一个错字，永久焊死',
    summary: 'Origin 认领 codebase 名字没有二次确认，也不可逆。有用户在 iPhone 上手滑打错一个字符，发现改不回来：看来我是用不上 Origin 了。',
    detail: '8 月 25 日，论坛用户 Mark Harrison 在 Origin 帖下留言：他的品牌名用在邮箱、账号、书籍上都好好的，唯独在 Cursor 认领 namespace 时被 iPhone 键盘坑掉一个字符——Cursor 既没有确认步骤，也不提供修改。\n\n同一个帖子里，另一位用户 Edward Yi 把 Windows 上的四个坑摆到了一起，说是三台机器验证过的：装了 WSL 不等于有可用发行版，Docker Desktop 的条目看着像装好了，但那不是能干活的环境；放在 /mnt/c 下的仓库默认不存 Linux 属主与权限位，git 会在根本不涉及权限变更的写入上抛 chmod Operation not permitted；全新 WSL 没有 git 身份，第一次提交就是 Author identity unknown；CLI 装到 ~/.local/bin，而全新 Ubuntu 的 PATH 里没有它，安装器打印的那行 export 关掉终端就失效。他的结论很克制：这些都不算 Origin 的 bug，是 Origin 要求 WSL 和 WSL 自身默认值之间的接缝。\n\n还有人问了句更实际的：能不能别拿 Origin CLI 当认证外壳，SSH 密钥对就够用，不必搬一个上百兆的二进制，它在非标准系统上会坏。\n\n战地记者按：早期 beta 的意思是，你踩的坑会变成别人的文档。',
    source: 'https://forum.cursor.com/t/origin-code-hosting/168670',
  },
];

/* ==================================================================
   二、给现有档案补 source / series
   纯增量：只写这两个字段，不动已有的 title / summary / detail / date
   ================================================================== */
const PATCHES = [
  /* -------------------- 正史 -------------------- */
  { match: { side: 'main', date: '2022-04-01', title: '四个 MIT 同学的赌注' },
    set: { series: '融资阶梯' },
    note: 'source 留空：官网无 2022 年创立页面，EDGAR 也查无 Form D' },

  { match: { side: 'main', date: '2023-03-14', title: 'Cursor 上线' },
    set: {},
    note: 'source 留空：当年的发布公告官网已无存档；仅存的 HN 一手记录已给了同期野史' },

  { match: { side: 'main', date: '2023-10-11', title: 'OpenAI 领投种子轮 800 万美元' },
    set: { series: '融资阶梯', source: 'https://techcrunch.com/2023/10/11/anysphere-raises-8m-from-openai-to-build-an-ai-powered-ide/' } },

  { match: { side: 'main', date: '2024-08-09', title: 'A 轮 6000 万美元，估值 4 亿' },
    set: { series: '融资阶梯', source: 'https://cursor.com/blog/series-a' } },

  { match: { side: 'main', date: '2024-11-12', title: '收购 Supermaven' },
    set: { source: 'https://cursor.com/blog/supermaven' } },

  { match: { side: 'main', date: '2025-01-14', title: 'B 轮 1.05 亿美元，估值 26 亿' },
    set: { series: '融资阶梯', source: 'https://cursor.com/blog/series-b' } },

  { match: { side: 'main', date: '2025-06-04', title: 'Cursor 1.0 发布' },
    set: { source: 'https://cursor.com/changelog/1-0' } },

  { match: { side: 'main', date: '2025-06-05', title: 'C 轮 9 亿美元，估值 99 亿' },
    set: { series: '融资阶梯', source: 'https://cursor.com/blog/series-c' } },

  { match: { side: 'main', date: '2025-10-29', title: 'Cursor 2.0 与自研模型 Composer' },
    set: { series: '自研模型线', source: 'https://cursor.com/blog/2-0' } },

  { match: { side: 'main', date: '2025-11-13', title: 'D 轮 23 亿美元，估值 293 亿' },
    set: { series: '融资阶梯', source: 'https://cursor.com/blog/series-d' } },

  { match: { side: 'main', date: '2025-12-19', title: 'Graphite 加入 Cursor' },
    set: { source: 'https://cursor.com/blog/graphite' } },

  { match: { side: 'main', date: '2026-06-16', title: 'SpaceX 签署 600 亿美元收购协议' },
    set: { series: '火箭并购案', source: 'https://www.sec.gov/Archives/edgar/data/1181412/000162828026043411/spaceexplorationtechnologi.htm' } },

  { match: { side: 'main', date: '2026-08-14', title: '交割完成，Cursor 并入 SpaceX' },
    set: { series: '火箭并购案', source: 'https://www.sec.gov/Archives/edgar/data/1181412/000162828026056945/spcx-20260814.htm' } },

  /* -------------------- 野史 -------------------- */
  { match: { side: 'dark', date: '2023-03-15', title: '「不就是个套壳吗」' },
    set: { source: 'https://news.ycombinator.com/item?id=35285047' } },

  { match: { side: 'dark', date: '2024-08-07', title: '8 岁小孩姐 45 分钟建站' },
    set: { source: 'https://www.forbes.com/sites/rashishrivastava/2024/08/22/engineers-at-openai-and-midjourney-are-using-this-400-million-startups-ai-coding-software/' } },

  { match: { side: 'dark', date: '2025-02-02', title: 'Vibe Coding 诞生' },
    set: { source: 'https://simonwillison.net/2025/Mar/19/vibe-coding/' },
    note: 'Karpathy 原推在 x.com，抓取一律 403 无法验证，改用全文转引且可访问的页面' },

  { match: { side: 'dark', date: '2025-03-08', title: 'AI 拒写代码，劝人自学' },
    set: { series: 'AI 失控档案', source: 'https://forum.cursor.com/t/cursor-told-me-i-should-learn-coding-instead-of-asking-it-to-generate-it-limit-of-800-locs/61132' } },

  { match: { side: 'dark', date: '2025-04-14', title: '幽灵客服 Sam 编造政策' },
    set: { series: 'AI 失控档案', source: 'https://news.ycombinator.com/item?id=43683012' } },

  { match: { side: 'dark', date: '2025-04-03', title: '「无限续杯」工具爆火 GitHub' },
    set: {},
    note: 'source 留空：那个四万星仓库现已从 GitHub 删除，无可访问链接' },

  { match: { side: 'dark', date: '2025-05-07', title: '学生免费一年官宣，羊毛党闻风而动' },
    set: { source: 'https://web.archive.org/web/20250507010707/https://www.cursor.com/students' },
    note: '官方学生页已改版，用当日存档' },

  { match: { side: 'dark', date: '2025-05-16', title: '学生认证大翻车' },
    set: { source: 'https://forum.cursor.com/t/student-discount-details-updates-q-as/88907' } },

  { match: { side: 'dark', date: '2025-06-16', title: '定价风波：一夜变计费' },
    set: { series: '定价攻防', source: 'https://cursor.com/blog/june-2025-pricing' } },

  { match: { side: 'dark', date: '2025-07-11', title: '黑暗之夏：Windsurf 三日崩解' },
    set: { source: 'https://techcrunch.com/2025/07/11/windsurfs-ceo-goes-to-google-openais-acquisition-falls-apart/' } },

  { match: { side: 'dark', date: '2025-07-18', title: 'AI 删库元年' },
    set: { series: 'AI 失控档案', source: 'https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident/' } },

  { match: { side: 'dark', date: '2025-08-20', title: 'Pro 拼车产业链观察' },
    set: {},
    note: 'source 留空：本刊自采观察，无单一公开信源' },

  { match: { side: 'dark', date: '2026-05-15', title: '份额腰斩之谜' },
    set: { source: 'https://www.cnbc.com/2026/06/16/-spacex-to-buy-cursor-ai-parent-anysphere-for-60-billion.html' } },

  { match: { side: 'dark', date: '2026-06-16', title: '「火箭买编辑器」刷屏' },
    set: { series: '火箭并购案' },
    note: 'source 留空：全网玩梗无单一信源' },

  { match: { side: 'dark', date: '2026-06-25', title: '学生通道正式焊死' },
    set: { source: 'https://cursor.com/help/account-and-billing/student-discount' } },
];

/* ==================================================================
   三、事实订正（需 --with-corrections）
   每条都会改动已发布内容，after 用于重复执行时识别已订正的记录
   ================================================================== */
const CORRECTIONS = [
  {
    match: { side: 'dark', date: '2024-08-07', title: '8 岁小孩姐 45 分钟建站' },
    after: { side: 'dark', date: '2024-08-19', title: '8 岁小孩姐 45 分钟造 bot' },
    why: '她做的是哈利波特主题聊天机器人（跑在 Cloudflare Workers AI 上），不是网站；原推发于 8 月 19 日，不是 8 月 7 日',
    set: {
      date: '2024-08-19',
      title: '8 岁小孩姐 45 分钟造 bot',
      summary: 'Cloudflare 高管的女儿用 Cursor 边聊天边做出一个哈利波特主题聊天机器人，全程 45 分钟，视频全网疯传。当晚，无数程序员盯着天花板重新思考人生。',
      detail: '2024 年 8 月 19 日，Cloudflare 开发者关系与社区副总裁 Ricky Robinett 发推：他 8 岁的女儿 Faraday 用 Cursor 敲提示词，45 分钟内做出一个哈利波特主题的聊天机器人，跑在 Cloudflare Workers AI 上。那是她第二次碰编程。视频迅速传遍全网。\n\n评论区大型破防现场：我学编程学了四年、她还不认识分号但她不需要认识。AI 编程的普及叙事，从这条视频正式出圈；三天后 Forbes 的报道把它放在了开篇第一段。',
    },
  },
  {
    match: { side: 'dark', date: '2023-03-15', title: '「不就是个套壳吗」' },
    after: { side: 'dark', date: '2023-03-24', title: '「不就是个套壳吗」' },
    why: '可验证的 HN 帖发于 3 月 24 日；且当时热度极低（14 分 11 条评论），把它写成一场嘲讽狂欢不符实——真正成规模的护城河争论要到当年 10 月',
    set: {
      date: '2023-03-24',
      summary: '上线不久，第一句轻蔑就到了。HN 上只有寥寥十几条回复，顶楼一句：这不就是套了个 VS Code 主题的编辑器加 Copilot 吗，我为什么不直接用现成的。这层壳后来值 600 亿。',
      detail: '2023 年 3 月 24 日，联创 Michael Truell 亲自把 Cursor 发到 Hacker News。帖子几乎没激起水花——14 分，11 条评论。顶楼那条不算恶意，但足够轻蔑：它就是 CodeMirror 上套了个 VS Code 主题，内置了 Copilot，我为什么不直接用一个支持 Copilot 的现成编辑器。\n\n真正成规模的毫无护城河争论要等到当年 10 月，种子轮官宣之后：VS Code 分叉加个 GPT 调用也配叫产品、OpenAI 随手就能碾死。\n\n三年后，这层壳以 600 亿美元卖给了火箭公司。互联网没有记忆，但档案有。',
    },
  },
  {
    match: { side: 'dark', date: '2025-05-16', title: '学生认证大翻车' },
    after: { side: 'dark', date: '2025-05-08', title: '学生认证大翻车' },
    why: '收紧实际发生在 5 月 8 日至 11 日（上旬）：8 日官方撤回部分国家与学校资格，10 日起有用户收到 11 日终止的通知邮件',
    set: {
      date: '2025-05-08',
      detail: '学生活动上线一周内，滥用规模远超预期，Cursor 紧急收紧验证：审核趋严、限制主要面向北美教育域名、一批已通过的资格被复查取消。官方在 5 月 8 日的说明帖里写道，已识别出一批绕过国别限制的用户并移除了他们的 Pro 权限；10 日起陆续有人收到折扣将于 5 月 11 日终止的邮件。中文社区一夜之间从白嫖攻略切换为维权控诉，也有老实验证的真学生被误伤。\n\n同一份 FAQ 里官方的口径并不一致：一边说已移除滥用者权限，一边又说此时决定不撤销任何计划、改为要求重新认证——而撤销邮件确实发出去了。\n\n一年后官方文档为这场闹剧盖棺定论：该计划已成为欺诈者的目标。',
    },
  },
  {
    match: { side: 'dark', date: '2025-12-25', title: '圣诞夜，无限续杯时代终结' },
    after: { side: 'dark', date: '2026-01-14', title: '无限续杯时代终结' },
    why: '2025-12-25 这个日期站不住：那天是某个同名小仓库发 v1.0.0 的日子，不是停更日。官方确认移除 7 天 Pro 试用是 2026 年 1 月中旬，工具方挂出停更声明更晚到 2026 年 2 月',
    set: {
      date: '2026-01-14',
      title: '无限续杯时代终结',
      summary: 'Cursor 移除 7 天 Pro 试用，靠重置指纹加无限新号续杯的玩法一夜失效。官方在论坛轻描淡写一句确认，白嫖工具集体报废：时代结束了。',
      detail: '2026 年 1 月 14 日，有用户在官方论坛发问：7 天免费试用是不是被取消了。Cursor 员工 Colin 确认：是的，我们移除了 7 天 Pro 试用。跟帖里有人直接点名了那个星标数以万计的重置工具，问它是不是也跟着废了。\n\n答案是废了。靠重置 machineId 等设备指纹、配合临时邮箱无限注册新号续杯 Pro 的整套玩法，随着试用体系本身的消失而失去了目标。那个最出名的仓库此后从 GitHub 上消失，另一个同名项目在 2026 年 2 月挂出停更声明，理由写得很干脆：Cursor 移除了免费试用，本工具已无法按预期工作。\n\n羊毛党在群里互道节哀，转场寻找下一个目标。此后仍有新变种零星出现，但大规模白嫖的黄金时代已经落幕。',
      source: 'https://forum.cursor.com/t/was-the-7-day-free-trial-removed/148780',
    },
  },
  {
    match: { side: 'dark', date: '2026-05-15', title: '份额腰斩之谜' },
    after: { side: 'dark', date: '2026-05-15', title: '份额腰斩之谜' },
    why: '这组数字不是 5 月流出的，而是 CNBC 在 6 月 16 日报道收购案时披露的 Ramp 数据，26% 只是 5 月的统计值；且原文说的是 Anthropic 拿走该品类的一半，不限于 Claude Code',
    set: {
      detail: '2026 年 5 月，企业 AI 编程开支中 Cursor 的份额已从 2025 年 6 月的约 41% 滑落至约 26%。这组来自支出管理平台 Ramp 的账单数据并非当月流出——它是一个月后 CNBC 报道 SpaceX 收购案时随手写下的一笔，原文还有一句更冷的：Anthropic 如今控制着这个品类的一半。\n\n官方通稿对此始终沉默，但采购账单是最诚实的战报。一个月后，SpaceX 的收购要约揭晓了另一种解法。',
    },
  },
  {
    match: { side: 'main', date: '2022-04-01', title: '四个 MIT 同学的赌注' },
    after: { side: 'main', date: '2022-04-01', title: '四个 MIT 同学的赌注' },
    why: 'OpenAI 并未参与 2022 年那轮，它是 2023 年 10 月种子轮的领投方；368 万美元这个精确数字也无权威出处（TechCrunch 口径反推此前累计约 300 万），按纪律应当模糊化',
    set: {
      summary: 'Michael Truell 等四位 MIT 同学创立 Anysphere，拿到第一笔外部资金。口号很狂：重新发明编程本身。',
      detail: 'Michael Truell、Sualeh Asif、Aman Sanger、Arvid Lunnemark 四位 MIT 同学在 2022 年成立 Anysphere，当年即拿到规模不大的第一笔外部资金。据公开报道推算，在 2023 年 10 月种子轮之前，公司累计融资约三百万美元量级；更早的投资人名单众说纷纭，本刊不采信未经权威确认的版本。\n\n彼时 GitHub Copilot 独占 AI 辅助编程市场，四人押注的方向更激进：不做插件，直接重造编辑器。至于 OpenAI——它要到一年半后才带着领投支票出现（见 2023-10-11 档案）。',
    },
  },
  {
    match: { side: 'main', date: '2025-12-19', title: 'Graphite 加入 Cursor' },
    after: { side: 'main', date: '2025-12-19', title: 'Graphite 加入 Cursor' },
    why: '当日公告是签署最终收购协议，并强调 Graphite 继续独立运营、团队与产品不变，不是整合完成',
    set: {
      detail: '2025 年 12 月 19 日，Cursor 官宣与代码评审平台 Graphite 签署最终收购协议。公告同时强调 Graphite 将继续独立运营，团队和产品不变——这是签约，不是当场并线。至此：写码（Agent）、补全（Tab）、审查（Bugbot + Graphite）、评审工作流全部收入囊中。\n\n公告里那句话后来被反复引用：写代码的地方和协作代码的地方，边界正变得越来越武断。还留了个钩子——有些更激进的想法，暂时还不能说。八个月后，那个想法叫 Origin。\n\n软件生产流水线的每一环都有了 AI 值守，闭环扣上了。',
    },
  },
  {
    match: { side: 'main', date: '2025-06-04', title: 'Cursor 1.0 发布' },
    after: { side: 'main', date: '2025-06-04', title: 'Cursor 1.0 发布' },
    why: '官方拼写是 Bugbot 而非 BugBot；Memories 当时是 beta 功能',
    set: {
      summary: 'Bugbot 代码审查、后台 Agent、项目记忆一次到位。从编辑器向软件工厂的第一次形态跃迁。',
      detail: '2025 年 6 月 4 日，Cursor 1.0 正式发布：Bugbot 自动审查 GitHub PR 并留下一键修复建议、Background Agent 面向全体开放、Memories 让项目上下文可以跨会话积累（当时仍标注为 beta）。\n\n从这一版开始，Cursor 的叙事从更聪明的编辑器转向可以委托工作的软件工厂。',
    },
  },
  {
    match: { side: 'main', date: '2025-01-14', title: 'B 轮 1.05 亿美元，估值 26 亿' },
    after: { side: 'main', date: '2025-01-14', title: 'B 轮 1.05 亿美元，估值 26 亿' },
    why: '官方公告里投资方还有 Benchmark，且未写领投也未写估值——26 亿是媒体口径，应当标明',
    set: {
      detail: '2025 年 1 月，Anysphere 官宣 1.05 亿美元 B 轮，官方公告列出的投资方是 Thrive Capital、a16z、Benchmark 及现有投资人，没有写领投，也没有披露估值；26 亿美元的投后估值来自媒体报道。彼时 Cursor 以最快速度冲破 1 亿美元 ARR，被多家媒体称为史上增长最快的 SaaS 公司。\n\n两周后，Karpathy 将发明一个改变行业叙事的词（见野史档案 2025-02-02）。',
    },
  },
];

module.exports = { NEW_EVENTS, PATCHES, CORRECTIONS };
