/**
 * Read-count integration.
 *
 * - Footer totals: Cloudflare Zone Analytics snapshot from /data/cloudflare-traffic.json.
 * - Post page: one POST per canonical post URL to Vercount, incrementing that post PV.
 * - List pages (home / archive / tag / category): GET-only, never increments.
 * - < 10000 shows raw; >= 10000 shows "1.2 万"; full value in title.
 * - Em dash while loading, "暂无数据" on failure. Local hosts never write.
 */
(function () {
  "use strict";


  var API = "https://events.vercount.one/api/v2/log";
  var SITE_STATS_API = "/data/cloudflare-traffic.json";
  var TIMEOUT = 6000;
  var DEDUPE_MS = 3000;
  var CACHE_TTL = 5 * 60 * 1000;
  var LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "0.0.0.0", ""];

  function isLocal() { return LOCAL_HOSTS.indexOf(window.location.hostname) !== -1; }

  function formatCount(n) {
    if (typeof n !== "number" || !isFinite(n) || n < 0) return null;
    if (n < 10000) return String(Math.round(n));
    var wan = n / 10000;
    var text = wan >= 100 ? String(Math.round(wan)) : wan.toFixed(1).replace(/\\.0$/, "");
    return text + " 万";
  }

  function absolutePath(path) {
    try { return new URL(path, window.location.origin).href; } catch (e) { return null; }
  }

  function readCounter(payload) {
    if (!payload || typeof payload !== "object") return null;
    var data = payload.data && typeof payload.data === "object" ? payload.data : payload;
    var pagePv = Number(data.page_pv), sitePv = Number(data.site_pv), siteUv = Number(data.site_uv);
    return {
      pagePv: isFinite(pagePv) ? pagePv : null,
      sitePv: isFinite(sitePv) ? sitePv : null,
      siteUv: isFinite(siteUv) ? siteUv : null
    };
  }

  function request(url, method) {
    return new Promise(function (resolve) {
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, TIMEOUT);
      var options = { method: method || "GET", headers: { Accept: "application/json" }, signal: controller.signal, credentials: "omit" };
      if (method === "POST") {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify({ url: url, isNewUv: false });
      }
      var target = method === "POST" ? API : API + "?url=" + encodeURIComponent(url);
      fetch(target, options)
        .then(function (res) { clearTimeout(timer); if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
        .then(function (json) { resolve(readCounter(json)); })
        .catch(function () { clearTimeout(timer); resolve(null); });
    });
  }

  function readSiteStats(payload) {
    if (!payload || typeof payload !== "object") return null;
    var visitors = Number(payload.visitors);
    var pageViews = Number(payload.pageViews);
    if (!isFinite(visitors) || visitors < 0 || !isFinite(pageViews) || pageViews < 0) return null;
    return {
      visitors: visitors,
      pageViews: pageViews,
      updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : ""
    };
  }

  function requestSiteStats() {
    return new Promise(function (resolve) {
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, TIMEOUT);
      fetch(SITE_STATS_API, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
        credentials: "same-origin",
        cache: "no-store"
      })
        .then(function (res) { clearTimeout(timer); if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
        .then(function (json) { resolve(readSiteStats(json)); })
        .catch(function () { clearTimeout(timer); resolve(null); });
    });
  }

  function formatUpdatedAt(value) {
    if (!value) return "";
    try {
      var date = new Date(value);
      if (!isFinite(date.getTime())) return value;
      return date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
    } catch (e) {
      return value;
    }
  }

  function renderSiteValue(el, value, label, updatedAt) {
    if (!el) return;
    if (value === null || typeof value === "undefined" || isNaN(value)) {
      el.textContent = "暂无数据";
      el.classList.add("pv-unavailable");
      el.removeAttribute("title");
      el.removeAttribute("aria-label");
      return;
    }
    var numberText = Number(value).toLocaleString("zh-CN");
    var title = "Cloudflare · " + label;
    var updated = formatUpdatedAt(updatedAt);
    if (updated) title += " · 更新于 " + updated;
    el.classList.remove("pv-unavailable");
    el.textContent = numberText;
    el.setAttribute("title", title);
    el.setAttribute("aria-label", label + " " + numberText);
  }

  function cacheGet(url) {
    try {
      var raw = sessionStorage.getItem("wp-pv-cache:" + url);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || Date.now() - obj.t > CACHE_TTL) return null;
      return obj.v;
    } catch (e) { return null; }
  }

  function cacheSet(url, value) {
    try { sessionStorage.setItem("wp-pv-cache:" + url, JSON.stringify({ v: value, t: Date.now() })); } catch (e) {}
  }

  function renderValue(el, value) {
    if (!el) return;
    if (value === null || typeof value === "undefined" || isNaN(value)) {
      el.textContent = "暂无数据";
      el.classList.add("pv-unavailable");
      el.removeAttribute("title");
      return;
    }
    el.classList.remove("pv-unavailable");
    el.textContent = formatCount(value) || "暂无数据";
    el.setAttribute("title", "完整阅读量 " + Number(value).toLocaleString("zh-CN"));
  }

  function shouldPost(url) {
    try {
      var last = Number(sessionStorage.getItem("wp-pv-post:" + url) || 0);
      if (Date.now() - last < DEDUPE_MS) return false;
      sessionStorage.setItem("wp-pv-post:" + url, String(Date.now()));
      return true;
    } catch (e) { return true; }
  }

  async function refreshSiteStats() {
    var sitePvEl = document.getElementById("busuanzi_value_site_pv");
    var siteUvEl = document.getElementById("busuanzi_value_site_uv");
    if (!sitePvEl && !siteUvEl) return;
    var data = await requestSiteStats();
    renderSiteValue(siteUvEl, data ? data.visitors : null, "访问人数", data ? data.updatedAt : "");
    renderSiteValue(sitePvEl, data ? data.pageViews : null, "总访问量", data ? data.updatedAt : "");
  }

  async function refreshPostCounts() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-post-pv]"));
    if (!nodes.length) return;
    var articleNode = document.querySelector(".article-content-container [data-post-pv]");
    var groups = {};
    nodes.forEach(function (el) {
      var url = absolutePath(el.getAttribute("data-post-pv"));
      if (!url) return;
      if (!groups[url]) groups[url] = { els: [], isCurrent: articleNode === el };
      groups[url].els.push(el);
    });
    var urls = Object.keys(groups);
    await Promise.all(urls.map(async function (url) {
      var cached = cacheGet(url);
      var value;
      if (cached !== null) {
        value = cached;
      } else if (groups[url].isCurrent && !isLocal() && shouldPost(url)) {
        var counted = await request(url, "POST");
        value = counted && counted.pagePv !== null ? counted.pagePv : null;
        if (value !== null) cacheSet(url, value);
      } else {
        var queried = await request(url, "GET");
        value = queried && queried.pagePv !== null ? queried.pagePv : null;
        if (value !== null) cacheSet(url, value);
      }
      groups[url].els.forEach(function (el) { renderValue(el, value); });
    }));
  }

  var running = false;
  async function refresh() {
    if (running) return;
    running = true;
    try { await Promise.all([refreshSiteStats(), refreshPostCounts()]); } finally { running = false; }
  }

  window.WPUI.bindOnce("counter-refresh", function () {
    window.WPUI.onPageView(function () {
      setTimeout(refresh, 60);
    });
  });
})();
