import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  Film,
  Flag,
  LogOut,
  MapPin,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useUI } from '../../context/UIContext';
import { useWxNav } from '../../lib/nav';
import { getStudySubtitle } from '../../lib/study';
import {
  AppPage,
  EmptyPanel,
  LineButton,
  PageHeader,
  SectionHeader,
  SectionSurface,
  SegmentedTabs,
  TypeBadge,
} from '../../components/layout/AppScaffold';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';

const DETAIL_PATH = {
  carpool: '/pages/detail-carpool/detail-carpool',
  entertainment: '/pages/detail-entertainment/detail-entertainment',
  group: '/pages/detail-study/detail-study',
  study: '/pages/detail-study/detail-study',
};

const TABS = [
  { key: 'ongoing', label: '进行中', icon: Clock3 },
  { key: 'completed', label: '已完成', icon: CheckCircle2 },
];

const APP_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已加入' },
  { key: 'rejected', label: '已婉拒' },
  { key: 'left', label: '已退出' },
];

export default function MyTeams() {
  const nav = useWxNav();
  const { showModal, showToast } = useUI();
  const [tab, setTab] = useState('ongoing');
  const [rooms, setRooms] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [applications, setApplications] = useState([]);
  const [appFilter, setAppFilter] = useState('all');
  const [loaded, setLoaded] = useState({
    ongoing: false,
    completed: false,
    applications: false,
  });

  const loadRooms = useCallback((phase = 'ongoing') => {
    setLoaded((s) => ({ ...s, [phase]: false }));
    api.users
      .myRooms({ phase, page: 1, pageSize: 50 })
      .then((res) => {
        if (phase === 'completed') setCompleted(res.list || []);
        else setRooms(res.list || []);
      })
      .catch(() => {})
      .finally(() => setLoaded((s) => ({ ...s, [phase]: true })));
  }, []);

  const loadApplications = useCallback((status = 'all') => {
    setLoaded((s) => ({ ...s, applications: false }));
    const query = { page: 1, pageSize: 50 };
    if (status !== 'all') query.status = status;
    api.users
      .myApplications(query)
      .then((res) => setApplications(res.list || []))
      .catch(() => {})
      .finally(() => setLoaded((s) => ({ ...s, applications: true })));
  }, []);

  useEffect(() => {
    if (authLib.requireLogin()) return;
    loadRooms('ongoing');
    loadRooms('completed');
    loadApplications('all');
  }, [loadApplications, loadRooms]);

  const activeList = tab === 'completed' ? completed : rooms;
  const stats = useMemo(
    () => ({
      ongoing: rooms.length,
      completed: completed.length,
      pending: applications.filter((x) => x.status === 'pending').length,
    }),
    [applications, completed.length, rooms.length],
  );

  const openTeam = (room) => {
    const type = getRoomType(room);
    nav.navigateTo({ url: `${DETAIL_PATH[type] || DETAIL_PATH.group}?id=${getRoomId(room)}` });
  };

  const leaveTeam = (e, room) => {
    e.stopPropagation();
    const isOwner = room.role === 'owner';
    showModal({
      title: isOwner ? '结束并解散' : '退出队伍',
      content: isOwner
        ? `这会把「${room.title}」标记为已结束，所有成员将无法继续加入，确定？`
        : `这会把你从「${room.title}」中移除，名额释放给其他搭子，确定？`,
      confirmText: isOwner ? '结束' : '退队',
      confirmColor: '#2563EB',
    }).then((res) => {
      if (!res.confirm) return;
      const request = isOwner
        ? api.rooms.finish(getRoomId(room))
        : api.members.leave(getRoomId(room));
      request
        .then(() => {
          showToast({ title: isOwner ? '已结束' : '已退队', icon: 'success' });
          loadRooms('ongoing');
          loadRooms('completed');
        })
        .catch(() => {});
    });
  };

  const changeAppFilter = (key) => {
    setAppFilter(key);
    loadApplications(key);
  };

  return (
    <AppPage
      aside={<TeamsAside stats={stats} onCreate={() => window.dispatchEvent(new CustomEvent('lingda:publish'))} />}
    >
      <PageHeader
        eyebrow="Teams"
        title="我的组队"
        subtitle="集中管理你发起、加入和申请过的所有队伍。"
        action={
          <LineButton onClick={() => window.dispatchEvent(new CustomEvent('lingda:publish'))}>
            <Plus className="h-4 w-4" />
            发起组队
          </LineButton>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SegmentedTabs items={TABS} value={tab} onChange={setTab} />
      </div>

      <section className="space-y-3">
        <SectionHeader
          title={TABS.find((x) => x.key === tab)?.label}
          subtitle={
            tab === 'completed'
              ? '已经结束的队伍会沉淀在这里。'
              : '正在招募或进行中的队伍。'
          }
        />
        <SectionSurface>
          {!loaded[tab] && <TeamSkeleton />}
          {loaded[tab] && activeList.length === 0 && (
            <EmptyPanel
              icon={Users}
              text="这里还没有队伍"
            />
          )}
          {loaded[tab] &&
            activeList.map((room) => (
              <TeamRow
                key={getRoomId(room)}
                room={room}
                completed={tab === 'completed'}
                onOpen={() => openTeam(room)}
                onLeave={(e) => leaveTeam(e, room)}
              />
            ))}
        </SectionSurface>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="我的申请"
          subtitle="你提交过的加入申请会留在这里，待审核、已加入和被婉拒都能统一查看。"
          action={
            <div className="hidden gap-2 md:flex">
              {APP_FILTERS.map((item) => (
                <FilterButton
                  key={item.key}
                  active={appFilter === item.key}
                  onClick={() => changeAppFilter(item.key)}
                >
                  {item.label}
                </FilterButton>
              ))}
            </div>
          }
        />
        <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
          {APP_FILTERS.map((item) => (
            <FilterButton
              key={item.key}
              active={appFilter === item.key}
              onClick={() => changeAppFilter(item.key)}
            >
              {item.label}
            </FilterButton>
          ))}
        </div>
        <SectionSurface>
          {!loaded.applications && <TeamSkeleton />}
          {loaded.applications && applications.length === 0 && (
            <EmptyPanel icon={Search} text="还没有申请记录" />
          )}
          {loaded.applications &&
            applications.map((app) => (
              <ApplicationRow
                key={app.memberId || app.member_id || `${getRoomId(app)}-${app.status}`}
                app={app}
                onOpen={() => openTeam(app)}
              />
            ))}
        </SectionSurface>
      </section>
    </AppPage>
  );
}

function TeamRow({ room, completed, onOpen, onLeave }) {
  const meta = typeMeta(getRoomType(room));
  const Icon = meta.icon;
  const current = room.currentNum ?? room.current_num;
  const total = room.totalNum ?? room.total_num;
  const isStudy = getRoomType(room) === 'group' || getRoomType(room) === 'study';
  return (
    <div
      className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-4 transition last:border-b-0 hover:bg-slate-50"
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 items-start gap-3 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        <span className={cn('mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', meta.soft, meta.text)}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-950">{room.title}</h3>
            <TypeBadge tone={meta.tone}>{meta.label}</TypeBadge>
            {room.role === 'owner' && <TypeBadge tone="slate">房主</TypeBadge>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {isStudy ? (
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                {getStudySubtitle(room)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {formatTime(room.meetTime || room.meet_time)}
              </span>
            )}
            {!isStudy && (room.meetLocation || room.meet_location || room.start_location) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {room.meetLocation || room.meet_location || room.start_location}
              </span>
            )}
            {total != null && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {current ?? 0}/{total} 人
              </span>
            )}
          </div>
        </div>
      </button>
      {!completed && (
        <button
          type="button"
          onClick={onLeave}
          className="self-center rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
        >
          {room.role === 'owner' ? '结束' : '退队'}
        </button>
      )}
    </div>
  );
}

function ApplicationRow({ app, onOpen }) {
  const meta = typeMeta(getRoomType(app));
  const status = statusMeta(app.status);
  const isStudy = getRoomType(app) === 'group' || getRoomType(app) === 'study';
  const current = app.currentNum ?? app.current_num;
  const total = app.totalNum ?? app.total_num;
  const requirement = app.requireSkill || app.require_skill;
  const roomStatus = roomStatusMeta(app.roomStatus || app.room_status);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full gap-4 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50 md:grid-cols-[1fr_auto]"
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-950">{app.title}</span>
          <TypeBadge tone={meta.tone}>{meta.label}</TypeBadge>
          {roomStatus && <TypeBadge tone={roomStatus.tone}>{roomStatus.label}</TypeBadge>}
        </span>
        <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatTime(app.joinTime || app.join_time || app.applied_at)}
          </span>
          {isStudy ? (
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {getStudySubtitle(app)}
            </span>
          ) : (app.meetLocation || app.meet_location) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {app.meetLocation || app.meet_location}
            </span>
          )}
          {total != null && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {current ?? 0}/{total} 人
            </span>
          )}
        </span>
        {isStudy && requirement && (
          <span className="mt-2 line-clamp-2 block text-xs leading-5 text-slate-500">
            组员要求：{requirement}
          </span>
        )}
      </span>
      <span className={cn('self-start rounded-full px-2.5 py-1 text-xs font-semibold md:self-center', status.className)}>
        {status.label}
      </span>
    </button>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-200 bg-white text-slate-500 hover:text-blue-700',
      )}
    >
      {children}
    </button>
  );
}

