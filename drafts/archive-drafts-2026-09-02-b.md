# UMBRELLA 4365 · 档案草稿 2026-09-02（第二批：增量 + 查缺）

- 生成：2026-09-02（用户指令：探索新正史 / 野史，历史重要事件也收；另查「Grok Bot 昨晚重置额度」）
- 对照库：线上镜像 112 条（正史 67 / 野史 45），`node sync.js pull` 于当日刷新
- 哨兵队列：09-01 09:25 起 6 条未消化信号已全部消化（Copilot 三条与状态页 minor 降级均判为不立档，见文末）
- 本轮产出：**正史 5 + 野史 3**——增量 3 条（08-28 / 08-29 / 09-01）+ 查缺 3 条（2024-11-24 / 2025-07-18 / 2025-08-07）+ 站长线报 2 条（07 全员二次回血 09-02、08 Sand 换道版检出 09-01）
- 去重：库内 Grok Bot 线已有 #74 首发、#86 下放、#87 回血、#82/#104 伪装观测；本批只收「计费口径反转」与「一周三扩（X / Stripe / Outlook）」两桩新事。Astra 仅在 #88 断供通牒里被点名，无独立档案。0.43 Agent、Koala、CLI 三件在库内多条 detail 里被顺带提及（#38「桌面、网页、CLI、iOS 之外」、#8「后来的 Graphite 与 Origin」），均无独立档案
- **「Grok Bot 昨晚重置额度」核查**：x.ai/news、@bot 官方账号（最近一帖 08-31 微软插件）、Cursor 论坛（索引到 09-01）、Reddit、媒体转述均无公开记录；站长确认为北京时间 09-02 凌晨的全员重置（线报级，场外复测），按野史立档为 07，核查要点里标明「无公开信源」
- **Sand 换道版（SandClaimer 1.1.5）**：站长提供源码，已通读 `sand_patch.py` / `sand_rpc.js` / `sand_api.py` / `local_cursor.py`。机制是「改道」而非「改名」，与已灭活的伪装观测不是同一玩法，另立 08 为新线索 `借道` 的 `·检出` 条（2026-09-02 起检出即挂线索，不再用「（存活）」标记）；档案正文只写观测层，不写字段名 / 端点 / 步骤

---

## 01 · 野史 | 2026-08-28 | 冷眼

```
side:    dark
date:    2026-08-28
tag:     冷眼
title:   口径反转：Bot 池独立，溢出共账
summary: 现象：员工先答「Grok Bot 用 Pro 周额度」，同日更正为独立周池。取证：周池用尽即溢出到共享 On-Demand，无预警；$0 上限挡得住付费溢出，挡不住推荐额度先被吃空。系统备注：两本账是独立的，直到其中一本见底。
series:
source:  https://forum.cursor.com/t/grok-bot-spend-cursor-usage-i-cant-accept-it/169796
detail:
记录时间 2026-08-28。官方论坛，用户 m4.5 的帖子标题直白：Grok Bot spend cursor usage, I can't accept it。员工 deanrie 先答复：属预期行为，Grok Bot 记在 Cursor 账户上，用的是 Pro 计划的周额度，不是独立限额。同日再回帖更正：上一条措辞错了——Pro 上 Grok Bot 有自己独立的周池，与 Cursor 计划用量分开。两条答复相隔不到六小时，均已存档。

口径解析：独立只到周池见底为止。更正帖的下半段写明，周池用尽后若开着 On-Demand，Bot 继续从共享 On-Demand 池扣费——就是 Cursor 其余用量共用的那一只。另一线程里员工给出的扣费顺序为：Bot 周池 → 推荐 / 促销额度 → 付费 On-Demand，应用内无任何预警；把 On-Demand 上限设为 0 美元挡得住付费溢出，挡不住 Cursor 账户里的赠送额度先被吃空。用量页上，Bot 的对话与例程以 sand-default、sand-automation 两个名字归在 Other Models 之下，员工称这只是「展示层归组」不影响扣费；例程每次运行重发全部上下文、缓存读取也计数，所以数字远大于实际新工作。周池到底多大，任何档位都不公布；场外只有一句共识——比想象中小。

系统备注：官方说独立，说的是入口；场外看合并，看的是出口。两本账在同一只口袋里见面的那一刻，「不占用你现有额度」这句话的有效期就到了。
```

