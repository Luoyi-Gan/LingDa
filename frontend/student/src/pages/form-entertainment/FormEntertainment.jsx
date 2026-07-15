import { useEffect, useState } from 'react';
import {
  Sparkles,
  Clock3,
  MapPin,
  Users,
  Tag,
  StickyNote,
  Edit3,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useUI } from '../../context/UIContext';
import { useWxNav, useQueryOptions } from '../../lib/nav';
import NavBar from '../../components/NavBar';
import MatchCandidatesPanel from '../../components/MatchCandidatesPanel';
import PlaceAutocomplete from '../../components/PlaceAutocomplete';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  FieldGroup,
  ChipRow,
  NumberRow,
  DateTimeRow,
} from '../../components/form/FormShared';
import { cn } from '../../lib/cn';

import { entTypeIcon } from '../../lib/iconMap';

const ENT_TYPES = [
  { name: '演唱会', color: '#FF6B95' },
  { name: '剧本杀', color: '#9C5BA0' },
  { name: 'KTV', color: '#FF8E53' },
  { name: '密室', color: '#FF2D55' },
  { name: '观影', color: '#0A84FF' },
  { name: '展览', color: '#BF5AF2' },
  { name: '游戏', color: '#5E5CE6' },
  { name: '聚餐', color: '#FF9500' },
  { name: '其他', color: '#34C759' },
];
const AVAILABLE_TAGS = ['周末', '周中', '通宵', '小白友好', '硬核', '拍照', '夜场', '同校优先'];
const GENDER_PREFS = [
  { value: 'any', label: '不限' },
  { value: 'same', label: '仅同性' },
  { value: 'opposite_ok', label: '异性可' },
];

