# UMBRELLA 4365 · 云部署手册

> 目标：把本站部署到公网 `umbrella4365.com`，HTTPS 访问，后台入口隐藏，数据可备份。
>
> 架构：`用户 → Nginx（80/443，HTTPS 终止）→ Node 服务（127.0.0.1:4365）→ SQLite（data/chronicle.db）`

---

## 0. 准备清单

| 项目 | 要求 |
| --- | --- |
| 云服务器 | 任意云厂商 Linux 主机（Ubuntu 22.04 / 24.04 为例），1 核 1G 起步即可 |
| 域名 | `umbrella4365.com`，添加 A 记录指向服务器公网 IP（`@` 与 `www` 各一条） |
| 备案 | 若服务器在中国大陆，域名需完成 ICP 备案；不想备案可选用香港/海外节点 |
| 端口 | 安全组/防火墙只放行 `80`、`443`（以及你自己的 SSH 端口）；**不要放行 4365** |

## 1. 安装 Node.js ≥ 22.13

本项目零 npm 依赖，只需要 Node 本体（内置 SQLite）。

```bash
# NodeSource 官方源安装 Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # 应 >= v22.13
```

## 2. 部署代码与初始化数据

```bash
sudo mkdir -p /opt/cursor-warco && sudo chown $USER /opt/cursor-warco
git clone https://github.com/githubgotest001/cursor-warco.git /opt/cursor-warco
cd /opt/cursor-warco
```

数据初始化（线上库是唯一真源，仓库里不含数据）：

- **重建 / 迁移服务器**：从备份恢复——把 `/opt/backups/chronicle-<时间戳>.db` 拷成
  `data/chronicle.db`，解开对应的 `uploads-*.tar.gz` 到 `public/uploads/`（见第 7.3 节恢复流程）；
  或把旧机的 `data/` 与 `public/uploads/` 整体拷来（先停服务再拷，`.db/.db-wal/.db-shm` 都要带）。
- **全新空站**：什么都不用做，首次启动自动建空库，之后从后台录入。

## 3. 生产环境变量（安全核心）

三个关键变量，**部署公网前必须设置前两个**：

```bash
# 生成一个强随机管理密钥（示例输出请自己保存好）
openssl rand -hex 24

# 生成一个隐藏后台路径（也可以自己起，只允许字母数字_-）
openssl rand -hex 6   # 得到如 9f2c81ab73de → 后台路径设为 hive-9f2c81ab73de
```

| 变量 | 作用 | 生产建议值 |
| --- | --- | --- |
| `ADMIN_KEY` | 管理密钥（后台登录 + 写接口鉴权） | `openssl rand -hex 24` 的输出 |
| `ADMIN_PATH` | 后台隐藏入口路径（不含 `/`）。`/admin` 恒为 404 | 如 `hive-9f2c81ab73de`，**保密，不要外传** |
| `TRUST_PROXY` | 在 Nginx 后必须设为 `1`，防爆破封禁才能拿到真实客户端 IP | `1` |
| `PORT` | 监听端口 | 保持 `4365` |
| `SITE_URL` | 站点对外地址（canonical / sitemap / RSS 用） | 默认 `https://umbrella4365.com`，换域名才需设置 |

> 不设置 `ADMIN_PATH` 时服务会自动生成随机路径并写入 `data/config.json`（启动日志可见），
> 同样安全；显式设置的好处是换机器/清数据时入口不变。

## 4. systemd 守护进程（手把手）

以下命令逐条复制执行即可，变量会自动填进配置，无需手改文件。

### 4.1 生成并保存密钥与后台路径

```bash
export MY_ADMIN_KEY=$(openssl rand -hex 24)
export MY_ADMIN_PATH="hive-$(openssl rand -hex 6)"

echo "管理密钥 ADMIN_KEY  = $MY_ADMIN_KEY"
echo "后台路径 ADMIN_PATH = $MY_ADMIN_PATH"
```

**把这两行输出抄到密码管理器里**，后台登录全靠它们。丢了也能找回（看
`systemctl cat umbrella4365`），但别依赖这个。

### 4.2 确认 node 路径

```bash
which node    # NodeSource 安装通常是 /usr/bin/node；下面的 heredoc 会自动取这个值
node -v       # 必须 >= v22.13
```

### 4.3 创建低权限运行用户并交接目录

