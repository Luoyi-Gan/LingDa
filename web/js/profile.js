(function () {
  var U = window.LingDaUsers;
  if (!U) return;

  function qs(name) {
    var m = new URLSearchParams(location.search).get(name);
    return m || '';
  }

  var id = qs('u');
  if (U.isSelf(id)) {
    location.replace('me.html');
    return;
  }

  var user = U.get(id);
  var root = document.getElementById('profile-root');
  var title = document.getElementById('profile-title');
  if (!root) return;

  if (!user) {
    root.innerHTML =
      '<section class="card empty"><strong>未找到该用户</strong>可能已被删除或链接无效。<div style="margin-top:12px"><a class="btn btn-soft" href="forum.html">返回贴吧</a></div></section>';
    if (title) title.textContent = '用户不存在';
    return;
  }

  document.title = user.name + ' · 灵搭 LingDa';
  if (title) title.textContent = user.name + ' 的主页';

  root.innerHTML =
    '<section class="card">' +
    '<div class="me-hero">' +
    '<div class="avatar lg ' + user.avClass + '" data-user="' + user.id + '">' + user.av + '</div>' +
    '<div class="who">' +
    '<div class="name">' + escapeHtml(user.name) + '</div>' +
    '<div class="meta-line">' + escapeHtml([user.college, user.major, user.grade].filter(Boolean).join(' · ')) + '</div>' +
    '<div class="tags">' +
    '<span class="tag ' + user.tagClass + '">' + escapeHtml(user.tag) + '</span>' +
    '<span class="tag tag-indigo">★ ' + user.rating + '</span>' +
    '</div></div></div>' +
    '<p style="margin-top:14px;font-size:13px;color:var(--muted);line-height:1.6">' + escapeHtml(user.bio) + '</p>' +
    '<div class="row" style="margin-top:16px;gap:8px;flex-wrap:wrap">' +
    '<a class="btn btn-primary" href="#">加好友</a>' +
    '<a class="btn btn-soft" href="#">私信</a>' +
    '</div></section>' +
    '<section class="card">' +
    '<div class="card-head"><h2 class="card-title">概览</h2></div>' +
    '<div class="grid-2">' +
    '<div class="auth-stat" style="background:var(--bg);border:1px solid var(--border-soft);border-radius:12px;padding:14px"><strong style="font-size:20px">' + user.teams + '</strong><span style="display:block;margin-top:4px;font-size:12px;color:var(--muted)">组队次数</span></div>' +
    '<div class="auth-stat" style="background:var(--bg);border:1px solid var(--border-soft);border-radius:12px;padding:14px"><strong style="font-size:20px">' + user.posts + '</strong><span style="display:block;margin-top:4px;font-size:12px;color:var(--muted)">发帖数</span></div>' +
    '</div></section>' +
    '<section class="card">' +
    '<div class="card-head"><h2 class="card-title">最近动态</h2></div>' +
    '<div class="list-row"><div class="avatar sm ' + user.avClass + '" data-user="' + user.id + '">' + user.av + '</div>' +
    '<div style="flex:1"><strong style="font-size:13px">更新了个人简介</strong>' +
    '<p style="margin-top:4px;font-size:13px;color:var(--muted)">' + escapeHtml(user.bio) + '</p></div></div>' +
    '</section>';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
