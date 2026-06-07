// UI 重做 Phase 11：Register —— 与 Login 同款分屏 + 字段分两列网格
import { useState } from 'react';
import {
  IdCard,
  User as UserIcon,
  Lock,
  Phone,
  School,
  BookOpen,
  Users,
  ArrowRight,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useWxNav } from '../../lib/nav';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/cn';

const FIELDS = [
  { key: 'userId', label: '学号', placeholder: '4-50 位', icon: IdCard, required: true },
  { key: 'username', label: '昵称', placeholder: '展示给搭子', icon: UserIcon, required: true },
  { key: 'realName', label: '真实姓名', placeholder: '内部审核用', icon: UserIcon, required: true },
  { key: 'password', label: '密码', placeholder: '至少 6 位', icon: Lock, required: true, password: true },
  { key: 'phone', label: '手机号', placeholder: '11 位手机号', icon: Phone, required: true },
  { key: 'college', label: '学院', placeholder: '如：新闻学院', icon: School, required: true },
  { key: 'major', label: '专业', placeholder: '选填', icon: BookOpen },
  { key: 'gender', label: '性别', placeholder: '男 / 女 / 不填', icon: Users },
];

export default function Register() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const { showToast } = useUI();
  const nav = useWxNav();

  const onInput = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const goLogin = () => nav.navigateBack({ delta: 1 });

  const onSubmit = () => {
    const f = form;
    for (const k of ['userId', 'username', 'realName', 'password', 'phone', 'college']) {
      if (!f[k]) {
        showToast({ title: '请填完必填项', icon: 'none' });
        return;
      }
    }
    if (f.password.length < 6) {
      showToast({ title: '密码至少 6 位', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(f.phone)) {
      showToast({ title: '手机号格式不对', icon: 'none' });
      return;
    }
    setLoading(true);
    const payload = { ...f };
    if (!payload.major) delete payload.major;
    if (!payload.gender) delete payload.gender;

    api.auth
      .register(payload)
      .then((data) => {
        authLib.saveToken(data.token);
        authLib.saveCurrentUser(data.user);
        setUser(data.user);
        showToast({ title: '注册成功', icon: 'success' });
        setTimeout(() => nav.switchTab({ url: '/pages/hall/hall' }), 600);
      })
      .catch(() => {})
      .then(() => setLoading(false));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* 左/上：品牌区 —— 这次用 t-sky 区分 */}
      <aside className="relative lg:flex-1 lg:flex lg:flex-col lg:justify-between t-sky overflow-hidden p-6 md:p-10 lg:p-14 min-h-[220px] lg:min-h-screen">
        <svg
          aria-hidden
          className="absolute -right-20 -bottom-20 w-[520px] h-[520px] opacity-[0.12]"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="48" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" strokeWidth="1" />
          <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" strokeWidth="1" />
        </svg>

        <div className="relative z-10">
          <button
            onClick={goLogin}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/40 dark:bg-white/15 hover:bg-white/55 px-3 py-1 text-xs font-bold transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            返回登录
          </button>
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
            创建你的
            <br className="hidden lg:block" />
            <span className="lg:block mt-2 inline-flex items-center gap-2">
              校园身份
              <Sparkles className="inline h-7 w-7 lg:h-8 lg:w-8 opacity-80" strokeWidth={2} />
            </span>
          </h1>
          <p className="text-sm lg:text-base opacity-80 mt-4 max-w-md">
            完成几个简单字段，立刻开始找搭子。我们仅在内部使用真实姓名做审核。
          </p>

          <div className="hidden lg:block mt-10 space-y-3 text-sm">
            <CheckLine text="学号绑定，0 重复账号" />
            <CheckLine text="真实姓名仅内部审核，不公开" />
            <CheckLine text="加入即可使用拼车 / 娱乐 / 学习 三大模块" />
          </div>
        </div>

        <div className="hidden lg:block relative z-10 opacity-60 text-xs">
          © {new Date().getFullYear()} 灵搭 LingDa
        </div>
      </aside>

      {/* 右/下：注册表单 */}
      <main className="flex-1 flex items-start lg:items-center justify-center p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-xl">
          <div className="mb-6 lg:mb-8">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Create Account
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-tight mt-1">
              创建账号
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              填写以下信息开始使用搭子
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELDS.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.key}>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
                    {Icon && <Icon className="h-3 w-3" strokeWidth={2.2} />}
                    {f.label}
                    {f.required && <span className="text-cta">*</span>}
                  </label>
                  <input
                    type={f.password ? 'password' : 'text'}
                    placeholder={f.placeholder}
                    value={form[f.key] || ''}
                    onChange={onInput(f.key)}
                    className={authInputCls}
                  />
                </div>
              );
            })}
          </div>

          <Button
            variant="cta"
            size="lg"
            disabled={loading}
            onClick={onSubmit}
            className="w-full h-12 text-base mt-6"
          >
            {loading ? '注册中…' : '完成注册'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>

          <p className="mt-4 text-sm text-center text-muted-foreground">
            已有账号？
            <button
              onClick={goLogin}
              className="ml-1 text-primary font-semibold hover:underline"
            >
              返回登录
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function CheckLine({ text }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        'h-5 w-5 rounded-full bg-white/40 dark:bg-white/15 flex items-center justify-center'
      )}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      <span className="opacity-90">{text}</span>
    </div>
  );
}

const authInputCls =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm ' +
  'placeholder:text-muted-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:cursor-not-allowed disabled:opacity-50';
