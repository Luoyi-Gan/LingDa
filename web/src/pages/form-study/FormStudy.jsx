// UI 重做 Phase 5：FormStudy —— t-teal 主调 + Bento 重写
// （UI 叫 study，提交走 group room_type）
import { useEffect, useState } from 'react';
import {
  BookOpen,
  Target,
  Clock3,
  MapPin,
  Users,
  Edit3,
  Tag,
  GraduationCap,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useUI } from '../../context/UIContext';
import { useWxNav, useQueryOptions } from '../../lib/nav';
import NavBar from '../../components/NavBar';
import MatchCandidatesPanel from '../../components/MatchCandidatesPanel';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  FieldGroup,
  ChipRow,
  NumberRow,
  DateTimeRow,
} from '../../components/form/FormShared';

const SUBJECTS = [
  { badge: '理', name: '理工' },
  { badge: '英', name: '英语' },
  { badge: '法', name: '法学' },
  { badge: '计', name: '计算机' },
  { badge: '艺', name: '艺术' },
  { badge: '商', name: '经管' },
  { badge: '医', name: '医学' },
  { badge: '文', name: '文史' },
];
const LOCATIONS = ['图书馆', '自习室', '咖啡厅', '线上', '宿舍楼', '院系讨论室'];
const GENDER_PREFS = [
  { value: 'any', label: '不限' },
  { value: 'same', label: '仅同性' },
  { value: 'opposite_ok', label: '异性可' },
];

