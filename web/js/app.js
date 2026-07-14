/* 主壳交互：发布 / 匹配 / 筛选 / 评价 / 资料编辑 */
(function () {
  var UI = window.LingDaUI;
  var Auth = window.LingDaAuth;
  if (!UI || !Auth) return;

  var MODULES = {
    carpool: {
      key: 'carpool',
      label: '拼车',
      tag: 'Carpool',
      tint: 't-sky',
      fields: [
        { id: 'from', label: '出发地', ph: '如：图书馆门口' },
        { id: 'to', label: '目的地', ph: '如：南站' },
        { id: 'time', label: '时间', ph: '如：周五 18:30' },
        { id: 'seats', label: '人数', ph: '如：还差 1 人' },
      ],
    },
    play: {
      key: 'play',
      label: '娱乐',
      tag: 'Play',
      tint: 't-violet',
      fields: [
        { id: 'game', label: '活动 / 游戏', ph: '如：王者荣耀' },
        { id: 'time', label: '时间', ph: '如：今晚 20:00' },
        { id: 'mode', label: '模式', ph: '如：双排冲分' },
        { id: 'slots', label: '人数', ph: '如：缺 2 人' },
      ],
    },
    study: {
      key: 'study',
      label: '学习',
      tag: 'Study',
      tint: 't-teal',
      fields: [
        { id: 'subject', label: '科目 / 主题', ph: '如：高数第四章' },
        { id: 'place', label: '地点', ph: '如：二教 305' },
        { id: 'time', label: '时间', ph: '如：工作日晚' },
        { id: 'goal', label: '目标', ph: '如：互批错题' },
      ],
    },
  };

  var FILTER_MAP = { 全部: 'all', 拼车: 'carpool', 娱乐: 'play', 学习: 'study' };

  Auth.syncMeDom();

  /* —— Toast 快捷 —— */
  function tip(msg) {
    UI.toast(msg);
  }

  /* —— 注入发布 Sheet —— */
  var publishBackdrop;
  var publishSheet;
  var publishMode = 'publish'; // publish | match
  var publishModule = 'carpool';

  function ensurePublish() {
    if (publishSheet) return;
    publishBackdrop = document.createElement('div');
    publishBackdrop.className = 'sheet-backdrop';
    publishBackdrop.id = 'publish-backdrop';
    publishBackdrop.hidden = true;

    publishSheet = document.createElement('div');
    publishSheet.className = 'sheet';
    publishSheet.id = 'publish-sheet';
    publishSheet.setAttribute('aria-hidden', 'true');
    publishSheet.setAttribute('role', 'dialog');
    publishSheet.setAttribute('aria-label', '发起组队');
    publishSheet.innerHTML =
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-head"><h2 id="publish-title">发起组队</h2>' +
      '<button type="button" class="drawer-close" id="publish-close" aria-label="关闭">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button></div>' +
      '<div class="sheet-body">' +
      '<div class="module-tabs" id="module-tabs">' +
      '<button type="button" class="module-tab active" data-mod="carpool">拼车</button>' +
      '<button type="button" class="module-tab" data-mod="play">娱乐</button>' +
      '<button type="button" class="module-tab" data-mod="study">学习</button>' +
      '</div>' +
      '<div class="stack" id="publish-fields" style="gap:14px;margin-top:16px"></div>' +
      '<button type="button" class="btn btn-cta btn-block" id="publish-submit" style="margin-top:20px">发布组队</button>' +
      '</div>';

    document.body.appendChild(publishBackdrop);
    document.body.appendChild(publishSheet);

    publishBackdrop.addEventListener('click', closePublish);
    document.getElementById('publish-close').addEventListener('click', closePublish);
    document.getElementById('module-tabs').addEventListener('click', function (e) {
      var tab = e.target.closest('[data-mod]');
      if (!tab) return;
      publishModule = tab.getAttribute('data-mod');
      renderPublishFields();
    });
    document.getElementById('publish-submit').addEventListener('click', submitPublish);
  }

  function renderPublishFields() {
    var mod = MODULES[publishModule];
    var tabs = document.querySelectorAll('#module-tabs .module-tab');
    tabs.forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-mod') === publishModule);
    });
    var title = document.getElementById('publish-title');
    var submit = document.getElementById('publish-submit');
    if (publishMode === 'match') {
      title.textContent = '匹配 · ' + mod.label;
      submit.textContent = '开始匹配';
    } else {
      title.textContent = '发起组队 · ' + mod.label;
      submit.textContent = '发布组队';
    }
    var host = document.getElementById('publish-fields');
    host.innerHTML = mod.fields
      .map(function (f) {
        return (
          '<div class="field"><label>' +
          UI.escapeHtml(f.label) +
          '</label><input class="input" data-field="' +
          f.id +
          '" placeholder="' +
          UI.escapeHtml(f.ph) +
          '" /></div>'
        );
      })
      .join('');
  }

  function openPublish(opts) {
    ensurePublish();
    publishMode = (opts && opts.mode) || 'publish';
    publishModule = (opts && opts.module) || 'carpool';
    renderPublishFields();
    UI.openOverlay(publishBackdrop, publishSheet);
  }

  function closePublish() {
    UI.closeOverlay(publishBackdrop, publishSheet);
  }

  function submitPublish() {
    var mod = MODULES[publishModule];
    var values = {};
    var empty = false;
    document.querySelectorAll('#publish-fields [data-field]').forEach(function (input) {
      var v = input.value.trim();
      values[input.getAttribute('data-field')] = v;
      if (!v) empty = true;
    });
    if (empty) {
      tip('请先填完必填信息');
      return;
    }
    closePublish();
    if (publishMode === 'match') {
      tip('已找到 ' + (3 + Math.floor(Math.random() * 4)) + ' 位候补搭子');
      setTimeout(function () {
        location.href = 'posts.html?filter=' + publishModule;
      }, 700);
      return;
    }
    var draft = {
      module: publishModule,
      tag: mod.tag,
      values: values,
      at: Date.now(),
    };
    try {
      var list = JSON.parse(localStorage.getItem('lingda:drafts') || '[]');
      list.unshift(draft);
      localStorage.setItem('lingda:drafts', JSON.stringify(list.slice(0, 20)));
    } catch (e) {}
    tip('组队已发布（预览）');
    setTimeout(function () {
      location.href = 'posts.html?filter=' + publishModule;
    }, 650);
  }

  /* —— 编辑资料 Modal —— */
  var editBackdrop;
  var editModal;

  function ensureEditModal() {
    if (editModal) return;
    editBackdrop = document.createElement('div');
    editBackdrop.className = 'sheet-backdrop';
    editBackdrop.hidden = true;
    editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.setAttribute('aria-hidden', 'true');
    editModal.setAttribute('role', 'dialog');
    editModal.innerHTML =
      '<div class="modal-card">' +
      '<div class="sheet-head"><h2>编辑资料</h2>' +
      '<button type="button" class="drawer-close" id="edit-close" aria-label="关闭">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button></div>' +
      '<div class="stack" style="gap:12px;padding:4px 4px 8px">' +
      '<div class="field"><label>昵称</label><input class="input" id="edit-name" /></div>' +
      '<div class="field"><label>学院</label><input class="input" id="edit-college" /></div>' +
      '<div class="field"><label>专业</label><input class="input" id="edit-major" /></div>' +
      '<div class="field"><label>年级</label><input class="input" id="edit-grade" /></div>' +
      '<div class="field"><label>简介</label><input class="input" id="edit-bio" /></div>' +
      '<button type="button" class="btn btn-cta btn-block" id="edit-save">保存</button>' +
      '</div></div>';
    document.body.appendChild(editBackdrop);
    document.body.appendChild(editModal);
    editBackdrop.addEventListener('click', closeEdit);
    document.getElementById('edit-close').addEventListener('click', closeEdit);
    document.getElementById('edit-save').addEventListener('click', function () {
      var name = document.getElementById('edit-name').value.trim();
      if (!name) {
        tip('昵称不能为空');
        return;
      }
      Auth.saveProfile({
        name: name,
        college: document.getElementById('edit-college').value.trim(),
        major: document.getElementById('edit-major').value.trim(),
        grade: document.getElementById('edit-grade').value.trim(),
        bio: document.getElementById('edit-bio').value.trim(),
      });
      Auth.syncMeDom();
      closeEdit();
      tip('资料已更新');
    });
  }

  function openEdit() {
    ensureEditModal();
    var p = Auth.getProfile();
    document.getElementById('edit-name').value = p.name || '';
    document.getElementById('edit-college').value = p.college || '';
    document.getElementById('edit-major').value = p.major || '';
    document.getElementById('edit-grade').value = p.grade || '';
    document.getElementById('edit-bio').value = p.bio || '';
    UI.openOverlay(editBackdrop, editModal);
  }

  function closeEdit() {
    UI.closeOverlay(editBackdrop, editModal);
  }

  /* —— 评价 Sheet —— */
  var rateBackdrop;
  var rateSheet;

  function ensureRate() {
    if (rateSheet) return;
    rateBackdrop = document.createElement('div');
    rateBackdrop.className = 'sheet-backdrop';
    rateBackdrop.hidden = true;
    rateSheet = document.createElement('div');
    rateSheet.className = 'sheet';
    rateSheet.setAttribute('aria-hidden', 'true');
    rateSheet.innerHTML =
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-head"><h2>待办评价</h2>' +
      '<button type="button" class="drawer-close" id="rate-close" aria-label="关闭">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button></div>' +
      '<div class="sheet-body">' +
      '<p class="text-muted" style="font-size:13px;margin-bottom:14px">为最近一次组队「周五晚南站拼车 · 周一凡」打分</p>' +
      '<div class="rate-stars" id="rate-stars">' +
      [1, 2, 3, 4, 5]
        .map(function (n) {
          return '<button type="button" class="rate-star" data-star="' + n + '">★</button>';
        })
        .join('') +
      '</div>' +
      '<div class="field" style="margin-top:16px"><label>一句话评价</label>' +
      '<input class="input" id="rate-text" placeholder="准时靠谱…" /></div>' +
      '<button type="button" class="btn btn-cta btn-block" id="rate-submit" style="margin-top:18px">提交评价</button>' +
      '</div>';
    document.body.appendChild(rateBackdrop);
    document.body.appendChild(rateSheet);
    var stars = 5;
    rateBackdrop.addEventListener('click', closeRate);
    document.getElementById('rate-close').addEventListener('click', closeRate);
    document.getElementById('rate-stars').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-star]');
      if (!btn) return;
      stars = Number(btn.getAttribute('data-star'));
      document.querySelectorAll('#rate-stars .rate-star').forEach(function (s) {
        s.classList.toggle('on', Number(s.getAttribute('data-star')) <= stars);
      });
    });
    document.querySelectorAll('#rate-stars .rate-star').forEach(function (s) {
      s.classList.add('on');
    });
    document.getElementById('rate-submit').addEventListener('click', function () {
      localStorage.setItem(
        'lingda:last-review',
        JSON.stringify({ stars: stars, text: document.getElementById('rate-text').value.trim(), at: Date.now() })
      );
      localStorage.setItem('lingda:todo-rate', '0');
      closeRate();
      tip('评价已提交，谢谢反馈');
      var chip = document.querySelector('[data-action="rate"]');
      if (chip) chip.style.display = 'none';
    });
  }

  function openRate() {
    ensureRate();
    UI.openOverlay(rateBackdrop, rateSheet);
  }

  function closeRate() {
    UI.closeOverlay(rateBackdrop, rateSheet);
  }

  /* —— 筛选 —— */
  function applyFilter(root, value) {
    var items = (root || document).querySelectorAll('[data-category]');
    items.forEach(function (el) {
      var cat = el.getAttribute('data-category');
      var show = value === 'all' || cat === value;
      el.hidden = !show;
      el.style.display = show ? '' : 'none';
    });
  }

  function wireFilters() {
    document.querySelectorAll('.filters').forEach(function (group) {
      group.querySelectorAll('.filter-pill').forEach(function (pill) {
        if (!pill.getAttribute('data-filter')) {
          var text = (pill.textContent || '').trim();
          pill.setAttribute('data-filter', FILTER_MAP[text] || 'all');
        }
      });
      group.addEventListener('click', function (e) {
        var pill = e.target.closest('.filter-pill');
        if (!pill || !group.contains(pill)) return;
        group.querySelectorAll('.filter-pill').forEach(function (p) {
          p.classList.remove('active');
        });
        pill.classList.add('active');
        var val = pill.getAttribute('data-filter') || 'all';
        var scope = group.closest('.card, .post-sec, .page-wrap') || document;
        applyFilter(scope, val);
      });
    });

    var params = new URLSearchParams(location.search);
    var preset = params.get('filter');
    if (preset && MODULES[preset]) {
      document.querySelectorAll('.filters').forEach(function (group) {
        var pills = group.querySelectorAll('.filter-pill');
        pills.forEach(function (p) {
          var on = p.getAttribute('data-filter') === preset;
          p.classList.toggle('active', on);
        });
        applyFilter(group.closest('.card, .post-sec, .page-wrap') || document, preset);
      });
    }
  }

  /* —— 绑定全局 CTA / FAB / 入口 —— */
  document.querySelectorAll('.dn-cta, .tab-fab').forEach(function (el) {
    el.setAttribute('href', 'javascript:void(0)');
    el.addEventListener('click', function (e) {
      e.preventDefault();
      openPublish({ mode: 'publish' });
    });
  });

  document.querySelectorAll('[data-entry]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      openPublish({ mode: 'match', module: el.getAttribute('data-entry') });
    });
  });

  document.querySelectorAll('[data-action="edit-profile"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      openEdit();
    });
  });

  document.querySelectorAll('[data-action="privacy"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      tip('隐私与安全设置（预览未开通）');
    });
  });

  document.querySelectorAll('[data-action="logout"]').forEach(function (el) {
    el.addEventListener('click', function () {
      Auth.logout();
    });
  });

  document.querySelectorAll('[data-action="rate"]').forEach(function (el) {
    el.style.cursor = 'pointer';
    if (localStorage.getItem('lingda:todo-rate') === '0') el.style.display = 'none';
    el.addEventListener('click', function () {
      openRate();
    });
  });

  document.querySelectorAll('[data-open-post]').forEach(function (el) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function () {
      var id = el.getAttribute('data-open-post');
      location.href = 'posts.html?post=' + encodeURIComponent(id);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (publishSheet && publishSheet.classList.contains('open')) closePublish();
    if (editModal && editModal.classList.contains('open')) closeEdit();
    if (rateSheet && rateSheet.classList.contains('open')) closeRate();
  });

  wireFilters();

  w.LingDaApp = {
    openPublish: openPublish,
    openEdit: openEdit,
    openRate: openRate,
    tip: tip,
  };
})();
