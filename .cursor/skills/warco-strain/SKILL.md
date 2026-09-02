---
name: warco-strain
description: 为 UMBRELLA 4365 / Cursor 战地纪实网站维护「毒株谱系」专栏（/m，模型总榜与发展史）的数据——models 登记表与 scores 评测记录。三种模式：① 查缺模式（不带条件）——读取本地镜像的 models / scores，按实验室名册逐家核「最新到哪一代」，找出漏登的模型与漏录的成绩；② 增量模式（给定日期）——搜集该日期之后全球实验室发布的新模型与新公开成绩；③ 补分模式（给定模型或维度）——为总榜里缺维度的模型补公开成绩。当用户说「谱系查缺」「有没有漏登的模型」「X 月 X 日之后发了哪些模型」「补一下 XX 的分数」「登记一株」「录成绩」「更新模型榜」「毒株谱系补数据」时使用本 skill——即使用户没有说出「毒株谱系」也应主动使用。产出为经查证、字段对应 models / scores 表的登记草稿（写入 drafts/），录入永远由用户完成或经用户明确授权后走线上 API。
---

# UMBRELLA 4365 · 毒株谱系数据侦察与登记

本 skill 是**谱系员**：负责「哪家发了什么、何时发的、公开考了多少分」的查证与登记，供 `/m` 总榜、维度榜、能力曲线与发布时间线使用。
它**不写档案正文**——模型在 Cursor 前线的进场 / 登顶 / 换防仍由 `../warco-chronicler` 立档；本 skill 只管结构化数据，
两者在「模型发布类事件」上一起出手（档案立一条 + 谱系登一株 + 录成绩）。

数据结构、名册、信源清单与 API 载荷格式见本目录 `references/registry-and-sources.md`；总榜口径（综合分怎么算）见 `PROJECT_BIBLE.md` 第 4.1 节「毒株谱系」小节。

## 三种模式

| 模式 | 触发条件 | 目标 |
| --- | --- | --- |
| **A · 查缺** | 用户未给日期 / 说「查缺」「有没有漏的模型」 | 按 `LABS` 名册**逐家**核「截至今天最新一代是谁」，对照本地 `models` 找漏登的整代与缺环；顺带核旧行的日期 / 状态 |
| **B · 增量** | 用户给了日期 | 搜集该日期之后各家发布的新模型与新公开成绩，与本地库去重后登记 |
| **C · 补分** | 用户点名模型或维度（「补 Fable 5.1 的 SWE-bench」「HLE 这列太空」） | 只找成绩：优先补**已入榜模型缺的维度**，其次补单维模型的第二维，让总榜覆盖变厚 |

用户没说清楚时默认 A。**A 的纪律是「逐家」**：把 `LABS` 里每个代号都过一遍，不是想得起谁补谁——2026-09-02 首版种子国产实验室只登了两株，就是没逐家核的代价。

## 工作流

### 1. 刷新镜像并读表（永远第一步）

```powershell
node sync.js pull   # 线上 → 本地：档案 + 刊物 + 补给表 + 毒株谱系（models / scores）镜像
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('data/chronicle.db',{readOnly:true});for(const r of db.prepare('SELECT lab, family, name, date, status, open_weights, (SELECT COUNT(*) FROM scores s WHERE s.model_id=m.id) n FROM models m ORDER BY lab, family, date').all())console.log([r.lab,r.family,r.date,r.name,r.status,r.open_weights?'open':'',r.n+'分'].join(' | '));console.log('BENCHES:',db.prepare('SELECT bench, COUNT(*) n FROM scores GROUP BY bench ORDER BY n DESC').all().map(b=>b.bench+'×'+b.n).join(' · '))"
```

- 本地库只是线上库的只读镜像，**改动回写永远走线上**（后台「毒株谱系」标签页或 REST API），不改本地库。
- 按 lab / family / date 排好的清单就是「每家谱系链」——每条链的最后一行是本站认为的该家最新一代，核查从这里起。
- 顺手看 `tools/seed-models.js` 的头注释与 BIBLE 第 11 节「毒株谱系待补的历史点」：那里记着已知缺环与「记不十分准」项，先消化再盲扫。

### 2. 圈定范围

