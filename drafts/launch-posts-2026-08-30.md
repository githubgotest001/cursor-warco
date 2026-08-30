# 分发首发文案包 · 2026-08-30

> 配套 GROWTH.md 第 3 节：各社区**一周内错峰发**，别同一天轰炸。发帖前确认 Phase 0 已完成
> （线上全删全增 + 新功能部署 + sitemap 提交），否则帖子引来的第一波流量会看到旧站。
> 所有帖子建议配 2–3 张截图：野史卡特写、作战室面板、双线时间轴全景——视觉即卖点。
> 【】内为发帖时需站长确认 / 替换的占位。

---

## 1 · Linux.do（首发主阵地 · 建议第 1 天）

**版块**：资源荟萃 或 软件分享　**标题**：

> 我把 Cursor 的正史和野史做成了一个「战地纪实」网站：双线时间轴 + 套利窗口存活状态板

**正文**：

大家好，我是 Cursor 重度用户。过去几个月圈子里的事太密了——收购、断供、各路「窗口」的开开关关——我把它们全部立档做成了一个网站：**umbrella4365.com**。

设定是保护伞公司的「蜂巢档案库」：一条垂直时间脊柱，左边是**正史**（融资、发布、并购，全部查证过信源），右边是**野史**（漏洞、套利、事故、传闻，采自场外与封闭频道，含演绎但核心事件都真实存在）。同一件事官方口径和场外玩法常在同一天各立一条，对照着读最有味。

几个大家可能用得上的页面：

- **红后作战室** /warroom：场外套利窗口哪些还存活、哪些刚被灭活（比如「假焚诀」存活 11 天的完整生命周期）、Cursor 在售模型价格额度一览、官方服务状态镜像
- **套利窗口全史** /d/windows：每个窗口的检出日 / 灭活日 / 存活天数
- **战报周刊** /w：每周五分钟跟上战况
- 版本史 /d/versions、融资估值史 /d/funding

立场写在发刊词里：不站队、不批判、仅作记录——只记录已公开的观测，不写教程不构成操作建议。有观测到新窗口 / 新故障的，首页有「提供线报」入口，匿名可投，查证通过就立档。

（置顶回复贴：作战室 /warroom 与本周战报链接）

---

## 2 · V2EX（分享创造 · 建议第 3 天）

**标题**：

> 零依赖 Node 写了个 Cursor 编年史站：单文件 server + SQLite + SSR + llms.txt，顺便做了个「套利窗口存活状态板」

**正文**（技术叙事为主）：

给 Cursor 和 AI 编程圈做了个「战地纪实」档案站 umbrella4365.com，分享下技术选型：

- **零 npm 依赖**：node:http + node:sqlite，整个后端一个 server.js。部署 = git clone + node server.js
- **SSR 直出 + 客户端 hydration 同构**：不执行 JS 的爬虫也能读到全文；档案独立页带 Article JSON-LD
- **GEO（生成式引擎优化）**：/llms.txt 目录 + /llms-full.txt 全文，AI 爬虫（GPTBot / ClaudeBot）可以整站消化
- **后台是个隐藏路径的「红后终端」**：档案管理 + 访客监控（IP 只存加盐哈希）+ 草稿收件箱（AI 侦察 agent 投稿、人工审核发布）
- 内容侧全靠 agent 编辑部：信源哨兵定时轮询官方 blog / changelog / 状态页 / HN / Reddit，diff 出新信号 → 侦察 agent 交叉查证写草稿 → 我在后台一键审核发布

内容上是「正史 / 野史」双线时间轴——官方大事记与场外套利 / 事故对照记录。比较特别的是把漏洞 / 羊毛类事件按「检出 / 灭活」记生命周期，作战室页面能直接看到每个窗口活了多少天。

欢迎拍砖，尤其是零依赖这条路线的取舍。

---

## 3 · 即刻（AI 编程圈子 · 建议第 2 天，配图为主）

