/* 全局 Toast / Sheet / Modal 基础 */
(function (w) {
  var toastHost = null;
  var scrollLocks = 0;

  function ensureToastHost() {
    if (toastHost) return toastHost;
    toastHost = document.createElement('div');
    toastHost.className = 'toast-host';
    toastHost.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastHost);
    return toastHost;
  }

  function toast(msg, ms) {
    var host = ensureToastHost();
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    host.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add('show');
    });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 220);
    }, ms || 2200);
  }

  function lockScroll() {
    scrollLocks += 1;
    document.body.classList.add('sheet-open');
  }

  function unlockScroll() {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (!scrollLocks) document.body.classList.remove('sheet-open');
  }

  function openOverlay(backdrop, panel) {
    if (!backdrop || !panel) return;
    backdrop.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
      backdrop.classList.add('open');
      panel.classList.add('open');
    });
    lockScroll();
  }

  function closeOverlay(backdrop, panel) {
    if (!backdrop || !panel) return;
    backdrop.classList.remove('open');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    unlockScroll();
    setTimeout(function () {
      if (!panel.classList.contains('open')) backdrop.hidden = true;
    }, 280);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  w.LingDaUI = {
    toast: toast,
    lockScroll: lockScroll,
    unlockScroll: unlockScroll,
    openOverlay: openOverlay,
    closeOverlay: closeOverlay,
    escapeHtml: escapeHtml,
  };
})(window);
