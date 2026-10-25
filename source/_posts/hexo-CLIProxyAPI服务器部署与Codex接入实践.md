---
title: 自建 AI 网关实践:Ubuntu 22.04 无头部署 CLIProxyAPI + CC Switch 接入 Windows Codex
date: 2026-10-25 20:00:00
tags:
  - CLIProxyAPI
  - CC-Switch
  - Codex
  - Antigravity
  - 自托管
categories:
  - 教程
description: 在 Ubuntu 22.04 x86_64 无头服务器上部署 CLIProxyAPI,OAuth 登录 Google Antigravity 订阅,打通三层防火墙直连,最后用 CC Switch 让 Windows 上的 Codex 一键接入。附全程真实踩坑与解法。
---

把 CLI 订阅账号(OAuth)变成统一 OpenAI/Anthropic 兼容接口,再让本机任意 coding 客户端一键切换使用——这是我折腾 CLIProxyAPI 的动机。本文记录完整过程:服务器是**无桌面的 Ubuntu 22.04 x86_64 云主机**,客户端是 **Windows 上的 Codex**,中间用 **CC Switch** 管理配置。所有命令均为实操验证,坑也一个没落下。

> 文中密钥、密码、IP 均为占位符,请替换为自己的。

<!-- more -->

## 0. 架构总览

```
Windows 电脑
 ├─ CC Switch(GUI)──写配置──▶ ~/.codex/config.toml
 ├─ Codex CLI / 桌面版 ──读配置──┐
 └─ 直连(安全组白名单)或 SSH 隧道 ─
                                  ▼
              http://<服务器IP>:8317/v1
                                  │
Ubuntu 22.04 服务器(headless)
 └─ CLIProxyAPI(systemd,:8317,Web 管理面板)
      └─ 上游:Google Antigravity / Claude / ChatGPT 订阅(OAuth)或 API Key
```

分工一句话:**CLIProxyAPI 管"接上游",CC Switch 管"客户端指向网关"**。

## 1. 服务器端:安装 CLIProxyAPI

### 1.1 选包

| Release 文件 | 适用 |
|---|---|
| `CLIProxyAPI_<ver>_linux_amd64.tar.gz` | ✅ x86_64 + glibc(Ubuntu 等主流发行版) |
| `..._amd64_no-plugin.tar.gz` | OpenWrt 等 musl/老旧系统,不支持插件 |
| `..._aarch64*.tar.gz` | ARM64 设备 |

### 1.2 下载与解压

```bash
tag=$(curl -fsSL https://api.github.com/repos/router-for-me/CLIProxyAPI/releases/latest | sed -n 's/.*"tag_name": "\(.*\)".*/\1/p')
wget "https://github.com/router-for-me/CLIProxyAPI/releases/download/${tag}/CLIProxyAPI_${tag#v}_linux_amd64.tar.gz"
sudo mkdir -p /opt/cli-proxy-api
sudo tar -xzf CLIProxyAPI_*_linux_amd64.tar.gz -C /opt/cli-proxy-api
sudo chmod +x /opt/cli-proxy-api/cli-proxy-api
```

**坑 1**:目录用 `sudo mkdir` 创建后属主是 root,普通用户直接 `tar -C` 进去会满屏 `Permission denied`。要么 `sudo tar`,要么先 `sudo chown -R $USER:$USER /opt/cli-proxy-api`。

### 1.3 最小配置

默认配置路径 `~/.cli-proxy-api/config.yaml`:

```yaml
config-version: 8
server:
  host: "127.0.0.1"   # 仅本机/隧道;直连方案改为 ""
  port: 8317
management:
  allow-remote: false
  secret-key: "<你的管理面板密码>"
access:
  api-keys:
    - "<你的客户端密钥>"
```

两个"密码"别混淆:

| 字段 | 用途 | 来源 |
|---|---|---|
| `access.api-keys` | 客户端(Codex/CC Switch)连网关的钥匙 | **自己编**,推荐 `openssl rand -hex 32` |
| `management.secret-key` | Web 管理面板登录密码 | 自己设;启动后会被自动哈希存回文件,属正常 |

### 1.4 systemd 自启

```bash
sudo tee /etc/systemd/system/cli-proxy-api.service > /dev/null <<EOF
[Unit]
Description=CLIProxyAPI gateway
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/cli-proxy-api
ExecStart=/opt/cli-proxy-api/cli-proxy-api -config $HOME/.cli-proxy-api/config.yaml
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now cli-proxy-api
```

自测:`curl -s http://127.0.0.1:8317/v1/models -H "Authorization: Bearer <客户端密钥>"`,返回 `{"data":[],...}` 空列表即服务正常(还没加上游)。

## 2. 无头服务器 OAuth 登录(以 Google Antigravity 为例)

服务器没有浏览器,而 OAuth 回调要跳 `localhost:<port>`——回调监听在服务器上,浏览器在你电脑上,这就是无头登录的核心矛盾。CLIProxyAPI 给了优雅解法:**把回调 URL 贴回终端**。

```bash
/opt/cli-proxy-api/cli-proxy-api -config ~/.cli-proxy-api/config.yaml \
  --antigravity-login --no-browser --oauth-callback-port 14555
```

1. 终端打印 Google 授权 URL,复制到本地浏览器;
2. 登录 Google 账号并授权;
3. 浏览器跳 `localhost:14555` 必然打不开(**预期!**),复制地址栏完整 URL(含 `?code=…`);
4. 回到服务器终端,程序正停在 `Paste the antigravity callback URL …:` 提示上,粘贴、回车;
5. 打印成功,令牌落盘 `~/.cli-proxy-api/`。

