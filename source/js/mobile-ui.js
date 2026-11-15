/* Mobile navigation shell and dependency-free search fallback. */
(function () {
  "use strict";

  if (window.WPMobileUI && typeof window.WPMobileUI.refresh === "function") {
    window.WPMobileUI.refresh();
    return;
  }

  var SEARCH_LIMIT = 16;
  var searchEntries = null;
  var searchPromise = null;
  var searchTimer = null;
  var lastSearchTrigger = null;
  var lastDrawerTrigger = null;

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function rootPath() {
    var root = window.config && window.config.root ? window.config.root : "/";
    return root.charAt(root.length - 1) === "/" ? root : root + "/";
  }

  function assetUrl(assetPath) {
    var value = String(assetPath || "");
    if (/^(?:https?:)?\/\//i.test(value)) return value;
    return rootPath() + value.replace(/^\/+/, "");
  }

  function stripHtml(value) {
    try {
      var parsed = new DOMParser().parseFromString(String(value || ""), "text/html");
      return (parsed.body && parsed.body.textContent) || "";
    } catch (error) {
      return String(value || "").replace(/<[^>]+>/g, " ");
    }
  }

  function getDom() {
    return {
      searchButton: qs(".mobile .search-popup-trigger"),
      drawerButton: qs(".mobile .navbar-bar"),
      overlay: qs("#local-search-overlay, .search-pop-overlay"),
      popup: qs("#local-search-overlay .search-popup, .search-pop-overlay .search-popup"),
      closeButton: qs("#local-search-overlay .popup-btn-close, .search-pop-overlay .popup-btn-close"),
      input: qs("#local-search-input, .search-pop-overlay .search-input"),
      results: qs("#local-search-overlay #search-result, .search-pop-overlay #search-result"),
      drawer: qs("#mobile-navbar-drawer, .navbar-drawer"),
      mask: qs(".navbar-container .window-mask, .window-mask")
    };
  }

  function setExpanded(element, expanded) {
    if (element) element.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function setLocked(locked) {
    if (locked) document.body.classList.add("mobile-ui-locked");
    else document.body.classList.remove("mobile-ui-locked");
  }

  function updateState() {
    var dom = getDom();
    var searchOpen = !!(dom.overlay && dom.overlay.classList.contains("active"));
    var drawerOpen = document.body.classList.contains("navbar-drawer-show");
    setExpanded(dom.searchButton, searchOpen);
    setExpanded(dom.drawerButton, drawerOpen);
    if (dom.searchButton) dom.searchButton.setAttribute("aria-label", searchOpen ? "关闭站内搜索" : "打开站内搜索");
    if (dom.drawerButton) dom.drawerButton.setAttribute("aria-label", drawerOpen ? "关闭导航菜单" : "打开导航菜单");
    if (dom.overlay) dom.overlay.setAttribute("aria-hidden", searchOpen ? "false" : "true");
    if (dom.drawer) dom.drawer.setAttribute("aria-hidden", drawerOpen ? "false" : "true");
    setLocked(searchOpen || drawerOpen);
  }

  function closeDrawer(restoreFocus) {
    document.body.classList.remove("navbar-drawer-show");
    updateState();
    if (restoreFocus && lastDrawerTrigger) {
      setTimeout(function () { lastDrawerTrigger.focus({ preventScroll: true }); }, 0);
    }
  }

  function openDrawer(trigger) {
    var dom = getDom();
    if (!dom.drawer) return;
    closeSearch(false);
    lastDrawerTrigger = trigger || dom.drawerButton;
    document.body.classList.add("navbar-drawer-show");
    updateState();
  }

  function closeSearch(restoreFocus) {
    var dom = getDom();
    if (dom.overlay) dom.overlay.classList.remove("active");
    updateState();
    if (restoreFocus && lastSearchTrigger) {
      setTimeout(function () { lastSearchTrigger.focus({ preventScroll: true }); }, 0);
    }
  }

  function openSearch(trigger) {
    var dom = getDom();
    if (!dom.overlay) return;
    closeDrawer(false);
    lastSearchTrigger = trigger || dom.searchButton;
    dom.overlay.classList.add("active");
    updateState();
    ensureSearchData().then(function () {
      if (dom.input) renderResults(dom.input.value, dom.results);
    });
    if (dom.input) {
      setTimeout(function () { dom.input.focus({ preventScroll: true }); }, 80);
    }
  }

  function createMessage(text, iconClass) {
    var wrap = document.createElement("div");
    wrap.id = "no-result";
    if (iconClass) {
      var icon = document.createElement("i");
      icon.className = iconClass;
      icon.setAttribute("aria-hidden", "true");
      wrap.appendChild(icon);
    }
    var label = document.createElement("span");
    label.textContent = text;
    wrap.appendChild(label);
    return wrap;
  }

  function searchUrl() {
    var configured = window.theme && window.theme.navbar && window.theme.navbar.search
      ? window.theme.navbar.search.path
      : "";
    if (!configured || !/\.json$/i.test(configured)) configured = "search.json";
    return assetUrl(configured);
  }

  function ensureSearchData() {
    if (searchEntries) return Promise.resolve(searchEntries);
    if (searchPromise) return searchPromise;
    searchPromise = fetch(searchUrl(), { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        searchEntries = Array.isArray(data) ? data.map(function (entry) {
          return {
            title: String(entry.title || "").trim(),
            content: stripHtml(entry.content || "").trim(),
            url: String(entry.url || "").trim()
          };
        }).filter(function (entry) { return entry.title && entry.url; }) : [];
        return searchEntries;
      })
      .catch(function () {
        searchEntries = [];
        return searchEntries;
      });
    return searchPromise;
  }

  function snippetFor(content, needle) {
    var lower = content.toLowerCase();
    var index = lower.indexOf(needle);
    if (index < 0) return content.slice(0, 110);
    var start = Math.max(0, index - 36);
    var end = Math.min(content.length, index + needle.length + 82);
    return (start > 0 ? "…" : "") + content.slice(start, end) + (end < content.length ? "…" : "");
  }

  function renderResults(rawQuery, resultRoot) {
    var dom = getDom();
    resultRoot = resultRoot || dom.results;
    if (!resultRoot) return;
    while (resultRoot.firstChild) resultRoot.removeChild(resultRoot.firstChild);

    var query = String(rawQuery || "").trim().toLowerCase();
    if (!query) {
      resultRoot.appendChild(createMessage("输入关键词搜索文章", "fa-solid fa-magnifying-glass fa-4x fa-fw"));
      return;
    }

    var results = (searchEntries || []).map(function (entry) {
      var title = entry.title.toLowerCase();
      var content = entry.content.toLowerCase();
      var score = title.indexOf(query) === 0 ? 3 : title.indexOf(query) >= 0 ? 2 : content.indexOf(query) >= 0 ? 1 : 0;
      return { entry: entry, score: score };
    }).filter(function (item) { return item.score > 0; }).sort(function (a, b) {
      return b.score - a.score;
    }).slice(0, SEARCH_LIMIT);

    if (!results.length) {
      resultRoot.appendChild(createMessage("没有找到相关内容", "fa-solid fa-box-open fa-4x fa-fw"));
      return;
    }

    var list = document.createElement("ul");
    list.className = "search-result-list";
    results.forEach(function (item) {
      var entry = item.entry;
      var li = document.createElement("li");
      var titleLink = document.createElement("a");
      titleLink.className = "search-result-title";
      titleLink.href = entry.url;
      titleLink.textContent = entry.title;
      li.appendChild(titleLink);

      var bodyLink = document.createElement("a");
      bodyLink.href = entry.url;
      var snippet = document.createElement("p");
      snippet.className = "search-result";
      snippet.textContent = snippetFor(entry.content, query);
      bodyLink.appendChild(snippet);
      li.appendChild(bodyLink);
      list.appendChild(li);
    });
    resultRoot.appendChild(list);
  }

  function bindOnce(element, key, eventName, handler) {
    if (!element || element.getAttribute("data-wp-mobile-bound") === key) return;
    element.setAttribute("data-wp-mobile-bound", key);
    element.addEventListener(eventName, handler, { passive: eventName === "input" ? true : false });
  }

  function intercept(event, callback) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    callback();
  }

  function bindDom() {
    var dom = getDom();

    bindOnce(dom.searchButton, "search-toggle", "click", function (event) {
      intercept(event, function () {
        if (dom.overlay && dom.overlay.classList.contains("active")) closeSearch(true);
        else openSearch(dom.searchButton);
      });
    });

    bindOnce(dom.drawerButton, "drawer-toggle", "click", function (event) {
      intercept(event, function () {
        if (document.body.classList.contains("navbar-drawer-show")) closeDrawer(true);
        else openDrawer(dom.drawerButton);
      });
    });

    bindOnce(dom.closeButton, "search-close", "click", function (event) {
      intercept(event, function () { closeSearch(true); });
    });

    bindOnce(dom.mask, "drawer-mask", "click", function (event) {
      intercept(event, function () { closeDrawer(true); });
    });

    bindOnce(dom.overlay, "overlay-close", "click", function (event) {
      if (event.target === dom.overlay) {
        intercept(event, function () { closeSearch(true); });
      }
    });

    bindOnce(dom.input, "search-input", "input", function (event) {
      event.stopPropagation();
      clearTimeout(searchTimer);
      var value = event.target.value;
      searchTimer = setTimeout(function () { renderResults(value, dom.results); }, 100);
    });


    updateState();
  }

  function refresh() {
    closeDrawer(false);
    closeSearch(false);
    bindDom();
    updateState();
  }

  function bindGlobalOnce() {
    if (window.__wpMobileUIGlobalBound) return;
    window.__wpMobileUIGlobalBound = true;

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (document.body.classList.contains("navbar-drawer-show")) closeDrawer(true);
      var overlay = qs("#local-search-overlay, .search-pop-overlay");
      if (overlay && overlay.classList.contains("active")) closeSearch(true);
    });

    ["swup:page:view", "redefine:page:refresh", "pjax:complete"].forEach(function (name) {
      document.addEventListener(name, refresh);
    });

    window.addEventListener("redefine:swup:ready", function () {
      if (window.swup && window.swup.hooks && window.swup.hooks.on) {
        window.swup.hooks.on("page:view", refresh);
      }
    });
  }

  window.WPMobileUI = { refresh: refresh };

  function init() {
    bindGlobalOnce();
    bindDom();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
