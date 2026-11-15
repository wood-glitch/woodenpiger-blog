---
title: 让 Muse 帮你做动画视频：18 个免费开源 Skill 按流程一次讲清
date: 2026-11-15 16:30:00
categories: [技术教程]
tags: [Muse, 动画视频, Remotion, 开源工具, Claude Code]
cover: /images/covers/muse-animation-video-skills.jpg
description: Muse 不会做动画视频，往往不是模型不行，是缺一套工具链。Felix 整理的 18 个免费开源仓库覆盖了从构思到导出的全流程，本文按流程分组，挑出新手最小组合，并补上安装方法。
---

## 先说结论

X 用户 Felix（@Feljoy_ix）11 月 15 日发了一条帖子：把 18 个 GitHub 上免费公开的 Skill 丢给 Muse 学习安装，就能让它做动画视频。帖子有 399 个赞，还配了一段 15 秒的演示视频。

我把 18 个仓库的链接逐个点开验证过，全部有效。结论是：这份清单有用，但别照单全收。其中几个是重型工具，新手先装 5 个就够了。以及，原帖只说“丢给 Muse 学习安装”，没写具体怎么装，这篇把通用做法补上。

## 18 个仓库按流程分组

原帖的思路是按“指示 → 制作 → 动起来 → 修改 → 导出”配工具。我把 18 个仓库按这个流程排了一下：

### 指示与编排

- **Remotion Skills**（[remotion-dev/skills](https://github.com/remotion-dev/skills)）：让 AI 制作视频的官方技能。这是整套流程的入口，Remotion 本身就是用代码做视频的框架。

### 制作画面

- **Motion Canvas**（[motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas)）：图解动画，适合做讲解类视频里的示意图。
- **Manim**（[ManimCommunity/manim](https://github.com/ManimCommunity/manim)）：公式与图形动画，数学、科普视频的首选。
- **Two.js**（[jonobr1/two.js](https://github.com/jonobr1/two.js)）：2D 矢量动画，轻量。
- **LUME**（[lume/lume](https://github.com/lume/lume)）：用 HTML 做 3D 场景。
- **Three.js**（[mrdoob/three.js](https://github.com/mrdoob/three.js)）：3D 场景，老牌库。
- **Babylon.js**（[BabylonJS/Babylon.js](https://github.com/BabylonJS/Babylon.js)）：3D 渲染与动画。
- **Konva**（[konvajs/konva](https://github.com/konvajs/konva)）：可触摸交互的画布，适合需要交互的场景。

### 让画面动起来

- **Motion**（[motiondivision/motion](https://github.com/motiondivision/motion)）：画面切换的动效。
- **Anime.js**（[juliangarnier/anime](https://github.com/juliangarnier/anime)）：时间线、错峰动效，2D 动效里最顺手的一个。
- **TweenJS**（[CreateJS/TweenJS](https://github.com/CreateJS/TweenJS)）：按顺序动起来的动画。
- **Shifty**（[jeremyckahn/shifty](https://github.com/jeremyckahn/shifty)）：缓动与补间。
- **Ola**（[franciscop/ola](https://github.com/franciscop/ola)）：让数值平滑变动。
- **Proton**（[drawcall/Proton](https://github.com/drawcall/Proton)）：粒子效果。

### 播放与导出

- **Lottie Web**（[airbnb/lottie-web](https://github.com/airbnb/lottie-web)）：轻量矢量动画的播放，适合把做好的动画嵌进网页或 App。
- **gifenc**（[mattdesl/gifenc](https://github.com/mattdesl/gifenc)）：GIF 导出，动图就靠它。

### 重型工具

- **Blender**（[blender/blender](https://github.com/blender/blender)）：绑定与角色动画。
- **Godot**（[godotengine/godot](https://github.com/godotengine/godot)）：游戏动画。

## 新手最小组合：先装这 5 个

如果你只是想做个讲解视频，不用 18 个全装。先装这 5 个，基本能跑通全流程：

1. **Remotion Skills**：定流程、定结构，让 Muse 知道视频怎么做。
2. **Motion Canvas**：画图解、做示意动画。
3. **Anime.js**：管时间线和动效，元素怎么进场、怎么错峰，全靠它。
4. **Lottie Web**：动画要在网页里播，用它。
5. **gifenc**：要发 GIF 动图，用它导出。

等这 5 个用熟了，再按需加：讲数学加 Manim，要 3D 加 Three.js，要粒子加 Proton。

## 怎么装进 Muse

原帖没写安装步骤，这里补一个通用做法：

1. 打开对应仓库，看 README 里关于 Skill 的说明（每个仓库的安装方式不一样，以官方页面为准）。
2. 在 Muse 的会话里把仓库链接发给它，让它按仓库说明学习并安装对应的 Skill；或者先把仓库 clone 到本地，再让 Muse 读取里面的 SKILL.md。
3. 装完后直接提需求，比如“用 Motion Canvas 做一段 30 秒的图解动画，讲清楚 XX 原理”，让 Muse 按 Skill 的流程走。

值得注意的是，“Skill”在这里是 Claude Skills 那种用法：一份写给 AI 的工作方法说明，不是传统意义上的插件。所以装不装得上，取决于仓库里有没有写好的 SKILL.md，以及 Muse 能不能读到它。个别仓库（比如 Blender、Godot）本质上是完整软件，仓库再大也不能“丢给 Muse”就完事，学习成本在那摆着。

## 哪些不值得新手碰

- **Blender、Godot**：完整软件，不是即插即用的 Skill。做角色动画、游戏动画再考虑，简单讲解视频用它们是大材小用。
- **Three.js、Babylon.js**：有 3D 需求时再上，没 3D 画面就别碰。
- **Manim**：很好，但定位很专——数学、物理、科普类视频。不是这类内容就不用装。

## 不止 Muse

原帖还提了一句：不止 Muse 可用，也可以直接交给 Claude 虚拟机里的 Claude Code 或 Codex 使用。道理是一样的，Skill 本身是通用的工作方法说明，换个 Agent 照样能读。以后绝对会用到，先收藏需要时再翻出来——这是原帖作者的原话，我认为这句没夸张：AI 做视频这件事，工具链正在快速标准化，现在搭好，以后直接复用。

## 我认为

这份清单真正的价值不是“18”这个数字，而是“按流程配工具”的思路。很多人让 AI 做视频失败，是因为只给模型一个模糊需求，模型手里又没有趁手的工具。先把流程拆开，每个环节配一个专用的库，再让 Muse 照着流程走，成功率会高很多。反过来，如果不分流程，18 个仓库全丢进去，模型反而不知道先用哪个。

另外要提醒一句：我只读到了帖子的文字，那段 15 秒的演示视频没看到。所以这篇文章只对文字清单负责，视频里演示的具体效果，以原帖为准。

来源：[Felix @Feljoy_ix 的原帖](https://x.com/Feljoy_ix/status/2121787138455040333)

---

> AI 声明：本文由 AI 辅助创作，初稿基于公开资料分析生成，经作者审阅、修改后发布；配图由 AI 生成。作者对内容的准确性负责，如有错误，欢迎指正。
