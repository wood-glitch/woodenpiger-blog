---
title: 学习ai分享
date: 2026-10-18
tags:
  - 魔法上网
  - 教程搭建
categories:
  - 实用工具的分享
---
# Lightsail Ubuntu 22.04 搭建 Xray（VLESS + REALITY）并导入 V2RayN

这份手册按从服务器准备到客户端验证的顺序编写，适用于 Amazon Lightsail、Ubuntu 22.04、Termius（Windows）和 V2RayN。示例公网 IP 为 `52.64.30.75`；如果你的实例 IP 不同，PowerShell 测试时替换成实际 IP。

操作原则：Termius 里每次只粘贴并执行一个代码块，等提示符重新出现再执行下一条。第四至第七节的变量必须在同一个 SSH 会话中连续执行；断开 SSH 后要重新生成密钥、UUID 和 Short ID，并重新写入配置、生成新链接。

## 1. 在 Lightsail 放行 TCP 443

1. 打开 Lightsail 控制台 → **Instances** → 选择 Ubuntu 实例 → **Networking**。
2. 在 **IPv4 Firewall** 添加规则：应用程序选 **Custom**，协议选 **TCP**，端口填 `443`，来源允许 `0.0.0.0/0`，保存。
3. 确认规则列表里同时保留 SSH 的 TCP `22`，并出现 TCP `443`。

## 2. 连接服务器并设置 Ubuntu 防火墙

在 Termius 连入服务器后，逐条执行以下命令：

```bash
sudo apt-get update
```

```bash
sudo apt-get install -y curl openssl ufw
```

先放行 SSH，避免启用防火墙后断开远程连接：

```bash
sudo ufw allow OpenSSH
```

放行 Xray 使用的 TCP 443：

```bash
sudo ufw allow 443/tcp
```

启用 Ubuntu 防火墙：

```bash
sudo ufw --force enable
```

确认规则：

```bash
sudo ufw status
```

输出中应能看到 `OpenSSH` 和 `443/tcp ALLOW`。

## 3. 安装 Xray

下载 XTLS 官方安装脚本：

```bash
curl -fsSL -o /tmp/xray-install.sh https://github.com/XTLS/Xray-install/raw/main/install-release.sh
```

运行安装脚本：

```bash
sudo bash /tmp/xray-install.sh install
```

确认 Xray 已安装：

```bash
/usr/local/bin/xray version
```

