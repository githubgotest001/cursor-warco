# UMBRELLA 4365 · 增长作战手册（GROWTH）

> **这份文档是什么**：站外增长的行动清单——搜索引擎接入、社区分发、外链建设、度量复盘。
> 站内的 SEO/GEO 能力已全部写进代码（见第 1 节清单），本手册只收录**需要站长人工完成**的动作。
> 配套阅读：技术实现见 `README.md`「SEO / GEO」，部署操作见 `DEPLOY.md`。
>
> 战略一句话：**用「Cursor 中文编年史 / 大事记」这组细分词建立标杆**——
> 靠时效（大新闻 24 小时内立档）+ 完整（正史野史双线 + 线索聚合）构成别人抄不走的壁垒。
>
> 创建：2026-08-29

---

## 0. 上线时序（先读，顺序错了会返工）

> **2026-08-30 起执行合并版时序**：`drafts/launch-runbook-2026-08-30.md` 已把本节与情报站升级
> 部署（迁移脚本、补给表初始化、创刊内容、哨兵定时）合成一份可照抄的手册，照它跑即可。骨架不变：

```
① 备份 → git pull → 线上库全删全增（最后一次）→ node tools/migrate-2026-08-30.js → restart
        ↓  全删全增会重排全部 /ev/:id，必须赶在搜索引擎收录之前完成
② 补给表初始化 + 创刊内容（战报第 1 期 / SpaceX 特稿）后台发布
        ↓
③ 后台「系统」页填验证码与推送 token（保存即生效，免重启；见第 2 节）
        ↓
④ 站长平台验证 + 提交 sitemap（第 2 节）
        ↓
⑤ 哨兵定时任务挂上（AUTOMATION.md 第 2 节）→ 社区分发首发（第 3 节）
```

> **id 永久化纪律**：完成 ① 之后，档案 id 即视为永久 URL（已被搜索引擎与外部分享引用），
> **不再做全删全增**——内容修订走后台逐条编辑，结构调整用 UPSERT 类脚本保 id 不变。

---

## 1. 站内已就位的武器（部署后自动生效，无需人工）

| 能力 | 说明 |
| --- | --- |
| 聚合着陆页矩阵 | 10 个线索页 `/s/:slug`（融资/并购/模型大战…）+ 5 个年份大事记 `/y/:year` + `/about`，全部 SSR 直出、带 CollectionPage/BreadcrumbList 结构化数据，拦截「cursor 融资」「spacex 收购 cursor」类搜索词 |
| 红后作战室 `/warroom` | 回访型页面：套利窗口存活状态 / 最近灭活 / 模型补给表 / 战线状态，拦截「cursor 羊毛 还能用吗」「cursor 模型 价格」「cursor 挂了」类意图（2026-08-30 上线） |
| 战报周刊 `/w` | 每周一期的内容节奏发动机，同时是公众号 / 社区分发的内容单元与 RSS 订阅钩子 |
| 数据页 `/d/*` | 版本史 / 融资估值史 / 套利窗口史三张速查表——长期 SEO 资产，拦截数据型检索意图 |
| 读者线报入口 | 首页「☏ 提供线报」匿名投递 → 后台收件箱，把读者变成信源网络 |
| 百度主动推送 | 档案与刊物增删改时自动把受影响 URL 推给百度（后台「系统」页配 token，见 2.1） |
| 站长验证 meta | 三大平台的验证码在后台「系统」页填写，保存即生效（见 2.1–2.3），无需改代码或重启 |
| 字体自托管 | 已移除 Google Fonts（境内不可达的渲染阻塞源）；mono/手写体子集共 34KB 本地托管，中文走系统字体栈 |
| brotli + gzip | 全部文本响应压缩，brotli 优先 |
| 机器可读层 | robots.txt（放行 AI 爬虫与 `/api/events`）、sitemap.xml（含聚合页）、RSS、llms.txt / llms-full.txt（含英文站点简介） |
| 图标全家桶 | favicon.ico / apple-touch-icon.png / SVG icon（重新生成流程见 `drafts/icon-render.html` 头部注释） |

SEO 接入配置（token / 验证码）在**后台「系统」标签页**填写，保存即生效、免重启，
存储于服务器 `data/config.json`（同名环境变量 `BAIDU_PUSH_TOKEN` / `BAIDU_SITE_VERIFY` /
`GOOGLE_SITE_VERIFY` / `BING_SITE_VERIFY` 仍可用作兜底，后台非空值优先）：

