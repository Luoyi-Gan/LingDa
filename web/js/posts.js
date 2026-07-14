(function () {
  var POSTS = {
    '1': {
      userId: 'zhou',
      author: '周一凡',
      av: '周',
      tint: 't-sky',
      tag: 'Carpool',
      category: 'carpool',
      title: '周五晚南站拼车',
      content: '明天 18:30 图书馆门口集合，还能带一个小行李箱。\n路线：校内 → 南站，AA 车费。',
      likes: 26,
      comments: [
        { userId: 'cheng', av: '程', name: '程思', time: '1 小时前', text: '还有空位吗？带一个箱子。' },
        { userId: 'zhou', av: '周', name: '周一凡', time: '50 分钟前', text: '还有 1 个，私信我。' },
      ],
      images: [
        'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80&auto=format&fit=crop',
      ],
    },
    '2': {
      userId: 'ye',
      author: '叶舟',
      av: '叶',
      tint: 't-violet',
      tag: 'Play',
      category: 'play',
      title: '今晚双排冲分',
      content: '王者星耀局，麦上手，氛围轻松。\n时间：今晚 20:00，语音开黑。',
      likes: 41,
      comments: [
        { userId: 'su', av: '苏', name: '苏晴', time: '30 分钟前', text: '算我一个！' },
      ],
      images: [
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80&auto=format&fit=crop',
      ],
    },
    '3': {
      userId: 'cheng',
      author: '程思',
      av: '程',
      tint: 't-teal',
      tag: 'Study',
      category: 'study',
      title: '高数习题 mutual',
      content: '二教 305，带错题本，互相答疑。\n进度第四章，欢迎同班同学。',
      likes: 18,
      comments: [
        { userId: 'lin', av: '林', name: '小林', time: '昨天', text: '我也在第四章，一起？' },
        { userId: 'cheng', av: '程', name: '程思', time: '昨天', text: '欢迎，今晚见。' },
      ],
      images: [
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1456513080880-7d36c8778ce9?w=800&q=80&auto=format&fit=crop',
      ],
    },
  };

  window.LingDaPosts = POSTS;

  var backdrop = document.getElementById('drawer-backdrop');
  var drawer = document.getElementById('post-drawer');
  var body = document.getElementById('drawer-body');
  var closeBtn = document.getElementById('drawer-close');
  var commentInput = document.getElementById('comment-input');
  var commentSend = document.getElementById('comment-send');
  var currentId = null;
  var UI = window.LingDaUI;
  var Auth = window.LingDaAuth;

  function loadComments(id) {
    try {
      var raw = localStorage.getItem('lingda:comments:' + id);
      if (raw) POSTS[id].comments = JSON.parse(raw);
    } catch (e) {}
  }

  function saveComments(id) {
    localStorage.setItem('lingda:comments:' + id, JSON.stringify(POSTS[id].comments || []));
  }

  Object.keys(POSTS).forEach(loadComments);

  if (!drawer || !body) {
    /* 非 posts 页也可跳转打开 */
    return;
  }

  function avatarHtml(userId, av) {
    return '<div class="avatar sm" data-user="' + userId + '" title="查看主页">' + av + '</div>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  function meProfile() {
    return Auth ? Auth.getProfile() : { name: '开发预览', av: '开' };
  }

  function renderPost(post, id) {
    var liked = localStorage.getItem('like:' + id) === '1';
    var faved = localStorage.getItem('fav:' + id) === '1';
    var joined = localStorage.getItem('join:' + id) === '1';
    var likeCount = post.likes + (liked ? 1 : 0);
    var imgs = (post.images || [])
      .map(function (src, i) {
        var cls = post.images.length === 1 || (post.images.length === 3 && i === 0) ? ' span-2' : '';
        return '<img class="' + cls.trim() + '" src="' + src + '" alt="" loading="lazy" />';
      })
      .join('');
    var comments = (post.comments || [])
      .map(function (c) {
        return (
          '<div class="comment">' +
          avatarHtml(c.userId, c.av) +
          '<div class="body"><div><span class="c-name">' +
          c.name +
          '</span><span class="c-time">' +
          c.time +
          '</span></div><p class="c-text">' +
          escapeHtml(c.text) +
          '</p></div></div>'
        );
      })
      .join('');

    return (
      '<div class="drawer-author">' +
      '<div class="avatar" data-user="' + post.userId + '" title="查看主页">' + post.av + '</div>' +
      '<div class="who"><div class="name">' +
      post.author +
      ' <span class="chip chip-indigo">' +
      post.tag +
      '</span></div><div class="time">浏览与互动预览</div></div></div>' +
      '<h3 class="drawer-title">' +
      escapeHtml(post.title) +
      '</h3>' +
      '<p class="drawer-content">' +
      escapeHtml(post.content) +
      '</p>' +
      (imgs ? '<div class="drawer-gallery">' + imgs + '</div>' : '') +
      '<div class="drawer-actions">' +
      '<button type="button" class="action-btn like' +
      (liked ? ' on' : '') +
      '" data-action="like"><svg viewBox="0 0 24 24" fill="' +
      (liked ? 'currentColor' : 'none') +
      '" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span data-like-count>' +
      likeCount +
      '</span> 点赞</button>' +
      '<button type="button" class="action-btn' +
      (faved ? ' on fav' : '') +
      '" data-action="fav"><svg viewBox="0 0 24 24" fill="' +
      (faved ? 'currentColor' : 'none') +
      '" stroke="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
      (faved ? '已收藏' : '收藏') +
      '</button>' +
      '<button type="button" class="action-btn" data-action="focus-comment"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      post.comments.length +
      ' 评论</button>' +
      '<button type="button" class="action-btn' +
      (joined ? ' on' : '') +
      '" data-action="join">' +
      (joined ? '已申请' : '申请加入') +
      '</button></div>' +
      '<div class="drawer-comments"><h3>全部评论</h3>' +
      (comments || '<p class="text-muted" style="font-size:13px">还没有评论</p>') +
      '</div>'
    );
  }

  function bindActions() {
    body.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var a = btn.getAttribute('data-action');
        if (a === 'like') toggleLike(btn);
        if (a === 'fav') toggleFav(btn);
        if (a === 'join') toggleJoin(btn);
        if (a === 'focus-comment' && commentInput) commentInput.focus();
      });
    });
  }

  function openDrawer(id) {
    var post = POSTS[id];
    if (!post) return;
    currentId = id;
    body.innerHTML = renderPost(post, id);
    backdrop.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
      backdrop.classList.add('open');
      drawer.classList.add('open');
    });
    document.body.classList.add('drawer-open');
    bindActions();
  }

  function closeDrawer() {
    backdrop.classList.remove('open');
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');
    setTimeout(function () {
      if (!drawer.classList.contains('open')) backdrop.hidden = true;
    }, 280);
    currentId = null;
    if (location.search.indexOf('post=') >= 0) {
      history.replaceState(null, '', location.pathname);
    }
  }

  function toggleLike(btn) {
    var key = 'like:' + currentId;
    var on = localStorage.getItem(key) !== '1';
    localStorage.setItem(key, on ? '1' : '0');
    btn.classList.toggle('on', on);
    btn.classList.toggle('like', on);
    var svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', on ? 'currentColor' : 'none');
    var el = btn.querySelector('[data-like-count]');
    if (el) el.textContent = POSTS[currentId].likes + (on ? 1 : 0);
  }

  function toggleFav(btn) {
    var key = 'fav:' + currentId;
    var on = localStorage.getItem(key) !== '1';
    localStorage.setItem(key, on ? '1' : '0');
    btn.classList.toggle('on', on);
    btn.classList.toggle('fav', on);
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="' +
      (on ? 'currentColor' : 'none') +
      '" stroke="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
      (on ? '已收藏' : '收藏');
  }

  function toggleJoin(btn) {
    var key = 'join:' + currentId;
    var on = localStorage.getItem(key) !== '1';
    localStorage.setItem(key, on ? '1' : '0');
    btn.classList.toggle('on', on);
    btn.textContent = on ? '已申请' : '申请加入';
    if (UI) UI.toast(on ? '已发送加入申请' : '已取消申请');
  }

  document.querySelectorAll('[data-post]').forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (e.target.closest('[data-user]')) return;
      openDrawer(card.getAttribute('data-post'));
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });

  if (commentSend && commentInput) {
    commentSend.addEventListener('click', function () {
      var text = commentInput.value.trim();
      if (!text || !currentId) return;
      var me = meProfile();
      POSTS[currentId].comments.push({
        userId: 'me',
        av: me.av || '开',
        name: me.name || '开发预览',
        time: '刚刚',
        text: text,
      });
      saveComments(currentId);
      commentInput.value = '';
      body.innerHTML = renderPost(POSTS[currentId], currentId);
      bindActions();
    });
    commentInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') commentSend.click();
    });
  }

  var deep = new URLSearchParams(location.search).get('post');
  if (deep && POSTS[deep]) {
    setTimeout(function () {
      openDrawer(deep);
    }, 80);
  }

  window.LingDaOpenPost = openDrawer;
})();
