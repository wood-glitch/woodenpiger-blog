/* Emit redirect artifacts after generation:
 *  - public/_redirects       -> true 301 on Cloudflare Pages
 *  - public/<old>/index.html -> redirect page on GitHub Pages / any static host
 */
"use strict";

const fs = require("fs");
const path = require("path");

const REDIRECTS = [
  { from: "/2026/04/12/ai/", to: "/2026/04/12/vscode-claude-code-setup/" },
  { from: "/2026/05/09/cf/", to: "/2026/05/09/cf-2-private-server-setup/" },
  { from: "/2026/09/03/ai答题/", to: "/2026/09/03/ai-quiz-assistant/" },
  { from: "/2026/10/25/hexo-CLIProxyAPI服务器部署与Codex接入实践/", to: "/2026/10/25/ubuntu-cliproxyapi-codex-gateway/" },
  { from: "/2026/11/01/opencode-go-套餐实测/", to: "/2026/11/01/opencode-go-review/" },
  { from: "/2026/10/17/xray-v2rayn-latency-troubleshooting/", to: "/2026/10/18/xray-v2rayn-latency-troubleshooting/" }
];

function redirectPage(to) {
  return [
    "<!DOCTYPE html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="utf-8">',
    "<title>页面已迁移</title>",
    '<link rel="canonical" href="' + to + '">',
    '<meta name="robots" content="noindex, follow">',
    '<meta http-equiv="refresh" content="0; url=' + to + '">',
    "<script>location.replace(" + JSON.stringify(to) + " + location.search + location.hash);</script>",
    "</head>",
    "<body>",
    '<p>这篇文章已迁移到 <a href="' + to + '">' + to + "</a></p>",
    "</body>",
    "</html>",
    ""
  ].join("\n");
}

hexo.extend.filter.register("after_generate", function () {
  const publicDir = path.join(hexo.base_dir, hexo.config.public_dir || "public");
  fs.mkdirSync(publicDir, { recursive: true });

  const lines = [];
  REDIRECTS.forEach((rule) => {
    lines.push(rule.from + " " + rule.to + " 301");
    const encoded = rule.from.replace(/[^\x00-\x7F]/g, (ch) => encodeURIComponent(ch));
    if (encoded !== rule.from) lines.push(encoded + " " + rule.to + " 301");
  });
  fs.writeFileSync(path.join(publicDir, "_redirects"), lines.join("\n") + "\n", "utf8");

  REDIRECTS.forEach((rule) => {
    const target = path.join(publicDir, decodeURIComponent(rule.from).replace(/^\//, ""), "index.html");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, redirectPage(rule.to), "utf8");
  });
});