---
title: 学习ai分享
date: 2026-10-18
tags:
  - 魔法上网
  - 教程搭建
categories:
  - 实用工具的分享
---
xray安装教程AWS免费服务器Amazon Lightsail
## 第 1 步：更新系统 + 开 BBR 加速

在 SSH 窗口里逐条执行：


apt update -y



echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
sysctl -p

验证一下，输 `sysctl net.ipv4.tcp_congestion_control`，显示 `= bbr` 就对了。

## 第 2 步：一键安装 Xray


bash <(wget -qO- -o- https://github.com/233boy/Xray/raw/main/install.sh)


安装过程中的选择：

| 问题 | 怎么选 |
|---|---|
| 安装类型 | 选 **VLESS Reality**（一般是选项 1 或标着 `[推荐]` 的） |
| 端口 | 直接回车用默认 **443** |
| 其他所有问题 | 一路回车用默认 |

装完会显示节点信息。

## 第 3 步：放行端口（重要，最常见翻车点）

去你 **VPS 服务商的网页控制台** → 找到「防火墙」或「安全组」→ 添加规则：**TCP 443 允许**。

（如果服务商面板没这个设置就不用管；Ubuntu 自带的 ufw 默认是关闭的，不用动）

## 第 4 步：拿到节点链接

在服务器上输：


xray


会弹出管理菜单 → 选「查看节点信息」之类的选项 → 里面有一条 **`vless://xxxx` 开头的分享链接**（还有二维码）。

**把这条链接复制下来**（或者对着二维码用手机扫也行）。

---

## 接下来在你 Windows 上装客户端

1. 下载 v2rayN：GitHub 搜 **2dust/v2rayN** → Releases → 下载 `v2rayN-windows-64.zip` 解压（GitHub 下载慢的话告诉我，给你镜像地址）
2. 运行 `v2rayN.exe` → 复制了链接的话它会自动提示导入，或点「服务器 → 从剪贴板导入」
3. 右下角托盘图标右键 → 「系统代理 → 自动配置系统代理」
4. 浏览器打开 **ip.sb** → 显示你 VPS 的 IP 
# Xray + v2rayN 延迟显示 -1 的排查教程
## 适用场景

在服务器上安装 Xray，并把分享链接导入 v2rayN 后，测试延迟显示 `-1`。本文记录的是一次实际排查过程，环境如下：

- 服务器：AWS Lightsail，Ubuntu 类系统
- 服务端：Xray 26.3.27
- 协议：VLESS + REALITY
- 监听端口：`29759/tcp`
- 客户端：Windows 上的 v2rayN
- 服务端配置：`/etc/xray/conf/VLESS-REALITY-29759.json`

本文中的服务器公网地址统一写成 `<服务器公网IP>`，实际操作时请替换成自己的地址。

## 结论先看

v2rayN 显示 `-1` 表示连接测试失败，不是延迟很高。本次问题的根因有两层：

1. Lightsail 的 IPv4 防火墙最初没有放行 `29759/tcp`
2. 服务器系统防火墙 `ufw` 也没有放行 `29759/tcp`

即使 Xray 已经正常启动并监听端口，只要云防火墙或系统防火墙任意一层拦截，v2rayN 都会显示 `-1`。

## 排查流程

建议按下面顺序排查。先确认服务本身，再确认端口连通，最后才检查客户端协议参数。

### 1. 确认 Xray 服务状态

在服务器上执行：

```bash
systemctl status xray --no-pager
```

成功标准：

- 服务状态为 `active (running)`
- 日志中没有启动失败、端口占用或配置解析错误

如果服务没有运行，先查看最近日志：

```bash
journalctl -u xray -n 100 --no-pager
```

### 2. 确认 Xray 正在监听端口

执行：

```bash
ss -lntp | grep xray
```

正常输出应包含类似内容：

```text
LISTEN 0 4096 *:29759 *:* users:(("xray",pid=<PID>,fd=<FD>))
```

其中 `*:29759` 表示 Xray 正在监听 `29759` 端口。如果没有任何输出，说明 Xray 没有监听预期端口，需要回头检查配置文件。

### 3. 查看服务日志

执行：

```bash
journalctl -u xray -n 100 --no-pager
```

下面这类信息通常不是连接失败的直接原因：

```text
REALITY: Listening on non-443 ports may get your IP blocked by the GFW
```

它只是提示非 443 端口更容易被封锁，不代表配置错误。

同样，下面这个 systemd 提示也不影响本次连接测试：

```text
Special user nobody configured, this is not safe!
```

它是运行用户安全性的提醒，优先级低于端口连通性问题。

### 4. 从 Windows 测试服务器端口

在 Windows PowerShell 执行：

```powershell
Test-NetConnection <服务器公网IP> -Port 29759
```

重点看这一行：

```text
TcpTestSucceeded : False
```

如果为 `False`，说明 TCP 端口不可达。此时不需要先怀疑 REALITY 参数，应先排查防火墙。

`PingSucceeded : False` 不是关键信息，因为很多云服务器默认禁用 ICMP，Ping 不通不代表 TCP 端口不通。

### 5. 检查 Lightsail IPv4 防火墙

在 AWS Lightsail 控制台操作：

1. 打开 Lightsail 控制台
2. 左侧进入 `Instances`
3. 点击正在使用的服务器实例
4. 顶部切换到 `Networking`
5. 找到 `IPv4 Firewall`
6. 点击 `Add rule`
7. 配置规则：

```text
Application: Custom
Protocol: TCP
Port: 29759
Source: Anywhere
```

保存后，回到 Windows 再次执行：

```powershell
Test-NetConnection <服务器公网IP> -Port 29759
```

注意：这里应修改的是 Lightsail 实例的 `IPv4 Firewall`，不是 EC2 的 Security Groups，也不是本机防火墙。

### 6. 检查服务器 UFW 防火墙

如果 Lightsail 规则已经添加，但端口测试仍是 `False`，继续在服务器上执行：

```bash
sudo ufw status verbose
```

本次问题中的输出显示：

```text
Status: active
Default: deny (incoming), allow (outgoing)

22/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

这说明系统防火墙默认拒绝入站连接，且没有放行 `29759/tcp`。执行：

```bash
sudo ufw allow 29759/tcp
```

成功后会看到：

```text
Rule added
Rule added (v6)
```

然后再次在 Windows 测试：

```powershell
Test-NetConnection <服务器公网IP> -Port 29759
```

成功标准：

```text
TcpTestSucceeded : True
```

### 7. 用 tcpdump 验证流量是否到达服务器

如果端口仍不通，可以在服务器上抓包：

```bash
sudo tcpdump -ni any tcp port 29759
```

保持命令运行，然后在 Windows PowerShell 执行：

```powershell
Test-NetConnection <服务器公网IP> -Port 29759
```

如果看到类似下面的三次握手：

```text
In  IP <客户端公网IP>.<端口> > <服务器内网IP>.29759: Flags [S]
Out IP <服务器内网IP>.29759 > <客户端公网IP>.<端口>: Flags [S.]
In  IP <客户端公网IP>.<端口> > <服务器内网IP>.29759: Flags [.]
```

含义如下：

- `S`：客户端发起连接
- `S.`：服务器同意连接
- `.`：三次握手完成
- 后续 `F.` 是连接结束，属于正常现象

如果 `tcpdump` 完全没有输出，说明流量没有到达服务器，应重点检查公网 IP 是否正确、Lightsail 防火墙规则是否生效、以及本地网络或运营商是否拦截。

测试完成后按 `Ctrl+C` 停止 `tcpdump`。

## 端口通了但真连接延迟仍是 -1

端口连通后，在 v2rayN 中分别测试：

- 测试服务器延迟，通常对应 TCPing
- 测试真连接延迟，通常对应通过代理访问测试地址

判断方式：

- TCPing 有数值，真连接延迟也有数值：配置正常
- TCPing 有数值，真连接延迟仍是 `-1`：端口已通，优先检查 REALITY 参数
- 两者都是 `-1`：优先继续排查端口、防火墙和网络连通性

可以在服务器上执行下面的命令查看关键 REALITY 配置。该命令刻意不输出 UUID 和 privateKey：

```bash
sudo jq '[.inbounds[] | select(.port == 29759) | {
  port,
  protocol,
  network: .streamSettings.network,
  security: .streamSettings.security,
  flow: [.settings.clients[].flow],
  serverNames: .streamSettings.realitySettings.serverNames,
  dest: .streamSettings.realitySettings.dest,
  shortIds: .streamSettings.realitySettings.shortIds
}]' /etc/xray/conf/VLESS-REALITY-29759.json
```

然后对照 v2rayN 节点参数：

| v2rayN 参数 | 需要匹配的服务端字段或要求 |
|---|---|
| 地址 | 服务器公网 IP，不能填 `172.26.x.x` 内网地址 |
| 端口 | inbound 的 `port` |
| UUID | 客户端 `id`，不要泄露给他人 |
| 流控 `flow` | 通常为 `xtls-rprx-vision` |
| 传输方式 | `network`，本例为 `tcp` |
| 安全 | `reality` |
| SNI | `serverNames` 中的其中一个 |
| 指纹 `fp` | 客户端指纹，例如 `chrome` |
| 公钥 `pbk` | 服务端 privateKey 对应生成的 publicKey，不能填 privateKey |
| Short ID `sid` | `shortIds` 中的其中一个 |

常见错误：

- 链接里填了服务端 `privateKey`，但客户端 `pbk` 应该填 `publicKey`
- `sni`、`sid`、`flow` 与服务端不一致
- 地址误填成服务器内网 IP
- 服务器使用较新的 XHTTP 或 REALITY 配置，但 v2rayN 或内置 Xray 核心版本过旧

## 安全提醒

不要把这些信息发给不可信的人或粘贴到公开位置：

- 服务器公网 IP
- VLESS UUID
- REALITY privateKey
- 完整分享链接

排查时可以只输出非敏感字段，或先打码再分享。

## 快速命令汇总

```bash
systemctl status xray --no-pager
ss -lntp | grep xray
journalctl -u xray -n 100 --no-pager
sudo ufw status verbose
sudo ufw allow 29759/tcp
sudo tcpdump -ni any tcp port 29759
curl -4 https://checkip.amazonaws.com
```

```powershell
Test-NetConnection <服务器公网IP> -Port 29759
```
