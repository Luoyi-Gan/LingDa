// 命令式桥接层：让非 React 模块(api.js / socket.js)也能弹 Toast、跳路由。
// UIProvider 注册 toast；RouterBridge 注册 navigate。
let _toast = (msg) => console.warn('[toast:not-ready]', msg);
let _navigate = (path, opts) => console.warn('[nav:not-ready]', path);

export function setToast(fn) {
  _toast = fn;
}
export function toast(opts) {
  // 兼容 wx.showToast({ title, icon }) 形态
  if (typeof opts === 'string') return _toast({ title: opts, icon: 'none' });
  return _toast(opts);
}
export function setNavigate(fn) {
  _navigate = fn;
}
export function navigate(path, opts) {
  return _navigate(path, opts);
}
