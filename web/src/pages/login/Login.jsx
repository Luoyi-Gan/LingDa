// UI 重做 Phase 11：Login —— 双栏分屏（桌面）/ 单栏（移动）
// 鉴权逻辑 100% 原样：api.auth.login + 记住我（仅持久化学号）
import { useState, useEffect } from 'react';
import {
  IdCard,
  Lock,
  ArrowRight,
  Sparkles,
  Check,
  GraduationCap,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useWxNav } from '../../lib/nav';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/cn';

const REMEMBER_FLAG = 'login:remember';
const REMEMBER_USER = 'login:userId';

export default function Login() {
  const [form, setForm] = useState({ userId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [isRemember, setIsRemember] = useState(false);
  const { setUser } = useAuth();
  const { showToast } = useUI();
  const nav = useWxNav();

  useEffect(() => {
    if (localStorage.getItem(REMEMBER_FLAG) === '1') {
      const saved = localStorage.getItem(REMEMBER_USER) || '';
      setIsRemember(true);
      if (saved) setForm((f) => ({ ...f, userId: saved }));
    }
  }, []);

  const onInput = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const goRegister = () => nav.navigateTo({ url: '/pages/register/register' });
  const onForgot = () => showToast({ title: '请联系管理员重置密码', icon: 'none' });

  const onSubmit = () => {
    const { userId, password } = form;
    if (!userId || !password) {
      showToast({ title: '请填学号 + 密码', icon: 'none' });
      return;
    }
    setLoading(true);
    api.auth
      .login({ userId, password })
      .then((data) => {
        authLib.saveToken(data.token);
        authLib.saveCurrentUser(data.user);
        setUser(data.user);
        if (isRemember) {
          localStorage.setItem(REMEMBER_FLAG, '1');
          localStorage.setItem(REMEMBER_USER, userId);
        } else {
          localStorage.removeItem(REMEMBER_FLAG);
          localStorage.removeItem(REMEMBER_USER);
        }
        showToast({ title: '欢迎回来', icon: 'success' });
        setTimeout(() => nav.switchTab({ url: '/pages/hall/hall' }), 600);
      })
      .catch(() => {})
      .then(() => setLoading(false));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) onSubmit();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* ===== 桌面左侧品牌区 / 移动顶部紧凑品牌 ===== */}
      <aside className="relative lg:flex-1 lg:flex lg:flex-col lg:justify-between t-violet overflow-hidden p-6 md:p-10 lg:p-14 min-h-[260px] lg:min-h-screen">
        {/* 角落装饰：同心圆十字（科技感） */}
        <svg
          aria-hidden
          className="absolute -right-20 -bottom-20 w-[520px] h-[520px] opacity-[0.12]"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="48" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="26" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" strokeWidth="1" />
          <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" strokeWidth="1" />
        </svg>
        {/* 节点网络 */}
        <svg
          aria-hidden
          className="hidden lg:block absolute top-1/4 left-1/4 w-[420px] h-[420px] opacity-50"
          viewBox="0 0 600 600"
        >
          <defs>
            <linearGradient id="ln" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.45" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g stroke="url(#ln)" strokeWidth="1.2">
            <line x1="90" y1="120" x2="300" y2="240" />
            <line x1="300" y1="240" x2="510" y2="140" />
            <line x1="300" y1="240" x2="200" y2="470" />
            <line x1="300" y1="240" x2="470" y2="430" />
            <line x1="200" y1="470" x2="470" y2="430" />
            <line x1="90" y1="120" x2="200" y2="470" />
          </g>
          {[[90, 120, 5], [300, 240, 8], [510, 140, 4], [200, 470, 6], [470, 430, 7]].map(
            ([cx, cy, r], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="currentColor"
                opacity="0.6"
                style={{ animation: `pulse 3s ease-in-out ${i * 0.4}s infinite` }}
              />
            ),
          )}
        </svg>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/40 dark:bg-white/15 px-3 py-1 text-xs font-bold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-current animate-ping opacity-50" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            灵搭 · 校园协作匹配平台
          </div>
        </div>

        <div className="relative z-10 mt-6 lg:mt-0 lg:max-w-md">
          <div className="flex items-center gap-3 mb-5 lg:mb-8">
            <div className="h-12 w-12 lg:h-14 lg:w-14 rounded-2xl bg-white/55 dark:bg-white/20 flex items-center justify-center font-heading font-extrabold text-2xl lg:text-3xl">
              灵
            </div>
            <div className="leading-none">
              <div className="font-heading text-xl lg:text-2xl font-extrabold tracking-tight">
                灵搭
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70 mt-1.5">
                LingDa
              </div>
            </div>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
            找到你的
            <br className="hidden lg:block" />
            <span className="lg:block mt-2 inline-flex items-center gap-2">
              最佳组队合伙人
              <Sparkles className="inline h-7 w-7 lg:h-8 lg:w-8 opacity-80" strokeWidth={2} />
            </span>
          </h1>
          <p className="text-sm lg:text-base opacity-80 mt-4 max-w-md">
            拼车 · 娱乐 · 学习 — 三步匹配同频伙伴，让每一次组队都高效而温暖。
          </p>

          <div className="hidden lg:flex items-center gap-6 mt-10">
            <Stat num="12k+" label="校园用户" />
            <span className="h-8 w-px bg-current opacity-20" />
            <Stat num="3.8k" label="成功组队" />
            <span className="h-8 w-px bg-current opacity-20" />
            <Stat num="4.9" label="平均口碑" suffix="★" />
          </div>
        </div>

        <div className="hidden lg:block relative z-10 opacity-60 text-xs">
          © {new Date().getFullYear()} 灵搭 LingDa
        </div>
      </aside>

      {/* ===== 右侧 / 下方表单 ===== */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:mb-8">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Sign In
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-tight mt-1">
              进入系统
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              使用学号登录你的协作空间
            </p>
          </div>

          <div className="space-y-4">
            <Field label="学号" icon={IdCard}>
              <input
                type="text"
                className={authInputCls}
                placeholder="请输入学号"
                value={form.userId}
                onChange={onInput('userId')}
                onKeyDown={onKeyDown}
                autoComplete="username"
              />
            </Field>
            <Field label="密码" icon={Lock}>
              <input
                type="password"
                className={authInputCls}
                placeholder="至少 6 位"
                value={form.password}
                onChange={onInput('password')}
                onKeyDown={onKeyDown}
                autoComplete="current-password"
              />
            </Field>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 cursor-pointer text-foreground">
                <span
                  className={cn(
                    'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
                    isRemember
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border bg-background',
                  )}
                >
                  {isRemember && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isRemember}
                  onChange={(e) => setIsRemember(e.target.checked)}
                />
                <span className="text-xs font-medium">记住我</span>
              </label>
              <button
                onClick={onForgot}
                className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                忘记密码？
              </button>
            </div>

            <Button
              variant="cta"
              size="lg"
              disabled={loading}
              onClick={onSubmit}
              className="w-full h-12 text-base"
            >
              {loading ? '正在进入…' : '立即进入'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              <span>还没账号？</span>
              <button
                onClick={goRegister}
                className="ml-1 text-primary font-semibold hover:underline inline-flex items-center gap-1"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                立即注册
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" strokeWidth={2.2} />}
        {label}
      </label>
      {children}
    </div>
  );
}

function Stat({ num, label, suffix }) {
  return (
    <div>
      <div className="font-heading text-2xl font-extrabold tabular-nums leading-none">
        {num}
        {suffix && <span className="text-base ml-0.5 opacity-80">{suffix}</span>}
      </div>
      <div className="text-[11px] opacity-70 mt-1">{label}</div>
    </div>
  );
}

const authInputCls =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm ' +
  'placeholder:text-muted-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:cursor-not-allowed disabled:opacity-50';
