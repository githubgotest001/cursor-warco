# UMBRELLA 4365 · Cursor 战地纪实

> AI一日，人间一年 —— by Cursor Warco · 战地记者
>
> 一条正史（官方档案），一条野史（民间情报），沿一条时间脊柱由新到旧记录 Cursor 的光与影。
> 仅作记录，不构成立场。域名：[umbrella4365.com](https://umbrella4365.com)

## 文档地图（找东西从这里进）

**一句话分工：设定问 BIBLE，技术问 README，部署问 DEPLOY，增长问 GROWTH，自动化问 AUTOMATION。**

| 我想…… | 去读 |
| --- | --- |
| 了解世界观、文体、固定文案、已定决策与禁忌 | [PROJECT_BIBLE.md](PROJECT_BIBLE.md)（设定集 · **改站/写档案前必读**） |
| 查功能清单、数据模型、API、环境变量 | 本文档（README，只讲技术） |
| 部署 / 迁移 / 备份 / 排障 | [DEPLOY.md](DEPLOY.md) |
| 做站长平台接入、社区分发、外链、复盘 | [GROWTH.md](GROWTH.md) |
| 跑哨兵 / 侦察 / 战报 / 扇出的 agent 编辑部 | [AUTOMATION.md](AUTOMATION.md) |
| 写一条档案 / 批量搜集 / 汇编战报 / 生成分发文案 | `.cursor/skills/` 下的 warco-chronicler / scout / dispatch / herald |
| 弄清 drafts/ 里每个文件是干嘛的、能不能删 | [drafts/README.md](drafts/README.md) |

## 技术栈

零 npm 依赖：`node:http` + `node:sqlite`（需要 **Node.js ≥ 22.13**）。

## 快速开始（本地运行）

```bash
node sync.js pull   # 从线上拉档案镜像建库（首次运行 / 每次让 AI 分析前）
node server.js      # 启动服务，默认端口 4365；Ctrl+C 停止
```

> 本地没有独立的种子数据：**线上库是唯一真源**，本地 `data/chronicle.db` 由 `sync.js pull`
> 生成的只读镜像充当。不 pull 直接 `node server.js` 也能启动（空库）。

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
| `BAIDU_PUSH_TOKEN` | 百度主动推送 token；配置后档案增删改实时推送受影响 URL | 关 |
| `BAIDU_SITE_VERIFY` | 百度站长验证码（首页输出验证 meta） | 关 |
| `GOOGLE_SITE_VERIFY` | Google Search Console 验证码（首页输出验证 meta） | 关 |
| `BING_SITE_VERIFY` | Bing 站长验证码（首页输出验证 meta） | 关 |

> 后四个 SEO 接入变量**推荐改从后台「系统」标签页管理**（存 `data/config.json`，保存即生效
> 免重启，另带百度推送测试按钮与运维指令速查）；环境变量仅作兜底，后台里的非空值优先。

内置防爆破：同一 IP 15 分钟内密钥错 5 次封禁 15 分钟（登录与全部写接口共用计数）。

### 线上 ⇄ 本地同步（sync.js）

**线上库是唯一真源，本地库只是供 AI 分析用的只读镜像。** 让 agent 扫库做内容分析前，
先拉一次镜像保证数据新鲜；改动回写永远走线上（后台或 REST API 逐条）——这样 `/ev/:id`
的 id 稳定不变（已被搜索引擎收录），且自动触发 SEO 缓存重建与百度推送：

```bash
node sync.js pull                 # 线上 → 本地：档案 + 刊物 + 补给表全量镜像，引用图片增量下载
node sync.js push-image 图片路径   # 本地图片 → 线上 /uploads/（需管理密钥），返回可填入 image 字段的路径
```

> **pull 镜像三张内容表**：`events`（档案）、`supply`（作战室补给表）走公开接口；`posts`（编辑部的战报 /
> 特稿，含 draft 态）走 `/api/posts` 需要管理密钥——`data/remote.json` 里有 `adminKey` 就一并镜像，没有则
> 跳过并提示。**不同步**访问日志 / 收件箱 / 线报：访客日志含加盐 IP 哈希（两边盐不同，本来也对不上）且
> 体量大，不出服务器；收件箱与线报是待处置队列，只在线上后台操作。所以本地后台「访客监控」显示的是本机
> 测试流量；**看真实访客数据永远去线上后台**。

站点地址与密钥按优先级取自：命令行参数（`--site` / `--key`）> 环境变量（`UMB_SITE` /
`UMB_ADMIN_KEY`）> `data/remote.json`（`{"site": "…", "adminKey": "…"}`，data/ 已
gitignore 不会泄露）。`pull` 不需要密钥。

> **重要**：首页 SSR、`/ev/:id`、sitemap、RSS 的缓存只在走后台 / API 写入时自动失效。
> 用 `sync.js pull` 或 SQL **直接改库**，正在运行的服务不会感知——必须重启
> （本地 Ctrl+C 后重跑 `node server.js`；线上 `sudo systemctl restart umbrella4365`）。

## 部署

云服务器部署（Nginx + HTTPS + systemd + 备份）见 [DEPLOY.md](DEPLOY.md)。

## 前台功能

- **双线时间树**：正史（左，浅色官方档案）/ 野史（右，深色民间情报），最新在上，向下回溯。
- **检索与筛选**（2026-09-02 起四维叠加）：报头检索框（`/` 键聚焦，匹配标题 / 摘要 / 详情 / 标签 /
  线索 / 战区 / 日期，命中词高亮）× 全部 / 正史 / 野史 × 点卡片标签只看该标签 × 点线索徽标只看该线索；
  任一生效时时间树顶部出现可逐项撤销的筛选条。状态同步到 URL 查询串（`/?q=fable&side=dark&tag=灭活`
  可直接分享；404 页与首页 WebSite JSON-LD 的 SearchAction 都指向 `/?q=`）。报头统计行显示收录总数、
  正史 · 野史分布与最新档案日期。
- **年份导航轨**：桌面端右侧固定的年份列，随滚动高亮视口所在年份，点击平滑跳到该年闸门（`#y-YYYY`）。
- **新入库徽标**：7 天内立档的卡片编号旁亮「● NEW」（按 `created_at` 在客户端推算，不受 SSR 缓存影响）。
- **事件线索**：把漏洞/羊毛窗口的多条事件串成时间线（见下节）。
- **调阅档案**：点卡片弹出详情（详细描述、图片、线索时间线、**同日另一线**双线对照、信源链接）。
  弹层内「‹ 较新 / 较旧 ›」或 ←→ 键沿当前筛选结果翻档；打开弹层会压一条浏览历史，**手机返回键 =
  关闭弹层**而非离开本站（弹层内跳转不叠历史，一次返回全部收起）；`role="dialog"` + 焦点进出归还。
- **分享定位**：每条档案有独立页面 `/ev/<id>`，弹层内「⧉ 链接」一键复制该地址，分享出去带
  事件专属标题与预览卡片；`#ev-<id>` 锚点仍可在时间树内直接定位。
- **社交卡片**：内置 Open Graph / Twitter 卡片与分享图 `public/og.png`，分享到群聊 / 推特有预览。
- **红后作战室 `/warroom`**（2026-08-30 起）：档案库实时推导的战况面板——存活套利窗口与最近灭活
  （按线索的最后一个状态节点判态：series 内有 `·检出` 而最后一个状态节点不是 `·灭活`——含 `·复燃`
  `·变异`——即存活，天数从最近一次检出 / 复燃起算；最后一个是 `·灭活` 即已灭活，窗口 = 首个检出日 →
  该灭活日；2026-09-02 前未挂 series 的「（存活）」孤条仍兼容识别）、模型补给表（`supply` 表，后台
  维护）、战线状态（status.cursor.com 镜像，5 分钟缓存超时降级）。
- **战报周刊 `/w`**：每周战报 `/w/<期号>` 与专题特稿 `/t/<slug>`（`posts` 表，草稿态不对外，
  正文支持空行分段 / `## ` 小节 / `- ` 列表 / `[文字](链接)`）；与档案合流进 RSS。
- **数据页 `/d/*`**：版本史全表 `/d/versions`、融资估值全史 `/d/funding`（两者 curated 在
  `server.js` 的 `VERSIONS` / `FUNDING` 常量）、套利窗口全史 `/d/windows`（全自动库推导）。
- **读者线报**：首页「☏ 提供线报」弹层匿名投递（`/api/tips`，限速 5 条/小时/IP + 蜜罐字段，
  只存 IP 哈希），后台「收件箱」查阅。
- **战区徽标**：`front` 字段非空的档案在卡片 / 弹层 / 档案页打「⌖ 战区」徽标（Claude Code /
  Codex / Copilot / Windsurf / 国产工具 / 模型厂商，名册在 `server.js` 与 `index.html` 的 `FRONTS`）。
- **支援与赞助**：后台「系统」页配置打赏 / TG / 公众号 / X 链接（前台「⛨ 支援本刊」弹层）与
  「补给线」赞助位（sponsorText + sponsorUrl 都配置才在页脚出现，输出带 `rel=sponsored`）。

## SEO / GEO

面向搜索引擎与 AI 爬虫（GPTBot / ClaudeBot / PerplexityBot 等）做了服务端直出与机器可读索引
（站外增长的行动清单另见 [GROWTH.md](GROWTH.md)）：

- **首页 SSR**：`/` 由服务端直出完整时间树 HTML，并内联档案数据（`window.__EVENTS__`），
  不执行 JS 的爬虫也能读到全文；浏览器端脚本检测到直出内容后只做交互接线（hydration），
  不重复渲染。入场动画通过 `.js` 类门控——无 JS 环境下内容直接可见，不构成隐藏文本。
  canonical / og:url / 站长验证 meta / WebSite JSON-LD 由服务端按 `SITE_URL` 注入。
- **独立档案页**：每条档案有可索引的 `/ev/<id>` 页面，含专属 title / description / canonical /
  Open Graph 卡片 / `article:tag` / Article + BreadcrumbList JSON-LD（日期、图片、信源 `isBasedOn`），
  并带较新/较旧翻页、事件线索内链、**同日另一线**（双线对照）与**同类档案**（同标签最近 3 条）横向内链、
  线索聚合页链接，方便爬虫沿内链遍历全部档案。页面顶部有与 BreadcrumbList 一致的可见面包屑
  （列表页 / 刊物页同样由 JSON-LD 直接渲染，标记与内容不会漂移）。
- **聚合着陆页**：文学化的档案标题拦不住搜索词，聚合页用搜索者的语言承接检索意图——
  `/s/<slug>` 事件线索页（如 `/s/funding` 承接「cursor 融资历史」、`/s/spacex` 承接
  「spacex 收购 cursor」；slug 与导语配置在 `server.js` 的 `SERIES_PAGES`，未配置的新线索
  回退中文 URL，已配置线索的中文路径 301 到 slug）、`/y/<year>` 年份大事记页、`/about` 关于本站
  （查证纪律，E-E-A-T 信号 + Organization JSON-LD + **常见问题 FAQPage**：8 组用搜索者提问方式复述
  库内已查证事实的问答，融资一问直接由 `FUNDING` 常量生成，是生成式引擎最常引用的块）。全部带
  CollectionPage/ItemList JSON-LD，首页页脚有索引导航入口。首页 WebSite JSON-LD 带 `publisher`
  与 `SearchAction`（`/?q={search_term_string}`，由客户端检索承接）。
- **机器可读索引**：`/robots.txt`（含 Sitemap 声明、放行全部爬虫与 `/api/events`、屏蔽其余
  `/api/`）、`/sitemap.xml`（首页 + 聚合页 + 全部档案页，含年份页在内均带 lastmod）、`/feed.xml`
  （RSS 2.0，`description` 纯文本摘要 + `content:encoded` 全文 HTML，阅读器内可读全文）、
  `/llms.txt` 与 `/llms-full.txt`（LLM 友好的 Markdown 目录 / 全文，含英文站点简介与线索页目录）。
  全部 HTML 页面带 `max-image-preview:large`。404 是一页红后口吻的档案式页面（检索框 + 站内去路），
  静态资源类路径仍回纯文本 404。
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
| `front` | 战区代号（选填，2026-08-30 起）。空 = Cursor 主战线；邻圈档案填 `claude-code` / `codex` / `copilot` / `windsurf` / `devin` / `replit` / `cn-tools` / `model-labs`（名册在 `server.js` 的 `FRONTS`，前台经 `window.__FRONTS__` 注入，后台经 `/api/meta`） |
| `created_at` / `updated_at` | 创建 / 最近修改时间（自动，后台列表可按其排序） |

另有四张辅助表（建表语句在 `server.js`，老库升级跑一次 `node tools/migrate-2026-08-30.js`）：
`posts`（刊物：weekly 战报 / feature 特稿，draft/published 两态）、`drafts`（草稿收件箱：侦察 agent
投稿 + 核查要点，审核发布后转正为 events 并回写 event_id）、`tips`（读者线报）、`supply`（模型补给表）。

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
server.js          零依赖服务端（静态资源 + REST API + SSR/SEO + 聚合页 + 作战室/刊物/数据页 + 百度推送 + 鉴权 + 访问记录）
sync.js            线上 ⇄ 本地同步工具：pull 拉档案 / 刊物 / 补给表镜像 + 图片，push-image 传图（线上库为唯一真源）
GROWTH.md          增长作战手册：站长平台接入、社区分发、外链与复盘（站外动作清单）
AUTOMATION.md      自动化手册：哨兵 / 侦察 / 战报 / 扇出的 agent 编辑部操作规程
tools/
  sentinel.js      信源哨兵：定时轮询 L0/L2 信源，diff 新信号进 data/sentinel-queue.md（可推 TG）
  seed-supply.js   模型补给表初始数据（一次性）
  migrate-2026-08-30.js  一次性迁移：events.front + posts/drafts/tips/supply 表（幂等）
data/chronicle.db  SQLite 数据库（本地为 sync.js pull 的只读镜像，已 gitignore）
data/remote.json   sync.js 的线上地址与密钥（可选，已 gitignore）
public/
  index.html       前台：垂直双线时间树（最新在上 · 左正史 · 右野史）
  admin.html       后台：RED QUEEN 终端（档案管理 + 收件箱 + 编辑部 + 补给线 + 访客监控 + 系统）
  logo.svg         站标：保护伞红白伞面 × Cursor 六边形 × 中央光标
  favicon.ico      收藏夹图标（32/16px，重新生成流程见 drafts/icon-render.html 头部注释）
  apple-touch-icon.png  iOS 主屏图标（180px）
  fonts/           自托管字体子集（JetBrains Mono latin 可变字重 + 手写体印章字符，共 34KB）
  uploads/         后台上传的图片
```

## API 摘要

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/events` | 否 | 事件列表。筛选 `side` `q` `series` `tag` `front`；排序 `sort`(date/created_at/updated_at/title) `order`(asc/desc)；分页 `page` `pageSize`（不传 `page` 返回全部，供前台时间轴）。返回含 `total` |
| GET | `/api/events/:id` | 否 | 单条事件 |
| GET | `/api/meta` | 否 | 已用过的标签与线索概览（供后台下拉、前台线索） |
| POST | `/api/events` | 是 | 新建 |
| PUT | `/api/events/:id` | 是 | 更新 |
| DELETE | `/api/events/:id` | 是 | 删除 |
| POST | `/api/upload` | 是 | 图片上传（JSON base64，≤10MB） |
| GET | `/api/stats?days=&rpage=&rsize=` | 是 | 访问统计（PV/UV、趋势、版面热度聚合、热门路径 TOP 20 带标题反查、来源、嗅探记录、最近访问分页；全部跟随 days） |
| POST | `/api/settings/test-tg` | 是 | 向配置的 TG 频道发测试消息（发布自动推送的链路验证） |
| GET / PUT | `/api/settings` | 是 | SEO 接入配置 + 频道与支援链接的读取与保存（GET 附当前 git 版本），保存即生效 |
| POST | `/api/settings/test-baidu` | 是 | 用当前 token 把首页推送一次百度，返回百度原始响应（验证链路） |
| POST | `/api/system/deploy` | 是 | 一键部署：`git pull --ff-only` → `node --check` 自检 → systemd 环境下退出进程由 `Restart=always` 拉起新版；自检不过拒绝重启。固定流程无参数，迁移类升级仍走 SSH |
| GET | `/api/system/status` / `/api/system/logs` | 是 | 状态体检（版本/进程/库与图片体积/内容计数）与运行日志（进程内环形缓冲 300 行，重启即清） |
| POST | `/api/system/backup` / `/api/system/sentinel` / `/api/system/restart` | 是 | 在线备份（`VACUUM INTO` 到 `data/backups/`，留 10 份，仅库）· 服务器跑一轮哨兵 · 重启（仅 systemd 环境） |
| GET / POST | `/api/posts`；PUT / DELETE `/api/posts/:id` | 是 | 刊物（战报 / 特稿）管理；发布态变更自动推百度 |
| GET / POST | `/api/drafts`；PUT / DELETE `/api/drafts/:id` | 是 | 草稿收件箱（侦察 agent 投稿，含 verify 核查要点） |
| POST | `/api/drafts/:id/publish` | 是 | 审核发布：草稿（可带最终修改）→ 正式档案，草稿标记 accepted |
| POST | `/api/tips` | 否 | 读者线报投递（8–1000 字，限速 5 条/小时/IP，蜜罐字段 `website`） |
| GET | `/api/tips`；PUT / DELETE `/api/tips/:id` | 是 | 线报查阅 / 标记已读 / 删除 |
| GET | `/api/supply` | 否 | 模型补给表（作战室数据源，公开只读） |
| POST | `/api/supply`；PUT / DELETE `/api/supply/:id` | 是 | 补给表维护 |
| POST | `/api/auth/check` | — | 校验管理密钥（含防爆破限速） |

写操作需请求头 `X-Admin-Key: <ADMIN_KEY>`。SSR 页面：`/warroom`、`/w`、`/w/:issue`、`/t/:slug`、
`/d/versions|funding|windows` 已全部进 sitemap / llms.txt；刊物与档案合流进 RSS。
