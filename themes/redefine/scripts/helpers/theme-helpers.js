/* main hexo */

"use strict";

const url = require("url");
const { ensurePrefix } = require("../utils/log-prefix");
const { version } = require("../../package.json");
const themeVersion = version;

hexo.extend.helper.register("isHomePagePagination", function (pagePath, route) {
  if (pagePath.length > 5 && route === "/") {
    return pagePath.slice(0, 5) === "page/";
  }

  return false;
});

/* code block language display */
hexo.extend.filter.register("after_post_render", function (data) {
  // Only process if not already processed
  if (data._processedHighlight) return data;
  
  // Updated pattern to include numbers and other special characters
  const pattern = /<figure class="highlight ([^"]+)">([\s\S]*?)<\/figure>/g;
  data.content = data.content.replace(pattern, function (match, p1, p2) {
    // If already has code-container anywhere in the match, return unchanged
    if (match.includes('code-container')) {
      return match;
    }

    let language = p1 || "code";
    if (language === "plain") {
      language = "code";
    }

    return '<div class="code-container" data-rel="' +
      language.charAt(0).toUpperCase() +
      language.slice(1) +
      '">' +
      match.replace(
        '<figure class="highlight ',
        '<figure class="iseeu highlight '
      ) +
      "</div>";
  });

  // Mark as processed
  data._processedHighlight = true;
  return data;
});

hexo.extend.helper.register("createNewArchivePosts", function (posts) {
  const postList = [],
    postYearList = [];
  posts.forEach((post) => postYearList.push(post.date.year()));
  Array.from(new Set(postYearList)).forEach((year) => {
    postList.push({
      year: year,
      postList: [],
    });
  });
  postList.sort((a, b) => b.year - a.year);
  postList.forEach((item) => {
    posts.forEach(
      (post) => item.year === post.date.year() && item.postList.push(post),
    );
  });
  postList.forEach((item) =>
    item.postList.sort((a, b) => b.date.unix() - a.date.unix()),
  );
  return postList;
});

hexo.extend.helper.register(
  "getAuthorLabel",
  function (postCount, isAuto, labelList) {
    return '<a class="bili-lv6-badge" href="https://space.bilibili.com/3546697200307141?spm_id_from=333.1007.0.0" target="_blank" rel="noopener noreferrer" data-no-swup title="访问 WoodenPiger 的 Bilibili 空间" aria-label="访问 WoodenPiger 的 Bilibili 空间（Lv6）">' +
      '<svg class="bili-lv6-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1901 1024" aria-hidden="true" focusable="false">' +
      '<rect class="bili-lv6-plate" x="154.93" y="184.75" width="1609.14" height="707.37" fill="#FFFFFF"/>' +
      '<path class="bili-lv6-glyph" d="M1779.58 93.07C1802.29 93.07 1824.99 113.83 1823.9 136.32L1822.99 142.49V889.93C1822.99 912.4 1807.59 934.88 1781.52 938.77L1773.39 939.37H144.65C122.13 939.37 99.61 924.01 95.7 898.03L95.11 889.93V228.97C95.11 206.5 110.46 184.04 136.52 180.14L144.65 179.55H1166.48V142.49C1166.48 120.03 1181.83 97.56 1207.89 93.67L1216.02 93.07H1779.58ZM1686.73 198.07H1302.78C1286.26 198.07 1269.8 212.71 1266.34 228.98L1265.68 235.13V809.62C1265.68 826.07 1280.31 842.57 1296.61 846.04L1302.78 846.7H1686.73C1703.25 846.7 1719.76 832.02 1723.22 815.76L1723.89 809.62V494.59C1723.89 478.07 1709.21 461.62 1692.9 458.17L1686.73 457.51H1389.54V321.61H1686.73C1703.25 321.61 1719.76 306.97 1723.22 290.7L1723.89 284.55V235.13C1723.89 216.6 1705.31 198.07 1686.73 198.07ZM733.02 284.57H683.48C664.9 284.57 646.32 303.1 646.32 321.64V624.34C646.32 641.09 646.32 656.16 652.51 661.36L825.91 834.27C833.78 842.16 849.14 845.04 859.3 846.09L869.27 846.7L877.75 846.24C887.84 845.32 904.36 842.55 912.62 834.27L1098.4 661.36C1103.36 656.44 1104.35 647.55 1104.54 637.86L1104.6 327.81C1104.6 309.27 1086.02 290.75 1067.44 290.75H1017.96C999.31 290.75 980.74 309.27 980.74 327.81V605.77L875.46 710.73L770.18 605.77V321.64C770.18 303.1 751.6 284.57 733.02 284.57ZM287.09 284.57H237.55C221.03 284.57 204.52 299.21 201.06 315.48L200.39 321.64V809.62C200.39 826.13 215.07 842.58 231.38 846.04L237.55 846.7H534.81C551.33 846.7 567.84 832.08 571.3 815.78L571.97 809.62V760.25C571.97 743.67 557.29 727.26 540.98 723.82L534.81 723.16H324.25V321.64C324.25 303.1 305.67 284.57 287.09 284.57ZM1599.99 581.04V723.16H1389.5V581.04H1599.99Z" fill="#FF0000"/>' +
      '</svg>' +
      '</a>';
  },
);

