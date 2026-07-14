/* 主题切换：左下角按钮 + localStorage 持久化 */
(function () {
  var KEY = 'lingda:theme';
  var ICON_SUN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  var ICON_MOON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/></svg>';

  function systemTheme() {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function storedTheme() {
    try {
      var t = localStorage.getItem(KEY);
      return t === 'dark' || t === 'light' ? t : null;
    } catch (e) {
      return null;
    }
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || storedTheme() || systemTheme();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) {}
    syncButton(theme);
  }

  function syncButton(theme) {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var dark = theme === 'dark';
    btn.setAttribute('aria-label', dark ? '切换为浅色模式' : '切换为深色模式');
    btn.setAttribute('title', dark ? '浅色模式' : '深色模式');
    btn.innerHTML =
      (dark ? ICON_SUN : ICON_MOON) +
      '<span class="theme-toggle-label">' +
      (dark ? '浅色' : '深色') +
      '</span>';
  }

  /* 尽早应用，减少闪烁 */
  applyTheme(storedTheme() || systemTheme());

  function mountButton() {
    if (document.getElementById('theme-toggle')) {
      syncButton(currentTheme());
      return;
    }
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'theme-toggle';
    btn.className = 'theme-toggle';
    btn.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
    document.body.appendChild(btn);
    if (document.querySelector('.auth')) btn.classList.add('is-auth');
    syncButton(currentTheme());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountButton);
  } else {
    mountButton();
  }

  window.LingDaTheme = {
    get: currentTheme,
    set: applyTheme,
    toggle: function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    },
  };
})();
