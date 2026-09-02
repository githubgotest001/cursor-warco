# 毒株谱系 · 名册、口径与信源手册（2026-09-02 实战验证）

## 一、数据结构（与 `server.js` 建表一致）

### models（毒株登记表，一株一行）

| 字段 | 必填 | 规范 |
| --- | --- | --- |
| `name` | 是 | 正名（sonic → grok-code-fast-1）；同日多档位各一行（Opus 4 / Sonnet 4；Sol / Terra / Luna） |
| `slug` | 否 | 留空按 name 生成小写连字符；重名自动 `-2` |
| `lab` | 是 | `LABS` 代号（见下表），不在名册的先去 `server.js` 登记 |
| `family` | 否 | 谱系名，同家同 family 才串成链：Claude / GPT / o 系列 / Gemini / Grok / Composer / Llama / Muse / DeepSeek / Qwen / Kimi / GLM / MiniMax M / Doubao Seed / Hunyuan Hy / 文心 ERNIE / Step / Mistral Large |
| `date` | 是 | `YYYY-MM-DD`，GA 或首发日；预览另标 status |
| `tier` | 否 | 旗舰 / 主力 / 走量 / 推理 / 编码专用 / 开源旗舰 / 受限旗舰 / 自研 · 编码 …（datalist 会列已用值） |
| `context` | 否 | `200K` / `1M` / `2M` |
| `price` | 否 | 每百万 token 输入 / 输出，如 `$5 / $25`；有峰谷价写清 `$0.66 / $1.98（低谷价；高峰 $1.32 / $3.96）` |
| `open_weights` | 否 | 0 / 1，以官方仓库为准 |
| `status` | 否 | `active` 在役 · `preview` 受限 / 预览 · `retired` 官方下架 / 停供 |
| `summary` | 否 | 60–90 字特稿体一段 |
| `source` | 否 | 官方发布页 URL（找不到官方页才用权威媒体 / 聚合站，并在待补里标注） |
| `ev` | 否 | 站内档案 id（`/ev/<id>`），Cursor 相关模型尽量回链 |

### scores（能力评测记录，一模型一基准可多条）

| 字段 | 必填 | 规范 |
| --- | --- | --- |
| `model_id` | 是 | models.id |
| `bench` | 是 | 基准名，**版本不可比就分名**（见二） |
| `score` / `unit` | 是 / 否 | 数字 / `%` · `分` · `Elo`（留空取名册默认） |
| `date` | 否 | 成绩公布日；留空 = 模型发布日；对照表里的竞品分数填对照表发布日 |
| `note` | 建议 | **口径**：版本 · 算力档（max / xhigh / 满力档）· 脚手架（OpenHands / Claude Code / bash-only）· 官方自报 / 第三方 tracker / 据 XX 对照表；加成值（并行计算 / 带工具）写在这里 |
| `source` | 建议 | 成绩出处 URL；站内档案用 `https://umbrella4365.com/ev/<id>` |

## 二、名册（改动要同步 `server.js`）

### LABS（实验室代号 → 展示名）

`anthropic` Anthropic · `openai` OpenAI · `google` Google DeepMind · `xai` xAI / SpaceXAI · `anysphere` Anysphere（Cursor）· `meta` Meta ·
`deepseek` DeepSeek · `alibaba` 阿里 · Qwen · `moonshot` 月之暗面 · Kimi · `zhipu` 智谱 · GLM · `minimax` MiniMax · `bytedance` 字节 · 豆包 Seed ·
`tencent` 腾讯 · 混元 · `baidu` 百度 · 文心 · `stepfun` 阶跃星辰 · Step · `mistral` Mistral · `other` 其他实验室

### BENCHES（已登记 slug 与导语的基准；未登记的名字能用但 URL 是原名编码）

| 基准名（原样填 bench） | slug | 单位 | 备注 |
| --- | --- | --- | --- |
| SWE-bench Verified | swe-bench-verified | % | 编码主基准；取官方主报数，加成进 note |
| SWE-bench Pro | swe-bench-pro | % | 加难版，Scale 出品 |
| Terminal-Bench | terminal-bench | % | 2025 初版题库 |
| Terminal-Bench 2.0 / 2.1 / 3.0 / 4.0 | terminal-bench-2 / -21（原名编码）/ -3 / -4 | % | **版本各一条曲线**，不混录 |
| Terminal-Bench-Science 0.1 | terminal-bench-science | % | 科研 agent |
| CursorBench | cursorbench | % | Cursor 自家考卷，note 写版本（3.2）与档位；撤榜成绩不录 |
| AA Intelligence Index | aa-intelligence-index | 分 | Artificial Analysis 综合指数，随版本重算，同模型可多条 |
| AA Coding Agent Index | aa-coding-agent-index | 分 | AA 编码 agent 指数 |
| HLE | hle | % | **无工具口径**为主记录，带工具写 note |
| LMArena Elo | lmarena-elo | Elo | 人类偏好 |