核查要点：
- 两条答复顺序与「相隔不到六小时」取自论坛时间戳（8:36am → 2:03pm，显示时区为爬虫所见，未写具体钟点）；员工 ID deanrie，原帖用户 m4.5
- 扣费顺序（周池 → 推荐 / 促销额度 → On-Demand）与「$0 上限不挡额度耗尽」出自另两条帖：169679（Grok Bot gives no warning before weekly usage spills into paid On-Demand）、169982（Grok Bot draining Cursor credit pool），均为员工答复
- sand-default / sand-automation 的归组说明出自 169581（Why does Grok Bot chat use so many sand-* tokens）——顺带**佐证**了 #82/#104「伪装观测」档案里的「Sand 客户端模式」命名：Sand 确为 Grok Bot 侧的内部标识（此为旧档案的正向佐证，非疑点）
- 「周池大小任何档位都不公布」：CellCog 与 aibuilderclub 两家均核对过官方帮助页，只写 Pro < Pro+ < Ultra 的相对关系
- 不与 #87（08-27 全员回血）合并：那条记重置与场外命名，本条记计费口径的前后矛盾与溢出机制

---

## 02 · 正史 | 2026-08-29 | 整合

```
side:    main
date:    2026-08-29
tag:     整合
title:   Grok Bot 接入 X：API 额度随附
summary: SpaceXAI 官宣 Grok Bot 打通 X：连上账号即开开发者账户，付费用户获免费 X API 额度，Bot 可搜帖、读时间线、查提及。前一日它刚接上 Stripe Link 学会代人付款。交割半月，编辑器、模型与社交网络第一次在同一个产品里合流。
series:  火箭并购案
source:  https://x.ai/news/grok-bot-and-x
detail:
8 月 29 日，SpaceXAI 发布《Grok Bot now works with X》：在 Grok Bot 里连接 X 账号，系统会为没有开发者账户的用户自动创建一个，付费 Grok Bot 用户起步即获免费 X API 额度；连上之后，可以让 Bot 搜索帖子、读取时间线、检查提及、汇总 X 上正在发生的事，另附一个可搜帖、读时间线、拉趋势、管书签的 X 插件。官方自称这是「该集成的第一个版本」。

这一周，Bot 的手脚在连续伸长。8 月 28 日，官方账号 @bot 宣布两件事：Bot 模板可以分享给他人；接上 Stripe Link 之后，Bot 可以代用户完成购买。8 月 31 日再添 Outlook、Calendar 与 OneDrive 三个微软插件，Bot 对邮箱与日历可读、可写、可操作。8 月 11 日它还是一个只对顶配开放的早期测试品；到月底，它有了钱包、通讯录和一张社交网络的通行证。

值得留档的是署名与来路。X 与 Grok Bot 同属 SpaceX，Cursor 并入也只有半个月：对开发者收费的 X API，在这里以「免费额度」的形式发给自家 Bot 的付费用户，是集团内部的一次调拨。至于版本记录——同一时期有用户在论坛问 Grok Bot 的更新日志在哪里，Cursor 员工的回答是：目前没有官方更新日志，最好的查看处是 X 上的 @bot 账号。一个把 X 接进来的产品，自己的发布说明也住在 X 上。
```

核查要点：
- 日期取 x.ai 官方新闻页 08-29；@bot 同日推文口径一致。08-29 库内已有 4 条档案（#89 / #96 / #102 / #103），本条并列为该日第 5 条，属实际密度
- Stripe Link 代购与模板分享出自 @bot 08-28 两条推文（x.com/bot/status/2093419921007108385、2093376523919323618，经 awesome-grok-bot 索引与 Flavio Copes 08-28 深度稿双重转述）；微软插件出自 @bot 08-31（status/2094543253811183943）——三者均非 x.ai 新闻页，故 source 只挂 X 集成的官方页
- 「没有官方更新日志，看 @bot」出自论坛 170056（Colin，08-31）
- 「对开发者收费的 X API」只写事实不写价格；未采用「昂贵著称」类评价
- series 挂 `火箭并购案`：与 #61 Grok 4.5、#75 Grok 4.6 同为收购后的产品级整合节点；若站长认为并购线应止于交割（#77），可去掉 series

---

## 03 · 正史 | 2026-09-01 | 军备

