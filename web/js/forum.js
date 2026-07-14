(function () {
  var POSTS = {
    '1': {
      userId: 'jiaowu',
      author: '教务处',
      av: '官',
      avClass: 'av-indigo',
      tag: '官方',
      tagClass: 'tag-teal',
      time: '2 小时前',
      title: '下学期选课系统开放时间预告',
      content:
        '选课将于下周一开始试运行，请提前核对培养方案与学分要求。\n\n' +
        '正式开放时间：下周一 09:00\n试运行窗口：本周五 14:00–18:00\n\n' +
        '遇到问题可到教务大厅咨询，或通过校园服务入口提交反馈。',
      views: '1.2k',
      likes: 126,
      comments: [
        { userId: 'li', av: '李', avClass: 'av-sky', name: '李想', time: '1 小时前', text: '请问辅修怎么选？' },
        { userId: 'wang', av: '王', avClass: 'av-amber', name: '王同学', time: '40 分钟前', text: '试运行能看到课表吗？' },
        { userId: 'jiaowu', av: '官', avClass: 'av-indigo', name: '教务处', time: '20 分钟前', text: '试运行仅校验登录与志愿暂存，课表以正式开放后为准。' },
      ],
      images: [
        'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80&auto=format&fit=crop',
      ],
    },
    '2': {
      userId: 'photo',
      author: '摄影协会',
      av: '社',
      avClass: 'av-amber',
      tag: '社团',
      tagClass: 'tag-amber',
      time: '5 小时前',
      title: '周末夜景外拍报名中',
      content:
        '本周六晚集合图书馆门口，路线校园湖—主楼灯饰。\n\n' +
        '集合时间：周六 18:30\n装备：自备相机 / 手机即可\n名额：20 人（新手友好）\n\n' +
        '报名请在评论区留言，先到先得～',
      views: '386',
      likes: 67,
      comments: [
        { userId: 'zhouzhou', av: '周', avClass: 'av-violet', name: '周周', time: '3 小时前', text: '报名！带三脚架可以吗？' },
        { userId: 'photo', av: '社', avClass: 'av-amber', name: '摄影协会', time: '2 小时前', text: '可以，欢迎一起。' },
      ],
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80&auto=format&fit=crop',
      ],
    },
    '3': {
      userId: 'lin',
      author: '小林',
      av: '林',
      avClass: 'av-sky',
      tag: '认证学生',
      tagClass: 'tag-sky',
      time: '昨天',
      title: '有一起刷高数习题的吗？',
      content:
        '想找 1–2 个同班同学晚上去二教自习，进度第四章。\n可以互相答疑，也可以带错题本一起过。\n\n时间：工作日 19:00–21:30\n地点：二教优先',
      views: '210',
      likes: 31,
      comments: [
        { userId: 'cheng', av: '程', avClass: 'av-teal', name: '程思', time: '昨天', text: '我在，今晚二教 305？' },
        { userId: 'lin', av: '林', avClass: 'av-sky', name: '小林', time: '昨天', text: '好呀，到时候直接进。' },
      ],
      images: [
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80&auto=format&fit=crop',
      ],
    },
    '4': {
      userId: 'chen',
      author: '陈同学',
      av: '陈',
      avClass: 'av-teal',
      tag: '认证学生',
      tagClass: 'tag-sky',
      time: '2 天前',
      title: '在一食堂捡到校园卡',
      content:
        '中午在一食堂二楼座位区捡到校园卡一张，姓名大概是「王×」。\n\n已交服务台，失主请带学生证领取。请互相转告～',
      views: '502',
      likes: 44,
      comments: [
        { userId: 'han', av: '韩', avClass: 'av-rose', name: '韩梅', time: '1 天前', text: '已转告同学，感谢！' },
      ],
      images: [
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80&auto=format&fit=crop',
      ],
    },
  };

  var backdrop = document.getElementById('drawer-backdrop');
  var drawer = document.getElementById('post-drawer');
  var body = document.getElementById('drawer-body');
  var closeBtn = document.getElementById('drawer-close');
  var commentInput = document.getElementById('comment-input');
  var commentSend = document.getElementById('comment-send');
  var currentId = null;

  if (!drawer || !body) return;

  function avatarHtml(userId, avClass, av, size) {
    var cls = 'avatar' + (size ? ' ' + size : '') + ' ' + avClass;
    var attrs = ' class="' + cls + '"';
    if (userId) {
      attrs += ' data-user="' + userId + '" title="查看主页"';
    }
    return '<div' + attrs + '>' + av + '</div>';
  }

  function openDrawer(id) {
    var post = POSTS[id];
    if (!post) return;
    currentId = id;
    body.innerHTML = renderPost(post, id);
    backdrop.hidden = false;
    requestAnimationFrame(function () {
      backdrop.classList.add('open');
      drawer.classList.add('open');
    });
    drawer.setAttribute('aria-hidden', 'false');
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
  }

  function renderPost(post, id) {
    var liked = localStorage.getItem('like:' + id) === '1';
    var faved = localStorage.getItem('fav:' + id) === '1';
    var likeCount = post.likes + (liked ? 1 : 0);

    var imgs = (post.images || [])
      .map(function (src, i) {
        var cls = post.images.length === 1 || (post.images.length === 3 && i === 0) ? ' span-2' : '';
        return '<img class="' + cls.trim() + '" src="' + src + '" alt="帖子图片" loading="lazy" />';
      })
      .join('');

    var comments = (post.comments || [])
      .map(function (c) {
        return (
          '<div class="comment">' +
          avatarHtml(c.userId, c.avClass, c.av, 'sm') +
          '<div class="body">' +
          '<div class="c-head"><span class="c-name">' + c.name + '</span><span class="c-time">' + c.time + '</span></div>' +
          '<p class="c-text">' + escapeHtml(c.text) + '</p>' +
          '</div></div>'
        );
      })
      .join('');

    return (
      '<div class="drawer-author">' +
      avatarHtml(post.userId, post.avClass, post.av) +
      '<div class="who">' +
      '<div class="name">' +
      escapeHtml(post.author) +
      ' <span class="tag ' + post.tagClass + '">' + post.tag + '</span></div>' +
      '<div class="time">' + post.time + ' · 浏览 ' + post.views + '</div>' +
      '</div></div>' +
      '<h3 class="drawer-title">' + escapeHtml(post.title) + '</h3>' +
      '<p class="drawer-content">' + escapeHtml(post.content) + '</p>' +
      (imgs ? '<div class="drawer-gallery">' + imgs + '</div>' : '') +
      '<div class="drawer-actions">' +
      '<button type="button" class="action-btn like' + (liked ? ' on' : '') + '" data-action="like">' +
      '<svg viewBox="0 0 24 24" fill="' + (liked ? 'currentColor' : 'none') + '" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
      '<span data-like-count>' + likeCount + '</span> 点赞</button>' +
      '<button type="button" class="action-btn' + (faved ? ' on fav' : '') + '" data-action="fav">' +
      '<svg viewBox="0 0 24 24" fill="' + (faved ? 'currentColor' : 'none') + '" stroke="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
      (faved ? '已收藏' : '收藏') + '</button>' +
      '<button type="button" class="action-btn" data-action="focus-comment">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      (post.comments.length) + ' 评论</button>' +
      '</div>' +
      '<div class="drawer-comments">' +
      '<h3>全部评论</h3>' +
      (comments || '<p style="color:var(--muted);font-size:13px">还没有评论，来抢沙发吧</p>') +
      '</div>'
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  function bindActions() {
    body.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        if (action === 'like') toggleLike(btn);
        if (action === 'fav') toggleFav(btn);
        if (action === 'focus-comment' && commentInput) commentInput.focus();
      });
    });
  }

  function toggleLike(btn) {
    if (!currentId) return;
    var key = 'like:' + currentId;
    var on = localStorage.getItem(key) === '1';
    localStorage.setItem(key, on ? '0' : '1');
    on = !on;
    btn.classList.toggle('on', on);
    btn.classList.toggle('like', on);
    var svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', on ? 'currentColor' : 'none');
    var countEl = btn.querySelector('[data-like-count]');
    if (countEl) {
      var base = POSTS[currentId].likes;
      countEl.textContent = base + (on ? 1 : 0);
    }
  }

  function toggleFav(btn) {
    if (!currentId) return;
    var key = 'fav:' + currentId;
    var on = localStorage.getItem(key) !== '1';
    localStorage.setItem(key, on ? '1' : '0');
    btn.classList.toggle('on', on);
    btn.classList.toggle('fav', on);
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="' + (on ? 'currentColor' : 'none') + '" stroke="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
      (on ? '已收藏' : '收藏');
  }

  document.querySelectorAll('.post-card[data-post]').forEach(function (card) {
    function open(e) {
      if (e.target.closest('[data-user]')) return;
      openDrawer(card.getAttribute('data-post'));
    }
    card.addEventListener('click', open);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.target.closest('[data-user]')) return;
        e.preventDefault();
        openDrawer(card.getAttribute('data-post'));
      }
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
      if (!text || !currentId || !POSTS[currentId]) return;
      POSTS[currentId].comments.push({
        userId: 'me',
        av: '开',
        avClass: 'av-indigo',
        name: '开发预览',
        time: '刚刚',
        text: text,
      });
      commentInput.value = '';
      body.innerHTML = renderPost(POSTS[currentId], currentId);
      bindActions();
      var list = body.querySelector('.drawer-comments');
      if (list) list.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    commentInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') commentSend.click();
    });
  }
})();