### DIMENSIONS（总榜维度 → 基准优先级；基准累计 ≥3 条成绩才参与）

编码 = SWE-bench Verified → SWE-bench Pro → AA Coding Agent Index ｜ 终端 Agent = TB 4.0 → 3.0 → 2.1 → 2.0 → 初版 ｜ 科研 Agent = TB-Science ｜
Cursor 考卷 = CursorBench ｜ 综合智能 = AA Intelligence Index ｜ 前沿推理 = HLE ｜ 人类偏好 = LMArena Elo

综合分 = 各已测维度「相对前沿分」（该模型最近一次成绩 ÷ 该维度当前最高 × 100）的平均，≥2 维入榜。**补分优先级**：榜首几株缺的维度 > 单维模型的第二维 > 其余。

## 三、信源分级（按实验室）

原则同 scout：**L0 定事实（发布日 / 参数 / 价格 / 自报分），L1 补语境，L2 第三方统一口径的分数，L4 只当目录**。

### L0 · 官方一手

| 实验室 | 发布页 / changelog | 权重与模型卡 | 备注 |
| --- | --- | --- | --- |
| Anthropic | anthropic.com/news、platform.claude.com/docs/…/models（含 Released / Retirement 字段） | — | 文档页的 Legacy / Latest 标签是 status 的权威口径 |
| OpenAI | openai.com/index/<model>、系统卡 | — | Codex 系列 API 常滞后数天到数周，发布日以官方页为准 |
| Google | blog.google（含各语言站）、docs.cloud.google.com …/model-versions（发布日 / 弃用日表） | — | Flash 线迭代极快，Pro 线以官方为准不登传闻 |
| xAI / SpaceXAI | x.ai/news；Cursor 侧看 cursor.com/blog、forum.cursor.com | — | x.ai 页日期可能是 API 全量日，与 Cursor 上线日不同，两口径都记 |
| Anysphere | cursor.com/blog、cursor.com/changelog | — | 全部回链站内档案 `ev` |
| Meta | ai.meta.com/blog、github.com/meta-llama 模型卡（Model Release Date） | huggingface.co/meta-llama | 模型卡日期是终审口径（Llama 4 = 2025-04-05） |
| DeepSeek | api-docs.deepseek.com/zh-cn/updates（更新日志含自报分） | huggingface.co/deepseek-ai | 直接 fetch 常被拦，走搜索引用；预览 / 正式 checkpoint 分清（V4 预览 04-24，Pro-0813 / Flash-0731） |
| 阿里 Qwen | qwen.ai/blog?id=<name>、github.com/QwenLM/<ver> README（各尺寸开源日） | huggingface.co/Qwen | Max 级多为 API-only；开权重日与发布日分开记 |
| 月之暗面 Kimi | kimi.com/news、kimi.com/code/docs/…/whats-new、moonshotai.github.io、arXiv 技术报告 | huggingface.co/moonshotai | K3 技术报告（arXiv 2607.24653）自带五家对照表 |
| 智谱 GLM | z.ai/blog/<name>、zhipuai.cn/zh/research | huggingface.co/zai-org | 许可证从 MIT 变 bespoke（5.3）要写进 summary |
| MiniMax | minimaxi.com/news、minimaxi.com/blog、platform.minimax.io/docs/release-notes/models | huggingface.co/MiniMaxAI | 官方 news 页日期精确到日 |
| 字节 豆包 Seed | seed.bytedance.com/zh/blog、research.doubao.com、火山引擎开发者社区 | — | 闭源，成绩少公开，登记发布日为主 |
| 腾讯 混元 | tencent.com/zh-cn 新闻、hunyuan 公众号 | huggingface.co/tencent | Hy3 / Hy4 preview 走「preview 先行、正式跟进」节奏 |
| 百度 文心 | ernie.baidu.com/blog | — | 发布日看 blog slug（`ernie-5.1-0508-release`） |
| 阶跃 Step | stepfun.com、官方公众号 | huggingface.co/stepfun-ai | Flash 线为主 |
| Mistral | mistral.ai/news | huggingface.co/mistralai | 欧洲阵营唯一在前沿榜的 |

### L1 · 权威媒体与官方对照表

- CNBC / Reuters / TechCrunch / The Information（西方）；IT之家 / 新浪财经 / 证券时报 / 21 财经 / 界面（国产发布当日报道，日期可靠，数字回溯官方）。
- **官方对照表**：一家的技术报告或发布页常列竞品分数（智谱 GLM-5 表、Kimi K3 表、Fable 5.1 发布对照表）——可录，note 写「据 XX 对照表 · 口径」。