hexo.extend.helper.register("getPostUrl", function (rootUrl, path) {
  const relative = String(path || "").replace(/^\/+/, "");
  if (rootUrl) {
    let { href } = new URL(rootUrl);
    if (href.substring(href.length - 1) !== "/") {
      href = href + "/";
    }
    return href + relative;
  }
  return "/" + relative;
});

hexo.extend.helper.register("renderJS", function (path, options = {}) {
  const _js = hexo.extend.helper.get("js").bind(hexo);
  const { module = false, async = false, swupReload = false } = options;

  const isDeveloperMode = this.theme.developer?.enable === true;

  if (Array.isArray(path)) {
    path = path.map((p) => (isDeveloperMode ? "js/" : "js/build/") + p);
  } else {
    path = (isDeveloperMode ? "js/" : "js/build/") + path;
  }

  const cdnProviders = {
    zstatic:
      "https://s4.zstatic.net/ajax/libs/hexo-theme-redefine/:version/:path",
    cdnjs:
      "https://cdnjs.cloudflare.com/ajax/libs/hexo-theme-redefine/:version/:path",
    unpkg: "https://unpkg.com/hexo-theme-redefine@:version/source/:path",
    jsdelivr:
      "https://cdn.jsdelivr.net/npm/hexo-theme-redefine@:version/source/:path",
    aliyun:
      "https://evan.beee.top/projects/hexo-theme-redefine@:version/source/:path",
    npmmirror:
      "https://registry.npmmirror.com/hexo-theme-redefine/:version/files/source/:path",
    custom: this.theme.cdn.custom_url,
  };

  const cdnPathHandle = (path) => {
    const cdnBase =
      cdnProviders[this.theme.cdn.provider] || cdnProviders.npmmirror;
    let scriptTag;

    const typeAttr = module ? 'type="module"' : "";
    // const asyncAttr = async ? "async" : "";
    const swupAttr = swupReload ? "data-swup-reload-script" : "";

    if (this.theme.cdn.enable) {
      if (this.theme.cdn.provider === "custom") {
        const customUrl = cdnBase
          .replace(":version", themeVersion)
          .replace(":path", path);
        scriptTag = `<script ${typeAttr} src="${
          this.theme.cdn.enable ? customUrl : _js({ src: path })
        }" ${swupAttr}></script>`;
      } else {
        scriptTag = `<script ${typeAttr} src="${cdnBase
          .replace(":version", themeVersion)
          .replace(":path", path)}" ${swupAttr}></script>`;
      }
    } else {
      scriptTag = _js({
        src: path,
        type: module ? "module" : undefined,
        "data-swup-reload-script": swupReload ? "" : undefined,
        // async: async,
      });
    }

    return scriptTag;
  };

  let renderedScripts = "";

  if (Array.isArray(path)) {
    renderedScripts = path.map(cdnPathHandle).join("");
  } else {
    renderedScripts = cdnPathHandle(path);
  }

  return renderedScripts;
});

hexo.extend.helper.register("renderCSS", function (path) {
  const _css = hexo.extend.helper.get("css").bind(hexo);

  const cdnProviders = {
    zstatic:
      "https://s4.zstatic.net/ajax/libs/hexo-theme-redefine/:version/:path",
    cdnjs:
      "https://cdnjs.cloudflare.com/ajax/libs/hexo-theme-redefine/:version/:path",
    unpkg: "https://unpkg.com/hexo-theme-redefine@:version/source/:path",
    jsdelivr:
      "https://cdn.jsdelivr.net/npm/hexo-theme-redefine@:version/source/:path",
    aliyun:
      "https://evan.beee.top/projects/hexo-theme-redefine@:version/source/:path",
    npmmirror:
      "https://registry.npmmirror.com/hexo-theme-redefine/:version/files/source/:path",
    custom: this.theme.cdn.custom_url,
  };

  const cdnPathHandle = (path) => {
    const cdnBase =
      cdnProviders[this.theme.cdn.provider] || cdnProviders.npmmirror;
    let cssLink;

    if (this.theme.cdn.enable) {
      if (this.theme.cdn.provider === "custom") {
        const customUrl = cdnBase
          .replace(":version", themeVersion)
          .replace(":path", path);
        cssLink = `<link rel="stylesheet" href="${customUrl}">`;
      } else {
        cssLink = `<link rel="stylesheet" href="${cdnBase
          .replace(":version", themeVersion)
          .replace(":path", path)}">`;
      }
    } else {
      cssLink = _css(path);
    }

    return cssLink;
  };

  if (Array.isArray(path)) {
    return path.map(cdnPathHandle).join("");
  } else {
    return cdnPathHandle(path);
  }
});

hexo.extend.helper.register("getThemeVersion", function () {
  return themeVersion;
});

hexo.extend.helper.register("checkDeprecation", function (condition, id, message) {
  if (condition) {
    // Use Set to ensure each warning is only logged once per Hexo process
    if (!global.deprecationWarnings) {
      global.deprecationWarnings = new Set();
    }
    
    if (!global.deprecationWarnings.has(id)) {
      hexo.log.warn(ensurePrefix(`${message}`));
      global.deprecationWarnings.add(id);
    }
    return true;
  }
  return false;
});

hexo.extend.helper.register("configOptions", function (obj, indent = '  ') {
  if (!obj || typeof obj !== 'object') return '';
  
  return Object.entries(obj)
    .filter(([key, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${indent}${key}: '${value}',`;
      }
      return `${indent}${key}: ${value},`;
    })
    .join('\n');
});
