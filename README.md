# UMBRELLA 4365 · Cursor 战地纪实

> AI圈一天，人间一年 —— by Cursor 战地记者
>
> 一条正史（官方档案），一条野史（民间情报），沿一条时间脊柱由新到旧记录 Cursor 的光与影。
> 仅作记录，不构成立场。域名：[umbrella4365.com](https://umbrella4365.com)

## 技术栈

零 npm 依赖：`node:http` + `node:sqlite`（需要 **Node.js ≥ 22.13**）。

## 快速开始

```bash
node seed.js      # 建库并灌入初始档案（已有数据时自动跳过；--force 清空重灌）
node server.js    # 启动服务，默认端口 4365
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

内置防爆破：同一 IP 15 分钟内密钥错 5 次封禁 15 分钟（登录与全部写接口共用计数）。

## 部署

云服务器部署（Nginx + HTTPS + systemd + 备份）见 [DEPLOY.md](DEPLOY.md)。

## 数据模型（events）

| 字段 | 说明 |
| --- | --- |
| `side` | `main` 正史（脊柱之左） / `dark` 野史（脊柱之右） |
| `date` | 事件日期，`YYYY-MM-DD`（到日） |
| `tag` | 标签，如 融资 / 羊毛 / 事故 / 玩梗 |
| `title` | 标题 |
| `summary` | 摘要（时间轴卡片显示） |
| `detail` | 详细描述（前台"调阅档案"弹层显示，空行分段） |
| `image` | 图片（`/uploads/…` 或外链 URL，后台可直接上传） |

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
server.js          零依赖服务端（静态资源 + REST API + 图片上传 + 密钥鉴权 + 访问记录）
seed.js            建库 + 初始档案（正史 13 条 / 野史 16 条，含"薅羊毛攻防"支线）
data/chronicle.db  SQLite 数据库（运行时生成，已 gitignore）
public/
  index.html       前台：垂直双线时间树（最新在上 · 左正史 · 右野史）
  admin.html       后台：RED QUEEN 终端（档案管理 + 访客监控）
  logo.svg         站标：保护伞红白伞面 × Cursor 六边形 × 中央光标
  uploads/         后台上传的图片
```

## API 摘要

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/events?side=&q=` | 否 | 事件列表（日期倒序） |
| GET | `/api/events/:id` | 否 | 单条事件 |
| POST | `/api/events` | 是 | 新建 |
| PUT | `/api/events/:id` | 是 | 更新 |
| DELETE | `/api/events/:id` | 是 | 删除 |
| POST | `/api/upload` | 是 | 图片上传（JSON base64，≤10MB） |
| GET | `/api/stats?days=` | 是 | 访问统计（PV/UV、趋势、热门路径、来源、嗅探记录） |
| POST | `/api/auth/check` | — | 校验管理密钥（含防爆破限速） |

写操作需请求头 `X-Admin-Key: <ADMIN_KEY>`。
