# 毒株谱系登记草稿 · 2026-09-13

- 模式：增量（2026-09-03 → 2026-09-13）+ 补分（三张官方对照表此前未录的列）
- 对照：线上镜像 99 株 / 123 条成绩（最新登记 GPT-6 Astra 09-03）
- 本次：新增 3 株（SWE-1.7 / SWE-2 / DeepSeek-V4.1-Flash）· 新增 38 条成绩 · 状态修订 1（DeepSeek-V4-Flash → retired）
- **已按站长指令经 `tools/seed-models.js` 写入线上**（脚本幂等，行已追加进 MODELS / SCORES 数组）；名册变更（LABS `cognition`、BENCHES `FrontierCode 1.1 Main`）随 server.js 47d5dde 部署

---

## 01 · Cognition · SWE-1.7 · 2026-07-08

```
name:         SWE-1.7
lab:          cognition
family:       SWE
date:         2026-07-08
tier:         自研 · 编码
open_weights: 0
status:       active
source:       https://cognition.com/blog/swe-1-7
scores:
  - bench: FrontierCode 1.1 Main | score: 42.3 | unit: % | note: 官方自报（SWE-2 对照表中记为 42.0）
  - bench: Terminal-Bench 2.1    | score: 81.5 | unit: % | note: 官方自报
```

核查要点：底座 Kimi K2.7 Code（06-12 开源）；无 API、无权重，Devin 内经 Cerebras 供应；发布日 07-08 出自博客日期戳与 TechTimes 07-09 报道「Wednesday」

## 02 · Cognition · SWE-2 · 2026-09-10

```
name:         SWE-2
lab:          cognition
family:       SWE
date:         2026-09-10
tier:         自研 · 编码
open_weights: 0
status:       active
source:       https://cognition.com/blog/swe-2
ev:           136
scores:
  - bench: FrontierCode 1.1 Main | 50.0 | 官方自报 · 各档最佳
  - bench: DeepSWE v1.1          | 73.0 | 官方自报 · 各档最佳
  - bench: Terminal-Bench 2.1    | 92.8 | 官方自报 · 各档最佳 · 对照表最高
  - bench: Terminal-Bench 4.0    | 27.3 | 官方自报 · 各档最佳
```

核查要点：底座 Kimi K3（2.8T）；对照表口径「公开结果优先，否则各家原生 harness 自测，各档取最佳」；Cognition 是新登记实验室代号，与 Anysphere（Composer）同类——产品公司自研模型

## 03 · DeepSeek · DeepSeek-V4.1-Flash · 2026-09-10

```
name:         DeepSeek-V4.1-Flash
lab:          deepseek
family:       DeepSeek
date:         2026-09-10
tier:         开源 · 走量
context:      1M
price:        $0.15 / $0.60（低谷价；高峰 $0.30 / $1.20）
open_weights: 1
status:       active
source:       https://api-docs.deepseek.com/news/news260910
scores:
  - Terminal-Bench 2.1 | 90.6 | 官方更新日志自报
  - Terminal-Bench 3.0 | 30.0 | 官方更新日志自报
  - Terminal-Bench 4.0 | 31.2 | 官方更新日志自报
  - DeepSWE v1.1       | 74.2 | 官方更新日志自报 · 超过 GPT-6 Astra 的 74.1 → DeepSWE 前沿线刷新
  - HLE                | 36.8 | 无工具（带工具 63.9）
```

核查要点：552B 总参 / 8B–16B 激活，HF 模型卡 `deepseek-ai/DeepSeek-V4.1-Flash`；价格出自官方定价页与 apidog 复算；**V4-Flash 即日退役（已改 retired）；V4-Pro 09-14 12:00 北京时间起路由到 V4.1-Flash——09-14 之后应把 #71 DeepSeek-V4-Pro 改 retired**

---

## 补分（对既有株）

