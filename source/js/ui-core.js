/* Shared UI core: clipboard, toast and page-view lifecycle. */
(function () {
  "use strict";

  if (window.WPUI) return;

  var TOAST_ID = "wp-ui-toast";
  var toastTimer = null;
  var callbacks = [];
  var bound = false;
  var initialFired = false;
  var onceKeys = Object.create(null);

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copyText(text) {
    var value = String(text == null ? "" : text);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value).then(function () {
        return true;
      }).catch(function () {
        return fallbackCopy(value);
      });
    }
    return Promise.resolve(fallbackCopy(value));
  }

  function showToast(message) {
    var el = document.getElementById(TOAST_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = TOAST_ID;
      el.className = "social-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-atomic", "true");
      document.body.appendChild(el);
    }
    el.textContent = String(message == null ? "" : message);
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("is-visible");
    }, 2200);
  }

  function safeRun(cb) {
    try { cb(); } catch (e) { console.error("[WPUI] page-view callback failed:", e); }
  }

  function runAll() {
    callbacks.slice().forEach(safeRun);
  }

  function fireInitial() {
    if (initialFired) return;
    initialFired = true;
    runAll();
  }

  function hookSwup() {
    if (!window.swup || !window.swup.hooks || window.__wpUiSwupHooked) return;
    window.__wpUiSwupHooked = true;
    window.swup.hooks.on("page:view", runAll);
  }

  function bind() {
    if (bound) return;
    bound = true;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fireInitial, { once: true });
    } else {
      setTimeout(fireInitial, 0);
    }

    ["swup:page:view", "redefine:page:refresh", "pjax:complete"].forEach(function (name) {
      document.addEventListener(name, runAll);
    });

    window.addEventListener("redefine:swup:ready", hookSwup);
    hookSwup();
  }

  function onPageView(callback) {
    if (typeof callback !== "function") return;
    callbacks.push(callback);
    bind();
    if (initialFired) setTimeout(function () { safeRun(callback); }, 0);
  }

  function bindOnce(key, fn) {
    if (!key || onceKeys[key]) return false;
    onceKeys[key] = true;
    if (typeof fn === "function") fn();
    return true;
  }

  function onReady(callback) {
    if (typeof callback !== "function") return;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { safeRun(callback); }, { once: true });
    } else {
      safeRun(callback);
    }
  }

  window.WPUI = {
    copyText: copyText,
    showToast: showToast,
    onPageView: onPageView,
    onReady: onReady,
    bindOnce: bindOnce
  };
})();
