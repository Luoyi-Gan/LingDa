(function () {
  function currentPage() {
    var raw = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!raw || raw === '/') return 'announcements';
    return raw.replace(/\.html$/i, '');
  }

  var page = currentPage();
  document.querySelectorAll('.nav-item[data-page]').forEach(function (el) {
    var target = (el.getAttribute('data-page') || '')
      .toLowerCase()
      .replace(/\.html$/i, '');
    if (target === page) {
      el.classList.add('active');
      el.setAttribute('aria-current', 'page');
    } else {
      el.classList.remove('active');
      el.removeAttribute('aria-current');
    }
  });

  document.querySelectorAll('.side-profile').forEach(function (el) {
    if (page === 'me') {
      el.classList.add('active');
      el.setAttribute('aria-current', 'page');
    } else {
      el.classList.remove('active');
      el.removeAttribute('aria-current');
    }
  });

  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = root.querySelectorAll('.tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var key = tab.getAttribute('data-tab');
        root.querySelectorAll('[data-panel]').forEach(function (panel) {
          panel.hidden = panel.getAttribute('data-panel') !== key;
        });
      });
    });
  });

  document.querySelectorAll('.toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.classList.toggle('on');
      btn.setAttribute('aria-pressed', btn.classList.contains('on') ? 'true' : 'false');
    });
  });

  document.querySelectorAll('.pill[data-filter]').forEach(function (pill) {
    pill.addEventListener('click', function () {
      var group = pill.parentElement;
      group.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('active'); });
      pill.classList.add('active');
    });
  });
})();