模式 A 三个突破口（按性价比排序）：

1. **每家的「最新一代」核对**：对 `LABS` 里每个代号发一条检索「<实验室> 最新模型 发布 <当年>」，把结果与本地链尾比——差一代以上就是缺环（2026-09-02 实例：本地 GLM 链尾是 5.1，实际已到 5.3）。
2. **谱系中间缺环**：链上相邻两代之间隔了明显一代（GPT-5.1 → GPT-5.5 之间的 5.2 / 5.4）。
3. **总榜覆盖洞**：`/m` 总榜里「仅一个维度」的模型和入榜模型的空格——尤其榜首几株缺的维度，一个数字能改排名。

模式 B：范围就是「给定日期 → 今天」，逐家扫一遍再按周补扫大盘。

### 3. 扫信源

按 `references/registry-and-sources.md` 的分级执行。核心纪律：

- **先官方后三方**：各家 blog / changelog / 技术报告 / Hugging Face 模型卡是发布日、参数、价格、自报分数的地基；第三方 tracker（Artificial Analysis、Vals AI、llm-stats、LMArena）用于补「统一 harness 下的成绩」与指数，**必须在 note 里写明是第三方**。
- **对照表是富矿**：一家的技术报告常附竞品对照表（Kimi K3 报告一次给了五家的 Terminal-Bench 2.1 与 HLE；智谱 GLM-5 表给了 DeepSeek-V3.2 与 Kimi K2.5 的 SWE-bench）。可以用，note 写「据 XX 发布对照表 · 口径」，分数日期填对照表发布日。
- **聚合站只当目录**：日期与数字必须回到官方或权威媒体确认。实测教训：两家聚合站把 Llama 4 写成 2026-04-05，Meta 官方博客与模型卡都是 2025-04-05——同错多现不构成两源。
- 每个候选至少两次独立检索交叉验证。

### 4. 查证与口径（决定生死）

- **发布日**：取公开可用日（GA）或首发日；预览 / 匿名公测另立 `status: preview` 或写进 summary，不把预览日当 GA 日。开权重日与发布日不同时，发布日填发布，开权重写进 summary（Qwen3.8-Max：08-03 发布、08-12 开权重）。
- **一株一行**：同日发布的不同档位各登一行（Opus 4 / Sonnet 4；Sol / Terra / Luna；V4-Pro / V4-Flash），`family` 相同才串成链；受限通道模型（Mythos）照登、`status: preview`；checkpoint 更新（`-0902`、`-0813`）视为同一株的迭代，不另开行，可在 summary 里提。
- **数字必须有出处**：2026 年 Cursor 相关模型只认站内已查证档案（`ev` 回链，分数 source 填档案页 `https://umbrella4365.com/ev/<id>`）；其余认官方发布页 / 系统卡 / 技术报告 / 第三方评测机构。记不准的**不录**，列进「待补」——宁缺毋滥。
- **SWE-bench Verified 取官方主报数**，并行计算 / 自定义脚手架的加成写进 note；**题库不可比就分基准名**（Terminal-Bench 初版 / 2.0 / 2.1 / 3.0 / 4.0 各是一条曲线）；指数类基准（AA 智能指数）随版本重算，同一模型可有多条不同日期的记录，总榜自动取最近一次。
- **撤榜的成绩不收录**（训练数据污染，例：Grok 4.5 的 CursorBench）。
- **状态**：官方弃用公告明确下架 / 停供的标 `retired`；受限通道标 `preview`；其余 `active`。是否开放权重以官方仓库为准，未核实的记闭源并在待补里标注。

### 5. 入册价值判定

登记表**宁全勿滥但不设高门槛**：凡实验室级别的正式代际发布（旗舰 / 主力 / 走量 / 编码专用 / 推理专用 / 开源旗舰）都登；小尺寸衍生件（xB 蒸馏版、Lite / Mini / nano）、视觉 / 语音 / 图像专用模型、微版本 checkpoint 默认不登，除非它在总榜某维度有公开成绩或改变了格局（Composer 2.5 成默认模型、Haiku 4.5 追平 Sonnet 4）。新实验室先在 `server.js` 的 `LABS` 登记代号，新基准先在 `BENCHES` 登 slug 与导语（想进总榜再挂 `DIMENSIONS`）。

