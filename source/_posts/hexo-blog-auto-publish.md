---
title: 我的博客是怎么跑起来的：Hexo + Cloudflare Pages + Muse 自动发布全流程
date: 2026-11-15 17:20:00
categories:
  - 技术教程
tags:
  - Hexo
  - Cloudflare Pages
  - 博客搭建
  - Muse
  - 自动化
cover: /images/covers/hexo-blog-auto-publish.jpg
description: 从本地 Hexo 到 owo24.com 上线，再到 Muse 自动写稿、配图、发布的完整链路，每一步的配置和踩过的坑都写清楚了。
---

## 现在的样子

博客在 owo24.com，Hexo 7.3.0 + Redefine v2.9.0 主题，源码在 GitHub 仓库 wood-glitch/woodenpiger-blog（main 分支），Cloudflare Pages 自动构建、自动上线。写文章的流程是：在 Muse 的博客生产中心里加一个选题，分析、写稿、配图、审核、发布全走流水线，最后由一台免费云机器推送到仓库，Pages 构建完就上线。截至 2026-11-15，近 30 天访问人数 2,464，总访问量 10,977。

这篇把整条链路拆开，每一步的配置、命令和踩过的坑都写清楚。

> 提示：文中的作者信息（如 GitHub 用户名、仓库名、机器名、域名、密钥名等）请替换成自己的。

## 选型：为什么是这套组合

- Hexo 是静态博客生成器：文章是 Markdown，生成出来是一堆静态 HTML，没有数据库，不用管服务器运维。
- Cloudflare Pages 托管静态站免费，推代码就自动构建，还能直接绑自定义域名，省掉了买服务器、配 Nginx、续证书的活。
- 主题用 Redefine v2.9.0（之前是 Butterfly，2026-11-15 换过来的），够用。
- 发布机用一台免费云机器（InstaBox，4 vCPU / 8 GiB），只做一件事：存一份博客源码，推送到 GitHub。博客本身不跑在这台机器上——免费机最多连续跑 8 小时，闲置 1800 秒还会自动暂停，拿它当生产服务器不靠谱。托管和发布机分开，是这套方案里最重要的一点。

值得注意的是，免费不等于随便用：这台免费机的服务条款明确禁代理，之前在上面装过一次代理，当天就被封了 24 小时。博客这条线从头到尾不碰代理，只推代码。

## 本地搭建

本地只需要 Node.js。初始化一个 Hexo 站点，装好 Redefine 主题，改好 `_config.yml`（站点名、语言、permalink），就能在本地跑起来预览：

```bash
npm install -g hexo-cli
hexo init woodenpiger.blog
cd woodenpiger.blog
npm install
hexo server   # 本地预览，默认 http://localhost:4000
hexo generate # 生成静态文件到 public/
```

主题配置文件在 `themes/redefine/_config.yml`，改配色、菜单、社交链接都在这里。本地改完先 `hexo generate` 看有没有报错，没问题再推。

## 仓库与托管

源码推到 GitHub 仓库 `wood-glitch/woodenpiger-blog`，分支 `main`。Cloudflare Pages 里建一个项目 `woodenpiger-blog`，连上这个仓库，设置如下：

- 生产分支：`main`
- 构建命令：`npm install && npm install -g hexo-cli && hexo generate`
- 输出目录：`public`
- 自动部署：开

推一次代码，Pages 就构建一次，构建完自动上线。自定义域名在 Pages 项目里绑 `owo24.com`（域名是 2026-11-13 买的，绑完等 DNS 生效）。之前的域名 wood-glitch.com 没做 301 跳转——没人收藏，没必要。

## 发布机：InstaBox 上的 ~/blog

发布机是一台 InstaBox 免费实例，机器名 agent-browser-wjum，Debian 13，预装了 Node v22。上面只做博客发布：

1. 在 GitHub 仓库 Settings → Deploy keys 里加一个写权限的 key，名字叫 `instabox-blog-src`，公钥放在机器的 `~/.ssh/` 里。
2. 在机器上克隆源码到 `~/blog`，配好 git 身份（用户名 wood-glitch）。
3. 发布流程固定四步：`git pull` → 写文章到 `source/_posts/` → 本地 `hexo generate` 验证 → `git commit` + `git push` 到 main，Pages 自动构建。

`git pull` 是强制步骤：我自己也会直接往仓库推，不先拉取就会冲突。文章文件在 `source/_posts/`，文件名用干净的拼音或英文 slug，例如 `hexo-blog-auto-publish.md`，front-matter 的 `date` 必须带具体时间，例如 `2026-11-15 17:20:00`。

## 免费机保活：Worker 每 9 分钟续租