export default function FormStudy() {
  const { showToast } = useUI();
  const nav = useWxNav();
  const options = useQueryOptions();
  const editingId = options.edit ? Number(options.edit) : null;
  const [form, setForm] = useState({
    course_name: '',
    subject: '',
    title: '',
    group_target: '',
    require_skill: '',
    date: '',
    time: '',
    meet_location: '',
    total_num: 4,
    gender_pref: 'any',
  });
  const [loading, setLoading] = useState(false);
  const [cands, setCands] = useState([]);
  const [proceeded, setProceeded] = useState(false);

  useEffect(() => {
    authLib.requireLogin();
  }, []);

  useEffect(() => {
    if (editingId) return;
    if (!form.course_name) {
      setCands([]);
      return;
    }
    const t = setTimeout(() => {
      api.rooms
        .matchGroup({
          courseName: form.course_name,
          meetLocation: form.meet_location || undefined,
        })
        .then((res) => setCands(res.list || []))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [form.course_name, form.meet_location, editingId]);

  useEffect(() => {
    if (!editingId) return;
    api.rooms
      .detail(editingId)
      .then((d) => {
        const r = d.room || {};
        setForm({
          course_name: r.course_name || '',
          subject: '',
          title: r.title || '',
          group_target: r.group_target || '',
          require_skill: r.require_skill || '',
          date: r.meet_time ? r.meet_time.slice(0, 10) : '',
          time: r.meet_time ? r.meet_time.slice(11, 16) : '',
          meet_location: r.meet_location || '',
          total_num: r.total_num || 4,
          gender_pref: 'any',
        });
      })
      .catch(() => {});
  }, [editingId]);

  const setKey = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const submit = () => {
    const f = form;
    if (!f.course_name) {
      showToast({ title: '请填写课程名', icon: 'none' });
      return;
    }
    if (!f.title) {
      showToast({ title: '请填写组队描述', icon: 'none' });
      return;
    }
    if (!f.group_target) {
      showToast({ title: '请填写小组目标', icon: 'none' });
      return;
    }
    const meetTime =
      f.date && f.time
        ? new Date(`${f.date}T${f.time}:00`).toISOString()
        : undefined;
    const payload = {
      title: f.title,
      totalNum: Number(f.total_num) || 4,
      meetTime,
      meetLocation: f.meet_location || undefined,
      joinRule: 'direct',
      courseName: f.course_name,
      groupTarget: f.group_target,
      requireSkill: f.require_skill || undefined,
    };

    setLoading(true);
    const promise = editingId
      ? api.rooms.updateGroup(editingId, payload)
      : api.rooms.createGroup(payload);
    promise
      .then((res) => {
        showToast({ title: editingId ? '已更新' : '发布成功', icon: 'success' });
        const id = editingId || res.room_id;
        setTimeout(() => {
          nav.redirectTo({ url: `/pages/detail-study/detail-study?id=${id}` });
        }, 500);
      })
      .catch(() => {})
      .then(() => setLoading(false));
  };

  return (
    <div className="relative min-h-screen pb-32 md:pb-12">
      <NavBar title={editingId ? '编辑学习' : '发布学习'} />
      <div className="relative mx-auto w-full max-w-[860px] px-4 pt-4 md:px-8 md:pt-6">
        {/* Hero —— t-teal + BookOpen 简笔 */}
        <Card bento className="t-teal border-transparent p-6 md:p-7 relative overflow-hidden mb-4">
          <BookOpen aria-hidden className="absolute -right-8 -bottom-8 h-44 w-44 opacity-15" strokeWidth={1.25} />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">Study</p>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mt-0.5">
              {editingId ? '编辑学习' : '发布学习'}
            </h1>
            <p className="text-sm opacity-75 mt-1">
              先写课程，我们帮你看看同课的同学是不是已经组好了
            </p>
          </div>
        </Card>

        <Card bento className="p-5 md:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldGroup label="课程名" icon={BookOpen} required>
              <Input
                placeholder="例如：高等数学 B"
                value={form.course_name}
                onChange={(e) => setKey('course_name', e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="学科" icon={GraduationCap}>
              <ChipRow
                items={SUBJECTS.map((s) => ({ value: s.badge, label: s.name }))}
                value={form.subject}
                onChange={(v) => setKey('subject', v)}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="组队描述" icon={Edit3} required>
            <Input
              placeholder="比如：每天9点到馆+互相抽查"
              maxLength={40}
              value={form.title}
              onChange={(e) => setKey('title', e.target.value)}
            />
          </FieldGroup>

          <FieldGroup label="学习目标" icon={Target}>
            <textarea
              value={form.group_target}
              onChange={(e) => setKey('group_target', e.target.value)}
              maxLength={100}
              placeholder="比如：30 天内过完所有章节"
              className="w-full min-h-[88px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </FieldGroup>

          <FieldGroup label="学习时间" icon={Clock3}>
            <DateTimeRow
              date={form.date}
              time={form.time}
              onDate={(v) => setKey('date', v)}
              onTime={(v) => setKey('time', v)}
            />
          </FieldGroup>

          <FieldGroup label="地点" icon={MapPin}>
            <ChipRow
              items={LOCATIONS}
              value={form.meet_location}
              onChange={(v) => setKey('meet_location', v)}
            />
          </FieldGroup>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldGroup label="人数" icon={Users}>
              <NumberRow items={[2, 3, 4, 5, 6, 8]} value={form.total_num} onChange={(v) => setKey('total_num', v)} />
            </FieldGroup>
            <FieldGroup label="性别偏好" icon={Users}>
              <ChipRow items={GENDER_PREFS} value={form.gender_pref} onChange={(v) => setKey('gender_pref', v)} />
            </FieldGroup>
          </div>
        </Card>

        {!editingId && cands.length > 0 && (
          <MatchCandidatesPanel
            items={cands}
            type="group"
            proceeded={proceeded}
            onJoin={(c) => nav.navigateTo({ url: `/pages/detail-study/detail-study?id=${c.room_id}` })}
            onProceed={() => setProceeded(true)}
          />
        )}

        <div className="sticky bottom-0 left-0 right-0 -mx-4 md:-mx-8 mt-6 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)] px-4 md:px-8 bg-gradient-to-t from-background to-background/0">
          <Button
            size="lg"
            variant="cta"
            disabled={loading}
            onClick={submit}
            className="w-full h-12 text-base"
          >
            {loading ? '发布中…' : editingId ? '保存修改' : '开始 Match'}
          </Button>
        </div>
      </div>
    </div>
  );
}
