# 上线操作手册 · 2026-08-30（Phase 0 + 情报站升级 一次跑完）

> 本手册把两件事合成一个时序：① GROWTH.md 第 0 节一直待执行的上线前置（全删全增 → 站长平台）；
> ② 2026-08-30 情报站升级（作战室 / 刊物 / 收件箱 / 数据页 / 战区 / 哨兵）的部署。
> 顺序错了会返工，照抄执行即可。执行完把 PROJECT_BIBLE 待办勾掉、本文件归档。
> 标注【人】的步骤只能站长做（要登录账号）；其余可让 agent 代跑（授权后）。

## A · 本地收尾（开发机）

1. 【人】检查工作区改动并提交推送：本次改动含 server.js / 前后台 / skills / tools / 文档，
   `git add -A && git commit && git push`（提交信息建议：「情报站升级：作战室、战报周刊、收件箱、数据页、战区与信源哨兵」）。
2. 确认 `data/remote.json` 的 site / adminKey 正确（`node sync.js pull` 能拉到 89 条即对）。

## B · 服务器部署（SSH；每条前缀 `cd /opt/cursor-warco`）

```bash
# 1. 备份（全删全增前必做）
sudo /opt/cursor-warco/backup.sh

# 2. 拉新代码（带来 full-rewrite SQL 与全部新功能）
sudo -u umbrella git pull

# 3. 线上库全删全增（最后一次！此后 id 永久化，不再全删全增）
sudo -u umbrella sqlite3 data/chronicle.db ".read drafts/full-rewrite-2026-08-29.sql"
sudo -u umbrella sqlite3 data/chronicle.db "SELECT COUNT(*) FROM events;"   # 预期 89

# 4. 一次性迁移（events.front 列 + posts/drafts/tips/supply 四张新表，幂等可重跑）
sudo -u umbrella node tools/migrate-2026-08-30.js

# 5. 重启并验收
sudo systemctl restart umbrella4365
curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/            # 200
curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/warroom     # 200
curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/w           # 200
curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/d/windows   # 200
curl -s https://umbrella4365.com/api/events | head -c 120; echo               # JSON 89 条
```

## C · 内容初始化（开发机，走线上 API）

```bash
# 6. 补给表初始数据（9 行，出自站内档案口径；之后维护走后台「补给线」）
node tools/seed-supply.js
```

7. 【人】后台录入并发布创刊内容（也可授权 agent 投草稿态后自己点发布）：
   - `drafts/dispatch-001.md` → 编辑部 → 新建战报（第 1 期）→ 预览 `/w/1` → 发布
   - `drafts/feature-spacex.md` → 编辑部 → 新建特稿（slug `spacex-merger`）→ 预览 → 发布

## D · 搜索引擎接入（【人】· GROWTH.md 第 2 节原文照做）

8. 百度资源平台：验证码与推送 token 填后台「系统」页 → 点「测试百度推送」→ 提交 sitemap。
9. GSC：验证 → 提交 sitemap；Bing：从 GSC 一键导入。
   ⚠ 顺序纪律：B-3 全删全增必须已完成，sitemap 才能提交（id 永久化前置）。

## E · 自动化常驻（哨兵 + 定时侦察）

10. 哨兵定时（推荐先开发机，成本为零；服务器可同时跑一份互为备份）：
    - Windows：`schtasks /create /tn umb-sentinel /sc hourly /mo 2 /tr "node d:\github_code\cursor-warco\tools\sentinel.js"`
    - 服务器 cron：`0 0-23/2 * * * cd /opt/cursor-warco && node tools/sentinel.js >> /var/log/umb-sentinel.log 2>&1`
    - 【人】可选 TG 提醒：`data/sentinel.json` 填 `{ "tgBotToken": "…", "tgChatId": "…" }`（BotFather 建 bot）
11. 侦察节奏（见 AUTOMATION.md）：每周对 agent 说「汇编战报」出周刊；哨兵报警后说「跑一次侦察，消化哨兵队列」。

## F · 渠道与分发（【人】）

12. 注册渠道：TG 频道、X 账号、即刻、（可选）公众号——注册完把链接填进后台「系统 → 频道与支援链接」，
    前台「支援本刊」弹层即时生效；打赏想开就注册爱发电，同样只填链接。
13. 社区错峰首发：照 `drafts/launch-posts-2026-08-30.md` 执行（Linux.do → 即刻 → V2EX → 掘金长文 → 第 2 周 Show HN）。

## G · 收尾

14. 勾掉 PROJECT_BIBLE 第 11 节「线上库全删全增待执行」待办，删除 `drafts/full-rewrite-2026-08-29.sql`。
15. 一周后回 GROWTH.md 第 7 节做第一次复盘（收录量 / 周 UV / 来源）。