function TeamsAside({ stats, onCreate }) {
  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-heading text-base font-bold text-slate-950">组队概览</h3>
        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 text-center">
          <MiniStat label="进行中" value={stats.ongoing} />
          <MiniStat label="已完成" value={stats.completed} />
          <MiniStat label="待审核" value={stats.pending} />
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-heading text-base font-bold text-slate-950">快捷动作</h3>
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          发起组队
        </button>
      </section>
    </>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <div className="font-heading text-xl font-bold tabular-nums text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function TeamSkeleton() {
  return [0, 1, 2].map((i) => (
    <div key={i} className="border-b border-slate-100 p-4 last:border-b-0">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-3 h-4 w-2/3" />
    </div>
  ));
}

function typeMeta(type) {
  const key = type === 'group' ? 'study' : type;
  if (key === 'carpool') {
    return { icon: Car, label: '拼车', tone: 'blue', soft: 'bg-blue-50', text: 'text-blue-700' };
  }
  if (key === 'entertainment') {
    return { icon: Film, label: '娱乐', tone: 'orange', soft: 'bg-orange-50', text: 'text-orange-700' };
  }
  return { icon: BookOpen, label: '课程组队', tone: 'green', soft: 'bg-emerald-50', text: 'text-emerald-700' };
}

function getRoomId(room) {
  return room.roomId ?? room.room_id;
}

function getRoomType(room) {
  return room.roomType || room.room_type || room.type || 'group';
}

function statusMeta(status) {
  const map = {
    pending: { label: '待审核', className: 'bg-amber-50 text-amber-700' },
    approved: { label: '已加入', className: 'bg-emerald-50 text-emerald-700' },
    rejected: { label: '已婉拒', className: 'bg-rose-50 text-rose-700' },
    left: { label: '已退出', className: 'bg-slate-100 text-slate-500' },
  };
  return map[status] || { label: status || '未知', className: 'bg-slate-100 text-slate-500' };
}

function roomStatusMeta(status) {
  const map = {
    open: { label: '招募中', tone: 'green' },
    full: { label: '已满员', tone: 'slate' },
    finished: { label: '已完成', tone: 'slate' },
    cancelled: { label: '已取消', tone: 'slate' },
  };
  return map[status] || null;
}

function formatTime(value) {
  if (!value) return '时间待定';
  try {
    return new Date(value).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}