| 模型 | 基准 | 分 | 日期 | 口径 / 来源 |
| --- | --- | --- | --- | --- |
| Kimi K3 | FrontierCode 1.1 Main | 44.2 | 09-10 | 据 SWE-2 对照表 · Devin CLI |
| Kimi K3 | DeepSWE v1.1 | 68.5 | 09-10 | 同上 |
| Kimi K3 | Terminal-Bench 4.0 | 21.5 | 09-10 | 同上 |
| Grok 4.6 | FrontierCode 1.1 Main | 48.0 | 09-10 | 据 SWE-2 对照表 · Grok Build |
| Grok 4.6 | DeepSWE v1.1 | 67.5 | 09-10 | 同上 |
| Grok 4.6 | Terminal-Bench 2.1 | 88.4 | 09-10 | 同上 |
| Grok 4.6 | Terminal-Bench 4.0 | 20.3 | 09-10 | 同上 → **Grok 4.6 由 1 维升到 3 维，入总榜** |
| Claude Fable 5.1 | Terminal-Bench 2.1 | 91.4 | 09-10 | 据 SWE-2 对照表 · Claude Code |
| Claude Fable 5.1 | FrontierCode 1.1 Main | 50.9 | 09-03 | 据 Astra 对照表（与 SWE-2 表一致） |
| Claude Fable 5.1 | HLE | 60.9 | 09-01 | 官方自报 · 无工具（带工具 65.0）→ **HLE 前沿线刷新** |
| GPT-6 Astra | Terminal-Bench 2.1 | 89.9 | 09-10 | 据 SWE-2 对照表 · Codex |
| GPT-6 Astra | FrontierCode 1.1 Main | 53.3 | 09-03 | 官方自报（Extended 64.5） |
| GPT-6 Astra | AA Coding Agent Index | 67.0 | 09-03 | v1.4 · 官方对照表 |
| GPT-5.6 Sol | FrontierCode 1.1 Main | 47.5 | 09-03 | 据 Astra 对照表 |
| GPT-5.6 Sol | AA Coding Agent Index | 65.1 | 09-03 | v1.4 · 据 Astra 对照表（7 月口径 80，指数已重算） |
| GPT-5.6 Sol | Terminal-Bench-Science 0.1 | 22.4 | 09-01 | 据 Fable 5.1 对照表 |
| Claude Fable 5 | FrontierCode 1.1 Main | 53.5 | 09-03 | 据 Astra 对照表（高于 Fable 5.1 的 50.9，原表如此） |
| Claude Fable 5 | DeepSWE v1.1 | 69.9 | 09-03 | 据 Astra 对照表 · xhigh |
| Claude Fable 5 | Terminal-Bench 4.0 | 44.5 | 09-03 | 据 Astra 对照表（Anthropic 自家表 42.0，另录） |
| Claude Fable 5 | AA Coding Agent Index | 67.2 | 09-03 | v1.4 · 据 Astra 对照表 |
| Claude Fable 5 | HLE | 57.8 | 09-01 | 据 Fable 5.1 对照表 · 无工具（Kimi 表 53.3 另在） |
| Claude Opus 5 | FrontierCode 1.1 Main | 53.4 | 09-03 | 据 Astra 对照表 |
| Claude Opus 5 | AA Coding Agent Index | 68.1 | 09-03 | v1.4 · 据 Astra 对照表 · 表内最高 |
| Claude Opus 5 | HLE | 56.6 | 09-01 | 据 Fable 5.1 对照表 · 无工具 |
| Claude Opus 5 | Terminal-Bench 4.0 | 52.3 | 09-01 | Anthropic 自报（Google 表 51.8 / OpenAI 表 52.6 各有） |
| Gemini 3.8 Flash | FrontierCode 1.1 Main | 43.6 | 09-03 | 据 Astra 对照表 |
| Gemini 3.8 Flash | AA Coding Agent Index | 61.2 | 09-03 | v1.4 · 据 Astra 对照表 |

说明：FrontierCode 1.1 Main 已在 BENCHES 登记 slug `frontiercode`（页面 `/b/frontiercode`），**尚未挂入 DIMENSIONS 编码维度**——是否把它排在 SWE-bench Verified 之前（Verified 已饱和到 95–97%）是站长的编辑判断，本次不动。

---

## 旧行疑点 / 待补

- **#71 DeepSeek-V4-Pro**：09-14 12:00（北京）起官方路由到 V4.1-Flash 并按 Flash 价计费，「直至 V4.1-Pro 发布」——09-14 之后改 `retired`，summary 可补一句。
- **#47 GPT-5.6 Sol · AA Coding Agent Index**：7 月发布时口径 80 分（刷新纪录）与 9 月 v1.4 版 65.1 落差极大，指数明显重算过；总榜取最近一次（65.1），页面免责已覆盖，但「刷新纪录」的旧 note 读者可能困惑。
- **#43 Claude Fable 5 · Terminal-Bench 4.0**：现有 42.0（Anthropic 表）与 44.5（OpenAI 表）两条并存，日期分别 09-01 / 09-03，总榜取 44.5。
- **未登（实验室不在名册）**：Sakana Fugu Max / Fugu Ultra v2（09-11，$2 / $6，宣称 Terminal-Bench 2.1 与 GPQA Diamond 领先——本质是跨开源模型的学习型路由器，是否算「一株」存疑）；商汤 SenseNova-U1.5；Inception Mercury 2.5（扩散 LLM）；Cohere North-Small-Translate。
- **不登（未发布）**：Grok 4.7（09-11 仍「再煮几天」）、Qwen 4（传闻）、Grok 5（训练中）。
- **checkpoint 不另开行**：Qwen3.8-Max-0902（09-02 快照，Code Arena 前端榜 1691 第一）——可补进 #53 summary。
- 仍缺：Fable 5.1 的 SWE-bench Verified 官方数字（发布页表内无此行）；Qwen3.8-Max / Kimi K3 / GLM-5.3 / Hy4 的 SWE-bench 数字。
