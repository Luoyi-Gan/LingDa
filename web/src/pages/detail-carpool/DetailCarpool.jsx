// UI 重做 Phase 6：DetailCarpool —— t-sky 主调 + 共用 Detail 原语
import { useEffect, useState, useRef } from 'react';
import {
  Car,
  Clock3,
  DollarSign,
  Users,
  Star,
  Pencil,
  Trash2,
  LogOut,
  MapPin,
  Target,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { toCountdown } from '../../lib/time';
import { useUI } from '../../context/UIContext';
import { useWxNav, useQueryOptions } from '../../lib/nav';
import { useAuth } from '../../context/AuthContext';
import NavBar from '../../components/NavBar';
import EvaluatePanel from '../../components/EvaluatePanel';
import { Button } from '../../components/ui/button';
import {
  DetailHero,
  DetailSection,
  InfoRow,
  CreatorCard,
  MemberGrid,
  PillRow,
} from '../../components/detail/DetailShared';

export default function DetailCarpool() {
  const options = useQueryOptions();
  const { showToast, showModal } = useUI();
  const nav = useWxNav();
  const roomId = Number(options.id);

  const [room, setRoom] = useState({});
  const [creator, setCreator] = useState({});
  const [members, setMembers] = useState([]);
  const [emptyCount, setEmptyCount] = useState(0);
  const [requirements, setRequirements] = useState([]);
  const [joinLabel, setJoinLabel] = useState('申请加入');
  const [joinDisabled, setJoinDisabled] = useState(false);
  const [myStatus, setMyStatus] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [canEvaluate, setCanEvaluate] = useState(false);
  const [evalTargets, setEvalTargets] = useState([]);
  const { currentUser } = useAuth() || {};
  const authUserRef = useRef();
  authUserRef.current = currentUser?.user_id;
  const roomRef = useRef({});
  roomRef.current = room;
  const joinDisabledRef = useRef(false);
  joinDisabledRef.current = joinDisabled;

  const computeJoinState = (r, me) => {
    if (me && me.is_owner) return { joinLabel: '我发起的', joinDisabled: true };
    if (me && me.status === 'approved')
      return { joinLabel: '已加入', joinDisabled: true };
    if (me && me.status === 'pending')
      return { joinLabel: '等待车主同意', joinDisabled: true };
    if (r.status === 'full' || r.status === 'finished' || r.status === 'cancelled') {
      const lbl = r.status === 'full' ? '已满员' : '房间已结束';
      return { joinLabel: lbl, joinDisabled: true };
    }
    return { joinLabel: '申请加入', joinDisabled: false };
  };

  const applyDetail = (d) => {
    const r = d.room || {};
    const c = d.creator || {};
    const ms = (d.members || []).filter((m) => m.status === 'approved');
    const empty = Math.max(0, (r.total_num || 0) - ms.length);
    const me = (d.my_membership || {}).exists ? d.my_membership : null;
    const jd = computeJoinState(r, me);

    setRoom({
      ...r,
      meet_label: r.meet_time_label || '',
      countdown: r.meet_time ? toCountdown(r.meet_time) : '',
    });
    setCreator(c);
    setMembers(ms);
    setEmptyCount(empty);
    setRequirements(r.tags || []);
    setJoinLabel(jd.joinLabel);
    setJoinDisabled(jd.joinDisabled);
    setMyStatus(me ? me.status : '');
    setIsOwner(me ? !!me.is_owner : false);
    setCanEvaluate(!!d.can_evaluate);
    const myUid = authUserRef.current;
    setEvalTargets(
      (d.members || []).filter(
        (m) => m.status === 'approved' && m.user_id !== myUid,
      ),
    );
  };

  const load = () => {
    api.rooms.detail(roomId).then(applyDetail).catch(() => {});
  };

  useEffect(() => {
    if (authLib.requireLogin()) return;
    if (roomId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doApply = (body) => {
    api.members
      .apply(roomId, body)
      .then((res) => {
        showToast({
          title: res.status === 'approved' ? '已加入' : '申请已提交',
          icon: 'success',
        });
        load();
      })
      .catch(() => {});
  };

  const join = () => {
    if (joinDisabledRef.current) return;
    const r = roomRef.current;
    if (r.join_rule === 'password') {
      showModal({
        title: '加入口令',
        editable: true,
        placeholderText: '请输入车主设置的加入口令',
        confirmText: '加入',
      }).then((res) => {
        if (res.confirm) doApply({ joinPassword: res.content });
      });
      return;
    }
    showModal({
      title: '申请加入',
      content: r.join_rule === 'audit' ? '车主同意后自动加入' : '点击确认后立即加入',
    }).then((res) => {
      if (res.confirm) doApply({});
    });
  };

  const leave = () => {
    showModal({
      title: '退出队伍',
      content: '退出后你的名额将释放，确定退出？',
      confirmText: '退出',
      confirmColor: '#F59E0B',
    }).then((res) => {
      if (!res.confirm) return;
      api.members.leave(roomId).then(() => {
        showToast({ title: '已退出队伍', icon: 'success' });
        setTimeout(() => nav.switchTab({ url: '/pages/hall/hall' }), 500);
      }).catch(() => {});
    });
  };

  const canLeave =
    myStatus === 'approved' && !isOwner && room.status !== 'finished' && room.status !== 'cancelled';
  const canEdit =
    isOwner && room.status !== 'finished' && room.status !== 'cancelled';

  const goEdit = () =>
    nav.navigateTo({ url: `/pages/form-carpool/form-carpool?edit=${roomId}` });

  const onDelete = () => {
    showModal({
      title: '删除帖子',
      content: '删除后无法恢复，已加入的成员名额会被释放。',
      confirmText: '删除',
      confirmColor: '#F59E0B',
    }).then((res) => {
      if (!res.confirm) return;
      api.rooms.cancel(roomId).then(() => {
        showToast({ title: '已删除', icon: 'success' });
        setTimeout(() => nav.switchTab({ url: '/pages/posts/posts' }), 500);
      }).catch(() => {});
    });
  };

  return (
    <div className="relative min-h-screen pb-32 md:pb-12">
      <NavBar title="拼车详情" />
      <div className="relative mx-auto w-full max-w-[860px] px-4 pt-4 md:px-8 md:pt-6">
        <DetailHero
          tint="t-sky"
          icon={Car}
          tag="CARPOOL"
          title={`${room.start_location || ''} → ${room.end_location || ''}`}
          countdown={room.countdown}
          meetLabel={room.meet_label}
          total={room.total_num}
          current={room.current_num}
        />

        {canEvaluate && (
          <EvaluatePanel roomId={roomId} targets={evalTargets} onDone={load} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-4">
          <DetailSection title="行程信息">
            <InfoRow icon={MapPin} label="出发地" value={room.start_location} />
            <InfoRow icon={Target} label="目的地" value={room.end_location} />
            <InfoRow icon={Clock3} label="出发时间" value={room.meet_label} />
            <InfoRow icon={Car} label="车型" value={room.car_type} />
            <InfoRow
              icon={DollarSign}
              label="人均"
              value={room.cost_split != null ? `¥${room.cost_split}` : null}
            />
          </DetailSection>

          <DetailSection title="车主">
            <CreatorCard creator={creator} roleLabel="车主" />
          </DetailSection>
        </div>

        {requirements.length > 0 && (
          <DetailSection title="车主要求" className="mb-4">
            <PillRow items={requirements} />
          </DetailSection>
        )}

        <DetailSection
          title="成员"
          icon={Users}
          action={
            <span className="text-xs font-bold tabular-nums text-foreground">
              {room.current_num}/{room.total_num}
            </span>
          }
        >
          <MemberGrid members={members} emptyCount={emptyCount} />
        </DetailSection>

        {/* Footer 操作栏 */}
        <div className="sticky bottom-0 left-0 right-0 -mx-4 md:-mx-8 mt-6 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)] px-4 md:px-8 bg-gradient-to-t from-background via-background/95 to-background/0">
          <div className="flex gap-2">
            <Button variant="ghost" size="lg" className="px-3" aria-label="收藏">
              <Star className="h-5 w-5" />
            </Button>
            {canEdit ? (
              <>
                <Button variant="outline" size="lg" onClick={goEdit} className="flex-1">
                  <Pencil className="h-4 w-4" />
                  编辑
                </Button>
                <Button variant="destructive" size="lg" onClick={onDelete} className="flex-1">
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
              </>
            ) : canLeave ? (
              <Button variant="destructive" size="lg" onClick={leave} className="flex-1">
                <LogOut className="h-4 w-4" />
                退出队伍
              </Button>
            ) : (
              <Button
                variant="cta"
                size="lg"
                onClick={join}
                disabled={joinDisabled}
                className="flex-1"
              >
                {joinLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