```bash
sudo useradd -r -s /usr/sbin/nologin umbrella 2>/dev/null || true
sudo chown -R umbrella:umbrella /opt/cursor-warco
```

> 服务以 `umbrella` 用户运行，即使被攻破也拿不到 root。
> `data/`（数据库）和 `public/uploads/`（图片）都要归它所有，否则启动时写库会报权限错误。

### 4.4 生成 service 文件（自动填入密钥）

直接整段复制执行（heredoc 会把上面 export 的变量和 node 路径展开写进文件）：

```bash
sudo tee /etc/systemd/system/umbrella4365.service > /dev/null <<EOF
[Unit]
Description=UMBRELLA 4365 - Cursor Frontline Chronicle
After=network.target

[Service]
User=umbrella
WorkingDirectory=/opt/cursor-warco
ExecStart=$(which node) server.js
Restart=always
RestartSec=3
Environment=ADMIN_KEY=$MY_ADMIN_KEY
Environment=ADMIN_PATH=$MY_ADMIN_PATH
Environment=TRUST_PROXY=1
Environment=PORT=4365

[Install]
WantedBy=multi-user.target
EOF
```

检查生成结果（重点看三个 Environment 行是否已是真实值而不是空的）：

```bash
cat /etc/systemd/system/umbrella4365.service
```

### 4.5 启动并设置开机自启

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now umbrella4365
systemctl status umbrella4365 --no-pager
```

预期 `status` 输出里有：`Active: active (running)`。

查看启动日志（会打印后台入口地址）：

```bash
sudo journalctl -u umbrella4365 -n 20 --no-pager
```

预期能看到：

```text
UMBRELLA 4365 · RED QUEEN SYSTEM ONLINE
  前台     http://localhost:4365/
  后台入口 http://localhost:4365/hive-xxxxxxxxxxxx   （保密！/admin 恒为 404）
  管理密钥 （来自环境变量）
  防爆破   同 IP 密钥错 5 次封禁 15 分钟 · 反代模式(X-Forwarded-For)
```

### 4.6 本机验证（此时还没装 Nginx，用 curl 测 4365 端口）

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4365/                  # 预期 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4365/admin             # 预期 404
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4365/$MY_ADMIN_PATH    # 预期 200
curl -s http://127.0.0.1:4365/api/events | head -c 200; echo                     # 预期 JSON 数据
```

### 4.7 第 4 步常见故障

| status 里的报错 | 原因与处理 |
| --- | --- |
| `217/USER` | `umbrella` 用户没建成功，重跑 4.3 |
| `203/EXEC` | node 路径不对：`which node` 确认后编辑 service 里的 `ExecStart`，再 `daemon-reload` + `restart` |
| 日志报 `SQLITE_CANTOPEN` / 权限错误 | `data/` 不属于 umbrella 用户，重跑 4.3 的 chown |
| `EADDRINUSE` | 4365 被占：`ss -lntp \| grep 4365` 找到旧进程 kill 掉 |

改过 service 文件后固定三连：

```bash
sudo systemctl daemon-reload && sudo systemctl restart umbrella4365 && systemctl status umbrella4365 --no-pager
```

## 5. Nginx 反向代理 + HTTPS（手把手）

### 5.1 先确认 DNS 已生效

```bash
# 两条都应解析到你这台服务器的公网 IP
ping -c 2 umbrella4365.com
ping -c 2 www.umbrella4365.com
```

没生效就去域名控制台检查 A 记录，等 TTL 过期后再继续（certbot 验证依赖 DNS 正确）。

### 5.2 安装 Nginx 并移除默认站点

```bash
sudo apt-get install -y nginx
sudo rm -f /etc/nginx/sites-enabled/default
```

### 5.3 写入站点配置（含 SEO 主域归一，一次到位）

整段复制执行（注意 heredoc 用的是 `'EOF'` 带引号——防止 `$host` 等 Nginx 变量被 shell 吞掉）。
配置里已带 **www → 裸域 301**（避免两个域名分摊 SEO 权重），后面 certbot 签发证书时会
自动继承这份配置，**之后不需要再回来改 Nginx**：

