(function () {
  var U = window.LingDaUsers;
  var UI = window.LingDaUI;
  if (!U) return;
  var id = new URLSearchParams(location.search).get('u') || '';
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
      '<section class="card"><h2>未找到该用户</h2><p class="text-muted" style="margin-top:8px">链接可能已失效。</p><a class="btn btn-soft" style="margin-top:16px" href="posts.html">返回帖子</a></section>';
    return;
  }
  document.title = user.name + ' · 灵搭 LingDa';
  if (title) title.textContent = user.name + ' 的主页';

  function friendKey() {
    return 'lingda:friend:' + user.id;
  }
  function isFriend() {
    return localStorage.getItem(friendKey()) === '1';
  }

  function renderActions() {
    var friend = isFriend();
    return (
      '<div class="row" style="margin-top:16px;gap:8px">' +
      '<button type="button" class="btn btn-primary" id="btn-friend">' +
      (friend ? '已是好友' : '加好友') +
      '</button>' +
      '<a class="btn btn-soft" href="chat-detail.html?u=' +
      encodeURIComponent(user.id) +
      '">私信</a></div>'
    );
  }

  root.innerHTML =
    '<section class="card">' +
    '<div class="row">' +
    '<div class="avatar xl" data-user="' +
    user.id +
    '">' +
    user.av +
    '</div>' +
    '<div class="grow">' +
    '<h2 class="font-heading" style="font-size:22px;font-weight:800">' +
    user.name +
    '</h2>' +
    '<p class="text-muted" style="margin-top:4px;font-size:13px">' +
    [user.college, user.major, user.grade].filter(Boolean).join(' · ') +
    '</p>' +
    '<div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap">' +
    '<span class="chip chip-indigo">' +
    user.tag +
    '</span>' +
    '<span class="chip chip-amber">★ ' +
    user.rating +
    '</span></div>' +
    '</div></div>' +
    '<p class="text-muted" style="margin-top:14px;font-size:13px;line-height:1.6">' +
    user.bio +
    '</p>' +
    renderActions() +
    '</section>' +
    '<section class="card" style="margin-top:16px">' +
    '<div class="eyebrow">Overview</div>' +
    '<div class="row" style="margin-top:12px;gap:24px">' +
    '<div><div class="font-heading" style="font-size:24px;font-weight:800">' +
    user.teams +
    '</div><div class="text-muted" style="font-size:12px">组队</div></div>' +
    '<div><div class="font-heading" style="font-size:24px;font-weight:800">' +
    user.posts +
    '</div><div class="text-muted" style="font-size:12px">发帖</div></div>' +
    '</div></section>';

  var btn = document.getElementById('btn-friend');
  if (btn) {
    btn.addEventListener('click', function () {
      if (isFriend()) {
        localStorage.setItem(friendKey(), '0');
        btn.textContent = '加好友';
        if (UI) UI.toast('已解除好友（预览）');
      } else {
        localStorage.setItem(friendKey(), '1');
        btn.textContent = '已是好友';
        if (UI) UI.toast('好友请求已发送');
      }
    });
  }
})();
