/* Social buttons: copy QQ / Email via the shared WPUI helpers. */
(function () {
  "use strict";

  window.WPUI.bindOnce("social-copy-click", function () {
    document.addEventListener("click", function (event) {
      var button = event.target.closest("[data-copy]");
      if (!button) return;
      event.preventDefault();

      var value = button.getAttribute("data-copy") || "";
      var message = button.getAttribute("data-toast") || ("已复制：" + value);

      window.WPUI.copyText(value).then(function (ok) {
        window.WPUI.showToast(ok ? message : ("复制失败，请手动复制：" + value));
      });
    });
  });
})();