// UI 重做 Phase 11：Register —— 与 Login 同款分屏 + 字段分两列网格
import { useState } from 'react';
import {
  IdCard,
  User as UserIcon,
  Lock,
  Phone,
  School,
  BookOpen,
  GraduationCap,
  Users,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useWxNav } from '../../lib/nav';
import { Button } from '../../components/ui/button';
import AuthVisualPanel from '../../components/AuthVisualPanel';
import { COLLEGE_CODES, MAJOR_CODES, enrollmentCohortOptions } from '../../lib/academicOptions';

const ENROLLMENT_COHORTS = enrollmentCohortOptions();

const FIELDS = [
  { key: 'userId', label: '学号', placeholder: '4-50 位', icon: IdCard, required: true },
  { key: 'username', label: '昵称', placeholder: '展示给搭子', icon: UserIcon, required: true },
  { key: 'realName', label: '真实姓名', placeholder: '内部审核用', icon: UserIcon, required: true },
  { key: 'password', label: '密码', placeholder: '至少 6 位', icon: Lock, required: true, password: true },
  { key: 'phone', label: '手机号', placeholder: '11 位手机号', icon: Phone, required: true },
  { key: 'college', label: '学院', placeholder: '请选择', icon: School, required: true, options: COLLEGE_CODES },
  { key: 'major', label: '专业简称', placeholder: '请选择', icon: BookOpen, required: true, options: MAJOR_CODES },
  { key: 'grade', label: '入学届别', placeholder: '请选择', icon: GraduationCap, required: true, options: ENROLLMENT_COHORTS },
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
    for (const k of ['userId', 'username', 'realName', 'password', 'phone', 'college', 'major', 'grade']) {
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
      <AuthVisualPanel
        image="/images/campus/study-window.jpg"
        imagePosition="center"
        compact
        eyebrow="Create Account"
        title="创建校园身份，加入灵搭社区"
        subtitle="完成基础信息后，你就可以发布课程组队、加入活动、和同学建立稳定联系。"
        action={{ label: '返回登录', onClick: goLogin }}
        meta={[
          { value: '学号', label: '身份绑定' },
          { value: '实名', label: '内部审核' },
          { value: '三类', label: '组队场景' },
        ]}
      />

      {/* 右/下：注册表单 */}
      <main className="flex flex-1 items-start justify-center bg-[#F7F9FC] p-6 md:p-8 lg:items-center lg:p-12">
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
                  {f.options ? (
                    <select value={form[f.key] || ''} onChange={onInput(f.key)} className={authInputCls}>
                      <option value="">{f.placeholder}</option>
                      {f.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.password ? 'password' : 'text'}
                      placeholder={f.placeholder}
                      value={form[f.key] || ''}
                      onChange={onInput(f.key)}
                      className={authInputCls}
                    />
                  )}
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
              type="button"
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

const authInputCls =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm ' +
  'placeholder:text-muted-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:cursor-not-allowed disabled:opacity-50';
