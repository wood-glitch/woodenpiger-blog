---
title: 爱问答答题助手加入 AI 辅助答题的改造记录
date: 2026-09-03 15:15:41


permalink: 2026/09/03/ai-quiz-assistant/
cover: /images/covers/ai-answer-helper.svg
description: 为自用的爱问答答题助手补充豆包与智谱 AI 接口，在原有题库之外支持 AI 辅助答题，并记录配置入口、已知小问题与使用注意事项。
keywords:
  - 爱问答
  - 答题助手
  - 豆包 API
  - 智谱 AI
  - 油猴脚本
tags:
  - 学习通答题助手
  - 工具分享
categories:
  - 工具分享
---

也是好长时间不更新我的 blog，这次过完暑假，我把我大一下学期用 AI 写的爱问答答题助手给优化了一下。

1. 这个爱问答助手有他自己的题库，但是像老师平常布置的作业，题库里面可能就没有了。
2. 我给这个题库加上了豆包和智谱 AI 的 API，可以直接调用这些 API 来答题。
3. 想改 AI 供应商/Key 的话：改第 8296–8323 行的 gpt 数组（api、key、model 三个字段，OpenAI 兼容格式即可）；想改提问的提示词，改 aiAsk 的默认参数和 Gt 对象。
4. 经过我的测试还是有一点小 bug，但是整体不影响使用。

这是夸克网盘链接

我用夸克网盘给你分享了「助手.user.js」，点击链接或复制整段内容，打开「夸克APP」即可获取。  
链接：https://pan.quark.cn/s/6239913ede76

