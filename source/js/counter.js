(function () {
  // 基础偏移量：让访客数和浏览量从 666 开始累加
  const uvOffset = 665; // 当前访客数为 1，加 665 变为 666
  const pvOffset = 663; // 当前浏览量为 3，加 663 变为 666

  function applyOffset(id, offset) {
    const el = document.getElementById(id);
    if (!el) return;

    const update = () => {
      if (el.dataset.offsetApplied) return;
      const raw = el.innerText || el.textContent;
      const num = parseInt(raw, 10);
      if (!isNaN(num)) {
        el.dataset.offsetApplied = 'true';
        el.textContent = num + offset;
      }
    };

    update();

    const observer = new MutationObserver(() => {
      update();
      if (el.dataset.offsetApplied) {
        observer.disconnect();
      }
    });

    observer.observe(el, { childList: true, characterData: true, subtree: true });
  }

  function init() {
    applyOffset('busuanzi_value_site_uv', uvOffset);
    applyOffset('busuanzi_value_site_pv', pvOffset);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('pjax:complete', init);
})();
