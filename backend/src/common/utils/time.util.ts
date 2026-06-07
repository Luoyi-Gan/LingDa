/**
 * 时间格式化 —— 后端镜像前端 utils/time.js,保证两端展示一致。
 * 数据层 ISO 字符串,展示层调下面这几个函数。
 */

const PAD = (n: number) => (n < 10 ? '0' + n : '' + n);
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function toDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "今天 16:00" / "明天 06:30" / "周五 14:00" / "11/15 19:30" */
export function formatMeet(input: Date | string | null, now = new Date()): string {
  if (!input) return '';
  const d = toDate(input);
  if (isNaN(d.getTime())) return '';

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const hm = `${PAD(d.getHours())}:${PAD(d.getMinutes())}`;

  if (sameDay(d, now)) return `今天 ${hm}`;
  if (sameDay(d, tomorrow)) return `明天 ${hm}`;

  const diffDay = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diffDay > 0 && diffDay < 7) {
    return `周${WEEK[d.getDay()]} ${hm}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

export function formatMeetShort(input: Date | string | null, now = new Date()): string {
  return formatMeet(input, now).replace('明天', '明').replace('今天', '今');
}

/** "刚刚" / "12 分钟前" / "3 小时前" / "昨天" / "周一" / "4/22" */
export function fromNow(input: Date | string | null, now = new Date()): string {
  if (!input) return '';
  const d = toDate(input);
  if (isNaN(d.getTime())) return '';
  const diff = (now.getTime() - d.getTime()) / 1000;

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return '昨天';

  const diffDay = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDay < 7) return `周${WEEK[d.getDay()]}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** "还有 30 分钟" / "还有 2 小时" / "还有 3 天" / "已出发" */
export function toCountdown(input: Date | string | null, now = new Date()): string {
  if (!input) return '';
  const d = toDate(input);
  if (isNaN(d.getTime())) return '';
  const diff = (d.getTime() - now.getTime()) / 1000;

  if (diff < 0) return '已出发';
  if (diff < 60) return '马上出发';
  if (diff < 3600) return `还有 ${Math.floor(diff / 60)} 分钟`;
  if (diff < 86400) return `还有 ${Math.floor(diff / 3600)} 小时`;
  return `还有 ${Math.floor(diff / 86400)} 天`;
}

export function isPast(input: Date | string | null, now = new Date()): boolean {
  if (!input) return false;
  const d = toDate(input);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < now.getTime();
}
