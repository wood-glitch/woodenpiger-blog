/* Cover hydration: fade in on load, hide on error, rescan on page views. */
(function () {
  "use strict";

  function hydrate(img) {
    if (!img || img.dataset.coverReady === "1") return;
    img.dataset.coverReady = "1";

    function done() {
      img.classList.add("is-loaded");
    }

    function drop() {
      var box = img.closest(".home-article-thumbnail, .article-cover-media");
      img.remove();
      if (box) box.classList.add("cover-missing");
    }

    if (img.complete) {
      if (img.naturalWidth > 0) done();
      else drop();
      return;
    }

    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", drop, { once: true });
  }

  function scan(root) {
    (root || document).querySelectorAll("img.cover-image").forEach(hydrate);
  }

  window.WPUI.bindOnce("cover-hydrate", function () {
    window.WPUI.onPageView(function () { scan(document); });
  });
})();