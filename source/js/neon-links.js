/* Neon link cards for external links inside .article-content. */
(function () {
  "use strict";

  /* ---------- constants ---------- */
  var ICONS = {
    "github.com": "fa-brands fa-github",
    "pan.quark.cn": "fa-solid fa-cloud",
    "pan.baidu.com": "fa-solid fa-cloud"
  };
  var X_PATH = "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z";
  var SKIP = "pre, code, .article-copyright-info-container, .post-tags-box, .article-nav, .post-toc, [data-no-neon]";
  var LABELS = /^(链接|地址|下载地址|网盘链接|资源链接|资源|链接地址|下载)$/;
  var CODE_RE = /提取码\s*[:：]\s*([A-Za-z0-9]+)/;

  function iconFor(host) {
    var h = String(host || "").replace(/^www\./, "").toLowerCase();
    return ICONS[h] || "fa-solid fa-globe";
  }

  function makeIcon(host) {
    var h = String(host || "").replace(/^www\./, "").toLowerCase();
    if (h === "x.com" || h === "twitter.com") {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("class", "neon-x-svg");
      svg.setAttribute("aria-hidden", "true");
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", X_PATH);
      path.setAttribute("fill", "currentColor");
      svg.appendChild(path);
      return svg;
    }
    var icon = el("i", iconFor(host));
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------- parsing ---------- */
  function isBareUrl(text, url) {
    var t = String(text || "").trim().replace(/[.,;，。；、]+$/, "");
    if (!t) return true;
    if (t === url.href) return true;
    if (t === url.href.replace(/\/$/, "")) return true;
    return /^https?:\/\//i.test(t);
  }

  function displayPath(url) {
    var path = url.pathname || "/";
    try { path = decodeURIComponent(path); } catch (e) {}
    var params = new URLSearchParams(url.search || "");
    params.delete("pwd");
    var rest = params.toString();
    if (rest) path += "?" + rest;
    return path;
  }

  function extractCode(url, p) {
    var pwd = url.searchParams.get("pwd");
    if (pwd) return pwd;
    if (!p) return "";
    var m = String(p.textContent || "").match(CODE_RE);
    return m ? m[1] : "";
  }

  function parseLink(a) {
    var url = new URL(a.getAttribute("href") || "", location.href);
    var p = a.closest("p");
    var text = String(a.textContent || "").trim();
    var host = url.hostname.replace(/^www\./, "");
    return {
      url: url,
      p: p,
      host: host,
      title: isBareUrl(text, url) ? host : text,
      path: displayPath(url),
      code: extractCode(url, p)
    };
  }

  function shouldSkip(a) {
    if (!a || a.hasAttribute("data-neon-processed")) return true;
    if (a.closest(SKIP)) return true;
    if (a.querySelector("img")) return true;
    var href = a.getAttribute("href") || "";
    if (!href) return true;
    if (/^(#|mailto:|javascript:|tel:|data:)/i.test(href)) return true;
    var url;
    try { url = new URL(href, location.href); } catch (e) { return true; }
    if (url.protocol !== "http:" && url.protocol !== "https:") return true;
    if (url.hostname === location.hostname) return true;
    return false;
  }

  function lineBefore(a) {
    var text = "", node = a.previousSibling;
    while (node && node.nodeName !== "BR") {
      if (node.nodeType === 3) text = node.textContent + text;
      node = node.previousSibling;
    }
    return text.replace(/\s+/g, " ").trim();
  }

  function lineAfter(a) {
    var text = "", node = a.nextSibling;
    while (node && node.nodeName !== "BR") {
      if (node.nodeType === 3) text += node.textContent;
      node = node.nextSibling;
    }
    return text.replace(/\s+/g, " ").trim();
  }

  function isStandaloneLine(a, p) {
    if (!p) return false;
    if (p.querySelectorAll("a[href]").length !== 1) return false;
    if (p.querySelector("img, figure, pre, code, table, ul, ol, blockquote")) return false;
    var before = lineBefore(a).replace(/[\s:：,，。.;；、|/\-—_]+/g, "");
    var after = lineAfter(a).replace(/\s+/g, "");
    var beforeOk = before === "" || LABELS.test(before);
    var afterOk = after === "" || /^提取码[:：]?[A-Za-z0-9]*$/.test(after) || /^[，。.,;；、|]+$/.test(after);
    return beforeOk && afterOk;
  }

  function hasOtherText(p, a) {
    if (!p) return false;
    var full = String(p.textContent || "");
    var linkText = String(a.textContent || "");
    var rest = full.split(linkText).join("");
    rest = rest.replace(/提取码\s*[:：]\s*[A-Za-z0-9]+/g, "");
    rest = rest.replace(/[\s:：,，。.;；、|/\-—_]+/g, "");
    return rest.length > 0;
  }

  /* ---------- rendering ---------- */
  function buildCard(info) {
    var card = el("div", "neon-link-card");
    card.setAttribute("data-neon-processed", "card");
    card.setAttribute("title", info.url.href);

    var head = el("div", "neon-link-card__head");
    var iconWrap = el("span", "neon-link-card__icon");
    iconWrap.appendChild(makeIcon(info.host));

    var meta = el("div", "neon-link-card__meta");
    meta.appendChild(el("span", "neon-link-card__host", info.host));
    var pathEl = el("span", "neon-link-card__path", info.path || "/");
    pathEl.setAttribute("title", info.url.href);
    meta.appendChild(pathEl);

    head.appendChild(iconWrap);
    head.appendChild(meta);
    card.appendChild(head);
    card.appendChild(el("div", "neon-link-card__title", info.title));

    if (info.code) {
      var codeRow = el("div", "neon-link-card__code");
      codeRow.appendChild(el("span", "neon-code-label", "提取码"));
      codeRow.appendChild(el("code", "neon-code-value", info.code));
      var copyCode = el("button", "neon-link-btn neon-link-btn--ghost", "复制提取码");
      copyCode.type = "button";
      copyCode.setAttribute("data-copy-code", info.code);
      codeRow.appendChild(copyCode);
      card.appendChild(codeRow);
    }

    var actions = el("div", "neon-link-card__actions");
    var copyLink = el("button", "neon-link-btn", "复制链接");
    copyLink.type = "button";
    copyLink.setAttribute("data-copy-link", info.url.href);
    var open = el("a", "neon-link-btn neon-link-btn--primary", "打开链接");
    open.href = info.url.href;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.setAttribute("data-no-swup", "");
    var arrow = el("i", "fa-solid fa-arrow-up-right-from-square");
    arrow.setAttribute("aria-hidden", "true");
    open.appendChild(document.createTextNode(" "));
    open.appendChild(arrow);
    actions.appendChild(copyLink);
    actions.appendChild(open);
    card.appendChild(actions);
    return card;
  }

  function upgradePill(a, info) {
    a.classList.add("neon-link-pill");
    a.setAttribute("data-neon-processed", "pill");
    a.setAttribute("data-no-swup", "");
    a.setAttribute("title", info.url.href);
    if (!a.getAttribute("target")) a.setAttribute("target", "_blank");
    if (!a.getAttribute("rel")) a.setAttribute("rel", "noopener noreferrer");

    while (a.firstChild) a.removeChild(a.firstChild);

    var icon = makeIcon(info.host);
    icon.classList.add("neon-link-pill__icon");
    var text = el("span", "neon-link-pill__text", info.title);
    var hostEl = el("span", "neon-link-pill__host", info.host);
    var arrow = el("i", "fa-solid fa-arrow-up-right-from-square neon-link-pill__arrow");
    arrow.setAttribute("aria-hidden", "true");

    a.appendChild(icon);
    a.appendChild(text);
    a.appendChild(hostEl);
    a.appendChild(arrow);
  }

  function removeLinkLine(a) {
    var node = a.previousSibling;
    while (node && node.nodeName !== "BR") {
      var prev = node.previousSibling;
      if (node.parentNode) node.parentNode.removeChild(node);
      node = prev;
    }
    if (node && node.nodeName === "BR" && node.parentNode) node.parentNode.removeChild(node);
    var next = a.nextSibling;
    if (a.parentNode) a.parentNode.removeChild(a);
    if (next && next.nodeName === "BR" && next.parentNode) next.parentNode.removeChild(next);
  }

  /* ---------- scanning ---------- */
  function scan(root) {
    var links = (root || document).querySelectorAll(".article-content a[href]");
    Array.prototype.forEach.call(links, function (a) {
      if (shouldSkip(a)) return;
      var info;
      try { info = parseLink(a); } catch (e) { return; }

      if (isStandaloneLine(a, info.p)) {
        var card = buildCard(info);
        a.setAttribute("data-neon-processed", "card");
        if (!info.p) {
          a.replaceWith(card);
        } else if (hasOtherText(info.p, a)) {
          removeLinkLine(a);
          info.p.insertAdjacentElement("afterend", card);
        } else {
          info.p.replaceWith(card);
        }
      } else {
        upgradePill(a, info);
      }
    });
  }

  /* ---------- binding ---------- */
  function bindCopyHandlers() {
    window.WPUI.bindOnce("neon-copy-click", function () {
      document.addEventListener("click", function (event) {
        var linkBtn = event.target.closest("[data-copy-link]");
        if (linkBtn) {
          event.preventDefault();
          var link = linkBtn.getAttribute("data-copy-link") || "";
          window.WPUI.copyText(link).then(function (ok) {
            window.WPUI.showToast(ok ? "链接已复制" : "复制失败，请手动复制");
          });
          return;
        }
        var codeBtn = event.target.closest("[data-copy-code]");
        if (codeBtn) {
          event.preventDefault();
          var code = codeBtn.getAttribute("data-copy-code") || "";
          window.WPUI.copyText(code).then(function (ok) {
            window.WPUI.showToast(ok ? "提取码 " + code + " 已复制" : "复制失败，请手动复制");
          });
        }
      });
    });
  }

  function boot() {
    bindCopyHandlers();
    window.WPUI.bindOnce("neon-scan", function () {
      window.WPUI.onPageView(function () { scan(document); });
    });
  }

  boot();
  window.neonLinks = { scan: scan };
})();