import { ArrowRight, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { adminApi } from '../api';
import { adminAuth } from '../auth';

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ userId: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError(''); setBusy(true);
    try {
      const result = await adminApi.login(form);
      if (result.user?.account_role !== 'admin') throw new Error('该账号没有管理员权限');
      adminAuth.save(result.token, result.user);
      onLogin(result.user);
    } catch (err) { setError(err.message || '登录失败'); }
    finally { setBusy(false); }
  };
  return <main className="admin-login"><section className="login-copy"><div className="login-brand"><span className="brand-mark large">灵</span><div><strong>灵搭管理中心</strong><span>LINGDA ADMIN</span></div></div><div className="login-message"><span className="eyebrow light">Campus community operations</span><h1>让每一次发布<br />都清晰、可信、可追溯</h1><p>独立的校园社区运营与安全审核工作台。</p></div><div className="login-status"><ShieldCheck size={18} /><span>自动风控与人工复核协同运行</span></div></section><section className="login-form-wrap"><form className="login-form" onSubmit={submit}><div><span className="eyebrow">Administrator</span><h2>管理员登录</h2><p>使用已授权的管理账号进入工作台</p></div><label className="field"><span>管理员账号</span><div className="input-with-icon"><UserRound size={17} /><input value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} autoComplete="username" placeholder="输入管理员账号" /></div></label><label className="field"><span>密码</span><div className="input-with-icon"><LockKeyhole size={17} /><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" placeholder="输入密码" /></div></label>{error && <p className="form-error">{error}</p>}<button className="button primary login-button" disabled={busy || !form.userId || !form.password}>{busy ? '正在验证...' : '进入管理中心'}<ArrowRight size={17} /></button><small className="login-help">管理账号由平台负责人统一创建和分配。</small></form></section></main>;
}
