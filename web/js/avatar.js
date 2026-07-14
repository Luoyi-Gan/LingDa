(function () {
  var ME = (window.LingDaUsers && window.LingDaUsers.ME_ID) || 'me';

  document.addEventListener(
    'click',
    function (e) {
      var av = e.target.closest('[data-user]');
      if (!av) return;
      if (av.closest('.dn-profile') || av.closest('.dn-user')) return;
      var uid = av.getAttribute('data-user');
      if (!uid || uid === ME) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.stopPropagation();
      location.href = 'profile.html?u=' + encodeURIComponent(uid);
    },
    true,
  );
})();
