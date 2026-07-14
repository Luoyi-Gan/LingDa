/* 登录页交互 */
(function () {
  var Auth = window.LingDaAuth;
  var UI = window.LingDaUI;
  if (!Auth || !UI) return;

  var student = document.getElementById('login-student');
  var password = document.getElementById('login-password');
  var remember = document.getElementById('remember-check');
  var submit = document.getElementById('login-submit');
  var preview = document.getElementById('login-preview');
  var forgot = document.getElementById('login-forgot');

  if (Auth.getRemember() && remember) remember.classList.add('on');
  if (Auth.getRemember() && student) {
    var s = Auth.getSession();
    if (s && s.studentId) student.value = s.studentId;
  }

  if (remember) {
    remember.addEventListener('click', function () {
      remember.classList.toggle('on');
      Auth.setRemember(remember.classList.contains('on'));
    });
  }

  if (forgot) {
    forgot.addEventListener('click', function (e) {
      e.preventDefault();
      UI.toast('找回密码（预览未开通）');
    });
  }

  function goHall() {
    location.href = 'hall.html';
  }

  if (submit) {
    submit.addEventListener('click', function (e) {
      e.preventDefault();
      var sid = (student && student.value.trim()) || '';
      var pwd = (password && password.value) || '';
      if (!sid) {
        UI.toast('请输入学号');
        if (student) student.focus();
        return;
      }
      if (pwd.length < 6) {
        UI.toast('密码至少 6 位');
        if (password) password.focus();
        return;
      }
      if (remember) Auth.setRemember(remember.classList.contains('on'));
      Auth.login({
        studentId: sid,
        profile: Object.assign(Auth.getProfile(), { studentId: sid }),
      });
      UI.toast('登录成功');
      setTimeout(goHall, 350);
    });
  }

  if (preview) {
    preview.addEventListener('click', function (e) {
      e.preventDefault();
      Auth.login({ preview: true, token: 'dev-preview' });
      goHall();
    });
  }

  [student, password].forEach(function (input) {
    if (!input) return;
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && submit) submit.click();
    });
  });
})();
