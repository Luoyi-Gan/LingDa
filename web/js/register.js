/* 注册页交互 */
(function () {
  var Auth = window.LingDaAuth;
  var UI = window.LingDaUI;
  if (!Auth || !UI) return;

  var submit = document.getElementById('register-submit');
  if (!submit) return;

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  submit.addEventListener('click', function (e) {
    e.preventDefault();
    var studentId = val('reg-student');
    var name = val('reg-name');
    var realName = val('reg-realname');
    var password = val('reg-password');
    var phone = val('reg-phone');
    var college = val('reg-college');
    var major = val('reg-major');
    var gender = val('reg-gender');

    if (!studentId || studentId.length < 4) {
      UI.toast('请填写有效学号');
      return;
    }
    if (!name) {
      UI.toast('请填写昵称');
      return;
    }
    if (!realName) {
      UI.toast('请填写真实姓名');
      return;
    }
    if (password.length < 6) {
      UI.toast('密码至少 6 位');
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      UI.toast('请填写 11 位手机号');
      return;
    }
    if (!college) {
      UI.toast('请填写学院');
      return;
    }

    Auth.saveProfile({
      name: name,
      college: college,
      major: major || '未填写',
      grade: gender ? '新生' : '新生',
      bio: realName + ' · 新注册用户',
      studentId: studentId,
      phone: phone,
      gender: gender,
    });
    Auth.login({ studentId: studentId, profile: Auth.getProfile() });
    UI.toast('注册成功，欢迎加入灵搭');
    setTimeout(function () {
      location.href = 'hall.html';
    }, 450);
  });
})();