```bash
sudo tee /etc/nginx/sites-available/umbrella4365.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name umbrella4365.com www.umbrella4365.com;

    # 图片走 base64 JSON 上传，10MB 图约膨胀到 14MB，务必调大
    client_max_body_size 20m;

    # SEO：www 统一 301 到裸域。用 $scheme 而不是写死 https，
    # 是为了 certbot 给 www 签证书做 HTTP-01 校验时不被跳到还未启用的 HTTPS 上；
    # certbot --redirect 之后本块整体搬进 443，$scheme 自然变成 https，无需改动
    if ($host = www.umbrella4365.com) {
        return 301 $scheme://umbrella4365.com$request_uri;
    }

    location / {
        proxy_pass http://127.0.0.1:4365;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 顺手在入口层再挡一次常见嗅探路径（可选）
    location ~* ^/(admin|wp-admin|wp-login|phpmyadmin|manager)(/|$|\.) {
        return 404;
    }
}
EOF
```

### 5.4 启用并验证 HTTP

```bash
sudo ln -sf /etc/nginx/sites-available/umbrella4365.conf /etc/nginx/sites-enabled/
sudo nginx -t                        # 预期：syntax is ok / test is successful
sudo systemctl reload nginx

curl -s -o /dev/null -w "%{http_code}\n" http://umbrella4365.com/        # 预期 200
curl -s -o /dev/null -w "%{http_code}\n" http://umbrella4365.com/admin   # 预期 404
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://www.umbrella4365.com/
# 预期 301 -> http://umbrella4365.com/（签发 HTTPS 后自动变为跳 https）
```

### 5.5 签发 HTTPS 证书（Let's Encrypt，免费 + 自动续期）

```bash
sudo apt-get install -y certbot python3-certbot-nginx

# 非交互一步到位：换成你的邮箱（用于证书到期提醒）
sudo certbot --nginx \
  -d umbrella4365.com -d www.umbrella4365.com \
  --redirect -m you@example.com --agree-tos --no-eff-email
```

`--redirect` 会自动改写 Nginx 配置，把 HTTP 301 跳转到 HTTPS。

### 5.6 验证 HTTPS 与自动续期

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/    # 预期 200
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://umbrella4365.com/
# 预期 301 -> https://umbrella4365.com/
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://www.umbrella4365.com/
# 预期 301 -> https://umbrella4365.com/（5.3 配置的主域归一已在 HTTPS 上生效）

sudo certbot renew --dry-run    # 预期最后输出 all simulated renewals succeeded
```

完成后：

- 前台：`https://umbrella4365.com/`
- 后台：`https://umbrella4365.com/<你的 ADMIN_PATH>`（只有你自己知道）

## 6. 防火墙

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable        # 提示会中断 SSH 时输入 y（已放行 OpenSSH，不会真断）
sudo ufw status verbose
```

预期 `status` 只有 SSH/80/443 三条 ALLOW。云厂商控制台的安全组同样只放行 80/443/SSH。
4365 端口不对公网暴露，Node 服务只被本机 Nginx 访问：

```bash
# 从外部机器（比如你本机）验证 4365 直连不通（超时即正确）
curl -m 5 http://<服务器公网IP>:4365/ ; echo "exit=$?"   # 预期 exit=28（超时）
```

## 7. 数据备份（手把手）

需要备份的只有两处：`data/`（数据库 + 后台路径配置）与 `public/uploads/`（图片）。

### 7.1 安装 sqlite3 工具并写入备份脚本

整段复制执行（heredoc 用 `'EOF'` 带引号，脚本内变量原样落盘）：

```bash
sudo apt-get install -y sqlite3

sudo tee /opt/cursor-warco/backup.sh > /dev/null <<'EOF'
#!/usr/bin/env bash
set -e
TS=$(date +%Y%m%d-%H%M)
DEST=/opt/backups
mkdir -p $DEST
# SQLite 在线安全备份（WAL 模式下也能保证一致性）
sqlite3 /opt/cursor-warco/data/chronicle.db ".backup '$DEST/chronicle-$TS.db'"
tar czf $DEST/uploads-$TS.tar.gz -C /opt/cursor-warco/public uploads
cp /opt/cursor-warco/data/config.json $DEST/config-$TS.json 2>/dev/null || true
# 只保留最近 30 份
ls -t $DEST/chronicle-*.db   | tail -n +31 | xargs -r rm
ls -t $DEST/uploads-*.tar.gz | tail -n +31 | xargs -r rm
echo "backup done: $TS"
EOF

