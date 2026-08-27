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
git clone <你的仓库地址> /opt/cursor-warco
cd /opt/cursor-warco

node seed.js        # 首次建库灌入初始档案（已有 data/chronicle.db 时自动跳过）
```

> 如果想把本机已录入的数据带上云：直接把本地的 `data/` 目录和 `public/uploads/` 目录
> 一并拷贝到服务器同位置（先停服务再拷，`.db/.db-wal/.db-shm` 三个文件都要带）。

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

> 不设置 `ADMIN_PATH` 时服务会自动生成随机路径并写入 `data/config.json`（启动日志可见），
> 同样安全；显式设置的好处是换机器/清数据时入口不变。

## 4. systemd 守护进程

创建 `/etc/systemd/system/umbrella4365.service`：

```ini
[Unit]
Description=UMBRELLA 4365 - Cursor Frontline Chronicle
After=network.target

[Service]
WorkingDirectory=/opt/cursor-warco
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
# ↓↓↓ 换成你自己生成的值 ↓↓↓
Environment=ADMIN_KEY=换成openssl生成的强密钥
Environment=ADMIN_PATH=hive-换成你的随机串
Environment=TRUST_PROXY=1
Environment=PORT=4365
# 建议用低权限用户运行（先 useradd -r -s /usr/sbin/nologin umbrella 并 chown 目录）
# User=umbrella

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now umbrella4365
systemctl status umbrella4365          # 确认 active (running)
sudo journalctl -u umbrella4365 -n 20  # 启动日志里会打印后台入口地址
```

## 5. Nginx 反向代理 + HTTPS

```bash
sudo apt-get install -y nginx
```

创建 `/etc/nginx/sites-available/umbrella4365.conf`：

```nginx
server {
    listen 80;
    server_name umbrella4365.com www.umbrella4365.com;

    # 图片走 base64 JSON 上传，10MB 图约膨胀到 14MB，务必调大
    client_max_body_size 20m;

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
```

```bash
sudo ln -s /etc/nginx/sites-available/umbrella4365.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

签发免费 HTTPS 证书（Let's Encrypt，自动续期）：

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d umbrella4365.com -d www.umbrella4365.com --redirect
```

`--redirect` 会自动把 HTTP 跳转到 HTTPS。完成后访问：

- 前台：`https://umbrella4365.com/`
- 后台：`https://umbrella4365.com/<你的 ADMIN_PATH>`（只有你自己知道）

## 6. 防火墙

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

云厂商控制台的安全组同样只放行 80/443/SSH。4365 端口不对公网暴露，
Node 服务只被本机 Nginx 访问。

## 7. 数据备份

需要备份的只有两处：`data/`（数据库 + 后台路径配置）与 `public/uploads/`（图片）。

```bash
# /opt/cursor-warco/backup.sh
#!/usr/bin/env bash
set -e
TS=$(date +%Y%m%d-%H%M)
DEST=/opt/backups
mkdir -p $DEST
# SQLite 在线安全备份（WAL 模式下也一致）
sqlite3 /opt/cursor-warco/data/chronicle.db ".backup '$DEST/chronicle-$TS.db'"
tar czf $DEST/uploads-$TS.tar.gz -C /opt/cursor-warco/public uploads
cp /opt/cursor-warco/data/config.json $DEST/config-$TS.json 2>/dev/null || true
# 只保留最近 30 份
ls -t $DEST/chronicle-*.db | tail -n +31 | xargs -r rm
ls -t $DEST/uploads-*.tar.gz | tail -n +31 | xargs -r rm
```

```bash
sudo apt-get install -y sqlite3
chmod +x /opt/cursor-warco/backup.sh
crontab -e   # 加一行：每天凌晨 4 点备份
# 0 4 * * * /opt/cursor-warco/backup.sh
```

有条件的话，把 `/opt/backups` 再同步到对象存储（OSS/COS/S3）异地保存。

## 8. 日常更新发布

```bash
cd /opt/cursor-warco
git pull
sudo systemctl restart umbrella4365
```

数据在 `data/` 与 `public/uploads/`（均已 gitignore），更新代码不会影响内容。

## 9. 上线前安全清单

- [ ] `ADMIN_KEY` 已改为 `openssl rand -hex 24` 级别的强随机值（默认密钥等于裸奔）
- [ ] `ADMIN_PATH` 已设置且只有自己知道；`https://域名/admin` 实测返回 404
- [ ] `TRUST_PROXY=1` 已设置（否则防爆破封禁会把所有人当成同一个 Nginx IP，误伤全站）
- [ ] 安全组/防火墙只开 80/443/SSH，4365 不对外
- [ ] HTTPS 已生效且 HTTP 自动跳转
- [ ] 备份脚本已跑通一次，手动恢复验证过（备份没验证过恢复 = 没有备份）
- [ ] 浏览器无痕窗口访问后台入口，确认要密钥才能进

内置防爆破策略：同一 IP 15 分钟内密钥错误 5 次，封禁 15 分钟（登录接口与全部写接口共用）。
重启服务会清空封禁状态（内存态）。

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
docker exec umbrella4365 node seed.js   # 首次初始化数据
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
| 忘了后台入口路径 | 服务器上看 `data/config.json`（或 systemd 环境变量）；`journalctl -u umbrella4365` 的启动日志也有 |
