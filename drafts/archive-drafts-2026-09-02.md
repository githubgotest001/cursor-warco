# UMBRELLA 4365 · 档案草稿 2026-09-02

- 生成：2026-09-02（增量侦察：用户点名 Fable 5.1 / Mythos 5.1）
- 对照库：线上镜像 110 条（正史 66 / 野史 44），`node sync.js pull` 于当日刷新
- 本轮产出：**正史 1 + 野史 1**
- 去重：库内有 Fable 5 / Mythos 5（2026-06-09 登顶、2026-06-12 出口管制），无 5.1
- 哨兵命中：论坛「Claude Fable 5.1 - Out Now!」、Anthropic EFS 公告，已并入本档
- 未立档（密度不够）：9-01 状态页 minor 降级、Grok 4.5 性能降级、Copilot changelog 三条、Anthropic alignment 报告（作 Fable 发布的配套材料，不单开）

---

## 01 · 正史 | 2026-09-01 | 登顶

```
side:    main
date:    2026-09-01
tag:     登顶
title:   Fable 5.1：CursorBench 73.4%
summary: Anthropic 同日放出 Fable 5.1 与 Mythos 5.1：同一套权重，两道护栏。输入输出仍 10 / 50 美元每百万 token，缓存读取砍到四分之一。Cursor 当日上架，CursorBench 3.2 满力档 73.4%，自称测过最强。Mythos 仍只给受审通道。
series:  模型军备
source:  https://www.anthropic.com/claude-fable-and-mythos-5-1
detail:
2026 年 9 月 1 日，Anthropic 发布 Claude Fable 5.1 与 Claude Mythos 5.1。官方定义与上一档相同：同一套模型，护栏不同。Fable 5.1 公开可买；Mythos 5.1 仅通过受审通道向网络安全与生命科学方向的机构开放。Cursor 员工 Colin 当日在论坛宣布 Fable 5.1 进选择器，并给出自家尺子上的数字：CursorBench 3.2 满力档 73.4%，「我们跑过的最强模型」。同一张官方对照表里，Fable 5 是 70.5%，Opus 5 是 70.0%，GPT-5.6 Sol 是 67.2%。

价钱的面子没动，里子动了。输入输出仍是每百万 token 10 美元 / 50 美元；缓存读取从 1 美元降到 0.25 美元，官方称典型工作负载大约便宜四分之一，重 agent、重上下文的任务可到约百分之四十五。Terminal-Bench 4.0 从 Fable 5 的 42.0% 拉到 55.8%（Mythos 5.1 为 60.9%）；面向科研代理的 Terminal-Bench-Science 从 24.7% 到 52.6%。Jane Street 量化研究负责人被写进发布材料：内部基准上它比 Fable 5 和 Opus 5 解得更多，长任务也不那么容易写到后来没人看得懂。

门后那一档没有跟着进编辑器。Mythos 5.1 目前只给一批美国受审机构，官方说正与美国政府协调扩围。企业侧另许一桩秋季才到的事：Enterprise Frontier Safeguards，数据放在客户自己的云里，权当零留存。Cursor 用户当天能点到的，是 Fable。
```

核查要点：
- 日期：Anthropic 官宣与 Cursor 论坛公告均为 2026-09-01（TechCrunch 12:39 PM PDT；Colin 帖 6:24pm）。与库内 Fable 5 一样取美西/同日口径，不用北京时间次日
- 数字均出 Anthropic 发布页对照表 + Cursor 论坛原文。CursorBench 73.4% 为官方自测满力档，未做第三方复测
- source 取 Anthropic 一手；Cursor 上架一手为 https://forum.cursor.com/t/claude-fable-5-1-out-now/170246
- front 留空：Cursor 当日上架、CursorBench 入题，主语是 Cursor 用户看到的军备表，不是 Anthropic 自家产品发布会
- 未把 Mythos 写成「Cursor 可选用」——选择器只有 Fable 5.1
- 未写跨档案日期算术；出口管制那一档用「上一档」带过

---

## 02 · 野史 | 2026-09-01 | 冷眼

```
side:    dark
date:    2026-09-01
tag:     冷眼
title:   门闸观测：榜首要签留存条款
summary: 现象：CursorBench 榜首当日进选择器，隐私模式与企业户默认关。取证：须在仪表盘签 Anthropic 三十日留存条款，全队生效。状态：Mythos 5.1 未上架。系统备注：最强模型的说明书，第一页是授权书。
series:  模型军备
source:  https://cursor.com/docs/models/claude-fable-5-1
detail:
记录时间 2026-09-01。Cursor 文档与论坛公告口径一致：Fable 5.1 与前代 Fable 一样，不进零留存协议。个人户关掉隐私模式则默认开；隐私模式开启的账号、团队，以及所有企业户，默认关，须管理员在仪表盘批准「Data Retention Policy」后才出现在模型列表。条款写明：不论 Cursor 隐私模式是否打开，使用该模型时 Anthropic 会保存 agent 的输入与输出，用于自动与人工防危害审查，默认三十日后删除，不用于训练。团队一签，全员适用。护栏被触发时，请求自动改道 Opus，用户不必自己切模型。

口径核对：Anthropic 发布稿另许一桩——合格企业可在 Enterprise Frontier Safeguards 落地前先走零留存；EFS 把数据放进客户自己的云，秋季分批上。Cursor 文档没有把这道口子写进编辑器：隐私模式用户当天面对的仍是签字页。Mythos 5.1 与 Fable 同权异构，官方限定受审的美国机构与即将扩围的生命科学通道；Cursor 选择器里没有这一项。已知：榜首数字印在论坛标题下。传闻：有人会为这 2.9 个百分点击下同意。推论：门不在模型里，在仪表盘的复选框上。

系统备注：两道门。一道签在仪表盘上，一道设在华盛顿。公开卖的那一档，从来都要先过第一道。
```

核查要点：
- 隐私门闸不是 5.1 新发明，Fable 5 已有同一套 opt-in。本档记的是「榜首再发、门闸原样搬来」，不是新漏洞
- Anthropic「合格客户可先 ZDR」与 Cursor「隐私模式必须签字」两套口径并置，不把其中一套写成谎言
- Mythos 未进 Cursor：Cursor 论坛与文档只宣布 Fable 5.1，无 Mythos 条目。若日后上架，另立档
- 护栏自动回落 Opus：Cursor 文档写明；Fable 5 时期论坛已有人抱怨「不想被悄悄换模型」。5.1 文档未承诺会提示
- series 与正史同挂 `模型军备`，同日双线互文，不新开线索
