/* 假鉴权：localStorage 会话 + 个人资料覆盖 */
(function (w) {
  var KEY_SESSION = 'lingda:session';
  var KEY_PROFILE = 'lingda:profile';
  var KEY_REMEMBER = 'lingda:remember';

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function defaultProfile() {
    return {
      name: '开发预览',
      av: '开',
      college: '新闻学院',
      major: '前端',
      grade: '研一',
      bio: '本地 UI 开发预览账号',
      studentId: '',
    };
  }

  function getProfile() {
    return Object.assign(defaultProfile(), readJson(KEY_PROFILE, {}));
  }

  function saveProfile(partial) {
    var next = Object.assign(getProfile(), partial || {});
    if (next.name) next.av = String(next.name).trim().charAt(0) || '开';
    writeJson(KEY_PROFILE, next);
    if (w.LingDaUsers && w.LingDaUsers.list && w.LingDaUsers.list.me) {
      Object.assign(w.LingDaUsers.list.me, {
        name: next.name,
        av: next.av,
        college: next.college,
        major: next.major,
        grade: next.grade,
        bio: next.bio,
      });
    }
    return next;
  }

  function getSession() {
    return readJson(KEY_SESSION, null);
  }

  function isLoggedIn() {
    return !!getSession();
  }

  function login(payload) {
    var session = {
      token: payload.token || 'preview-' + Date.now(),
      studentId: payload.studentId || '',
      preview: !!payload.preview,
      at: Date.now(),
    };
    writeJson(KEY_SESSION, session);
    if (payload.profile) saveProfile(payload.profile);
    return session;
  }

  function logout() {
    localStorage.removeItem(KEY_SESSION);
  }

  function setRemember(on) {
    localStorage.setItem(KEY_REMEMBER, on ? '1' : '0');
  }

  function getRemember() {
    return localStorage.getItem(KEY_REMEMBER) === '1';
  }

  function syncMeDom(profile) {
    var p = profile || getProfile();
    document.querySelectorAll('.dn-profile .name, [data-me-name]').forEach(function (el) {
      el.textContent = p.name;
    });
    document.querySelectorAll('.dn-profile .sub, [data-me-sub]').forEach(function (el) {
      el.textContent = [p.college, p.grade].filter(Boolean).join(' · ');
    });
    document.querySelectorAll('.dn-profile .avatar, [data-me-av]').forEach(function (el) {
      el.textContent = p.av;
    });
    document.querySelectorAll('[data-me-line]').forEach(function (el) {
      el.textContent = [p.college, p.major, p.grade].filter(Boolean).join(' · ');
    });
    document.querySelectorAll('[data-me-hello]').forEach(function (el) {
      el.textContent = '你好，' + p.name;
    });
  }

  /* 合并进假用户表 */
  if (w.LingDaUsers) saveProfile(getProfile());

  w.LingDaAuth = {
    getProfile: getProfile,
    saveProfile: saveProfile,
    getSession: getSession,
    isLoggedIn: isLoggedIn,
    login: login,
    logout: logout,
    setRemember: setRemember,
    getRemember: getRemember,
    syncMeDom: syncMeDom,
  };
})(window);
