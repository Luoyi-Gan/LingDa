(function () {
  var ME = (window.LingDaUsers && window.LingDaUsers.ME_ID) || 'me';

  function goProfile(userId, e) {
    if (!userId || userId === ME) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    if (e) e.stopPropagation();
    location.href = 'profile.html?u=' + encodeURIComponent(userId);
  }

  document.addEventListener(
    'click',
    function (e) {
      var av = e.target.closest('[data-user]');
      if (!av) return;
      // 侧栏整卡已有链接时，由原链接处理；其内部头像标 data-user="me"
      if (av.closest('.side-profile')) return;
      goProfile(av.getAttribute('data-user'), e);
    },
    true,
  );

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var av = e.target.closest('[data-user]');
    if (!av || av.closest('.side-profile')) return;
    if (av.getAttribute('data-user') === ME) return;
    e.preventDefault();
    goProfile(av.getAttribute('data-user'), e);
  });
})();
