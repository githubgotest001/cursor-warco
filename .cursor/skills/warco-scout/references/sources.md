# 信源手册（经 2026-08-28 实战验证）

分级原则：**L0 定事实，L1 补语境，L2 供野史，L3 管漏洞，L4 只当目录**。
每次侦察按「L4/L1 找线索 → L0 定案 → L2 找暗面」的顺序走性价比最高。

## L0 · 官方一手（事实的地基）

| 信源 | URL | 覆盖 | 用法与备注 |
| --- | --- | --- | --- |
| Cursor Blog | cursor.com/blog | 融资、并购、大版本、模型发布、公司公告 | 正史第一信源。文章 URL 规则如 `/blog/series-c`、`/blog/grok-4-5`、`/blog/joining-spacex` |
| Cursor Changelog | cursor.com/changelog | 版本功能（2.4、Composer 2.5、JetBrains…） | 发布日以此为准。URL 有两种：语义名（`/changelog/composer-2-5`）或日期（`/changelog/03-04-26`） |
| Cursor Forum · 公告区 | forum.cursor.com（Announcements / Release Discussions 分类） | 官方公告 + 员工答疑 + 用户第一反应 | 一帖两用：楼主帖是正史素材，回帖是野史素材。员工账号：Colin、kevinn、Lee Robinson 等 |
| Cursor Status | status.cursor.com | 故障、降级、依赖链事故 | 故障类档案唯一权威。事件按日归档，含时间线与影响面 |
| Cursor Docs / Help | cursor.com/docs、cursor.com/help | 功能细节、政策变更（如学生计划盖棺定论） | 政策类野史常在这里找到官方「事后口径」 |
| SpaceXAI 新闻 | x.ai/news | Grok 系模型、Grok Bot（2026-06 收购后 Cursor 相关度极高） | 注意：x.ai 页面标注日期可能是「API 全量开放日」，与 Cursor 侧上线日不一致（Grok 4.5 实测差 8 天），两口径都要记 |
| Anthropic 新闻 | anthropic.com/news | Claude / Fable 系模型、安全事件 | AI 圈事件波及 Cursor 用户时用（如 Fable 5 出口管制） |
| SEC EDGAR | sec.gov | 并购、上市、股权（SpaceX 收购案全程有据） | 惊变类正史的终极证据。全文检索 `efts.sec.gov/LATEST/search-index?q=` |
| 联创个人博客 | arvid.xyz 等 | 人事变动一手声明 | Arvid 离职即出自 arvid.xyz/posts/leaving |
| JetBrains Blog | blog.jetbrains.com | 生态合作对方口径 | 合作类事件找「对方官宣」交叉 |

## L1 · 权威媒体（语境、数字、评论）

- **TechCrunch**（techcrunch.com）——融资 / 并购 / 产品线报道最勤，历史档案多条 source 出自它。
- **CNBC**（cnbc.com）——独家爆料多（OpenAI 求购、份额数据、SpaceX 收购）。
- **Bloomberg**——ARR / 估值数字的惯常首发（常需经二级引用回溯）。
- **Reuters**——并购与上市的准官方口径，引语可靠。
- **The Verge / Forbes / VentureBeat / The Information**——深度与评论；Forbes 管富豪榜叙事，VentureBeat 曾出 Origin 上线报道。
- **The New Stack / InfoWorld / SiliconANGLE**——开发者视角的产品与安全报道，适合补技术细节。

## L2 · 社区一手（野史的富矿）

- **Hacker News**（news.ycombinator.com）——冷眼、锐评、创始人现身；用 `hn.algolia.com` 按日期检索。
- **r/cursor**（reddit.com/r/cursor）——用户情绪、翻车现场、套利动向。
- **X**——爆料、泄露（Vega 泄露即出自 X 用户 Lumina）、高管发言；注意保存原帖时间戳。
- **Cursor Forum 用户区**——Bug Reports / Discussions 分类是「众怒」「破防」类档案的原产地。
- 中文渠道（群聊 / 即刻 / V2EX / linux.do）——套利与拼车类事件的第一现场，通常无链接可引，写「本刊观察」；入档叙述时统一称「封闭频道」。

## L3 · 安全研究（漏洞档案专线）

- **Check Point Research**（research.checkpoint.com）——MCPoison 出处。
- **Aim Security / Aim Labs**——CurXecute 出处。
- **Tenable Blog**——漏洞 FAQ 汇总，适合做单条 source。
- **Mindgard**——git.exe 事件出处。
- 通用：CVE 编号直接搜 `CVE-XXXX-XXXXX + cursor`，NVD 与厂商博客交叉。