```
side:    main
date:    2026-09-01
tag:     军备
title:   Astra 定级 Critical：先设卡再发布
summary: OpenAI 确认下一代模型 Astra 触及「Critical」网络能力阈值——史上首个能在无人指引下发现并利用未知漏洞的模型。仍称「很快」发布，攻防能力只向 Daybreak 联盟少数机构开放。它也是断供通牒里一概不给 Cursor 的那款。
series:
source:  https://www.cnbc.com/2026/09/01/open-ai-astra-cyber-model.html
front:   model-labs
detail:
9 月 1 日（周二），OpenAI 发文确认：即将发布的 Astra 是公司第一款越过 Preparedness Framework「Critical」网络安全能力阈值的模型——按其定义，能在多种加固的真实关键系统中不经人工干预地识别并开发各严重等级的零日漏洞利用，或仅凭一个高层目标就设计并执行端到端的新型攻击。此前 GPT-5.6 Sol 的评级是「High」。研究副总裁 Amelia Glaese 对记者的表述更直白：Astra 能找到此前未知的安全缺陷，并在无人逐步引导的情况下开发出利用方式。

时间线：8 月 1 日 OpenAI 确认 Astra 存在，称其解决了十个悬置多年的公开数学问题；8 月 7 日承认「无法排除」Critical 级网络能力，放慢发布节奏、暂停部分内部工作并加装安全控制；公司自述的「Hugging Face 事件」（官方称 Astra 并未卷入）又促使其暂停了部分前沿强化学习训练。9 月 1 日的结论是：安全措施已足以把严重危害的风险降到可发布的水平，Astra「很快」上线但不给时间表，最强的网络能力只向网络安全联盟 Daybreak 内的少数机构开放。官方同时预警：护栏可能误判正常操作——包括与安全无关的长时程 agent 任务——在 ChatGPT 与 Codex 里用户会被要求复核被标记的动作，走 API 则任务直接停止。

把这份公告放回本站的坐标里看：数日前 OpenAI 通知 SpaceX 将于 11 月 12 日停止向 Cursor 供应模型，并明言下一代模型 Astra 一概不予供给；今天它说清了 Astra 是什么——一款连自家都要先设卡再放行的模型。此前 Fable 5 因同类能力被商务部按停 19 天，GPT-5.5-Cyber 只向受审团队发放；模型能力的「危险档」单独发牌照，正从个案变成行业通例。Cursor 用户拿不到 Astra；从公告看，多数人拿到的也不会是完整的它。
```

核查要点：
- 日期 09-01 为 OpenAI 博文与 CNBC / Axios 报道同日（美东周二）；Glaese 引语出自 Axios 记者会转述，正文用转述体不加引号
- 「8 月 1 日确认存在 / 十个公开数学问题」「8 月 7 日无法排除 Critical、放慢发布」出自 Mashable 时间线并与 OpenAI《Pacing model development in an era of cyber-critical capabilities》博文一致；「暂停部分前沿 RL 训练」出自 Axios 与 OpenAI 博文，具体日期各家说法不一（有写 8 月 18 日），正文未写日期
- 「Hugging Face 事件」只按 OpenAI 自述称呼，本刊未查到该事件独立报道，不展开细节；如站长掌握，可另立档
- Daybreak 联盟名称出自 CNBC；GPT-5.6 Sol 此前评级 High 出自 Mashable
- front 填 `model-labs`：主语是 OpenAI 的模型发布策略；与 Cursor 的关联放在末段（#88 断供通牒点名 Astra），未写日期回链
- 「按停 19 天」为 #54 单一事件内时长，允许；「数日前」替代「四天前」避免跨档案日期算术

---

## 04 · 正史 | 2024-11-24 | 进化

