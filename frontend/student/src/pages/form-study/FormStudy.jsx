import { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  ClipboardList,
  Edit3,
  GraduationCap,
  Hash,
  Target,
  UserCheck,
  Users,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import {
  buildStudyContent,
  buildStudyRequirementSummary,
  buildStudyTags,
  buildStudyTitle,
  getStudyMeta,
} from '../../lib/study';
import { useUI } from '../../context/UIContext';
import { useWxNav, useQueryOptions } from '../../lib/nav';
import NavBar from '../../components/NavBar';
import MatchCandidatesPanel from '../../components/MatchCandidatesPanel';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FieldGroup, ChipRow, NumberRow } from '../../components/form/FormShared';

const GPA_PRESETS = ['不限', '3.0+', '3.3+', '3.5+', '3.7+'];
const YEAR_PRESETS = ['不限', '大一', '大二', '大三', '大四', '研究生'];
const SKILL_PRESETS = [
  '认真负责',
  '会写文档',
  '会做展示',
  '会编程',
  '沟通稳定',
  '按时交付',
  '英语好',
  '数据分析',
];

export default function FormStudy() {
  const { showToast } = useUI();
  const nav = useWxNav();
  const options = useQueryOptions();
  const editingId = options.edit ? Number(options.edit) : null;
  const [form, setForm] = useState({
    course_code: '',
    course_name: '',
    task_goal: '',
    total_num: 4,
    gpa_requirement: '',
    year_requirement: '不限',
    major_requirement: '',
    skills: [],
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [cands, setCands] = useState([]);
  const [proceeded, setProceeded] = useState(false);

  useEffect(() => {
    authLib.requireLogin();
  }, []);

  useEffect(() => {
    if (editingId) return undefined;
    if (!form.course_name && !form.course_code) {
      setCands([]);
      return undefined;
    }
    const t = setTimeout(() => {
      api.rooms
        .matchGroup({
          courseName: form.course_name || form.course_code,
        })
        .then((res) => setCands(res.list || []))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [form.course_name, form.course_code, editingId]);

  useEffect(() => {
    if (!editingId) return;
    api.rooms
      .detail(editingId)
      .then((d) => {
        const r = d.room || {};
        const meta = getStudyMeta(r);
        setForm({
          course_code: meta.courseCode || '',
          course_name: meta.courseName || r.course_name || '',
          task_goal: meta.taskGoal || r.group_target || '',
          total_num: r.total_num || 4,
          gpa_requirement: meta.gpaRequirement || '',
          year_requirement: meta.yearRequirement || '不限',
          major_requirement: meta.majorRequirement || '',
          skills: meta.skills || [],
          note: meta.note || '',
        });
      })
      .catch(() => {});
  }, [editingId]);

  const setKey = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const submit = () => {
    const f = {
      ...form,
      course_code: form.course_code.trim(),
      course_name: form.course_name.trim(),
      task_goal: form.task_goal.trim(),
      gpa_requirement: form.gpa_requirement.trim(),
      major_requirement: form.major_requirement.trim(),
      note: form.note.trim(),
    };
    if (!f.course_code) {
      showToast({ title: '请填写课程编号', icon: 'none' });
      return;
    }
    if (!f.course_name) {
      showToast({ title: '请填写课程名称', icon: 'none' });
      return;
    }
    if (!f.task_goal) {
      showToast({ title: '请填写组队任务', icon: 'none' });
      return;
    }
    const hasRequirement =
      (f.gpa_requirement && f.gpa_requirement !== '不限') ||
      (f.year_requirement && f.year_requirement !== '不限') ||
      (f.major_requirement && f.major_requirement !== '不限') ||
      f.skills.length > 0 ||
      !!f.note;
    if (!hasRequirement) {
      showToast({ title: '请至少填写一项组员要求', icon: 'none' });
      return;
    }

    const payload = {
      title: buildStudyTitle(f),
      content: buildStudyContent(f),
      totalNum: Number(f.total_num) || 4,
      joinRule: 'audit',
      courseName: f.course_name,
      groupTarget: f.task_goal,
      requireSkill: buildStudyRequirementSummary(f) || undefined,
      tags: buildStudyTags(f),
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
    <div className="relative min-h-screen bg-[#F7F9FC] pb-32 md:pb-12">
      <NavBar title={editingId ? '编辑课程组队' : '发布课程组队'} />
      <div className="relative mx-auto w-full max-w-[860px] px-4 pt-4 md:px-8 md:pt-6">
        <Card bento className="relative mb-4 overflow-hidden border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="absolute right-5 top-5 hidden h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 md:flex">
            <BookOpen aria-hidden className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Course Team</p>
            <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              {editingId ? '编辑课程组队' : '发布课程组队'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              按课程编号和课程名称找队友，提前说清人数和组员要求。
            </p>
          </div>
        </Card>

        <Card bento className="space-y-5 border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FieldGroup label="课程编号" icon={Hash} required>
              <Input
                placeholder="例如：COMP1021"
                value={form.course_code}
                onChange={(e) => setKey('course_code', e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="课程名称" icon={BookOpen} required>
              <Input
                placeholder="例如：Introduction to Computer Science"
                value={form.course_name}
                onChange={(e) => setKey('course_name', e.target.value)}
              />
            </FieldGroup>
          </div>

          <FieldGroup
            label="组队任务"
            icon={Target}
            required
            hint="说明这门课为什么需要组队，比如课程项目、小组作业、Presentation。"
          >
            <Input
              placeholder="例如：期末项目需要 4 人小组，主要做 Web 应用"
              maxLength={80}
              value={form.task_goal}
              onChange={(e) => setKey('task_goal', e.target.value)}
            />
          </FieldGroup>

          <FieldGroup label="队伍总人数" icon={Users}>
            <NumberRow
              items={[2, 3, 4, 5, 6, 8]}
              value={form.total_num}
              onChange={(v) => setKey('total_num', v)}
            />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FieldGroup label="绩点要求" icon={Award} hint="可选择常用项，也可以自己输入。">
              <div className="space-y-3">
                <ChipRow
                  items={GPA_PRESETS}
                  value={form.gpa_requirement}
                  onChange={(v) => setKey('gpa_requirement', v)}
                />
                <Input
                  placeholder="自定义，例如：3.4 以上 / A- 以上 / 不限"
                  value={form.gpa_requirement}
                  onChange={(e) => setKey('gpa_requirement', e.target.value)}
                />
              </div>
            </FieldGroup>
            <FieldGroup label="年级要求" icon={GraduationCap}>
              <ChipRow
                items={YEAR_PRESETS}
                value={form.year_requirement}
                onChange={(v) => setKey('year_requirement', v)}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="专业 / 学院偏好" icon={UserCheck}>
            <Input
              placeholder="例如：计算机相关优先 / 不限专业 / 商学院优先"
              value={form.major_requirement}
              onChange={(e) => setKey('major_requirement', e.target.value)}
            />
          </FieldGroup>

          <FieldGroup label="能力或角色要求" icon={ClipboardList}>
            <ChipRow
              items={SKILL_PRESETS}
              value={form.skills}
              multi
              onChange={(v) => setKey('skills', v)}
            />
          </FieldGroup>

          <FieldGroup label="补充说明" icon={Edit3}>
            <textarea
              value={form.note}
              onChange={(e) => setKey('note', e.target.value)}
              maxLength={160}
              placeholder="例如：希望每周同步一次进度；有项目经验更好。"
              className="min-h-[88px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </FieldGroup>
        </Card>

        {!editingId && cands.length > 0 && (
          <MatchCandidatesPanel
            items={cands}
            type="group"
            proceeded={proceeded}
            onJoin={(c) => nav.redirectTo({ url: `/pages/detail-study/detail-study?id=${c.room_id}` })}
            onProceed={() => setProceeded(true)}
          />
        )}

        <div className="sticky bottom-0 left-0 right-0 -mx-4 mt-6 bg-[#F7F9FC]/92 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 backdrop-blur md:-mx-8 md:px-8">
          <Button
            size="lg"
            variant="cta"
            disabled={loading}
            onClick={submit}
            className="h-12 w-full text-base"
          >
            {loading ? '发布中…' : editingId ? '保存修改' : '发布课程组队'}
          </Button>
        </div>
      </div>
    </div>
  );
}
