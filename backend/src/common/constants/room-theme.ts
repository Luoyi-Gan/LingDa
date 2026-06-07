/**
 * 三类房间主题色 / 标签 / 学习类 badge 映射 —— 应用层常量。
 * DB 里不存这些"展示用"字段(API.md §9 应用层补丁),后端按 roomType 算好返回。
 */

export type RoomType = 'carpool' | 'entertainment' | 'group';

export const ROOM_ACCENT: Record<RoomType, string> = {
  carpool: '#4A6FA5',
  entertainment: '#C8567E',
  group: '#3B9B8F',
};

export const ROOM_ACCENT_LABEL: Record<RoomType, string> = {
  carpool: '拼车',
  entertainment: '娱乐',
  group: '学习',
};

/**
 * 学习类 badge —— 按课程名首字符到学科分类映射。
 * 未命中走 fallback:取课程名第一个字。
 */
const COURSE_BADGE_MAP: Array<[RegExp, string]> = [
  [/数学|高数|微积分|线代|统计|概率/, '数'],
  [/物理/, '物'],
  [/化学/, '化'],
  [/生物/, '生'],
  [/英语|CET|雅思|托福|TOEFL|IELTS|GRE/i, '英'],
  [/政治|马原|毛概|思修/, '政'],
  [/历史/, '史'],
  [/法理|法学|民法|刑法|宪法/, '法'],
  [/经济|宏观|微观|金融|会计|管理/, '经'],
  [/计算机|编程|算法|数据结构|软件|网络/, '计'],
  [/艺术|音乐|美术|绘画|钢琴|考级/, '艺'],
];

export function pickStudyBadge(courseName: string | null | undefined): string {
  if (!courseName) return '学';
  for (const [pattern, badge] of COURSE_BADGE_MAP) {
    if (pattern.test(courseName)) return badge;
  }
  return courseName.trim().charAt(0) || '学';
}

/**
 * 学习类房间 badge 颜色:目前统一用 study accent。
 * 后续若要按学科再细分色,在这里改即可。
 */
export function pickStudyBadgeColor(courseName: string | null | undefined): string {
  void courseName;
  return ROOM_ACCENT.group;
}

/**
 * 拼车 / 娱乐主题色拓展(列表卡封面渐变副色,前端用)
 */
export function lightenColor(hex: string): string {
  const map: Record<string, string> = {
    '#FF6B95': '#FF9DBA',
    '#9C5BA0': '#BE7AC0',
    '#FF8E53': '#FFB082',
    '#FF2D55': '#FF6B85',
    '#0A84FF': '#5B96D9',
    '#BF5AF2': '#D89AFF',
    '#4A6FA5': '#7A9DCA',
    '#C8567E': '#E58AAA',
    '#3B9B8F': '#6FC0B5',
  };
  return map[hex] || hex;
}
