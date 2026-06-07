/**
 * 6 个成就 —— 按 API.md §2.3 的规则表实时点亮。
 * 不存表,每次访问主页时基于实际数据动态判定。
 */

export interface AchievementDef {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  color: string;
  /**
   * 根据当前用户的统计数据决定是否点亮。
   * 入参由 UserService 收集后传入。
   */
  rule: (stats: AchievementInput) => boolean;
}

export interface AchievementInput {
  finishedRoomCount: number;
  fiveStarCount: number;
  finishedGroupRoomCount: number;
  ratingAverage: number;
  evaluationCount: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'a1',
    emoji: '🚀',
    name: '初次组队',
    desc: '完成第一次组队',
    color: '#FF6B6B',
    rule: (s) => s.finishedRoomCount >= 1,
  },
  {
    id: 'a2',
    emoji: '🎯',
    name: '准时之星',
    desc: '完成 10 次组队',
    color: '#4ECDC4',
    rule: (s) => s.finishedRoomCount >= 10,
  },
  {
    id: 'a3',
    emoji: '🌟',
    name: '满分搭子',
    desc: '收到 100 个 5 星评价',
    color: '#FFD93D',
    rule: (s) => s.fiveStarCount >= 100,
  },
  {
    id: 'a4',
    emoji: '💯',
    name: '百次组队',
    desc: '完成 100 次组队',
    color: '#9C5BA0',
    rule: (s) => s.finishedRoomCount >= 100,
  },
  {
    id: 'a5',
    emoji: '👑',
    name: '校园之星',
    desc: '评分 ≥ 4.95 且 总评价数 ≥ 50',
    color: '#FF8E53',
    rule: (s) => s.ratingAverage >= 4.95 && s.evaluationCount >= 50,
  },
  {
    id: 'a6',
    emoji: '🎓',
    name: '学霸搭子',
    desc: '完成 50 次学习类组队',
    color: '#5B7CC9',
    rule: (s) => s.finishedGroupRoomCount >= 50,
  },
];

/**
 * 评估 ACHIEVEMENTS 全集,返回带 `got: boolean` 的列表。
 */
export function evaluateAchievements(input: AchievementInput) {
  return ACHIEVEMENTS.map((a) => ({
    id: a.id,
    emoji: a.emoji,
    name: a.name,
    desc: a.desc,
    color: a.color,
    got: a.rule(input),
  }));
}