> 做了个赛博考古现场：把 Cursor 从 2022 车库到 600 亿卖身 SpaceX 的全部大事，做成了「正史 / 野史」双线时间轴。
> 左边是台面上的融资发布，右边是同一时刻场外在怎么玩坏它——比如那个存活了 11 天的「假焚诀」窗口，检出到灭活全程有档案。
> 站名 UMBRELLA 4365，保护伞公司蜂巢档案库设定，红后 AI 管档案。
> 最近新开了「作战室」：哪些路子还活着、哪些刚被封，一眼看完。
> umbrella4365.com 【配图：野史卡特写 ×1 + 作战室 ×1 + 时间轴全景 ×1】

---

## 4 · 掘金 / 少数派长文（建议第 5–7 天 · 给线索页做外链）

**选题**（二选一，正文从对应线索页与特稿改写，文末注明整理自本站并链回）：

- 《SpaceX 收购 Cursor 全过程复盘：从 600 亿选择权到 OpenAI 断供通牒》→ 链 /t/spacex-merger 与 /s/spacex
- 《Cursor 融资简史：从 OpenAI 领投 800 万，到 NVIDIA 入局 293 亿，再到 600 亿卖身》→ 链 /d/funding 与 /s/funding

---

## 5 · 知乎（长期动作 · 有合适问题再答）

candidates：「如何评价 SpaceX 收购 Cursor」「如何看待 OpenAI 停止向 Cursor 供应模型」「Cursor 还值得订阅吗」。
答题纪律：答案主体给信息增量（时间线 / 数据表摘录），链接作为出处放文末；只答浏览量大且真正对题的。

---

## 6 · X / 推特（账号注册后 · 首发线程）

> 1/ 把 Cursor 的完整历史做成了一个「战地纪实」网站：一条正史（融资 / 发布 / 并购），一条野史（漏洞 / 套利 / 事故），同一条时间脊柱对照阅读。
> umbrella4365.com
>
> 2/ 野史线最有意思的部分：给每个套利窗口记生命周期。「假焚诀」08.15 被检出、08.26 被灭活，存活 11 天——全程档案可查。现在还活着的窗口，作战室实时可见。
>
> 3/ 整站零依赖 Node + SQLite，SSR + llms.txt 对 AI 爬虫全开放。内容由 agent 编辑部驱动：哨兵轮询信源 → 侦察 agent 查证写稿 → 人工审核发布。AI 一日，人间一年；记录是唯一的对抗方式。

---

## 7 · Show HN（英文 · 建议在中文渠道跑顺后第 2 周发）

**Title**:

> Show HN: A Resident Evil–styled dual-timeline chronicle of Cursor's history (zero-dependency Node)

**Text**:

I'm a heavy Cursor user. The past year of AI-coding news has been so dense (the SpaceX acquisition, the OpenAI supply cutoff, endless quota-exploit windows) that I started filing everything into a timeline site: https://umbrella4365.com

The concept: an Umbrella-Corp "hive archive" run by a Red Queen AI. One vertical spine, two tracks. The Main Chronicle (left) records funding rounds, releases, acquisitions—every number verified against primary sources. The Shadow Chronicle (right) records the same days from the outside: exploits, arbitrage plays, incidents, rumors—real events, stylized narration. Reading both sides of the same day is the point.

My favorite mechanic: exploit/arbitrage windows are filed like virus samples—"detected" when first observed in the wild, "neutralized" when officially patched—so every window gets a lifespan (one lived exactly 11 days). A live "war room" page derives which windows are still alive from the archive database.

Tech notes: zero npm dependencies (node:http + node:sqlite, one server.js), SSR with client hydration, /llms.txt + /llms-full.txt for AI crawlers, hidden-path admin. Content pipeline is agent-driven: cron sentinels poll primary sources, a scout agent cross-verifies and drafts, and I review/publish—the human stays the editorial gate.

It's in Chinese (the community it documents is largely Chinese-speaking), but /llms-full.txt machine-translates well. Happy to answer anything about the zero-dep approach or the agent newsroom.

---

## 发布追踪表（发完补一行）

| 日期 | 渠道 | 链接 | 首日数据 | 备注 |
| --- | --- | --- | --- | --- |
| | | | | |
