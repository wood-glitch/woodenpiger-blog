---
title: Cloudflare 给 Workers 加上消费上限了：花超了自动停，账单终于有闸了
date: 2026-11-16 09:00:00
categories:
  - 云服务
tags:
  - Cloudflare
  - Workers
  - Spend Management
  - 计费
  - 消费上限
cover: /images/covers/cloudflare-workers-spend-management.jpg
description: Cloudflare 11 月 13 日推出 Spend Management 测试版，付费账户能给 Workers 和 Durable Objects 设消费上限，到上限自动暂停计费调用。以前预算告警只发邮件、不拦用量，这次终于给了能真正停下来的开关。
---

CLOUDFLARE · 2026.11

> **先说结论：** 11 月 13 日，Cloudflare 推出 Spend Management 测试版，按量付费（PayGo）账户可以给 Workers 和 Durable Objects 设定消费上限。达到上限后，新的计费调用会被拒绝，服务自动暂停。以前的预算告警只发邮件、不拦用量——官方原话是"通知不等于控制"，这次终于给了能真正停下来的开关。免费版一直是硬上限；付费版过去超了照常跑、账单一直涨，补上的就是这个缺口。

## 01｜以前为什么会收到天价账单？

付费版和免费版的差别，关键不在价格，而在超了之后发生什么。

免费版的额度是硬限制：用完就报错、停服，等额度恢复。付费版正好反过来——超了照常运行，超出部分按单价继续计费，没有封顶，也不会自动暂停。Workers 付费版 5 美元/月起，含 1000 万次请求和 3000 万 CPU 毫秒，听起来不少，但一个被刷的 Worker、一轮失控的 AI 调用、一次配置失误，都能在你反应过来之前把账单推上去。

Cloudflare 不是没有提醒。付费账户有用量通知和预算告警，2026 年 7 月开始还会默认加一个 10 美元的告警。但官方说明写得很清楚：告警仅作通知，不会暂停或限制用量。而且用量数据是按天处理的，超过阈值后要第二天才会收到通知——等你看到邮件，钱已经花出去了。

Cloudflare 自己也承认：消费控制是开发者平台上被请求最多的功能之首，平台上已有超过 1000 万开发者在构建。这次的 Spend Management，就是来补这个缺口的。

有意思的是时间线：10 月 30 日，社区里有人发帖要硬性消费上限，理由是 AI 智能体时代"一个失控的循环几分钟就能烧掉人类几个月的用量"，而当时的计费模式对这种情况毫无防护；11 月 13 日，官方就推出了 Spend Management 测试版。Cloudflare 10 月初就说过正在做硬性上限的原型，所以这不完全是"提议推动上线"，但社区要的东西和官方正在做的，时间点卡得刚刚好。

## 02｜Spend Management 是怎么拦的？

入口有三个：控制台、cf CLI、REST API，挑顺手的一个就行。

控制台里走 Manage Account > Billing > Spend limits，启用你想控制消费的产品（目前是 Workers 和 Durable Objects）。启用后可以定义消费限制、指定通知收件人邮箱、设置一个或多个告警阈值。配了邮箱，消费达到阈值或上限时会发通知；达到上限时，强制执行阻止策略，产品自动暂停。

控制台还能以近实时（10 分钟以内）查看每个受支持产品当前计费周期的成本，概览面板显示哪些产品配了阈值和限制；还有审计日志，能看到谁、什么时候改了限制，或者什么时候达到了上限。

配合 AI Gateway 的消费限制，可以一起管计算和 AI 推理成本。AI Gateway 本来就支持针对 Workers AI 以及其他 AI 提供商的按用户和按模型预算，适用于通过网关路由的请求。

我认为这次最值钱的不是上限本身，而是"暂停"这个动作：以前 Cloudflare 只告诉你花超了，现在它会替你停下来。对个人开发者来说，一个 10 美元的上限配 80% 提醒，比任何事后看账单的习惯都管用。

## 03｜到上限后到底停什么、什么不停？

一旦强制执行上限，该产品新的调用会被拒绝。注意，它只暂停会产生费用的客户代码调用——Workers 里 Cron Triggers 和 Queue 消费者调用会被暂停，但静态资产继续提供服务。也就是说，你的网站静态页面还能打开，跑代码的那部分停了。

概览面板里一眼能看到每个产品的状态：下面这行就是 Workers 超了上限的样子——$65.88 / $10.00，标着 Services paused。

![Spend Management 概览面板：Workers 已花 $65.88，超过 $10.00 上限，显示 Services paused](/images/spend-management-overview.jpg)

上限触发后收到的通知邮件就是下面这样：写明什么时候、花了多少钱、占上限的百分之几、暂停到什么时候，以及"暂停意味着什么"。

![上限触发后收到的通知邮件：写明触发时间、已花金额、占上限比例和暂停到什么时候](/images/spend-management-pause-email.jpg)

（本节两张图与本文封面均来自 Cloudflare 官方博客）

恢复服务的办法有三个：把限制提高到当前周期累计消费之上；禁用或删除阻止策略；等下一个计费周期，现有阻止会过期。改完要等几分钟才生效，别改完立刻刷新看结果。