| 配置项 | 用途 | 哪里拿 |
| --- | --- | --- |
| 百度站点验证码 | 百度站点验证 meta | ziyuan.baidu.com → 站点管理 → HTML 标签验证的 content 值 |
| 百度推送 TOKEN | 百度主动推送 | ziyuan.baidu.com → 普通收录 → API 提交的 token |
| Google 验证码 | GSC 验证 meta | search.google.com/search-console → HTML 标记验证的 content 值 |
| Bing 验证码 | Bing 验证 meta | bing.com/webmasters → HTML Meta 标记的 content 值 |

---

## 2. 第一周：搜索引擎接入（一次性网页操作）

### 2.1 百度搜索资源平台（境内已备案，优先做）

1. [ziyuan.baidu.com](https://ziyuan.baidu.com) → 用户中心 → 站点管理 → 添加 `https://umbrella4365.com`
2. 验证方式选「HTML 标签」，把 content 值填进后台「系统」页的**百度站长验证码**并保存，回平台点验证
3. 「普通收录」→「sitemap」提交 `https://umbrella4365.com/sitemap.xml`
4. 「普通收录」→「API 提交」拿 token，填进后台「系统」页的**百度主动推送 TOKEN**并保存
5. 验证推送生效：直接点「系统」页的「⟳ 测试百度推送」按钮，显示「推送成功 N 条」即链路通
   （日常增删改档案会自动推送，`journalctl -u umbrella4365 -n 20` 可见 `[百度推送]` 日志）
6. 有「快速收录」配额的话（需移动适配或小程序等条件），同样在普通收录页申请

### 2.2 Google Search Console

1. [search.google.com/search-console](https://search.google.com/search-console) → 资源类型选「网址前缀」`https://umbrella4365.com`
2. 验证方式选「HTML 标记」，content 值填进后台「系统」页的 **Google 验证码**并保存，回平台点验证
   （若域名 DNS 在手上，用「域名」资源 + DNS TXT 验证也行，无需填后台）
3. 「站点地图」提交 `sitemap.xml`
4. 一周后回来看「网页索引」覆盖率与「效果」里的查询词

### 2.3 Bing 与其他（顺带，10 分钟）

- [bing.com/webmasters](https://www.bing.com/webmasters)：支持从 GSC 一键导入；覆盖 Bing / DuckDuckGo / ChatGPT 搜索
- 360 站长（zhanzhang.so.com）、搜狗站长（zhanzhang.sogou.com）、神马（zhanzhang.sm.cn）：
  各提交一次 sitemap 即可，优先级低，有空再做

---

## 3. 分发首发（一次性流量脉冲 + 初始外链）

> 发帖姿势：**以「我做了个东西」的分享体，不是广告体**。附 2–3 张有梗的档案截图
> （野史卡的视觉本身就是传播素材），链接给首页或最应景的线索页。
> 各社区一周内错峰发，别同一天轰炸。
> **即贴即用的全渠道文案包已备好：`drafts/launch-posts-2026-08-30.md`**（含 Linux.do / V2EX /
> 即刻 / 掘金选题 / 知乎策略 / X 首发线程 / Show HN 英文稿与发布追踪表）。

| 渠道 | 建议动作 | 备注 |
| --- | --- | --- |
| Linux.do | 发「我把 Cursor 的正史和野史做成了双线时间轴」帖，重点晒野史线（套利窗口检出/灭活、事故档案） | Cursor 中文讨论浓度最高的社区，野史题材天然契合；置顶回复贴 `/s/quota-lock` 这类线索页 |
| V2EX | 「分享创造」节点发帖，侧重技术叙事（零依赖 Node + SSR + llms.txt） | 技术人群，README 的技术卖点就是素材 |
| 即刻 | AI 编程相关圈子发短内容 + 截图 | 轻量，重视觉 |
| 掘金 / 少数派 | 把一条线索写成盘点长文（如「Cursor 融资简史」「SpaceX 收购 Cursor 全过程」），文末注明整理自本站并链回线索页 | 长文平台自带搜索权重，等于给线索页做外链 |
| 知乎 | 在「如何评价 Cursor XX」「Cursor 值得用吗」类问题下用档案内容作答，链到对应线索页 | 挑浏览量大的问题，答案要有信息增量，别只贴链接 |
| X / Twitter 中文圈 | Cursor 官方或大 V 发布新动态时，quote 转发并附上本站对应档案链接 | 蹭时效，见第 4 节 |

---

## 4. 持续节奏（成为标杆的根本 · 2026-08-30 起自动化承重，详见 AUTOMATION.md）

- **大新闻小时级立档**：哨兵（`tools/sentinel.js`，每 2 小时轮询）TG 报警 → 对 agent 说
  「跑一次侦察，消化哨兵队列」→ 后台收件箱一键审核发布（百度推送自动触发）→
  「生成分发文案」发 1–2 个应景渠道。人工环节只剩审核与粘贴。
- **每周日**：「汇编战报」→ 编辑部审阅发布 `/w/:issue` → 战报扇出全渠道（公众号 / TG / 即刻）；
  顺带做一次存活窗口灭活复核（AUTOMATION.md 第 4 节）
- **每月**：跑一次 warco-scout 查缺模式；把新 series 补进 `SERIES_PAGES`；新版本 / 新融资补
  `VERSIONS` / `FUNDING` 常量；补给表对一遍官方定价页
- **RSS / llms.txt 常驻曝光**：已在页脚（刊物与档案合流推送）；有人问「怎么订阅」甩 `/feed.xml`
  或前台「⛨ 支援本刊」弹层

---

## 5. 外链建设（细水长流）

- [ ] GitHub 上搜「awesome-cursor」类清单，提 PR 收录本站（分类可选 community/resources）
- [ ] 中文 AI 导航站 / 工具集网站的收录提交（搜「AI 导航 提交收录」逐个投）
- [ ] 自己的 GitHub 仓库 / 个人主页 / 博客加上本站链接
- [ ] 给写过 Cursor 长文的中文博主留言，档案可作时间线参考（合适再提，别硬广）

---

## 6. 可选项（按需启用）

| 项目 | 说明 | 现状 |
| --- | --- | --- |
| 渠道矩阵 | TG 频道 / X / 即刻 / 公众号——注册后把链接填进后台「系统 → 频道与支援链接」，前台「⛨ 支援本刊」弹层即时生效；发什么由 warco-herald 出文案 | 待注册（见 PROJECT_BIBLE 待办） |
| 打赏 | 爱发电 / GitHub Sponsors，链接同样走后台配置；未配置时支援弹层只展示订阅入口 | 待注册 |
| 「补给线」赞助位 | 后台「系统」页配文案 + 链接即上墙（首页页脚，`rel=sponsored`）；接单纪律见 PROJECT_BIBLE 第 17 条——周报订阅约 1k 后再主动招商 | 已就位未启用 |
| 情报订阅（付费） | 灭活预警推送 / 订阅者简报，付「时效与便捷」的钱、免费站保留全部内容。先用打赏与赞助位验证付费意愿再定（PROJECT_BIBLE 第 17 条护栏） | 远期，不动手 |
| X 账号 meta | 有账号后在 `server.js`/`index.html` 的 head 补 `<meta name="twitter:site" content="@账号">` | 未注册 |
| 国内 CDN | 已备案可用（阿里云/腾讯云 CDN），加速静态资源与图片；HTML 本身是动态 no-cache，收益主要在图片与抗扫描 | 流量起来再上 |
| 百度统计 | 对关键词来源报告有帮助，但与本站「自建日志、不接第三方」的隐私立场冲突；平台自带的搜索词报告（GSC + 百度资源平台）通常够用 | 默认不接 |
| `__EVENTS__` 瘦身 | 首页内联数据含 detail 全文，档案量翻倍后考虑去掉 detail 改按需请求（`/api/events/:id` 已就位） | 观察项，89 条时无碍 |

---

## 7. 度量与复盘

**看什么**：

- GSC「效果」与百度资源平台「流量与关键词」：展现量、点击量、关键词排名（每两周看一次）
- 后台「访客监控」的 Referer 面板：哪个分发渠道真的带来了人
- sitemap 提交页的收录量曲线：聚合页与档案页是否被吃进索引

**目标关键词清单**（在百度与 Google 各自搜，记录排名变化）：

| 关键词 | 承接页 | 首次收录 | 排名记录 |
| --- | --- | --- | --- |
| cursor 大事记 | `/` | | |
| cursor 时间线 / 编年史 | `/` | | |
| cursor 融资历史 / cursor 估值 | `/s/funding` | | |
| spacex 收购 cursor | `/s/spacex` | | |
| cursor composer 模型 | `/s/composer` | | |
| cursor 删库 / cursor 事故 | `/s/ai-incidents` | | |
| cursor 定价 / cursor 涨价 | `/s/pricing` | | |
| cursor 2026 大事记 | `/y/2026` | | |
| cursor 版本 历史 / cursor 更新日志 中文 | `/d/versions` | | |
| cursor 羊毛 / cursor 白嫖 还能用吗 | `/warroom` + `/d/windows` | | |
| cursor 模型 价格 / cursor 模型列表 | `/warroom` | | |
| cursor 周报 / AI 编程 周报 | `/w` | | |
| openai 断供 cursor | `/s/supply` | | |

**复盘记录**（每次看完数据补一行）：

| 日期 | 收录量（百度/Google） | 周 UV | 主要来源 | 动作与调整 |
| --- | --- | --- | --- | --- |
| | | | | |
