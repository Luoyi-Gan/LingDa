// UI 重做 Phase 11：Login —— 双栏分屏（桌面）/ 单栏（移动）
// 鉴权逻辑 100% 原样：api.auth.login + 记住我（仅持久化学号）
import { useState, useEffect } from 'react';
import {
  IdCard,
  Lock,
  ArrowRight,
  Check,
  GraduationCap,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useWxNav } from '../../lib/nav';
import { Button } from '../../components/ui/button';
import AuthVisualPanel from '../../components/AuthVisualPanel';
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

  const enterApp = (user, toastTitle) => {
    setUser(user);
    showToast({ title: toastTitle, icon: 'success' });
    setTimeout(() => nav.switchTab({ url: '/partners' }), 400);
  };

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
        if (isRemember) {
          localStorage.setItem(REMEMBER_FLAG, '1');
          localStorage.setItem(REMEMBER_USER, userId);
        } else {
          localStorage.removeItem(REMEMBER_FLAG);
          localStorage.removeItem(REMEMBER_USER);
        }
        enterApp(data.user, '欢迎回来');
      })
      .catch(() => {})
      .then(() => setLoading(false));
  };

  /** 开发免密入口：走真实后端 POST /auth/preview，签发 JWT */
  const onDevPreview = () => {
    setLoading(true);
    api.auth
      .preview()
      .then((data) => {
        authLib.saveToken(data.token);
        authLib.saveCurrentUser(data.user);
        enterApp(data.user, '开发预览已登录');
      })
      .catch(() => {})
      .then(() => setLoading(false));
  };

  const showDevPreview =
    import.meta.env.DEV || import.meta.env.VITE_UI_PREVIEW === 'true';

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) onSubmit();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* ===== 桌面左侧品牌区 / 移动顶部紧凑品牌 ===== */}
      <AuthVisualPanel
        image="/images/campus/login-building-warm.jpg"
        imagePosition="center 46%"
        eyebrow="Campus Matching"
        title="从熟悉的校园出发，找到同频搭子"
        subtitle="拼车、娱乐、课程组队都从这里开始。用清晰的信息和可靠的匹配，把临时组队变成轻松的日常。"
      />

      {/* ===== 右侧 / 下方表单 ===== */}
      <main className="flex flex-1 items-center justify-center bg-[#F7F9FC] p-6 md:p-8 lg:p-12">
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
                type="button"
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

            {showDevPreview && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={loading}
                onClick={onDevPreview}
                className="w-full h-12 text-base border-dashed"
              >
                开发预览 · 免密进入
              </Button>
            )}

            <div className="text-sm text-center text-muted-foreground">
              <span>还没账号？</span>
              <button
                type="button"
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

const authInputCls =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm ' +
  'placeholder:text-muted-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:cursor-not-allowed disabled:opacity-50';
