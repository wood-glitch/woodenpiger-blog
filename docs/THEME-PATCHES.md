# Redefine 主题改动记录（THEME PATCHES）

> 本站基于 Redefine v2.9.0 二次开发。以下改动直接写入 `themes/redefine/`，
> 升级主题后需要按下表重新应用。不要直接编辑 `themes/redefine/source/js/build/main.js`。

## 模板改动

| 文件 | 目的 | 内容摘要 |
|---|---|---|
| `layout/pages/home/home-content.ejs` | 首页封面 + 阅读量 | 有 `cover` 时渲染 16:9 懒加载图片；无封面不输出占位块；卡片显示阅读量 |
| `layout/pages/post/article-content.ejs` | 文章头图 | 有封面时渲染 eager 头图并叠加标题；无封面回退到普通标题 |
| `layout/pages/home/home-banner.ejs` | 社交栏与 banner | 社交链接支持外链/复制按钮；banner 改为按主题单张 CSS 背景 |
| `layout/pages/home/home-background.ejs` | banner 背景 | 同上，移除双 `<img>`，只保留主题对应背景 |
| `layout/components/header/navbar.ejs` | 移动端抽屉 | 抽屉底部新增作者卡（头像 + 名字 + Lv6 徽章） |
| `layout/components/footer/footer.ejs` | 页脚 | 增加分类/标签统计；主题署名改为“基于 Redefine 自研框架”并链接作者 GitHub |
| `layout/utils/posts-list.ejs` | 归档/分类/标签列表 | 每条文章显示阅读量 |
| `layout/utils/side-tools.ejs` | 侧边工具 | 移除 RSS 入口 |
| `layout/components/sidebar/author.ejs` | 作者卡 | 作者名与 Lv6 徽章同一行 |
| `layout/pages/post/article-info.ejs` | 文章元信息 | 显示“阅读量”文字 + PV 数值 |
| `layout/pages/home/home-article.ejs` | 首页卡片 | 显示阅读量 |
| `scripts/helpers/theme-helpers.js` | Helper | Lv6 徽章返回可点击 `<a>`；`getPostUrl()` 去除重复斜杠 |

## 升级 Redefine 时的重新应用步骤

1. 先备份当前 `themes/redefine` 与 `_config.redefine.yml`。
2. 用新版主题覆盖 `themes/redefine`。
3. 按上表逐项重新应用模板改动（以本仓库 `docs/` 与 git 历史为准）。
4. 保留 `scripts/helpers/theme-helpers.js` 中的两个修复：
   - `getAuthorLabel()` 返回指向 B 站空间的 `<a>`；
   - `getPostUrl()` 先 `replace(/^\/+/, "")` 再拼接，避免双斜杠。
5. 不要恢复 `source/js/build/main.js` 的手工修改（本站从未修改该文件）。
6. 重新执行 `npx hexo clean && npx hexo generate`，检查：
   - 首页封面/阅读量；
   - 文章头图；
   - 移动端抽屉作者卡；
   - 页脚统计与署名；
   - 归档/标签/分类阅读量。

## 站点侧文件（不属于主题）

- `source/css/tokens.css`：设计变量
- `source/css/theme-overrides.css`：组件覆盖
- `source/css/covers.css`、`source/css/neon-links.css`、`source/css/donate.css`
- `source/js/ui-core.js`、`social.js`、`neon-links.js`、`cover.js`、`counter.js`