```
side:    main
date:    2024-11-24
tag:     进化
title:   0.43：Composer 里长出 Agent
summary: Cursor 0.43 上线：Composer 搬进侧栏带行内 diff，内置一个「早期版本的 agent」——自己挑上下文、自己开终端；顺带预告一个找 bug 的功能。更新日志只给了它一行字。此后两年的产品史，几乎都是这一行字的展开。
series:
source:  https://cursor.com/changelog/0-43-x
detail:
2024 年 11 月 24 日，Cursor 0.43 发布。更新日志按惯例是一份清单：Composer 界面移入侧栏并支持行内 diff；「一个早期版本的 agent，可以在 composer 里自己选择上下文并使用终端」；生成 git 提交信息；聊天与 composer 里的文件推荐与 @Recommended 语义检索；更顺手的拖图体验；若干性能改进；以及一条 Beta 预告——「即将到来的 bug 查找功能先睹为快」。

当时的语境：同月稍早公司刚收购 Supermaven，补全线刚完成换代；市面上的 AI 编程工具仍以「补全 + 对话」为主形态，让模型自己决定读哪些文件、自己跑命令，在生产级编辑器里还是新事。0.43 的 agent 只是 Composer 下拉框里的一个选项，社区反馈以正面为主，讨论集中在一点上：它会自己动手了。

回头看，这份清单里埋着此后三条产品线的种子。那个「早期版本的 agent」，后来长成 1.0 的 Background Agent、2.0 的八路并行与 3.0 的 Agents Window；那条「bug 查找功能先睹为快」，是 Bugbot 的第一次露面；而 Composer 这个名字，一年后被拿去命名公司的第一款自研模型。大版本会开发布会；改写公司命运的功能，有时只在更新日志里占一行。
```

核查要点：
- 日期与清单逐条出自官方 changelog `/changelog/0-43-x`（Nov 24, 2024）；Medium 等三方稿为 11-25 转述，一致
- 「社区反馈以正面为主」为三方稿概括，未引具体原话；无 HN / 论坛一手帖可挂，故不写野史配档
- 「同月稍早收购 Supermaven」替代「十二天前」，避免跨档案日期算术；三条产品线的后续（Background Agent / Bugbot / Composer 模型）均为库内已有事实，仅作年级别粗粒度呼应
- 填补 2024-11-12（#8）→ 2024-12-18（#91）之间的空窗，也是「自研模型线」之前 Composer 名字的来历

---

## 05 · 正史 | 2025-07-18 | 并购

```
side:    main
date:    2025-07-18
tag:     并购
title:   Koala 并入：买团队，不买产品
summary: TechCrunch 披露 Anysphere 收购 AI CRM 初创 Koala：只接走数名核心工程师组建「企业就绪」团队，产品不整合，Koala 九月关停——五个月前它刚融完 1500 万美元 A 轮。冲进财富 500 强的路，先要有人把门修好。
series:
source:  https://techcrunch.com/2025/07/18/cursor-snaps-up-enterprise-startup-koala-in-challenge-to-github-copilot/
detail:
2025 年 7 月 18 日，TechCrunch 援引两位知情人士报道：Cursor 母公司 Anysphere 与 AI 驱动的客户关系管理初创 Koala 达成收购协议。交易的形态是人才收购——数名 Koala 顶尖工程师加入 Cursor，组建一支专职的「企业就绪」团队；Koala 团队不会整体并入，其核心 CRM 产品也不会被整合。Koala 当天发博客宣布九月关停。这家公司成立近四年、约三十名员工，客户包括 Vercel、Statsig 与 Retool；五个月前刚完成 CRV 领投的 1500 万美元 A 轮，HubSpot Ventures、Recall Capital 与 Afore 跟投。

报道把这笔交易放进一条更长的线：Anysphere 正在从境况平平的 AI 创业公司里挑人，快速搭起自己的企业业务——据 The Information，公司同期还请来网络安全初创 Resourcely 的 CEO Travis McPeak 领导安全团队。数字给了理由：六月 ARR 破 5 亿美元，超过半数财富 500 强在用，且据知情人士，增长中越来越大的份额来自企业合同。

并购这件事，Cursor 做过几种买法：买 Supermaven 是买一种能力，买 Graphite 是买一条工作流，买 Koala 是买一群会给大公司修门的人。产品关停、团队进门、对价不提——这是那一年硅谷最常见的一种交易形态，只是这一次的买方，是一家成立三年的公司。
```

核查要点：
- 日期取 TechCrunch 首发 07-18（12:56 PM PDT）；MLQ、theheadandtale 等为转述，口径一致
- 「两位知情人士」「不整合 CRM」「九月关停」「近四年 / 约三十人 / 客户名单 / 1500 万 A 轮及投资方」全部出自 TechCrunch 原文；Travis McPeak 一节 TechCrunch 注明转引 The Information
- 对价未披露，正文照实写「对价不提」；未写「收购金额」
- 「成立三年的公司」：Anysphere 2022 年成立，属年级别粗粒度
- 填补 2025-07-11/14（风帆易主）→ 2025-07-18 的并购线缺环；与 #8 Supermaven、#33 Graphite、#108 Firetiger 同 tag 成组