官方安装脚本：[XTLS/Xray-install](https://github.com/XTLS/Xray-install)

## 4. 备份现有配置并停止服务

如果服务器上已经安装过 Xray 且配置文件存在，先备份：

```bash
sudo cp -a /usr/local/etc/xray/config.json "/usr/local/etc/xray/config.json.bak.$(date +%Y%m%d-%H%M%S)"
```

停止正在运行的旧服务：

```bash
sudo systemctl stop xray
```

如果是全新安装、提示配置文件不存在，跳过备份命令即可；不要因此删除整个 Xray 目录。

## 5. 生成 REALITY 密钥、UUID 和 Short ID

生成密钥：

```bash
KEYS=$(/usr/local/bin/xray x25519)
```

提取服务端私钥（兼容 `Private key` 和 `PrivateKey` 两种标签）：

```bash
PRIVATE_KEY=$(printf '%s\n' "$KEYS" | awk '/^(Private key|PrivateKey):/ { sub(/^[^:]*:[[:space:]]*/, ""); print; exit }')
```

提取客户端公钥（兼容 `Public key`、`Password` 两种标签）：

```bash
PUBLIC_KEY=$(printf '%s\n' "$KEYS" | awk '/^(Public key|Password)( \(PublicKey\))?:/ { sub(/^[^:]*:[[:space:]]*/, ""); print; exit }')
```

检查密钥都提取到了：

```bash
test -n "$PRIVATE_KEY" && test -n "$PUBLIC_KEY" && echo key_ok
```

必须看到 `key_ok` 才继续；如果没有，停止操作并查看 `KEYS` 输出，不要写配置。

生成 VLESS 用户 UUID：

```bash
UUID=$(/usr/local/bin/xray uuid)
```

生成 REALITY Short ID：

```bash
SHORT_ID=$(openssl rand -hex 8)
```

检查其余参数不为空：

```bash
test -n "$UUID" && test -n "$SHORT_ID" && echo params_ok
```

必须看到 `params_ok`。保持当前 SSH 会话，不要断开。

## 6. 写入服务端配置

下面是一条完整命令。请整行复制执行，不要把它拆成多条：

```bash
printf '%s\n' "{\"inbounds\":[{\"listen\":\"0.0.0.0\",\"port\":443,\"protocol\":\"vless\",\"settings\":{\"users\":[{\"id\":\"$UUID\",\"flow\":\"xtls-rprx-vision\"}],\"decryption\":\"none\"},\"streamSettings\":{\"network\":\"raw\",\"security\":\"reality\",\"realitySettings\":{\"show\":false,\"target\":\"www.microsoft.com:443\",\"serverNames\":[\"www.microsoft.com\"],\"privateKey\":\"$PRIVATE_KEY\",\"shortIds\":[\"$SHORT_ID\"]}}}],\"outbounds\":[{\"protocol\":\"freedom\"}]}" | sudo tee /usr/local/etc/xray/config.json >/dev/null
```

## 7. 检查配置并重启 Xray

先做配置自检：

```bash
sudo /usr/local/bin/xray run -test -config /usr/local/etc/xray/config.json
```

只有自检没有 `Failed to start`、`empty` 等错误时才继续。设置开机启动：

```bash
sudo systemctl enable xray
```

重启服务以确保加载刚写入的新配置：

```bash
sudo systemctl restart xray
```

确认服务运行：

```bash
sudo systemctl is-active xray
```

预期输出 `active`。再确认服务器监听 TCP 443：

```bash
sudo ss -lntp | grep ':443'
```

输出应包含 `LISTEN` 和 `:443`。

## 8. 生成 V2RayN 导入链接

获取服务器公网 IPv4：

```bash
SERVER_IP=$(curl -4fsSL https://api.ipify.org)
```

确认公网 IP 不为空：

```bash
test -n "$SERVER_IP" && printf '%s\n' "$SERVER_IP"
```

生成完整 VLESS 链接：

```bash
printf 'vless://%s@%s:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.microsoft.com&fp=chrome&pbk=%s&sid=%s&type=tcp&headerType=none#my-xray\n' "$UUID" "$SERVER_IP" "$PUBLIC_KEY" "$SHORT_ID"
```

复制终端输出的整条 `vless://` 链接，在 Windows 的 V2RayN 中从剪贴板导入节点。导入后确认节点类型为 VLESS，传输层为 TCP，安全类型为 REALITY，SNI 为 `www.microsoft.com`，流控为 `xtls-rprx-vision`，然后选择该节点并启动系统代理。

检查链接中的 `pbk=` 和 `sid=` 后面都有内容。`pbk` 使用公钥；绝不能把服务器私钥放进分享链接或 V2RayN。

## 9. 验证端口与客户端

在 Windows PowerShell 测试 TCP 端口（把 IP 换成上一步输出的公网 IP）：

```powershell
Test-NetConnection 52.64.30.75 -Port 443
```

看 `TcpTestSucceeded`：

- `True`：Windows 到服务器的 TCP 443 可达；继续确认 V2RayN 导入的是刚生成的新链接，并查看 V2RayN 的 Core/日志。
- `False`：检查 Lightsail IPv4 Firewall、Ubuntu `sudo ufw status`、服务器公网 IP，以及 Xray 是否监听 `:443`。

`PingSucceeded: False` 不代表 TCP 端口不可用；端口测试以 `TcpTestSucceeded` 为准。即便 TCP 为 `True`，也只代表端口可达，不等于 VLESS/REALITY 握手已成功。

服务端查看 Xray 最近日志：

```bash
sudo journalctl -u xray -n 80 --no-pager
```

## 注意事项与这次的错误教训

1. **密钥标签不能按旧格式硬匹配。** 本次 Xray 26.3.27 的输出标签与旧命令不一致，导致私钥为空、配置自检报 `empty "privateKey"`，分享链接的 `pbk=` 也为空。本指南兼容常见的新旧标签，并要求先看到 `key_ok`、`params_ok`。
2. **`active` 不表示新配置已经生效。** 旧进程可能仍在运行。必须先执行配置自检，然后执行 `systemctl restart xray`；仅查看 `active` 或只执行 `enable` 不够。
3. **Lightsail 和 Ubuntu 各有一层防火墙。** 两处都要放行 TCP 443。之前只检查了服务器侧时，Windows 的 TCP 测试仍失败；Lightsail 规则补齐后，测试才可能通过。
4. **Termius 按单条命令执行。** 之前长段粘贴没有完整执行。看到 SSH 提示符回来后再粘贴下一条；含变量的步骤不能换 SSH 会话，否则变量会丢失。
5. **`-1` 延迟和 BBR 无关。** BBR 是可选的 TCP 拥塞控制调优，不会修复空公钥、错误节点参数、REALITY 握手失败或防火墙问题。先确保配置自检通过、443 可达、导入链接完整。
6. **不要混用多套安装脚本。** 本手册使用 XTLS 官方安装脚本及其默认服务/配置路径；已有安装时先备份配置，不要盲目删除整个目录或再运行其他第三方脚本。
7. **保护连接凭据。** VLESS 链接包含 UUID 等连接参数，服务端私钥更敏感。不要公开分享链接、私钥或完整配置。

### 可选：启用并持久化 BBR

BBR 不是搭建代理的必要步骤。只有想单独启用时再执行：

```bash
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr
```

```bash
printf 'net.core.default_qdisc=fq\nnet.ipv4.tcp_congestion_control=bbr\n' | sudo tee /etc/sysctl.d/99-bbr.conf
```

```bash
sudo sysctl --system
```

验证当前拥塞控制算法：

```bash
sysctl net.ipv4.tcp_congestion_control
```

输出为 `net.ipv4.tcp_congestion_control = bbr` 才表示当前生效。若显示 `cubic`，说明 BBR 未生效；这不影响 Xray 配置本身。
