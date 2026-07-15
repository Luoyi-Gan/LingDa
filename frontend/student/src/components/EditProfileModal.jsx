// 编辑个人信息 —— UI 重做：shadcn Dialog + 字段图标 + Tailwind
import { useState } from 'react';
import {
  User as UserIcon,
  IdCard,
  Users,
  School,
  BookOpen,
  Phone,
  Tag,
  GraduationCap,
  AlignLeft,
} from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { COLLEGE_CODES, MAJOR_CODES, enrollmentCohortOptions } from '../lib/academicOptions';
import { formatEnrollmentCohort } from '../lib/cohort';

const ENROLLMENT_COHORTS = enrollmentCohortOptions();

const FIELDS = [
  { key: 'username', label: '昵称', placeholder: '展示给搭子', icon: UserIcon },
  { key: 'realName', from: 'real_name', label: '真实姓名', placeholder: '内部审核用', icon: IdCard },
  { key: 'gender', label: '性别', placeholder: '男 / 女 / 不填', icon: Users },
  { key: 'college', label: '学院', placeholder: '请选择学院', icon: School, options: COLLEGE_CODES },
  { key: 'major', label: '专业简称', placeholder: '请选择专业', icon: BookOpen, options: MAJOR_CODES },
  { key: 'grade', label: '入学届别', placeholder: '请选择入学届别', icon: GraduationCap, options: ENROLLMENT_COHORTS },
  { key: 'phone', label: '手机号', placeholder: '11 位手机号', icon: Phone },
];

export default function EditProfileModal({ initial = {}, onClose, onSaved }) {
  const { showToast } = useUI();
  const [form, setForm] = useState(() => {
    const f = {};
    FIELDS.forEach((x) => {
      f[x.key] = initial[x.from || x.key] || '';
    });
    f.grade = formatEnrollmentCohort(f.grade);
    f.tags = Array.isArray(initial.tags) ? initial.tags.join('，') : '';
    f.bio = initial.bio || '';
    return f;
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => {
    const v = k === 'phone' ? e.target.value.replace(/\s+/g, '') : e.target.value;
    setForm((s) => ({ ...s, [k]: v }));
  };

  const submit = () => {
    const payload = {};
    FIELDS.forEach((x) => {
      const cur = (form[x.key] || '').trim();
      const orig = (initial[x.from || x.key] ?? '').toString().trim();
      if (cur && cur !== orig) payload[x.key] = cur;
    });
    const tags = form.tags
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const origTags = Array.isArray(initial.tags) ? initial.tags : [];
    if (
      tags.length !== origTags.length ||
      tags.some((t, i) => t !== origTags[i])
    ) {
      payload.tags = tags;
    }
    const bio = form.bio.trim();
    if (bio !== (initial.bio || '').trim()) payload.bio = bio;
    if (payload.phone && !/^1[3-9]\d{9}$/.test(payload.phone)) {
      showToast({ title: '手机号格式不对', icon: 'none' });
      return;
    }
    if (Object.keys(payload).length === 0) {
      showToast({ title: '没有变更', icon: 'none' });
      onClose && onClose();
      return;
    }
    setSaving(true);
    api.users
      .updateMe(payload)
      .then(() => {
        showToast({ title: '已保存', icon: 'success' });
        onSaved && onSaved();
      })
      .catch(() => {})
      .then(() => setSaving(false));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>编辑个人信息</DialogTitle>
          <DialogDescription>
            只更新有变化的字段；为空表示保持原状
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-3 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELDS.map((x) => {
              const Icon = x.icon;
              return (
                <div key={x.key}>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
                    {Icon && <Icon className="h-3 w-3" strokeWidth={2.2} />}
                    {x.label}
                  </label>
                  {x.options ? (
                    <select
                      value={form[x.key]}
                      onChange={set(x.key)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">{x.placeholder}</option>
                      {x.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <Input
                      placeholder={x.placeholder}
                      value={form[x.key]}
                      onChange={set(x.key)}
                    />
                  )}
                </div>
              );
            })}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
                <Tag className="h-3 w-3" strokeWidth={2.2} />
                标签
              </label>
              <Input
                placeholder="逗号分隔，如：i人，爱看演唱会"
                value={form.tags}
                onChange={set('tags')}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
                <AlignLeft className="h-3 w-3" strokeWidth={2.2} />
                个人简介
              </label>
              <textarea
                maxLength={500}
                rows={3}
                placeholder="介绍你的课程方向、兴趣和擅长的事情"
                value={form.bio}
                onChange={set('bio')}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-2 p-5 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button
            variant="cta"
            disabled={saving}
            onClick={submit}
            className="flex-[1.4]"
          >
            {saving ? '保存中…' : '保存修改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