---

## 06 · 正史 | 2025-08-07 | 破壁

```
side:    main
date:    2025-08-07
tag:     破壁
title:   Cursor CLI：Agent 走出编辑器
summary: GPT-5 上架同日，Cursor 放出第二件东西：Cursor CLI 早期测试——一行命令装好，终端里直接对 agent 下令，订阅内模型通吃，可并行或无头运行。官方自注：仍在 beta，护栏尚在演进，风险自负。终端这块地，此前只有 Claude Code 与 Codex 在种。
series:
source:  https://cursor.com/blog/cli
detail:
2025 年 8 月 7 日，官方论坛公告的开头是「我们还没完」：在 GPT-5 上架的同一天，Cursor 宣布 Cursor CLI 进入 Beta。安装只要一行 curl，然后在终端里对 agent 说一句「找一个 bug 并修掉」。它可以在任何 IDE、任何环境、任何项目里跑，使用订阅内的全部模型，支持多个 agent 在终端或远端并行，也可以无头运行、接进脚本与自动化。博客同时写下免责声明：CLI 仍在 beta，安全防护仍在演进——它能读、改、删文件，能执行你批准的 shell 命令，请只在可信环境中使用，风险自负。

博客把这一步接在一条线上：这一年 Cursor Agent 已经从编辑器扩展到网页、手机与 Slack，「现在，我们让 Agent 在任何地方可用」。语境是终端战线的形成——此前 Anthropic 以 Claude Code 开出了这条战线，OpenAI 的 Codex CLI 随后跟进；作为一家靠分叉 VS Code 起家的公司，Cursor 第一次把核心能力装进一个不需要自家编辑器的载体。

从产品哲学看，这是一次自我修正：编辑器曾是 Cursor 全部的护城河，CLI 则承认了另一件事——agent 才是产品，编辑器只是它的一个窗口。此后的 JetBrains 全家桶与 iPad 版，走的都是这条路。至于安全那段小字，一年之内会被多次回收。
```

核查要点：
- 日期取官方博客与论坛公告（danperks，Aug 7, 2025 8:54pm）；与 #24 GPT-5 首发同日，两条正史并列（库内已有同日双正史先例 #30/#31）
- 安装命令、`agent chat "find one bug and fix it"`、「任何模型 / 多 agent 并行 / 无头」「仍在 beta、风险自负」逐句出自博客原文
- 「Codex CLI 随后跟进」：OpenAI Codex CLI 开源于 2025 年 4 月，库内 #94 detail 已提及，未写日期
- 「一年之内会被多次回收」指 #64 git.exe、#109/#110 勒索团伙等安全档案，年级别粗粒度，未写回链
- 填补 #24（08-07）之后的产品线缺口：#38 JetBrains 档案里那句「桌面、网页、CLI、iOS 之外」所指的 CLI，此前无出处档案

---

## 07 · 野史 | 2026-09-02 | 情报

```
side:    dark
date:    2026-09-02
tag:     情报
title:   二次回血：全员周池静默归零
summary: 观测：北京时间 9 月 2 日凌晨，Grok Bot 周额度再度全员归零。核查：@bot 无帖、x.ai 无稿、论坛无楼，与上次「两分钟出帖」正相反。取证：多个账号的周期起点被拨到同一刻，非各号自身节奏。系统备注：上一次重置是公告，这一次是心跳。
series:  全员回血
source:
detail:
记录时间 2026-09-02（北京时间凌晨，美西 9 月 1 日日间）。封闭频道零点后陆续报数：Grok Bot 周额度回到 0%，进度条重新从头走。场外复测口径：多个账号的周期起点被拨到同一时刻，不是各号自身的周节奏——全员重置，第二次。

核查记录。一周之内的上一次，官方账号 @bot 发了两行公告，Cursor 员工两分钟内在论坛跟帖「我们刚做了一次重置」；这一次三处全空：@bot 最近一帖停在 8 月 31 日的微软插件，x.ai 新闻页停在 8 月 26 日的扩容，论坛到发稿时没有一楼提到重置。已知：Bot 额度接口给每个账号都标着「本周期起点」与「下次重置时间」，全员归零即把所有人的起点拨到同一刻。传闻：起因与上次相同——消耗异常偏快，官方上周承认过「部分账号额度掉得很快，团队在查」。推论：查的结果还没出来，先把进度条推回去，比解释便宜。

系统备注：上一次重置有公告，场外给它起了名字；这一次连公告都省了，场外只剩确认。「Codex 时刻」的原版特征正是如此——重置频繁到不再值得宣布。回血一旦有了节律，就不再是事件，是心跳。
```

