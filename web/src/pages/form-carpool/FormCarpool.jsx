// UI 重做 Phase 5：FormCarpool —— t-sky 主调 + Bento 重写
import { useEffect, useState } from 'react';
import {
  Car,
  MapPin,
  Clock3,
  Users,
  DollarSign,
  StickyNote,
  Target,
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
import { FieldGroup, ChipRow, NumberRow, DateTimeRow } from '../../components/form/FormShared';

const CAR_TYPES = ['5座轿车', '7座SUV', '不限'];
const GENDER_PREFS = [
  { value: 'any', label: '不限' },
  { value: 'same', label: '仅同性' },
  { value: 'opposite_ok', label: '异性可' },
];

export default function FormCarpool() {
  const { showToast } = useUI();
  const nav = useWxNav();
  const options = useQueryOptions();
  const editingId = options.edit ? Number(options.edit) : null;
  const [form, setForm] = useState({
    start_location: '',
    end_location: '',
    date: '',
    time: '',
    car_type: '不限',
    total_num: 4,
    cost_split: '',
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
    if (!form.start_location || !form.end_location || !form.date || !form.time) {
      setCands([]);
      return;
    }
    const t = setTimeout(() => {
      const meetTime = new Date(`${form.date}T${form.time}:00`).toISOString();
      api.rooms
        .matchCarpool({
          startLocation: form.start_location,
          endLocation: form.end_location,
          meetTime,
        })
        .then((res) => setCands(res.list || []))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [form.start_location, form.end_location, form.date, form.time, editingId]);

  useEffect(() => {
    if (!editingId) return;
    api.rooms
      .detail(editingId)
      .then((d) => {
        const r = d.room || {};
        setForm({
          start_location: r.start_location || '',
          end_location: r.end_location || '',
          date: r.meet_time ? r.meet_time.slice(0, 10) : '',
          time: r.meet_time ? r.meet_time.slice(11, 16) : '',
          car_type: r.car_type || '不限',
          total_num: r.total_num || 4,
          cost_split: r.cost_split != null ? String(r.cost_split) : '',
          gender_pref: 'any',
          content: r.content || '',
        });
      })
      .catch(() => {});
  }, [editingId]);

  const setKey = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const submit = () => {
    const f = form;
    if (!f.start_location || !f.end_location) {
      showToast({ title: '请填写出发地和目的地', icon: 'none' });
      return;
    }
    if (!f.date || !f.time) {
      showToast({ title: '请选择出发时间', icon: 'none' });
      return;
    }
    const meetTime = new Date(`${f.date}T${f.time}:00`).toISOString();
    const payload = {
      title: `${f.start_location} → ${f.end_location}`,
      content: f.content || undefined,
      totalNum: Number(f.total_num) || 4,
      meetTime,
      meetLocation: f.start_location,
      joinRule: 'direct',
      startLocation: f.start_location,
      endLocation: f.end_location,
      carType: f.car_type === '不限' ? undefined : f.car_type,
      costSplit: f.cost_split ? Number(f.cost_split) : undefined,
    };

    setLoading(true);
    const promise = editingId
      ? api.rooms.updateCarpool(editingId, payload)
      : api.rooms.createCarpool(payload);
    promise
      .then((res) => {
        showToast({ title: editingId ? '已更新' : '发布成功', icon: 'success' });
        const id = editingId || res.room_id;
        setTimeout(() => {
          nav.redirectTo({ url: `/pages/detail-carpool/detail-carpool?id=${id}` });
        }, 500);
      })
      .catch(() => {})
      .then(() => setLoading(false));
  };

  return (
    <div className="relative min-h-screen pb-32 md:pb-12">
      <NavBar title={editingId ? '编辑拼车' : '发布拼车'} />
      <div className="relative mx-auto w-full max-w-[860px] px-4 pt-4 md:px-8 md:pt-6">
        {/* Hero —— t-sky + Car 简笔 */}
        <Card bento className="t-sky border-transparent p-6 md:p-7 relative overflow-hidden mb-4">
          <Car aria-hidden className="absolute -right-8 -bottom-8 h-44 w-44 opacity-15" strokeWidth={1.25} />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">Carpool</p>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mt-0.5">
              {editingId ? '编辑拼车' : '发布拼车'}
            </h1>
            <p className="text-sm opacity-75 mt-1">
              起点 / 终点 / 时间填齐，我们顺便看看有没有现成可以并的车
            </p>
          </div>
        </Card>

        {/* 字段卡片 */}
        <Card bento className="p-5 md:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldGroup label="出发地" icon={MapPin} required>
              <PlaceAutocomplete
                placeholder="例如：学校南门"
                value={form.start_location}
                onChange={(v) => setKey('start_location', v)}
              />
            </FieldGroup>
            <FieldGroup label="目的地" icon={Target} required>
              <PlaceAutocomplete
                placeholder="例如：虹桥火车站"
                value={form.end_location}
                onChange={(v) => setKey('end_location', v)}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="出发时间" icon={Clock3} required>
            <DateTimeRow
              date={form.date}
              time={form.time}
              onDate={(v) => setKey('date', v)}
              onTime={(v) => setKey('time', v)}
            />
          </FieldGroup>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldGroup label="车型" icon={Car}>
              <ChipRow items={CAR_TYPES} value={form.car_type} onChange={(v) => setKey('car_type', v)} />
            </FieldGroup>
            <FieldGroup label="总人数" icon={Users}>
              <NumberRow items={[2, 3, 4, 5, 6, 7]} value={form.total_num} onChange={(v) => setKey('total_num', v)} />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldGroup label="人均费用" icon={DollarSign}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.cost_split}
                  onChange={(e) => setKey('cost_split', e.target.value)}
                  className="pl-7 pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/ 人</span>
              </div>
            </FieldGroup>
            <FieldGroup label="性别偏好" icon={Users} hint="同性偏好将仅向同性别用户展示">
              <ChipRow items={GENDER_PREFS} value={form.gender_pref} onChange={(v) => setKey('gender_pref', v)} />
            </FieldGroup>
          </div>

          <FieldGroup label="补充说明" icon={StickyNote}>
            <textarea
              value={form.content}
              onChange={(e) => setKey('content', e.target.value)}
              maxLength={80}
              placeholder="行李多 / 习惯前排 / 顺路点等..."
              className="w-full min-h-[88px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </FieldGroup>
        </Card>

        {!editingId && cands.length > 0 && (
          <MatchCandidatesPanel
            items={cands}
            type="carpool"
            proceeded={proceeded}
            onJoin={(c) => nav.navigateTo({ url: `/pages/detail-carpool/detail-carpool?id=${c.room_id}` })}
            onProceed={() => setProceeded(true)}
          />
        )}

        {/* 提交栏 */}
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