export default function FormEntertainment() {
  const { showToast } = useUI();
  const nav = useWxNav();
  const options = useQueryOptions();
  const editingId = options.edit ? Number(options.edit) : null;
  const [form, setForm] = useState({
    ent_type: '',
    title: '',
    date: '',
    time: '',
    location: '',
    total_num: 4,
    cost: '',
    tags: [],
    gender_pref: 'any',
    content: '',
  });
  const [loading, setLoading] = useState(false);
  const [cands, setCands] = useState([]);
  const [proceeded, setProceeded] = useState(false);

  useEffect(() => {
    authLib.requireLogin();
  }, []);

  useEffect(() => {
    if (editingId) return;
    if (!form.ent_type || !form.date || !form.time) {
      setCands([]);
      return;
    }
    const t = setTimeout(() => {
      const meetTime = new Date(`${form.date}T${form.time}:00`).toISOString();
      api.rooms
        .matchEntertainment({
          entType: form.ent_type,
          meetTime,
          meetLocation: form.location || undefined,
          title: form.title || undefined,
        })
        .then((res) => setCands(res.list || []))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [form.ent_type, form.date, form.time, form.location, form.title, editingId]);

  useEffect(() => {
    if (!editingId) return;
    api.rooms
      .detail(editingId)
      .then((d) => {
        const r = d.room || {};
        setForm({
          ent_type: r.ent_type || '',
          title: r.title || '',
          date: r.meet_time ? r.meet_time.slice(0, 10) : '',
          time: r.meet_time ? r.meet_time.slice(11, 16) : '',
          location: r.meet_location || '',
          total_num: r.total_num || 4,
          cost: r.cost != null ? String(r.cost) : '',
          tags: Array.isArray(r.tags) ? r.tags : [],
          gender_pref: 'any',
          content: r.content || '',
        });
      })
      .catch(() => {});
  }, [editingId]);

  const setKey = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const submit = () => {
    const f = form;
    if (!f.ent_type) {
      showToast({ title: '请选择活动类型', icon: 'none' });
      return;
    }
    if (!f.title) {
      showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!f.date || !f.time) {
      showToast({ title: '请选择时间', icon: 'none' });
      return;
    }
    const meetTime = new Date(`${f.date}T${f.time}:00`).toISOString();
    const payload = {
      title: f.title,
      content: f.content || undefined,
      totalNum: Number(f.total_num) || 4,
      meetTime,
      meetLocation: f.location || undefined,
      joinRule: 'direct',
      tags: f.tags && f.tags.length ? f.tags : undefined,
      entType: f.ent_type,
      cost: f.cost ? Number(f.cost) : undefined,
    };

    setLoading(true);
    const promise = editingId
      ? api.rooms.updateEntertainment(editingId, payload)
      : api.rooms.createEntertainment(payload);
    promise
      .then((res) => {
        showToast({ title: editingId ? '已更新' : '发布成功', icon: 'success' });
        const id = editingId || res.room_id;
        setTimeout(() => {
          nav.redirectTo({
            url: `/pages/detail-entertainment/detail-entertainment?id=${id}`,
          });
        }, 500);
      })
      .catch(() => {})
      .then(() => setLoading(false));
  };

  return (
    <div className="relative min-h-screen bg-[#F7F9FC] pb-32 md:pb-12">
      <NavBar title={editingId ? '编辑娱乐' : '发布娱乐'} />
      <div className="relative mx-auto w-full max-w-[860px] px-4 pt-4 md:px-8 md:pt-6">
        <Card bento className="relative mb-4 overflow-hidden border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="absolute right-5 top-5 hidden h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-700 md:flex">
            <Sparkles aria-hidden className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Entertainment</p>
            <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              {editingId ? '编辑娱乐' : '发布娱乐'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              选个活动类型，填好时间和地点，我们顺便看看有没有现成的群可以蹭
            </p>
          </div>
        </Card>

        <Card bento className="space-y-5 border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <FieldGroup label="活动类型" icon={Sparkles} required>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2.5">
              {ENT_TYPES.map((item) => {
                const on = form.ent_type === item.name;
                const Icon = entTypeIcon(item.name);
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setKey('ent_type', item.name)}
                      className={cn(
                      'group flex flex-col items-center gap-1.5 rounded-lg border p-3 transition',
                      on
                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-slate-200 bg-white hover:bg-slate-50',
                    )}
                  >
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: on ? item.color : `${item.color}1a`,
                        color: on ? '#fff' : item.color,
                      }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <span className="text-xs font-semibold">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          <FieldGroup label="一句话描述" icon={Edit3} required>
            <Input
              maxLength={40}
              placeholder="比如：周日想看场IMAX"
              value={form.title}
              onChange={(e) => setKey('title', e.target.value)}
            />
          </FieldGroup>

          <FieldGroup label="活动时间" icon={Clock3} required>
            <DateTimeRow
              date={form.date}
              time={form.time}
              onDate={(v) => setKey('date', v)}
              onTime={(v) => setKey('time', v)}
            />
          </FieldGroup>

          <FieldGroup label="地点" icon={MapPin}>
            <PlaceAutocomplete
              placeholder="例如：万达影城"
              value={form.location}
              onChange={(v) => setKey('location', v)}
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

          <FieldGroup label="标签" icon={Tag}>
            <ChipRow
              items={AVAILABLE_TAGS.map((t) => ({ value: t, label: `#${t}` }))}
              value={form.tags}
              onChange={(v) => setKey('tags', v)}
              multi
            />
          </FieldGroup>

          <FieldGroup label="补充说明" icon={StickyNote}>
            <textarea
              value={form.content}
              onChange={(e) => setKey('content', e.target.value)}
              maxLength={80}
              placeholder="比如：有提前买票 / 想找会拍照的搭子"
              className="min-h-[88px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </FieldGroup>
        </Card>

        {!editingId && cands.length > 0 && (
          <MatchCandidatesPanel
            items={cands}
            type="entertainment"
            proceeded={proceeded}
            onJoin={(c) => nav.redirectTo({ url: `/pages/detail-entertainment/detail-entertainment?id=${c.room_id}` })}
            onProceed={() => setProceeded(true)}
          />
        )}

        <div className="sticky bottom-0 left-0 right-0 -mx-4 mt-6 bg-[#F7F9FC]/92 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 backdrop-blur md:-mx-8 md:px-8">
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