核查要点：
- **无公开信源**：@bot、x.ai/news、Cursor 论坛（索引至 09-01）、Reddit、媒体转述均未见 9 月 1–2 日全员重置记录；本条依据为站长本人观测 + 封闭频道复测，属线报级——若明天论坛出帖，请回填 source
- 日期口径按 #87 的先例取北京日期 09-02（美西为 09-01 日间）；若站长改用美西口径请改 09-01，并注意与 08 号草稿同日
- 「多个账号周期起点被拨到同一时刻」依赖站长是否跨账号复测过；只看了一个号请把该句改为「场外多号报数口径一致」
- series `全员回血` 为新开线索（≥2 条：#87 + 本条）；**发布本条时请同时给 #87 补挂同名 series**，否则本条会显示为孤节点
- 「官方上周承认额度掉得快」出自 Cursor 员工 Colin 08-26 论坛回帖（"limits are depleting quickly. The team is working on this"）

---

## 08 · 野史 | 2026-09-01 | 极限套利

```
side:    dark
date:    2026-09-01
tag:     极限套利
title:   借道·检出：Agent 走 Bot 车道
summary: 现象：名片伪装灭活当日，场外放出「换道版」——不再让编辑器自称 Bot，而是把 Agent 的整条运行链路搬到 Bot 的车道上，消耗重新落进 Bot 周池。取证：源码注释留着一周内四次失败迭代。状态：存活。系统备注：来路可以核对，路可以换。
series:  借道
source:
detail:
记录时间 2026-09-01，样本为封闭频道流出的工具源码（版本 1.1.5，Windows 与 macOS 双端，编译成机器码以防还原）。背景：同日，「让编辑器自称 Bot 即换池」的老玩法被服务端灭活——名片不再决定口袋。新样本的思路不同：服务端核对的是 Agent 请求的来路，那就换一条路。补丁把 Cursor 客户端里 Agent 的运行时判定强制拨到 Grok Bot 所用的本地托管模式，执行器、主机身份、传输后端逐项对齐 Bot，模型调用改走 Bot 自己的推理流；唯一仍被服务端盯着的那一道检查，照旧报「IDE」。同一次对话，服务端记账时看到的是一台 Bot 在推理。

成立机制解析：Bot 与编辑器共用同一套底层协议，只是走的车道与报的身份不同——服务端按车道分池，而车道的选择权有一部分留在客户端。源码注释记下了一周之内的四次失败：只改路径不改主机，返回 404；短路会话创建，执行器落空；删掉一句等待，扩展宿主三十秒超时——直到 1.1.5 把残留剥干净。注释里还点了另两款同类工具的名字，补丁字面量与之「一致」：不是一个人在修，是一批人在对同一份混淆代码做协同逆向。工具另附三件配套：批量给账号池领取 Bot 资格（团队号自动走团队通道，免费号提示需绑卡）、把网页票据换成客户端认的会话票据写进本地、以及绕过本机「拼车」网关对官方域名的劫持——「车头」的工具箱，已经成套。已知：会员伪装只骗界面（本地会员判定改成企业级、模型列表全部解锁），扣费仍由服务端决定。传闻：换道不换速度，Bot 周池在重活面前撑不了几天，账号池由此成为刚需。推论：这一次的缝不在名字上，在「客户端还能替服务端决定走哪条路」——封住它，意味着把运行时的选择权收回去。

系统备注：上一代靠改名，被查来路；这一代改道，让来路本身合法。检测升到第二层的当天，绕过也升到第二层，双方版本号在同一周里同步递增。状态标记为存活，复现概率不做评估，后续变更将另行立档。
```