### 6. 写字段 → 交付

- `summary` 用正史特稿体一段（60–90 字，先事实、反讽藏在排列里），禁文字交叉引用与写作时点词（不写「至今」「见档案」），可用「随后 / 后来 / 三个月后」。
- 全部草稿写入 `drafts/strain-drafts-YYYY-MM-DD.md`（当天日期），格式见下方模板；聊天里给一份摘要清单（实验室 / 模型 / 日期 / 成绩条数 / 最要紧的核查提示）。
- **默认不写库**。两种升级（都要用户说了才做）：
  - 用户说「帮我录」「弄到线上」→ 按 `references/registry-and-sources.md` 的载荷格式 `POST <线上>/api/models`（`X-Admin-Key`，地址与密钥在 `data/remote.json`）拿到 `id`，再逐条 `POST /api/scores`。批量时改用 `tools/seed-models.js` 的写法：把行追加进 `MODELS` / `SCORES` 数组后执行——脚本幂等（同名模型 / 同分成绩跳过），可反复跑。
  - 用户只说「先放着」→ 追加进 `tools/seed-models.js` 但不执行，由用户核对后自己跑。
- 登完记得提醒：模型发布类事件是否还缺一条正史档案（走 chronicler）；线上写入会自动失效 `/m` 缓存并推送百度，不需要重启。

## 草稿文件格式模板

```
## NN · <实验室> · <模型名> · YYYY-MM-DD

​```
name:         Claude Opus 4.6
lab:          anthropic          （LABS 代号）
family:       Claude
date:         2026-02-05         （GA / 首发日）
tier:         旗舰
context:      1M
price:        $5 / $25            （每百万 token 输入 / 输出）
open_weights: 0
status:       active | preview | retired
summary:      60–90 字一段
source:       官方发布页 URL
ev:           （站内档案 id，选填）
scores:
  - bench: SWE-bench Verified | score: 80.8 | unit: % | date: 2026-02-19 | note: 据 Gemini 3.1 Pro 发布对照 | source: URL
​```

核查要点：
- 日期口径（GA / 预览 / 开权重）、信源级别（官方 / 三方 tracker / 对照表）、与本地既有行的冲突逐条列出
```

文件头部注明：生成日期、对照的 models / scores 条数、本次新增 / 修订统计。若发现**现有行**的错漏（日期矛盾、状态过期、分数口径混用），在文件末尾附「旧行疑点」一节，只提醒不改动。

## 常见坑

- **来源偏差**：站内档案以 Cursor 在售模型为主，凭档案与记忆出的清单天然偏 Anthropic / OpenAI / xAI；每次都按 `LABS` 逐家核，国产九家（DeepSeek / 千问 / Kimi / 智谱 / MiniMax / 豆包 / 混元 / 文心 / 阶跃）一家都不能跳。
- **自报 vs 统一 harness**：Vals AI 给 Opus 5 的 97.0% 与 Anthropic 自报口径不同、Fable 5 的 95.5%（官方）与 llm-stats 的 95.0% 也不同——都可录，note 必须写清；总榜取最近一次，混口径会影响排名，页面已有免责声明，但别在同一条记录里混。
- **对照表里的竞品数字是「对手替你考的」**：智谱表里 GPT-5.2 的 80.0、Kimi 表里 Opus 4.8 的 84.6——可录，note 写「据 XX 对照表」，遇到官方自报时以官方为准另录一条。
- **代号与正名**：sonic → grok-code-fast-1、Spud → GPT-5.5、Honeycomb → Opus 5、Vega → 传闻未认领——登正名，代号进 summary；**未发布的不登**（Grok 5、Gemini 3.5 Pro、Llama 5 截至 2026-09 均无正式发布，传闻不进表）。
- **预览日 ≠ 发布日**：Gemini 3.1 Pro Preview（02-19）、DeepSeek V4 预览（04-24 → 正式 07-31 / 08-13）、Hy4 preview——按第 4 节口径处理，别把两者混成一个日期。
- 时区：美西官宣 ≈ 北京时间次日凌晨，与站内既有口径（取美西 / 官宣当日）保持一致。
