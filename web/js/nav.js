(function () {
  var page = (location.pathname.split('/').pop() || 'hall.html')
    .toLowerCase()
    .replace(/\.html$/, '');
  if (!page || page === 'index') page = 'hall';
  if (page === 'chat-detail') page = 'chat';

  document.querySelectorAll('[data-nav]').forEach(function (el) {
    var target = (el.getAttribute('data-nav') || '').replace(/\.html$/, '');
    if (target === page) el.classList.add('active');
    else el.classList.remove('active');
  });

  document.querySelectorAll('.dn-profile').forEach(function (el) {
    if (page === 'me' || page === 'profile') el.classList.add('active');
    else el.classList.remove('active');
  });
})();