核查要点：
- **2026-09-02 定稿的新惯例**：检出当天即按 `·检出` 立档并挂 series，不再用「（存活）」标记；作战室把「有检出、无灭活」的线索判为存活——本条发布后应出现在存活板，天数从 09-01 起算（收件箱草稿 id 31 已按此改题挂线索）
- 日期取工具源码与构建脚本的最后修改时间（2026-09-01 14:17–14:25），与 #104 伪装观测灭活同日；站长拿到源码为 09-02，若按「场外首次观测到」口径可改 09-02
- 机制描述经通读源码核实：运行时判定强制 managed-local、agent-host 身份改 sand、Agent Run 转码为推理流并改打 API 后端、AgentService 请求分流报 ide、renderer 会员伪装（写死企业级 + 团队 ID）、Max mode 绑卡检查恒真；档案正文按不教唆红线**只写到「运行时 / 身份 / 传输后端对齐 Bot」这一层**，不出现字段名、端点、命令
- 「四次失败迭代」「另两款同类工具字面量一致」均出自源码注释原文（1.0.3 → 404；1.1.1–1.1.3 → undefined.execute；1.1.3 → ERROR_EXTENSION_HOST_TIMEOUT；ThankCat 1.0.8 / Toolkit 1.2.2 / sand_stream_installer）
- 「配套三件」出自 README 与 sand_api.py / local_cursor.py / resolve.py：批量领资格走官方 dashboard 接口；网页票据经深度登录换会话票据；DoH 绕过 cgw 类网关的域名劫持
- 线索名 `借道`（2 字）已在 server.js SERIES_PAGES 预配 slug bot-lane（部署新版后才有专页，未部署前回退中文 URL 可用）；**灭活时只需新立 `借道·灭活：…` 同挂 series，本条不动**
- 「传闻：撑不了几天」为推论级，基于论坛 Bot 用户重置后一日内耗尽的报数（169551 帖 DannyB），非本工具实测
- source 留空：源码为封闭频道分享，无公开链接；不引 GitHub 类似仓库以免构成指路

---

## 已消化未立档（哨兵队列 09-01 09:25 → 09-02 11:25）

- 状态页 09-01 / 09-02 两次 minor「Investigating service degradation」、09-01「Degraded performance of Grok 4.5」——均 minor 级，无社区事件，不立档；若 9 月继续成潮，可按 #71 体例做月度「故障潮」汇总
- Copilot 三条（Team 计划模型访问改按付费组织判定；9 月 1 日下架 Opus 4.5/4.6、Sonnet 4.5/4.6、Gemini 3.1 Pro、Raptor Mini 六款；code review 可批准 PR）——changelog 级，对 Cursor 用户无波及，不立档
- Anthropic《improving-alignment-security-efforts》——配套材料，不单开
- 论坛 08-31「Grok Bot 0.30.0 大面积 Can't reach your computer」——员工承认当日「rough patch」，但无状态页事件、无数据丢失，暂不立档；若复发可并入 Grok Bot 稳定性档案
- Reuters 09-01 联创 Aman Sanger 人物稿及各家「Who is Aman Sanger」——人物与身家报道（Forbes 估约 25 亿美元），无新事实，不立档
- Anthropic 08-31 与 Lambda 签 350 亿美元算力协议（Reuters）——模型厂商算力线，与 Cursor 无直接关联，不立档；供给线若再起波澜可作背景
- Claude Code「摘要网页即被劫持」提示注入（Rehberger，Anthropic 答「按设计工作」）——claude-code 战区候选，日期与首发媒体待核，本批未展开

## 旧档案疑点与佐证

- **#86「Grok Bot 下放付费全线」source 为 status.cursor.com**，与内容不匹配；官方一手为 x.ai 新闻页 `https://x.ai/news/grok-bot-more-plans`（Aug 26, 2026，标题「Grok Bot is now included with more plans」），建议后台替换 source
- **#82/#104「伪装观测」的「Sand」命名获正向佐证**：论坛员工确认 `sand-default` / `sand-automation` 即 Grok Bot 对话与例程的内部标识（见本批 01 核查要点），无需改动
- #77 交割股数「约 3.893 亿股」与 MarketScreener 的「约 3.91 亿股」略有出入，以 SEC 文件为准，不改