sudo chmod +x /opt/cursor-warco/backup.sh
```

### 7.2 手动跑一次并验证产物

```bash
sudo /opt/cursor-warco/backup.sh          # 预期输出 backup done: ...
ls -lh /opt/backups/                       # 应有 chronicle-*.db / uploads-*.tar.gz / config-*.json
sqlite3 /opt/backups/chronicle-*.db "SELECT COUNT(*) FROM events;"   # 应输出条数（如 30）
```

### 7.3 加入定时任务（每天凌晨 4 点，非交互式追加）

```bash
( sudo crontab -l 2>/dev/null; echo "0 4 * * * /opt/cursor-warco/backup.sh >> /var/log/umbrella4365-backup.log 2>&1" ) | sudo crontab -
sudo crontab -l    # 确认那行已存在
```

### 7.4 恢复演练（强烈建议至少做一次）

```bash
sudo systemctl stop umbrella4365
sudo cp /opt/backups/chronicle-<某个时间戳>.db /opt/cursor-warco/data/chronicle.db
sudo rm -f /opt/cursor-warco/data/chronicle.db-wal /opt/cursor-warco/data/chronicle.db-shm
sudo chown umbrella:umbrella /opt/cursor-warco/data/chronicle.db
sudo systemctl start umbrella4365
curl -s http://127.0.0.1:4365/api/events | head -c 200; echo   # 数据回来了即成功
```

有条件的话，把 `/opt/backups` 再同步到对象存储（OSS/COS/S3）异地保存。

## 8. 日常更新发布

**首选：后台「系统 → ▲ 部署更新」一键完成**（git pull --ff-only → 语法自检 → systemd 自动重启，
自检不过会拒绝重启保住旧版）。涉及一次性迁移脚本（tools/migrate-*.js）或环境变量变更的升级，
仍走下面的 SSH 流程：

```bash
cd /opt/cursor-warco
sudo -u umbrella git pull        # 目录属于 umbrella 用户，用它的身份拉取
sudo systemctl restart umbrella4365
systemctl status umbrella4365 --no-pager   # 确认 active (running)
curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/   # 预期 200
```

数据在 `data/` 与 `public/uploads/`（均已 gitignore），更新代码不会影响内容。
如 `git pull` 报 `dubious ownership`，执行提示中的
`git config --global --add safe.directory /opt/cursor-warco` 后重试。

## 9. 上线验收测试（一次跑完）

在服务器上执行（`MY_ADMIN_PATH` / `MY_ADMIN_KEY` 若已开新终端，先从
`systemctl cat umbrella4365` 里抄回来再 export）：

```bash
echo "— 前台 HTTPS —";        curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/
echo "— HTTP 跳 HTTPS —";     curl -s -o /dev/null -w "%{http_code}\n" http://umbrella4365.com/
echo "— www 301 裸域 —";      curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://www.umbrella4365.com/
echo "— /admin 伪装 404 —";   curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/admin
echo "— /admin.html 404 —";   curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/admin.html
echo "— 隐藏后台入口 200 —";  curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/$MY_ADMIN_PATH
echo "— API 数据 —";          curl -s https://umbrella4365.com/api/events | head -c 120; echo
echo "— 档案独立页 —";        curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/ev/1
echo "— robots/sitemap —";    curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/robots.txt; curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/sitemap.xml
echo "— RSS / llms.txt —";    curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/feed.xml; curl -s -o /dev/null -w "%{http_code}\n" https://umbrella4365.com/llms.txt
echo "— AI 爬虫可读全文 —";   curl -s -A "GPTBot" https://umbrella4365.com/ | grep -c 'class="card c-'
echo "— 密钥校验 —";          curl -s -o /dev/null -w "%{http_code}\n" -X POST https://umbrella4365.com/api/auth/check -H "Content-Type: application/json" -d "{\"key\":\"$MY_ADMIN_KEY\"}"
echo "— 错误密钥拒绝 —";      curl -s -o /dev/null -w "%{http_code}\n" -X POST https://umbrella4365.com/api/auth/check -H "Content-Type: application/json" -d '{"key":"wrong"}'
```

| 项目 | 预期 |
| --- | --- |
| 前台 HTTPS | `200` |
| HTTP 跳 HTTPS | `301` |
| www 301 裸域 | `301 -> https://umbrella4365.com/` |
| /admin 与 /admin.html | `404` |
| 隐藏后台入口 | `200` |
| API 数据 | 输出 JSON 片段 |
| 档案独立页 / robots / sitemap / RSS / llms.txt | 均 `200` |
| AI 爬虫可读全文 | 输出数字 > 0（服务端直出的档案卡片数，SSR 生效） |
| 正确密钥 | `200` |
| 错误密钥 | `401`（连错 5 次会变 `429`，15 分钟后自动解封，或重启服务立即解封） |

