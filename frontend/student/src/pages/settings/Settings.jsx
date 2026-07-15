import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronRight,
  Edit3,
  FileImage,
  ImagePlus,
  LoaderCircle,
  Lock,
  LogOut,
  MessageCircle,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useFriends } from '../../context/FriendsContext';
import EditProfileModal from '../../components/EditProfileModal';
import FriendRequestsModal from '../../components/FriendRequestsModal';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import {
  AppPage,
  PageHeader,
  SectionHeader,
  SectionSurface,
} from '../../components/layout/AppScaffold';
import { cn } from '../../lib/cn';

export default function SettingsPage() {
  const { setUser } = useAuth();
  const { showModal, showToast } = useUI();
  const { incoming = [], friends = [] } = useFriends() || {};
  const [user, setUserState] = useState({});
  const [editing, setEditing] = useState(false);
  const [friendReqOpen, setFriendReqOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verification, setVerification] = useState(null);
  const [prefs, setPrefs] = useState({
    message: true,
    team: true,
    searchable: true,
    profilePreview: true,
  });

  const loadData = () => {
    api.users.me().then((me) => {
      setUser(me);
      authLib.saveCurrentUser(me);
      api.users
        .profile(me.user_id)
        .then((profile) => setUserState({ ...profile.user, phone: me.phone }))
        .catch(() => setUserState(me));
      setPrefs({
        message: me.notify_enabled !== false,
        team: me.notify_enabled !== false,
        searchable: me.is_searchable !== false,
        profilePreview: me.show_profile !== false,
      });
    });
    api.community.myVerification().then((res) => setVerification(res.current || null)).catch(() => {});
  };

  useEffect(() => {
    if (authLib.requireLogin()) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogout = () => {
    showModal({ title: '退出登录', content: '确定要退出吗?' }).then((res) => {
      if (res.confirm) authLib.logout();
    });
  };

  const togglePref = (key) => {
    const next = !prefs[key];
    const payload = key === 'searchable'
      ? { isSearchable: next }
      : key === 'profilePreview'
        ? { showProfile: next }
        : { notifyEnabled: next };
    api.users.updateMe(payload).then((me) => {
      setPrefs((prev) => key === 'message' || key === 'team'
        ? { ...prev, message: next, team: next }
        : { ...prev, [key]: next });
      setUser(me);
      showToast({ title: '设置已保存', icon: 'success' });
    });
  };

  return (
    <>
      <AppPage aside={<SettingsAside user={user} friends={friends.length} incoming={incoming.length} />}>
        <PageHeader
          eyebrow="Settings"
          title="设置"
          subtitle="管理资料、好友申请、消息提醒和账号安全。"
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <AccountPanel user={user} onEdit={() => setEditing(true)} />

            <VerificationPanel
              user={user}
              verification={verification}
              onApply={() => setVerificationOpen(true)}
            />

            <section className="space-y-3">
              <SectionHeader title="资料与社交" subtitle="对外展示与好友关系" />
              <SectionSurface className="p-3">
                <SettingRow
                  icon={Edit3}
                  title="编辑个人信息"
                  desc="昵称、学院、专业、手机号和标签"
                  onClick={() => setEditing(true)}
                />
                <SettingRow
                  icon={UserPlus}
                  title="好友申请"
                  desc={incoming.length > 0 ? `${incoming.length} 条待处理` : '暂无新的申请'}
                  badge={incoming.length}
                  onClick={() => setFriendReqOpen(true)}
                />
                <ToggleRow
                  icon={ShieldCheck}
                  title="允许通过学号搜索到我"
                  desc="关闭后别人无法通过学号精确搜索你"
                  checked={prefs.searchable}
                  onClick={() => togglePref('searchable')}
                />
                <ToggleRow
                  icon={Lock}
                  title="展示个人资料预览"
                  desc="聊天和成员列表中展示学院、专业与标签"
                  checked={prefs.profilePreview}
                  onClick={() => togglePref('profilePreview')}
                />
              </SectionSurface>
            </section>

            <section className="space-y-3">
              <SectionHeader title="消息提醒" subtitle="控制灵搭里的提醒入口" />
              <SectionSurface className="p-3">
                <ToggleRow
                  icon={MessageCircle}
                  title="私聊和群聊提醒"
                  desc="有新消息时在导航栏显示红点"
                  checked={prefs.message}
                  onClick={() => togglePref('message')}
                />
                <ToggleRow
                  icon={Bell}
                  title="组队状态提醒"
                  desc="申请通过、队伍满员和活动结束时提醒"
                  checked={prefs.team}
                  onClick={() => togglePref('team')}
                />
              </SectionSurface>
            </section>

            <section className="space-y-3">
              <SectionHeader title="账号" subtitle="登录状态与安全操作" />
              <SectionSurface className="p-3">
                <SettingRow
                  icon={Lock}
                  title="账号安全"
                  desc="密码、手机号和登录设备"
                  muted
                />
                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </SectionSurface>
            </section>
          </div>

          <div className="hidden space-y-6 xl:block">
            <SectionSurface className="p-5">
              <SectionHeader title="设置建议" subtitle="让资料更容易被合适的搭子看见" />
              <div className="mt-4 space-y-3">
                <HintLine text="补全学院、专业和 2-4 个兴趣标签。" />
                <HintLine text="保持学号可搜索，方便线下同学快速加好友。" />
                <HintLine text="开启组队状态提醒，不错过申请通过。" />
              </div>
            </SectionSurface>
          </div>
        </div>
      </AppPage>

      {friendReqOpen && <FriendRequestsModal onClose={() => setFriendReqOpen(false)} />}
      {editing && (
        <EditProfileModal
          initial={user}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            loadData();
          }}
        />
      )}
      {verificationOpen && (
        <VerificationForm
          user={user}
          onClose={() => setVerificationOpen(false)}
          onSubmitted={() => {
            setVerificationOpen(false);
            loadData();
          }}
        />
      )}
    </>
  );
}

