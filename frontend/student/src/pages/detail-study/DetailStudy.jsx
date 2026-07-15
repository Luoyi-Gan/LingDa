// UI 重做 Phase 6：DetailStudy —— t-teal 主调 + 共用 Detail 原语
import { useEffect, useState, useRef } from 'react';
import {
  Award,
  BookOpen,
  Target,
  ClipboardList,
  FileText,
  GraduationCap,
  Hash,
  Users,
  Pencil,
  Trash2,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { toCountdown } from '../../lib/time';
import { getStudyMeta } from '../../lib/study';
import { useUI } from '../../context/UIContext';
import { useWxNav, useQueryOptions } from '../../lib/nav';
import { useAuth } from '../../context/AuthContext';
import NavBar from '../../components/NavBar';
import EvaluatePanel from '../../components/EvaluatePanel';
import FavoriteButton from '../../components/FavoriteButton';
import { Button } from '../../components/ui/button';
import {
  DetailHero,
  DetailSection,
  InfoRow,
  CreatorCard,
  MemberGrid,
  PillRow,
} from '../../components/detail/DetailShared';

export default function DetailStudy({ roomId: roomIdProp, embedded = false, onClose }) {
  const options = useQueryOptions();
  const { showToast, showModal } = useUI();
  const nav = useWxNav();
  const roomId = Number(roomIdProp ?? options.id);

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
      return { joinLabel: '等待组长同意', joinDisabled: true };
    if (['full', 'finished', 'cancelled'].includes(r.status)) {
      return {
        joinLabel: r.status === 'full' ? '已满员' : '房间已结束',
        joinDisabled: true,
      };
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
  }, [roomId]);

  const handleBack = () => {
    if (embedded && onClose) onClose();
    else nav.navigateBack();
  };

  const leaveAfter = () => {
    if (embedded && onClose) onClose();
    else nav.switchTab({ url: '/partners' });
  };

  const doApply = (body) => {
    api.members
      .apply(roomId, { ...body, confirmRequirements: true })
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
    const meta = getStudyMeta(r);
    const conditionLines = [
      meta.gpaRequirement ? `绩点要求：${meta.gpaRequirement}` : '',
      meta.yearRequirement ? `年级要求：${meta.yearRequirement}` : '',
      meta.majorRequirement ? `专业偏好：${meta.majorRequirement}` : '',
      meta.skills?.length ? `能力要求：${meta.skills.join(' / ')}` : '',
      meta.note ? `补充说明：${meta.note}` : '',
    ].filter(Boolean);
    if (conditionLines.length === 0 && r.require_skill) {
      conditionLines.push(`组长要求：${r.require_skill}`);
    }
    const conditionText = conditionLines.length
      ? conditionLines.join('\n')
      : '组长暂未填写额外条件，请确认自己能完成组队任务。';
    if (r.join_rule === 'password') {
      showModal({
        title: '加入口令',
        editable: true,
        content: `申请前请确认你符合以下条件：\n${conditionText}`,
        placeholderText: '请输入组长设置的加入口令',
        confirmText: '加入',
      }).then((res) => {
        if (res.confirm) doApply({ joinPassword: res.content });
      });
      return;
    }
    showModal({
      title: '确认申请条件',
      content:
        `申请前请确认你符合以下条件：\n${conditionText}\n\n` +
        (r.join_rule === 'audit' ? '组长同意后自动加入。' : '点击确认立即加入。'),
      confirmText: r.join_rule === 'audit' ? '确认申请' : '确认加入',
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
        setTimeout(leaveAfter, 500);
      }).catch(() => {});
    });
  };

  const canLeave =
    myStatus === 'approved' && !isOwner && room.status !== 'finished' && room.status !== 'cancelled';
  const canEdit =
    isOwner && room.status !== 'finished' && room.status !== 'cancelled';
  const studyMeta = getStudyMeta(room);

  const goEdit = () =>
    nav.navigateTo({ url: `/pages/form-study/form-study?edit=${roomId}` });

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
        setTimeout(leaveAfter, 500);
      }).catch(() => {});
    });
  };

  return (
    <div className={embedded ? 'relative pb-28' : 'relative min-h-screen pb-32 md:pb-12'}>
      {!embedded && <NavBar title="学习详情" onBack={handleBack} />}
      <div className={embedded ? 'relative mx-auto w-full px-4 pt-4 md:px-5' : 'relative mx-auto w-full max-w-[860px] px-4 pt-4 md:px-8 md:pt-6'}>
        <DetailHero
          tint="t-teal"
          icon={BookOpen}
          tag={studyMeta.courseCode || room.course_name || 'COURSE TEAM'}
          title={room.title}
          countdown=""
          meetLabel="课程组队"
          total={room.total_num}
          current={room.current_num}
        />

        {canEvaluate && (
          <EvaluatePanel roomId={roomId} targets={evalTargets} onDone={load} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-4">
          <DetailSection title="组队信息">
            <InfoRow icon={Hash} label="课程编号" value={studyMeta.courseCode} />
            <InfoRow icon={BookOpen} label="课程名称" value={studyMeta.courseName || room.course_name} />
            <InfoRow icon={Target} label="组队任务" value={studyMeta.taskGoal || room.group_target} />
            <InfoRow icon={Users} label="队伍人数" value={`${room.current_num || 0}/${room.total_num || 0} 人`} />
          </DetailSection>

          <DetailSection title="组长">
            <CreatorCard creator={creator} roleLabel="组长" />
          </DetailSection>
        </div>

        <DetailSection title="组员要求" className="mb-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <InfoRow icon={Award} label="绩点要求" value={studyMeta.gpaRequirement || '不限'} />
            <InfoRow icon={GraduationCap} label="年级要求" value={studyMeta.yearRequirement || '不限'} />
            <InfoRow icon={UserCheck} label="专业偏好" value={studyMeta.majorRequirement || '不限'} />
            <InfoRow icon={ClipboardList} label="能力要求" value={studyMeta.skills?.join(' / ') || room.require_skill || '未填写'} />
          </div>
          {studyMeta.note && (
            <div className="mt-3">
              <InfoRow icon={FileText} label="补充说明" value={studyMeta.note} />
            </div>
          )}
        </DetailSection>

        {requirements.length > 0 && (
          <DetailSection title="入组要求" className="mb-4">
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

        <div className="sticky bottom-0 left-0 right-0 -mx-4 md:-mx-8 mt-6 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)] px-4 md:px-8 bg-gradient-to-t from-background via-background/95 to-background/0">
          <div className="flex gap-2">
            <FavoriteButton
              roomType="group"
              roomId={roomId}
              payload={{
                title: room.title,
                subtitle: studyMeta.courseName || room.course_name || room.group_target || '课程组队',
                meetTime: room.meet_time,
                meetLabel: '课程组队',
                location: room.meet_location,
                creatorName: creator.username,
              }}
            />
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