最后用手机（非本机网络）打开 `https://umbrella4365.com/` 与后台入口，
输入密钥登录、发一条测试档案、传一张图，全链路走通即验收完成。

## 10. 上线前安全清单

- [ ] `ADMIN_KEY` 已改为 `openssl rand -hex 24` 级别的强随机值（默认密钥等于裸奔）
- [ ] `ADMIN_PATH` 已设置且只有自己知道；`https://域名/admin` 实测返回 404
- [ ] `TRUST_PROXY=1` 已设置（否则防爆破封禁会把所有人当成同一个 Nginx IP，误伤全站）
- [ ] 服务以低权限用户 `umbrella` 运行（`systemctl show umbrella4365 -p User` 确认）
- [ ] 安全组/防火墙只开 80/443/SSH，4365 不对外（第 6 步的外部 curl 已验证超时）
- [ ] HTTPS 已生效且 HTTP 自动跳转，`certbot renew --dry-run` 通过
- [ ] 备份脚本已跑通一次，恢复演练做过（备份没验证过恢复 = 没有备份）
- [ ] 浏览器无痕窗口访问后台入口，确认要密钥才能进

内置防爆破策略：同一 IP 15 分钟内密钥错误 5 次，封禁 15 分钟（登录接口与全部写接口共用）。
重启服务会清空封禁状态（内存态）。

## 11. 搜索引擎接入与增长（移交 GROWTH.md）

服务器侧的 SEO/GEO 已全部就位：首页 SSR、`/ev/:id` 档案页、`/s/:slug` 线索聚合页、`/y/:year`
年份大事记、`/about`、robots.txt、sitemap.xml、RSS、llms.txt、百度主动推送内置在代码里
（见 README「SEO / GEO」），www→裸域 301 已随 5.3 的 Nginx 配置一步到位，第 9 步的验收命令
也已覆盖全部 SEO 端点。

剩下的人工动作——站长平台验证与 sitemap 提交（验证码与推送 token 在后台「系统」标签页填写，
保存即生效免重启）、社区分发、外链建设与复盘节奏，全部收录在
**[GROWTH.md](GROWTH.md)（增长作战手册）**，按其第 0 节的时序执行。

## 附录 A · Docker 部署（可选路线）

不想装 Node 可用 Docker。项目零依赖，Dockerfile 极简：

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
EXPOSE 4365
CMD ["node", "server.js"]
```

```bash
docker build -t umbrella4365 .
docker run -d --name umbrella4365 --restart always \
  -p 127.0.0.1:4365:4365 \
  -e ADMIN_KEY=你的强密钥 -e ADMIN_PATH=hive-你的随机串 -e TRUST_PROXY=1 \
  -v /opt/cursor-warco-data/data:/app/data \
  -v /opt/cursor-warco-data/uploads:/app/public/uploads \
  umbrella4365
# 数据初始化：从备份恢复 data/chronicle.db（见第 2 节），全新空站则无需操作
```

Nginx/HTTPS 部分与上文相同。注意 `-p 127.0.0.1:4365:4365` 只绑定本机，不直接暴露公网。

## 附录 B · 故障排查

| 现象 | 处理 |
| --- | --- |
| `EADDRINUSE: address already in use` | 端口被占：`ss -lntp \| grep 4365` 找到进程处理 |
| `ExperimentalWarning: SQLite` | Node 内置 SQLite 的提示，无害，可忽略 |
| 启动报 `node:sqlite` 不存在 | Node 版本过低，需 ≥ 22.13 |
| 上传图片报错/被截断 | 检查 Nginx `client_max_body_size` 是否 ≥ 20m |
| 后台登录总提示封禁 | 未设 `TRUST_PROXY=1` 导致全站共享一个 IP 计数；重启服务清封禁后补配置 |
| 忘了后台入口路径 / 密钥 | `systemctl cat umbrella4365` 看 Environment 行；自动生成的路径在 `data/config.json`；`journalctl -u umbrella4365 -n 20` 的启动日志也有入口地址 |
