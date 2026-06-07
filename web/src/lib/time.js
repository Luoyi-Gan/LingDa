// lib/time.js — 统一时间格式化（直接移植自小程序 utils/time.js，纯函数无改动）
const PAD = (n) => (n < 10 ? '0' + n : '' + n);
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function toDate(input) {
  if (input instanceof Date) return input;
  return new Date(input);
}

export function formatMeet(input, now = new Date()) {
  const d = toDate(input);
  if (isNaN(d.getTime())) return '';

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const hm = `${PAD(d.getHours())}:${PAD(d.getMinutes())}`;

  if (sameDay(d, now)) return `今天 ${hm}`;
  if (sameDay(d, tomorrow)) return `明天 ${hm}`;

  const diffDay = Math.round((d - now) / 86400000);
  if (diffDay > 0 && diffDay < 7) {
    return `周${WEEK[d.getDay()]} ${hm}`;
  }

  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

export function formatMeetShort(input, now = new Date()) {
  const s = formatMeet(input, now);
  return s.replace('明天', '明').replace('今天', '今');
}

export function fromNow(input, now = new Date()) {
  const d = toDate(input);
  if (isNaN(d.getTime())) return '';
  const diff = (now - d) / 1000;

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, yesterday)) return '昨天';

  const diffDay = Math.floor((now - d) / 86400000);
  if (diffDay < 7) return `周${WEEK[d.getDay()]}`;

  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function toCountdown(input, now = new Date()) {
  const d = toDate(input);
  if (isNaN(d.getTime())) return '';
  const diff = (d - now) / 1000;

  if (diff < 0) return '已出发';
  if (diff < 60) return '马上出发';
  if (diff < 3600) return `还有 ${Math.floor(diff / 60)} 分钟`;
  if (diff < 86400) return `还有 ${Math.floor(diff / 3600)} 小时`;
  return `还有 ${Math.floor(diff / 86400)} 天`;
}

export function isPast(input, now = new Date()) {
  const d = toDate(input);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < now.getTime();
}

export default { formatMeet, formatMeetShort, fromNow, toCountdown, isPast };