## 扩战区信源（2026-08-30 起 · AI 编程全圈）

> 扩圈纪律：Cursor 永远是坐标。邻圈事件只收「改变格局 / 钱 / 大批用户体验」量级的（入档价值判定同第 5 节），
> 立档时补 `front` 战区代号；模型厂事件若主要以「波及 Cursor 用户」呈现，仍以 Cursor 视角写、front 留空。

| 战区（front 代号） | L0 一手 | 社区（野史侧） |
| --- | --- | --- |
| Claude Code（claude-code） | anthropic.com/news、docs.anthropic.com 发布记录 | r/ClaudeAI、HN |
| Codex（codex） | openai.com/news、help.openai.com 更新页 | r/OpenAI、HN |
| Copilot（copilot） | github.blog/changelog（Copilot 标签）、github.blog | r/github、HN |
| Windsurf（windsurf） | windsurf.com/changelog、官方 X | r/windsurf、HN |
| 国产工具（cn-tools） | Trae / 通义灵码 / CodeBuddy 官网公告与公众号 | 即刻、V2EX、linux.do |
| 模型厂商（model-labs） | anthropic.com/news、openai.com/news、x.ai/news、blog.google | HN、X |

**哨兵自动化**：`tools/sentinel.js` 已把上表主力信源（含 HN / r/cursor / GitHub Changelog RSS / 状态页事故流）
接入定时轮询，新信号自动落 `data/sentinel-queue.md` 并可推 TG 提醒。增量侦察先消化队列，再按检索配方补扫——
哨兵漏得掉的（微信生态、封闭频道），才需要人肉与检索兜底。

## L4 · 聚合站 / AI 百科（只当目录，严禁直接引用为事实）

kingy.ai、aiuncovers.com、ai.miraheze.org、tech-insider.org、thedigipalms.com 等。

- 用途：**快速拿到候选事件清单与大致日期**，再逐条回 L0/L1 定案。
- 实测教训（2026-08-28）：aiuncovers 时间线曾把「Cursor 2.0 GA」「Composer 2.5 首发」都标成 2026 年 1 月，与官方 changelog（2025-10-29 / 2026-05-18）相差数月；多个聚合站互相转抄，**同错多现不构成两源**。

## 检索配方

### 模式 A（查缺）——按空窗期扫

```
Cursor Anysphere major news timeline <月份> <年份>
Cursor changelog <年份>-<月>
site:forum.cursor.com announcements <月份> <年份>
```

再按主题补扫（每个主题一发）：

```
融资/估值:  Anysphere funding valuation round <年份>
发布:      Cursor launch announcement <功能猜想> <年份>
故障:      site:status.cursor.com 或 Cursor outage incident <月份> <年份>
漏洞:      Cursor vulnerability CVE <年份>
套利/社区: Cursor reddit trick free usage <月份> <年份>
人事:      Cursor co-founder leaves / joins <年份>
```

### 模式 B（增量）——按周扫

```
Cursor news week of <YYYY-MM-DD>
Cursor OR Anysphere OR SpaceXAI announcement <具体一周日期范围>
site:forum.cursor.com after:<YYYY-MM-DD>
```

补一发 AI 编程圈大盘（决定要不要记邻圈野史）：

```
AI coding tools news <该时段>（Anthropic / OpenAI / GitHub Copilot / Windsurf / Replit）
```

### 被引用未立档（模式 A 最高优先）

直接把现有档案 detail 里的钩子词拿去搜，例：`Cursor Compile conference`、`Cursor iPad launch`、`SpaceX Cursor partnership April`。

## 验证记录 · 2026-08-28 首轮实战

- 本手册全部 L0 信源当日实测可达且产出有效证据；x.ai 与 Cursor 双口径日期问题在 Grok 4.5 上首次实锤（7-08 vs 7-16）。
- 当日以「被引用未立档 + 空窗期」法共挖出 18 条候选（正史 13 / 野史 5，其中 2 条正史标记可选），全部完成交叉查证，成稿于 `drafts/archive-drafts-2026-08-28.md`。
- 发现旧档案疑点 2 处（Grok 4.6「交割后第十四天」口径、Grok Bot 全线档案 date 与 detail 差一天），已随稿提醒。