其他通道换 flag 即可:`--login`(Google/Gemini)、`--claude-login`、`--codex-login`、`--antigravity-login`。

**坑 2**:手动运行不带 `-config` 会报 `failed to read config file: open <当前目录>/config.yaml`——程序默认在**当前工作目录**找配置,systemd 里因为显式带了 `-config` 才没事。

**坑 3**:授权过程出现的 `project_id` 是 Google Code Assist 的隐形项目,控制台里找不到属正常,不要管。

完成后 `/v1/models` 就能列出 Antigravity 通道的模型了。

## 3. 让 Windows 够得着:三层防火墙

| 层 | 位置 | 操作 |
|---|---|---|
| ① 程序监听 | 服务器进程 | `host: ""` 后监听 `*:8317`(ss -lntp 验证) |
| ② 系统防火墙 | 服务器 ufw/iptables | `sudo ufw allow 8317/tcp`(ufw active 时) |
| ③ 云安全组 | **云控制台网页** | 入站规则:TCP 8317,来源=我的 IP |

最容易漏的是 ③:它不在服务器里,ufw 开了不等于安全组开了。AWS 路径:EC2 → 实例 → 安全 → 安全组 → 编辑入站规则。

验收(Windows PowerShell):

```powershell
Test-NetConnection <服务器IP> -Port 8317     # TcpTestSucceeded : True
curl.exe -o NUL -s -w "http=%{http_code}`n" http://<服务器IP>:8317/v1/models -H "Authorization: Bearer <客户端密钥>"   # http=200
```

不想开端口就保留 `host: "127.0.0.1"` + SSH 隧道(`ssh -N -L 8317:127.0.0.1:8317 user@server`,base_url 用 127.0.0.1),零暴露但每次要挂隧道;直连 + 安全组白名单是便利与安全的平衡点。

## 4. Windows 端:CC Switch 接入 Codex

安装:GitHub Releases 下载 `CC-Switch-<ver>-Windows.msi`;Codex:`npm i -g @openai/codex`。

添加供应商要点:

1. 侧栏选 **Codex**,顶部标签切 **直连**(别用"聚合",聚合只发布默认模型角色);
2. 添加供应商 → **自定义配置**;
3. 字段:
   - 名称:随意,如 `CLIProxyAPI`;
   - API Key:填网关客户端密钥;
   - **API 请求地址**:`http://<服务器IP>:8317/v1` —— 注意是"API 请求地址"格,不是"官网链接"格;**必须带 /v1**;
   - 上游格式:`Responses(原生)`;
4. 点 **获取模型列表**(它就是一次完整连通性测试:通不通、密钥对不对、有哪些模型,一次全知道)→ 选模型;
5. 添加 → 卡片 **启用** → 新终端 `codex` 实测。

Claude Code 同理,但 `ANTHROPIC_BASE_URL` **不带 /v1**(客户端自己拼 `/v1/messages`)。

## 5. 延迟会影响模型速度吗

会,但只影响**首字延迟**与 agentic 多轮往返的累积;流式吐字的稳态速率由上游模型决定。链路 RTT(你↔服务器↔上游)每段约几十到一百多毫秒,只叠加在"按下回车到第一个字"。服务器区域选择原则:**离上游近 + 到你路由好**;迁移成本极低,拷贝 `~/.cli-proxy-api/` 整个目录即可。自测:

```powershell
curl.exe -o NUL -s -w "connect=%{time_connect}s ttfb=%{time_starttransfer}s`n" http://<服务器IP>:8317/v1/models -H "Authorization: Bearer <客户端密钥>"
```

## 6. 踩坑合集

1. **no-plugin 包**:给 musl/老系统用的,Ubuntu 选普通 amd64;
2. **tar Permission denied**:root 属主目录,普通用户解压失败;
3. **YAML 粘进终端**:满屏 `command not found`——配置是文件内容,用 nano 或 heredoc 写;
4. **Unit not found**:systemd unit 没创建就 restart;
5. **failed to read config file**:手动运行在错误 cwd,补 `-config`;
6. **在 SSH 会话里跑 ssh -L**:隧道要在本地终端跑,服务器里跑等于服务器连服务器;
7. **localhost:14555 打不开**:无头 OAuth 的预期现象,贴回调 URL 回终端;
8. **curl -s 空输出**:-s 把错误也静默了,加 `-w` 或 `-v` 看真相;
9. **ssh Permission denied (publickey)**:新终端没带密钥,直连方案下无需隧道;
10. **CC Switch 填错格/进错模式**:URL 进"API 请求地址",模式选"直连";
11. **ufw ≠ 安全组**:云防火墙在控制台,独立于系统防火墙。

## 7. 安全清单

- 客户端密钥与管理密码分开、都用强随机值;密钥露过相就换(`openssl rand -hex 32` → 改配置 → restart → CC Switch 同步);
- 安全组来源收窄到"我的 IP",别长期 0.0.0.0/0;
- `~/.cli-proxy-api/` 内 OAuth 令牌等同账号凭据,勿外传;
- 管理面板保持 `allow-remote: false`,远程管理走隧道。

## 参考

- CLIProxyAPI:https://github.com/router-for-me/CLIProxyAPI
- 官方文档:https://help.router-for.me
- CC Switch:https://github.com/farion1231/cc-switch