function VerificationPanel({ user, verification, onApply }) {
  const status = verification?.status === 'pending'
    ? 'pending'
    : user.verification_status || 'unverified';
  const labels = {
    verified: '认证通过',
    pending: '审核中',
    rejected: '认证未通过',
    unverified: '尚未认证',
  };
  return (
    <section className="space-y-3">
      <SectionHeader title="身份认证" subtitle="学生、社团和官方机构使用不同认证材料" />
      <SectionSurface className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><ShieldCheck className="h-5 w-5" /></span>
            <div>
              <div className="font-semibold text-slate-950">{labels[status]}</div>
              <p className="mt-1 text-sm text-slate-500">
                {verification?.review_note || (status === 'verified' ? `当前身份：${roleLabel(user.account_role)}` : '认证后可发布社区帖子，社团和官方账号可按权限发布公告。')}
              </p>
            </div>
          </div>
          {status !== 'pending' && (
            <button type="button" onClick={onApply} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500">{status === 'verified' ? '申请其他认证' : '提交认证'}</button>
          )}
        </div>
      </SectionSurface>
    </section>
  );
}

function VerificationForm({ user, onClose, onSubmitted }) {
  const { showToast } = useUI();
  const [form, setForm] = useState({
    type: 'student',
    applicantName: user.real_name || '',
    organizationName: '',
    studentId: user.user_id || '',
    materialUrls: [],
    statement: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const uploadMaterials = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const remaining = 8 - form.materialUrls.length;
    if (files.length > remaining) {
      showToast({ title: `还可以上传 ${remaining} 份材料`, icon: 'none' });
      return;
    }
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))) {
      showToast({ title: '认证材料仅支持 JPG、PNG、WebP 或 GIF', icon: 'none' });
      return;
    }
    if (files.some((file) => file.size > 8 * 1024 * 1024)) {
      showToast({ title: '单份材料不能超过 8MB', icon: 'none' });
      return;
    }
    setUploading(true);
    try {
      const result = await api.uploads.verificationMaterials(files);
      const uploaded = (result.files || []).map((file) => ({ path: file.path, name: file.name }));
      set('materialUrls', [...form.materialUrls, ...uploaded]);
    } finally {
      setUploading(false);
    }
  };
  const submit = (event) => {
    event.preventDefault();
    const materialUrls = form.materialUrls.map((item) => item.path);
    if (!materialUrls.length) {
      showToast({ title: '请至少上传一份证明材料', icon: 'none' });
      return;
    }
    setSaving(true);
    api.community.submitVerification({
      type: form.type,
      applicantName: form.applicantName,
      ...(form.type !== 'student' ? { organizationName: form.organizationName } : {}),
      ...(form.type !== 'official' ? { studentId: form.studentId } : {}),
      materialUrls,
      statement: form.statement || undefined,
    }).then(() => {
      showToast({ title: '认证申请已提交', icon: 'success' });
      onSubmitted();
    }).finally(() => setSaving(false));
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}>
      <section role="dialog" aria-modal="true" className="max-h-[92vh] w-full overflow-y-auto rounded-lg bg-white p-5 shadow-2xl sm:max-w-xl sm:p-6">
        <div className="mb-5"><h2 className="text-xl font-bold text-slate-950">提交身份认证</h2><p className="mt-1 text-sm text-slate-500">管理员会核对身份与证明材料，结果会保留审核记录。</p></div>
        <form onSubmit={submit} className="space-y-4">
          <VerifySelect value={form.type} onChange={(v) => set('type', v)} />
          <VerifyInput label="申请人姓名" value={form.applicantName} onChange={(v) => set('applicantName', v)} />
          {form.type === 'student' && <VerifyInput label="学号" value={form.studentId} onChange={(v) => set('studentId', v)} />}
          {form.type === 'club' && <><VerifyInput label="社团名称" value={form.organizationName} onChange={(v) => set('organizationName', v)} /><VerifyInput label="负责人学号" value={form.studentId} onChange={(v) => set('studentId', v)} /></>}
          {form.type === 'official' && <VerifyInput label="官方机构名称" value={form.organizationName} onChange={(v) => set('organizationName', v)} />}
          <div className="block text-sm font-semibold text-slate-700">
            证明材料 <span className="font-normal text-slate-400">仅申请人和管理员可见，最多 8 份</span>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {form.materialUrls.map((item) => (
                <div key={item.path} className="flex min-h-20 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <FileImage className="h-5 w-5 shrink-0 text-blue-600" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">{item.name}</span>
                  <button type="button" onClick={() => set('materialUrls', form.materialUrls.filter((current) => current.path !== item.path))} aria-label="移除材料" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {form.materialUrls.length < 8 && (
                <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50">
                  {uploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  {uploading ? '上传中' : '选择本地图片'}
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={uploadMaterials} />
          </div>
          <label className="block text-sm font-semibold text-slate-700">补充说明<textarea rows={3} maxLength={1000} value={form.statement} onChange={(e) => set('statement', e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 p-3 font-normal outline-none focus:border-blue-400" /></label>
          <div className="flex gap-3"><button type="button" onClick={onClose} className="h-11 flex-1 rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">取消</button><button disabled={saving || uploading} className="h-11 flex-1 rounded-lg bg-blue-600 text-sm font-semibold text-white disabled:opacity-50">{saving ? '提交中...' : uploading ? '材料上传中...' : '提交审核'}</button></div>
        </form>
      </section>
    </div>
  );
}

function VerifyInput({ label, value, onChange }) { return <label className="block text-sm font-semibold text-slate-700">{label}<input required value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-blue-400" /></label>; }
function VerifySelect({ value, onChange }) { return <label className="block text-sm font-semibold text-slate-700">认证类型<select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal"><option value="student">在校学生身份</option><option value="club">社团负责人</option><option value="official">校级官方机构</option></select></label>; }
function roleLabel(role) { return ({ student: '在校学生', club: '认证社团', official: '官方机构', admin: '管理员' })[role] || '在校学生'; }

function AccountPanel({ user, onEdit }) {
  return (
    <SectionSurface className="p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="h-16 w-16 ring-4 ring-blue-50">
            <AvatarFallback
              style={{ background: user.avatar_color || '#2563EB' }}
              className="text-xl font-bold text-white"
            >
              {user.avatar_text || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-2xl font-bold text-slate-950">
              {user.username || '同学'}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">
              {user.college || '学校信息待完善'}
              {user.major && <> · {user.major}</>}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 text-sm font-semibold text-blue-600 transition hover:bg-blue-600 hover:text-white"
        >
          <Edit3 className="h-4 w-4" />
          编辑资料
        </button>
      </div>
    </SectionSurface>
  );
}

function SettingsAside({ user, friends, incoming }) {
  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-heading text-base font-bold text-slate-950">账号概览</h3>
        <div className="mt-4 grid grid-cols-2 divide-x divide-slate-100 text-center">
          <MiniMetric label="好友" value={friends} />
          <MiniMetric label="待处理" value={incoming} />
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-heading text-base font-bold text-slate-950">当前身份</h3>
        <p className="mt-2 text-sm text-slate-500">
          {user.college || '学校待完善'}
          {user.major && ` · ${user.major}`}
        </p>
      </section>
    </>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div>
      <div className="font-heading text-xl font-bold tabular-nums text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function SettingRow({ icon: Icon, title, desc, badge, muted, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition',
        muted ? 'text-slate-400' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
      )}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-400">{desc}</span>
      </span>
      {badge > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </button>
  );
}

function ToggleRow({ icon: Icon, title, desc, checked, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-400">{desc}</span>
      </span>
      <span
        className={cn(
          'relative h-7 w-12 rounded-full transition',
          checked ? 'bg-blue-600' : 'bg-slate-200',
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition',
            checked ? 'left-6' : 'left-1',
          )}
        />
      </span>
    </button>
  );
}

function HintLine({ text }) {
  return (
    <div className="flex gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
      <span>{text}</span>
    </div>
  );
}
