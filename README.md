# UMBRELLA 4365 · Cursor 战地纪实

> AI一日，人间一年 —— by Cursor Warco · 战地记者
>
> 一条正史（官方档案），一条野史（民间情报），沿一条时间脊柱由新到旧记录 Cursor 的光与影。
> 仅作记录，不构成立场。域名：[umbrella4365.com](https://umbrella4365.com)
>
> 本文档只讲技术。网站的世界观设定、文风调性、后台使用与运营纪律见 [PROJECT_BIBLE.md](PROJECT_BIBLE.md)（项目设定集）。

## 技术栈

零 npm 依赖：`node:http` + `node:sqlite`（需要 **Node.js ≥ 22.13**）。

## 快速开始（本地运行）

```bash
node seed.js      # 首次建库并灌入初始档案（已有数据时自动跳过）
node server.js    # 启动服务，默认端口 4365；Ctrl+C 停止
```

- 前台（时间树）：http://localhost:4365/
- 管理后台：入口路径是**隐藏的**——看启动日志打印的地址（也记录在 `data/config.json`）。
  `/admin` 与 `/admin.html` 恒为 404，防止路径嗅探。
- 默认管理密钥：`redqueen-4365`

环境变量：

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `PORT` | 监听端口 | `4365` |
| `ADMIN_KEY` | 管理后台密钥（部署公网前务必修改） | `redqueen-4365` |
| `ADMIN_PATH` | 后台隐藏入口路径（不含 `/`） | 自动生成随机值，存 `data/config.json` |
| `TRUST_PROXY` | 置 `1` 表示在 Nginx 等反代之后（取 X-Forwarded-For 作为客户端 IP） | 关 |
| `SITE_URL` | 站点对外地址，生成 canonical / sitemap / RSS 的绝对链接 | `https://umbrella4365.com` |
| `BAIDU_PUSH_TOKEN` | 百度主动推送 token；设置后档案增删改会实时把受影响 URL 推给百度 | 关 |
| `BAIDU_SITE_VERIFY` | 百度站长验证码（首页输出验证 meta） | 关 |
| `GOOGLE_SITE_VERIFY` | Google Search Console 验证码（首页输出验证 meta） | 关 |
| `BING_SITE_VERIFY` | Bing 站长验证码（首页输出验证 meta） | 关 |

内置防爆破：同一 IP 15 分钟内密钥错 5 次封禁 15 分钟（登录与全部写接口共用计数）。

### 本地重建数据（全删全增）

```bash
node seed.js --force    # 按 seed.js 快照清空重灌（等效：sqlite3 data/chronicle.db ".read drafts/full-rewrite-<日期>.sql"）
node server.js          # 重建后必须重启服务
```

> **重要**：首页 SSR、`/ev/:id`、sitemap、RSS 的缓存只在走后台 API 写入时自动失效。
> 用 `seed.js --force` 或 SQL **直接改库**，正在运行的服务不会感知——必须重启
> （本地 Ctrl+C 后重跑 `node server.js`；线上 `sudo systemctl restart umbrella4365`）。

## 部署

云服务器部署（Nginx + HTTPS + systemd + 备份）见 [DEPLOY.md](DEPLOY.md)。

## 前台功能

- **双线时间树**：正史（左，浅色官方档案）/ 野史（右，深色民间情报），最新在上，向下回溯。
- **顶部筛选**：全部 / 只看正史 / 只看野史；报头实时显示收录总数与正史 · 野史分布。
- **事件线索**：把漏洞/羊毛窗口的多条事件串成时间线（见下节）。
- **调阅档案**：点卡片弹出详情（详细描述、图片、线索时间线、信源链接）。
- **分享定位**：每条档案有独立页面 `/ev/<id>`，弹层内「⧉ 链接」一键复制该地址，分享出去带
  事件专属标题与预览卡片；`#ev-<id>` 锚点仍可在时间树内直接定位。
- **社交卡片**：内置 Open Graph / Twitter 卡片与分享图 `public/og.png`，分享到群聊 / 推特有预览。

## SEO / GEO

面向搜索引擎与 AI 爬虫（GPTBot / ClaudeBot / PerplexityBot 等）做了服务端直出与机器可读索引
（站外增长的行动清单另见 [GROWTH.md](GROWTH.md)）：

- **首页 SSR**：`/` 由服务端直出完整时间树 HTML，并内联档案数据（`window.__EVENTS__`），
  不执行 JS 的爬虫也能读到全文；浏览器端脚本检测到直出内容后只做交互接线（hydration），
  不重复渲染。入场动画通过 `.js` 类门控——无 JS 环境下内容直接可见，不构成隐藏文本。
  canonical / og:url / 站长验证 meta / WebSite JSON-LD 由服务端按 `SITE_URL` 注入。
- **独立档案页**：每条档案有可索引的 `/ev/<id>` 页面，含专属 title / description / canonical /
  Open Graph 卡片 / Article + BreadcrumbList JSON-LD（日期、图片、信源 `isBasedOn`），并带
  较新/较旧翻页、事件线索内链与线索聚合页链接，方便爬虫沿内链遍历全部档案。
- **聚合着陆页**：文学化的档案标题拦不住搜索词，聚合页用搜索者的语言承接检索意图——
  `/s/<slug>` 事件线索页（如 `/s/funding` 承接「cursor 融资历史」、`/s/spacex` 承接
  「spacex 收购 cursor」；slug 与导语配置在 `server.js` 的 `SERIES_PAGES`，未配置的新线索
  回退中文 URL）、`/y/<year>` 年份大事记页、`/about` 关于本站（查证纪律，E-E-A-T 信号 +
  Organization JSON-LD）。全部带 CollectionPage/ItemList JSON-LD，首页页脚有索引导航入口。
- **机器可读索引**：`/robots.txt`（含 Sitemap 声明、放行全部爬虫与 `/api/events`、屏蔽其余
  `/api/`）、`/sitemap.xml`（首页 + 聚合页 + 全部档案页，带 lastmod）、`/feed.xml`（RSS 2.0）、
  `/llms.txt` 与 `/llms-full.txt`（LLM 友好的 Markdown 目录 / 全文，含英文站点简介与线索页目录）。
- **百度主动推送**：配置 `BAIDU_PUSH_TOKEN` 后，档案增删改自动把受影响的 URL（档案页、首页、
  所属线索页与年份页）实时推送百度，境内收录缩短到分钟级。
- **传输层**：文本响应 brotli/gzip + ETag/304；字体子集自托管（`public/fonts/`，已移除
  Google Fonts 外链，中文走系统字体栈）；`/api/*` 带 `X-Robots-Tag: noindex` 防 JSON 被当作
  重复内容收录（`/api/events` 允许抓取但不进索引，供 AI 爬虫读取）。
- 以上动态产物全部内存缓存，档案增删改时自动失效重建；站点地址由环境变量 `SITE_URL` 控制。

## 数据模型（events）

| 字段 | 说明 |
| --- | --- |
| `side` | `main` 正史（脊柱之左） / `dark` 野史（脊柱之右） |
| `date` | 事件日期，`YYYY-MM-DD`（到日） |
| `tag` | 标签，如 融资 / 羊毛 / 事故 / 玩梗（后台下拉选已有或手输） |
| `title` | 标题 |
| `summary` | 摘要（时间轴卡片显示） |
| `detail` | 详细描述（前台"调阅档案"弹层显示，空行分段） |
| `image` | 图片（`/uploads/…` 或外链 URL，后台可直接上传） |
| `series` | 事件线索（选填）。同一漏洞/羊毛窗口的多条事件填相同线索名，前台串成时间线并显示窗口跨度 |
| `source` | 信源链接（选填）。原始报道/官方公告 URL，前台"调阅档案"可点击追溯 |
| `created_at` / `updated_at` | 创建 / 最近修改时间（自动，后台列表可按其排序） |

## 事件线索（漏洞 / 羊毛窗口）

漏洞白嫖类事件常是一个有始有终的窗口（如「8.1 发现 → 8.24 修复」）。给这些事件填相同的
`series`，它们就会被关联起来：卡片上出现可点击的线索徽标，「调阅档案」弹层里列出该线索的
完整时间线并计算**窗口跨度天数**，帮圈内人一眼判断某个路子现在还灵不灵。后台新建/编辑时
`series` 支持下拉选已有线索或手输新线索。

## 访问记录

后台「访客监控」标签页可看 PV / UV、每日趋势、热门路径、来源，以及 4xx 嗅探记录
（谁在扫 `/admin`、`/wp-admin` 一目了然）。设计上做了四件事防止它变成负担或风险：

- **不记静态资源**：`.svg/.png/.css/.js` 等正常命中不落库，避免一次访问产生七八条噪音；4xx 一律记录
- **去重**：同一 IP 同一路径 60 秒内只记一次
- **缓冲写入**：内存攒够 50 条或每 5 秒批量落库，不让每个请求都同步写 SQLite 阻塞事件循环
- **限制体积**：仅保留 90 天，且总行数上限 20 万，超出自动清理，防止被刷请求撑爆磁盘

隐私方面只存 IP 的加盐哈希（盐持久化在 `data/config.json`），不落明文；路径、UA、Referer
均截断到 200 字符。这些字段都是访问者可控的，后台渲染时全部经过转义，避免恶意 UA 变成
针对管理员的存储型 XSS。

## 目录结构

```
server.js          零依赖服务端（静态资源 + REST API + SSR/SEO + 聚合页 + 百度推送 + 鉴权 + 访问记录）
seed.js            建库 + 初始档案快照（2026-08-29：正史 51 / 野史 38 共 89 条、10 条事件线索；线上以 data/chronicle.db 为准）
GROWTH.md          增长作战手册：站长平台接入、社区分发、外链与复盘（站外动作清单）
data/chronicle.db  SQLite 数据库（运行时生成，已 gitignore）
public/
  index.html       前台：垂直双线时间树（最新在上 · 左正史 · 右野史）
  admin.html       后台：RED QUEEN 终端（档案管理 + 访客监控）
  logo.svg         站标：保护伞红白伞面 × Cursor 六边形 × 中央光标
  favicon.ico      收藏夹图标（32/16px，重新生成流程见 drafts/icon-render.html 头部注释）
  apple-touch-icon.png  iOS 主屏图标（180px）
  fonts/           自托管字体子集（JetBrains Mono latin 可变字重 + 手写体印章字符，共 34KB）
  uploads/         后台上传的图片
```

## API 摘要

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/events` | 否 | 事件列表。筛选 `side` `q` `series`；排序 `sort`(date/created_at/updated_at/title) `order`(asc/desc)；分页 `page` `pageSize`（不传 `page` 返回全部，供前台时间轴）。返回含 `total` |
| GET | `/api/events/:id` | 否 | 单条事件 |
| GET | `/api/meta` | 否 | 已用过的标签与线索概览（供后台下拉、前台线索） |
| POST | `/api/events` | 是 | 新建 |
| PUT | `/api/events/:id` | 是 | 更新 |
| DELETE | `/api/events/:id` | 是 | 删除 |
| POST | `/api/upload` | 是 | 图片上传（JSON base64，≤10MB） |
| GET | `/api/stats?days=&rpage=&rsize=` | 是 | 访问统计（PV/UV、趋势、热门路径、来源、嗅探记录、最近访问分页） |
| POST | `/api/auth/check` | — | 校验管理密钥（含防爆破限速） |

写操作需请求头 `X-Admin-Key: <ADMIN_KEY>`。
