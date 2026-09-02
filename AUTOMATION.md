# UMBRELLA 4365 · 自动化手册（AGENT 编辑部）

> **这份文档是什么**：内容流水线的自动化操作规程——哨兵、侦察、立档、战报、扇出五个角色怎么配合，
> 定时任务怎么挂，人工闸口在哪里。给两类读者：① 站长（隔几周回来忘了节奏）；② AI（新会话
> 接到「跑一次侦察」「汇编战报」时先读这份对齐流程）。
>
> 总原则一句话：**机器做找料、查证、成稿、分发；人只做判断。** 「录入永远人工审核」不变，
> 但人工从「操作」压缩为「后台点一下」。
>
> 创建：2026-08-30

---

## 0. 流水线全景

```
tools/sentinel.js（定时轮询信源，diff 新信号）
   → data/sentinel-queue.md（信号队列）＋ TG 提醒（可选）
      → warco-scout（侦察：消化队列 + 检索补扫 + 交叉查证 + 按规范成稿）
         → drafts/*.md 或 线上收件箱（POST /api/drafts，草稿态）
            → 【人工闸口】后台「收件箱」逐条审核 → 一键发布为档案
               → SEO 缓存自动重建 + 百度自动推送（内置）
               → warco-herald（扇出：各渠道文案）→ 站长复制发布
每周日：warco-dispatch（汇编战报草稿）→ 【人工闸口】后台「编辑部」审阅 → 发布 /w/:issue
```

前台「提供线报」入口是流水线的第六个信源：读者投递 → 后台「收件箱 · 读者线报」→ 有价值的转给 scout 查证。

## 1. 角色分工（五个 skill / 工具）

| 角色 | 载体 | 触发 | 产出 |
| --- | --- | --- | --- |
| 哨兵 | `tools/sentinel.js`（零依赖脚本） | 定时任务，每 2 小时 | `data/sentinel-queue.md` 新信号 + TG 提醒 |
| 侦察 | skill `warco-scout` | 说「跑一次侦察」「查缺补漏」；哨兵报警后 | 经查证的档案草稿（文件或线上收件箱） |
| 立档 | skill `warco-chronicler` | 说「写一条正史 / 野史」 | 单条档案字段（含 front 战区） |
| 战报 | skill `warco-dispatch` | 每周说「汇编战报」 | `/w/:issue` 战报草稿（draft 态） |
| 传令 | skill `warco-herald` | 说「生成分发文案」「这条发出去」 | 各渠道即贴文案（drafts/fanout-*.md） |

## 2. 定时任务

**哨兵（必挂，成本为零）**

- Windows 开发机：`schtasks /create /tn umb-sentinel /sc hourly /mo 2 /tr "node d:\github_code\cursor-warco\tools\sentinel.js"`
- Linux 服务器 cron：`0 0-23/2 * * * cd /opt/cursor-warco && node tools/sentinel.js >> /var/log/umb-sentinel.log 2>&1`
- 首轮只建基线不报警；此后每轮报「新信号」。单源失败不影响整轮（境内网络抓不到 x.ai / reddit 属正常，服务器侧通常可达）。
- TG 提醒（可选）：`data/sentinel.json` 填 `{ "tgBotToken": "…", "tgChatId": "…" }`，或环境变量 `TG_BOT_TOKEN` / `TG_CHAT_ID`。

**人的节奏（配合哨兵）**

- 哨兵 TG 报警且像大事 → 对 agent 说「跑一次侦察，消化哨兵队列」→ 审收件箱 →（大新闻力争 24 小时内立档，实际瓶颈只剩审核的几分钟）
- 每周日：「汇编战报」→ 编辑部审阅 → 发布 → 「给第 N 期战报生成分发文案」→ 各渠道粘贴
- 每月一次：「查缺补漏」（scout 模式 A 全时段扫描）
- 每月顺手：新 series 补 `server.js` 的 `SERIES_PAGES`；作战室补给表核对一遍官方定价页

## 3. 人工闸口（永不自动化的三件事）

1. **发布**：档案 / 战报 / 特稿全部由站长在后台点发布（agent 只能投 draft / 收件箱）。
2. **删除与改写**：红后人设「本系统不删除记录」——后续发展靠新档案 + series 串联，不改写旧档案。
3. **对外账号**：herald 只产文案；X / TG / 公众号的发送键永远在站长手里（将来接 API 自动发，也只发已审内容）。

## 4. 灭活复核（存活窗口的定期巡检）

作战室的「存活窗口」= 有 `·检出` 而最后一个状态节点不是 `·灭活` 的线索（2026-09-02 起；旧「（存活）」孤条仍兼容）。每周汇编战报时顺带执行：

1. 列出全部存活窗口（看 `/warroom`，或查库：`SELECT series FROM events WHERE title LIKE '%·检出%' AND series NOT IN (SELECT series FROM events WHERE title LIKE '%·灭活%')`——灭活后又复燃的线索作战室会单列，以页面为准）。
2. 对每个窗口检索灭活信号：官方 changelog / 论坛公告提到修复；社区出现「patched / 不行了 / 对上了」的讨论。
3. 确认灭活 → 走 chronicler 立「·灭活」档案（同挂 series；**检出档案不动**）→ 作战室与 /d/windows 自动更新。玩法削弱后改版存活立「·变异」，灭活后死灰复燃立「·复燃」，两者都让线索回到存活态。
4. 查无信号 → 保持现状，战报「窗口态势」照实写「存活 N 天」。

## 5. 数据页维护

- `/d/windows`：全自动（库推导），无需维护。
- `/d/versions` 与 `/d/funding`：数据 curated 在 `server.js` 的 `VERSIONS` / `FUNDING` 常量——新版本发布 / 新一轮融资时**立档 + 补一行**，部署即生效。
- 作战室「模型补给表」：后台「补给线」标签页维护；模型上架 / 停供 / 调价时顺手改行（断供类先标 `watch` 观察态）。

## 6. 故障排查

| 现象 | 处理 |
| --- | --- |
| 哨兵某源持续失败 | 看 `node tools/sentinel.js` 输出；页面结构变了就改该源的 `items()`；境内网络抓不到的源挪去服务器跑 |
| 哨兵重复报旧条目 | `data/sentinel-state.json` 被删或损坏——跑一轮重建基线即可（会有一轮误报） |
| 收件箱投递 401 | `data/remote.json` 的 adminKey 过期 / 错误；连错 5 次会被封 15 分钟 |
| 战报期号冲突 | `GET /api/posts` 查已有期号；期号唯一约束在服务端 |
| 作战室「哨所失联」 | 服务器出不去 status.cursor.com（超时 4 秒降级）；不影响其余面板 |