### L2 · 第三方评测 tracker（统一 harness / 指数）

| 来源 | 用途 | 记法 |
| --- | --- | --- |
| Artificial Analysis（artificialanalysis.ai） | 智能指数 / 编码 agent 指数 / GDPval-AA | `AA Intelligence Index`，note 写「2026-MM 版指数」；同模型随版本重算可多条 |
| Vals AI（vals.ai） | SWE-bench Verified 统一 bash-only harness 榜 | note「Vals AI 第三方统一 harness · 榜 N 位」 |
| llm-stats（llm-stats.com） | 多基准 tracker | note「llm-stats 第三方 tracker（YYYY-MM）」 |
| LMArena（lmarena.ai） | 人类偏好 Elo | `LMArena Elo`，unit Elo |
| SWE-bench 官方榜（swebench.com） | Verified / Pro 提交榜 | 官方榜与厂商自报口径不同，note 区分 |
| Terminal-Bench 榜（tbench.ai） | 各版本榜 | 版本分名 |

### L4 · 聚合站 / 参考站（只当目录）

llmreference.com、codersera.com、morphllm.com、buildfastwithai.com、futureagi.com、okamomedia 年表、各类「best LLMs 2026」榜文。
用途：快速拿候选清单与大致日期；**日期与数字必须回 L0/L1 确认**。实测教训：两家聚合站把 Llama 4 写成 2026-04-05（官方 2025-04-05）。

## 四、检索配方

```
逐家核最新（模式 A 主配方，每家一发）：
  <实验室> 最新模型 发布 2026 官方 blog          例：智谱 GLM 最新 发布 2026 z.ai blog
  <家族名> <猜测版本号> release date               例：Qwen3.8 release date
中间缺环：
  <家族名> <上一代> <下一代> 之间 发布日期          例：GPT-5.2 GPT-5.4 发布日期
补分（模式 C）：
  <模型名> SWE-bench Verified score                 例：Claude Fable 5.1 SWE-bench Verified
  <模型名> technical report benchmark table         例：Kimi K3 technical report Terminal-Bench HLE
  <模型名> Artificial Analysis Intelligence Index    例：Qwen3.8-Max Artificial Analysis
增量（模式 B）：
  大模型 发布 <YYYY年MM月> 汇总；AI model releases <month year>；再逐家补扫
```

## 五、API 载荷格式（用户授权写线上时）

```powershell
# 1. 登记模型（返回 row.id）
Invoke-RestMethod "$SITE/api/models" -Method Post -ContentType 'application/json' -Headers @{'X-Admin-Key'=$KEY} -Body (@{
  name='Claude Opus 4.6'; lab='anthropic'; family='Claude'; date='2026-02-05'; tier='旗舰'; context='1M'; price='$5 / $25';
  open_weights=0; status='active'; summary='…'; source='https://…'; ev=$null } | ConvertTo-Json)
# 2. 录成绩（model_id 用上一步的 id；date 留空取模型发布日）
Invoke-RestMethod "$SITE/api/scores" -Method Post -ContentType 'application/json' -Headers @{'X-Admin-Key'=$KEY} -Body (@{
  model_id=96; bench='SWE-bench Verified'; score=80.8; unit='%'; date='2026-02-19'; note='据 Gemini 3.1 Pro 发布对照'; source='https://…' } | ConvertTo-Json)
```

批量登记优先走 `tools/seed-models.js`：把行追加进 `MODELS` / `SCORES` 数组后 `node tools/seed-models.js`（读 `data/remote.json` 写线上；`--site` / `--key` 可指向本地）。脚本幂等——同名模型跳过（不覆盖后台改过的字段），同一模型 + 基准 + 分数已存在的成绩跳过。写入后 `/m`、`/m/<slug>`、`/b/<slug>` 缓存自动失效并推送百度，不需要重启服务。

## 六、验证记录 · 2026-09-02 首轮

- 首版种子 47 株偏西方（国产仅 Qwen3、Kimi K2）；第二批按家补 DeepSeek / 智谱 / MiniMax / 豆包 / 千问 / Kimi 至 75 株；第三批按名册逐家核「最新一代」至 95 株 / 16 家 / 104 条——智谱漏到 5.3、混元 / 文心 / 阶跃三家整家漏登，均在逐家核时发现。
- 富矿实证：Kimi K3 技术报告对照表一次补齐五家的 Terminal-Bench 2.1 与 HLE；智谱 GLM-5 表补齐 DeepSeek-V3.2 / Kimi K2.5 / GPT-5.2；Fable 5.1 发布对照表补齐 Terminal-Bench-Science 与 AA 指数 9 月快照。
- 反查实证：Llama 4 两家聚合站写 2026，官方 2025-04-05，原记录正确未改。
