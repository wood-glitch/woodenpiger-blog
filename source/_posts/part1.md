---
title: 新手如何用 AI 写代码 part1_在 vscode 上搭载 Claude code
tags: [AI, VSCode, Claude, 编程]
categories: [教程，技术]
date: 2026-04-12 19:33:00
---

今天，我来教大家如何在 Vscode 上部署 Claude code 以便用 ai 来写代码。

![成果展示](/images/bc2324b7b34c8653d9b24b62a1bf5331.png)

这是最终的成果展示，这样可以提高自己的效率，让大家赶上时代的潮流 享受 ai 拥抱 ai。

![屏幕截图](/images/screenshot-2026-04-06.png) 这是出生狂魔哥

好了，闲话少说，现在正片开始。Step1:安装 Vscode 这个我想大家应该都会安装  这个非常简单 只需要在浏览器输入 Vscode 搜素 就行  这是他的官网页面  然后为了防止有些人找不到  我会把官网链接放在这里 https://code.visualstudio.com/ ![官网页面](/images/0a516f0fa3f34188aaa223919275e21a.png)

嘿嘿嘿 这就是他的官网链接  是不是 ui 非常 good。然后安装打开 Vscode，因为这个 Vscoode 是外国的编译器 他的初始语言是英文  所以我们要在扩展中安装中文插件。就是这个安装完重启 就显示中文了。

![中文插件](/images/018368b77819bfa3485a28a994c8dd28.png).

然后在再扩展里面安装 Claude code 插件 就是这个 Anthropic。![Anthropic](/images/b357b37812ffa6cb7d558300c1e3d6fa.png)

安装完成你的 Vscode 页面右上角会出现   一个橘色的毛线球 这个就是 Claude code 点击这个毛线球  

![Claude 界面](/images/8845067b30bf17e303a40b3edb93d157.png)

就会出现这个界面 应为我这个已经登录好了它不会弹出登录界面      ![登录界面](/images/236812cc243254f7b8cefedb716a9162.png)    我已经找到登陆界面了就是下面图片这个  ![登录界面 2](/images/4c84abfce368998d449df75babcda64a.png)

现在我们已经安装完 Vsocde 并在 Vscode 上部署了 Claude code 下面我们要安装环境 让 Claude code 跑起来

Step2:安装环境 我们要安装两个环境第一个是 node.js  第二个是 git 这是他们的下载地址 node.js:https://nodejs.org/en/

git:https://git-scm.com/![git 下载](/images/c7eed2721f2684050962ffde79cdc8e6.png)

把这两个环境安装，你就可以让你的 Claude 在 vscode 上运行了。但是应为 Claude 的官方 api 太贵了  我们要在 Claude 上部署国产的 api

所以 Step3:在 Claude 上部署国产 api  要想在 Claude 上部署国产 api 我们要安装一个软件 ccswitch  它的作用是让 Claude 部署上咱们的国产 api

这是他在 GitHub 上的地址：https://github.com/farion1231/cc-switch/releases/tag/v3.12.0

![GitHub 下载](/images/34fd2b07dfb9cfa81382bfe685ce0aeb.png)

页面最下面有下载按钮 根据自己的电脑版本来选择。安装打开是这个界面![ccswitch 界面](/images/ec304ed7f4cfb7c79c3652266d7eb288.png)

还记得前面 Claude 的登陆界面吗   这个我们选择最下面的"Bedrock, Foundry, or Vertex"!

然后会跳转到这个网页  选择高亮字体的"使用第三方服务提供商" 然后它会跳转到另一个页面 我们在选择"禁用登陆提示"然后回到 vscode!

![设置 1](/images/455be84086e5b761e47a74c265b5fc43.png)
![设置 2](/images/8fdad2f3471225c349bf1b581866eb03.png)

接下来你的 Claude 就没有登录提示了  最后我们来选择国产的 api 这里我是推荐使用 Longcat  或者 智谱 的 api 都是很好的国产 ai 工具

下面我用 Longcat 的 api 来给大家一个实例：这是 Longcat 的网址：https://longcat.chat/platform/usage

注册登录然后在这个页面创建自己的 api!

![创建 api](/images/4f11576da28e9a4618900e2ee16295b4.png)

复制你的 api 地址  然后打开 ccswitch 点右上角的加号  选择 Longcat!

![选择 Longcat](/images/428969cab88a510b0b8837d584295e0e.png)

把你复制的 api key 粘贴到这个上面!

![粘贴 api key](/images/224ad5c57ec2152889c838447a0cae9a.png)

最后打开你的 Vscode 你就可以在 vscode 上使用 Claude 用 ai 来解决你的编程问题。