免费机有 8 小时运行上限，闲置还会暂停。保活靠一个 Cloudflare Worker：每 9 分钟（cron `*/9 * * * *`）调一次 InstaBox 的续租接口，租期 900 秒。Worker 里只存两个 Secret：InstaBox 的 API Key（新建的受限 key，只给机器读写和快照读权限）和一个自定义 TOKEN。查状态直接访问 Worker 的 `/status`，返回 `ok:true` 就是正常。

这一步只保发布机不断线，不保博客在线——博客在线靠的是 Pages，跟这台机器没关系。机器停了，最多是推不了文章，线上博客不受影响。

## Muse 自动发布流水线

写文章本身也有一条流水线，跑在 Muse 的「博客生产中心」空间里，一个页面三个区：选题、配图审核、博客。流程是：

1. **选题**：粘一个 X 链接，或者写一句话想法，状态「待写」。
2. **分析**：链接按免登录规则读（公开接口，不登录、不交账号），想法按 P3 扩展成大纲，写进 `analysis`。
3. **写作**：按 P2 写出完整 Hexo Markdown 草稿，含 front-matter，文末带 AI 声明，状态「已写」。
4. **配图**：按 P6 生成 16:9 封面，存进仓库 `source/images/covers/<slug>.jpg`（200KB 以内），进「待审核」等我看一眼；打回就按意见重画。
5. **发布**：我点发布（requestpublish）进「待发布」，门禁三项：草稿已写、配图已通过（或明确不用配图）、P4 自查九项通过。看守任务每 5 分钟跑一轮，门禁通过就推到仓库、验证首页 200、文章 200、sitemap 已更新，状态改「已发布」。

我认为这套流程里最值钱的不是自动化本身，而是门禁：草稿、配图、声明三项缺一不可，拦住了半成品直接上线。门禁是真拦过东西的——沙盒测试里缺 AI 声明的草稿直接被拒绝进待发布。

## 流量统计：页脚数字从哪来

页脚的访问人数和总访问量不是实时数，是 Cloudflare Analytics 的每日快照：

- 在 Cloudflare 账号里建一个只读 API Token，权限只有 Zone Analytics Read，范围只框 owo24.com 和 wood-glitch.com 两个域。
- 发布机上一个 systemd 定时器每天 10:20（02:20 UTC）拉取近 30 天数据，写进 `source/data/cloudflare-traffic.json`，有变化就提交推送；页脚读这个文件。
- 文章阅读量用 Vercount：只在文章页计数，列表页只查不计；localhost 不计；3 秒内重复访问去重；结果缓存 5 分钟；1 万以上显示成 1.2万这种格式。

## 踩过的坑

- **date 只写日期会错位**：有一篇文章 front-matter 只写了 `2026-10-18`，Pages 在 UTC 构建时把地址算成了前一天 `/2026/10/17/`。修法是 date 一律带具体时间，旧地址用 `_redirects` 做 301 保留（这个文件由 `scripts/cloudflare-redirects.js` 生成，不要手改）。
- **文件名带 #UXXXX 转义**：三篇文章的文件名里有 URL 转义字符，`git mv` 改成干净名字，URL 不变。
- **死的部署配置**：`_config.yml` 里残留的 `deploy:` 段和 `.github/workflows/deploy.yml` 都删了，现在部署只靠 Pages，留着它们只会误导人。
- **主题臃肿**：Redefine 主题自带 38 个 `.map` 文件和一个重复的 mermaid.js，删掉，体积直接下来。
- **本地残留**：`_backup/`（35MB）和 `_server.err.log` 只在本地 Windows 工作目录里，不在 git 里，要手动删。
- **图片太大**：一张 556KB 的照片压到 145KB，封面图一律压到 200KB 以内再进仓库。
- **sitemap 污染**：`source/data/cloudflare-traffic.json` 要加进 `skip_render`，不然流量快照会被收进 sitemap。
- **同步前不 pull 会冲突**：发布机和我本地都会往仓库推，任何操作前先 `git pull`。

## 成本与维护

整条链路全免费：Hexo 开源、GitHub 免费、Cloudflare Pages 免费、InstaBox 免费机、Cloudflare Worker 免费额度。日常维护只有三件事：每天 10:20 的流量快照自动跑（失败了会提醒）；发布机 8 小时一段，靠 Worker 续租，不用管；写文章走生产中心，选题、草稿、配图、发布记录都在一个空间里。

AI 声明：本文由 AI 辅助创作，初稿基于公开资料分析生成，经作者审阅、修改后发布；配图由 AI 生成。作者对内容的准确性负责，如有错误，欢迎指正。