## 04｜三步开起来

**控制台（最快）：**

1. 进控制台 Manage Account > Billing > Spend limits。
2. 启用 Workers（或 Durable Objects），填消费限制、通知邮箱、告警阈值。
3. 保存后在概览面板确认：能看到当前周期成本、配好的阈值和限制。

设置界面长这样：最上面是 Block usage 总开关，接着填上限金额，再填通知邮箱和多档提醒阈值。

![Workers 消费上限设置界面：拦截总开关、上限金额、通知邮箱和多档提醒阈值](/images/spend-management-controls.jpg)

（图片来自 Cloudflare 官方博客）

预期结果：概览面板里 Workers 一行出现你设的上限和阈值，审计日志里多一条你刚才的修改记录。

**REST API：**

```bash
curl --fail-with-body --request POST \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/billing/spend-policies" \
  --header "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "Workers spending cap",
    "product_id": "workers",
    "enabled": true,
    "threshold_cents": 10000,
    "action": "usage_block",
    "notification_email": "[email protected]"
  }'
```

预期结果：返回创建好的策略。`threshold_cents` 10000 就是 100 美元上限（10000 美分），`action` 为 `usage_block` 表示到上限就阻止。

**cf CLI：**

```bash
cf billing spend-policies list
cf billing spend-policies create --body '{
  "name": "Workers spending cap",
  "product_id": "workers",
  "enabled": true,
  "threshold_cents": 10000,
  "action": "usage_block",
  "notification_email": "[email protected]"
}'
```

预期结果：策略出现在 `list` 里，`audit list` 能看到这次创建。

注意：控制台建的上限默认不带通知邮箱，不填邮箱就收不到 80% 和 100% 的提醒——建完顺手把邮箱填上。

## 05｜三个容易踩的坑

**坑一：计费周期不是自然月。**

会发生什么：计费周期从付费订阅开始时算，不是从部署 Worker 或创建上限时算。比如 10 月 10 日开始的订阅，周期是 10 月 10 日到 11 月 10 日。按自然月去算限额和账单会对不上号。

正确做法：去控制台看当前周期的实际起止，再定限额。

**坑二：上限只管 Workers 和 Durable Objects，别以为全站都封顶了。**

会发生什么：Workers 的上限不包括 Durable Objects、Workers AI、Workers KV、R2 或应用用的其他产品；D1、Queues 也还没有自己的上限。一个 Worker 应用如果同时用 R2 存文件、用 D1 读数据、用 Workers AI 跑推理，那几处的账单照样能涨。

正确做法：先给 Workers 和 Durable Objects 各设一个上限；R2、KV、D1、Workers AI 目前还没有上限，继续用预算告警盯着，或者用 AI Gateway 的按模型预算管推理成本。

**坑三：拦截是异步的，上限不等于账单绝对封顶。**

会发生什么：计费引擎不在请求路径里，上限是通过配置服务异步下发到全球节点的，执行靠本地状态。官方文档明确说，限制不保证最高账单金额，超支仍可能发生；而且如果你在已经花了 60 美元之后才设一个 50 美元的上限，下一次检查策略时就可能直接触发暂停。

正确做法：上限设得比你能接受的账单低一档（比如能接受 50 美元就设 30 美元），留出异步执行的余量；先设告警阈值（80%）给自己留调查时间。

## 最后记住这三句话

- 收到告警 ≠ 被拦住——以前的预算告警只发邮件，拦用量的是 Spend Management 的阻止策略。
- 设了上限 ≠ 全站封顶——现在只覆盖 Workers 和 Durable Objects，R2、KV、D1、Workers AI 还没有。
- 到了上限 ≠ 立刻停——拦截是异步下发的，上限不保证账单绝对封顶，留点余量再设。

> ⚠️ 重要提醒：Spend Management 现在是 Beta，只对按量付费（PayGo）账户开放，先支持 Workers 和 Durable Objects；一个产品一个全账号上限，不能按单个 Worker 或单个指标设。免费版一直是硬上限，这个功能针对的是付费账户。暂停期间访问者会看到错误页，恢复要等几分钟生效。先在测试账户上把限额和告警跑一遍，再往生产账户上套。

## 参考资料

1. Cloudflare 官方博客《Introducing Spend Management: Spending limits and alerts for Cloudflare》：[blog.cloudflare.com](https://blog.cloudflare.com/spend-management/)
2. Cloudflare 计费文档《Spending limits and alerts》：[developers.cloudflare.com](https://developers.cloudflare.com/billing/manage/spend-management/)
3. Cloudflare 社区《Feature Request: Hard spending/usage caps for the age of AI agents》：[community.cloudflare.com](http://community.cloudflare.com/t/feature-request-hard-spending-usage-caps-for-the-age-of-ai-agents-context/974969)

整理日期：2026 年 11 月 16 日。本文仅用于技术科普与参考。

<div class="ai-declaration">AI 声明：本文由 AI 辅助创作，初稿基于公开资料分析生成，经作者审阅、修改后发布；封面与文内配图来自 Cloudflare 官方博客。作者对内容的准确性负责，如有错误，欢迎指正。</div>
