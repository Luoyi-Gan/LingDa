/* 聊天列表 + 详情 */
(function () {
  var UI = window.LingDaUI;
  var Auth = window.LingDaAuth;
  var Users = window.LingDaUsers;
  if (!UI) return;

  var SEEDS = {
    zhou: [
      { from: 'zhou', text: '周五南站拼车还差一个人，你来吗？', time: '13:50' },
      { from: 'me', text: '可以，图书馆门口见。', time: '14:02' },
      { from: 'zhou', text: '好的，那明天图书馆见～', time: '14:20' },
    ],
    ye: [
      { from: 'ye', text: '今晚双排冲分，缺一个中单。', time: '昨天' },
      { from: 'me', text: '算我一个，几点？', time: '昨天' },
      { from: 'ye', text: '今晚 8 点开黑记得上线', time: '昨天' },
    ],
    cheng: [
      { from: 'cheng', text: '高数 mutual 今晚继续吗？', time: '周一' },
      { from: 'me', text: '继续，二教还是老地方。', time: '周一' },
      { from: 'cheng', text: '二教 305 门锁了我们换教室', time: '周一' },
    ],
  };

  function storageKey(uid) {
    return 'lingda:chat:' + uid;
  }

  function loadMessages(uid) {
    try {
      var raw = localStorage.getItem(storageKey(uid));
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return (SEEDS[uid] || []).slice();
  }

  function saveMessages(uid, list) {
    localStorage.setItem(storageKey(uid), JSON.stringify(list));
  }

  /* 列表页：整行可进入详情 */
  document.querySelectorAll('.chat-row[data-chat]').forEach(function (row) {
    row.style.cursor = 'pointer';
    row.addEventListener('click', function (e) {
      if (e.target.closest('[data-user]')) return;
      var uid = row.getAttribute('data-chat');
      location.href = 'chat-detail.html?u=' + encodeURIComponent(uid);
    });
  });

  /* 详情页 */
  var thread = document.getElementById('chat-thread');
  if (!thread) return;

  var uid = new URLSearchParams(location.search).get('u') || '';
  var user = Users && Users.get(uid);
  var title = document.getElementById('chat-peer-name');
  var sub = document.getElementById('chat-peer-sub');
  var av = document.getElementById('chat-peer-av');
  var input = document.getElementById('chat-input');
  var send = document.getElementById('chat-send');

  if (!user) {
    thread.innerHTML =
      '<div class="chat-empty"><p>未找到会话</p><a class="btn btn-soft" href="chat.html">返回消息</a></div>';
    return;
  }

  if (title) title.textContent = user.name;
  if (sub) sub.textContent = [user.college, user.grade].filter(Boolean).join(' · ');
  if (av) {
    av.textContent = user.av;
    av.setAttribute('data-user', user.id);
  }
  document.title = user.name + ' · 聊天 · 灵搭';

  var me = Auth ? Auth.getProfile() : { av: '开', name: '开发预览' };
  var messages = loadMessages(uid);

  function render() {
    thread.innerHTML = messages
      .map(function (m) {
        var mine = m.from === 'me';
        var letter = mine ? me.av : user.av;
        return (
          '<div class="bubble-row' +
          (mine ? ' mine' : '') +
          '">' +
          (mine
            ? ''
            : '<div class="avatar sm" data-user="' + user.id + '">' + letter + '</div>') +
          '<div class="bubble"><p>' +
          UI.escapeHtml(m.text) +
          '</p><span class="b-time">' +
          UI.escapeHtml(m.time || '') +
          '</span></div>' +
          (mine ? '<div class="avatar sm" data-user="me">' + letter + '</div>' : '') +
          '</div>'
        );
      })
      .join('');
    thread.scrollTop = thread.scrollHeight;
  }

  function sendMsg() {
    var text = (input && input.value.trim()) || '';
    if (!text) return;
    var now = new Date();
    var time =
      String(now.getHours()).padStart(2, '0') +
      ':' +
      String(now.getMinutes()).padStart(2, '0');
    messages.push({ from: 'me', text: text, time: time });
    saveMessages(uid, messages);
    if (input) input.value = '';
    render();
  }

  if (send) send.addEventListener('click', sendMsg);
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMsg();
      }
    });
  }

  render();
})();
