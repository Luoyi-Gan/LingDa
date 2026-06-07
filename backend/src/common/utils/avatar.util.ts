/**
 * 头像文字 + 颜色生成器
 * 镜像前端 utils/avatar.js 的算法 —— 保证同一个名字两端显示一致。
 */

const PALETTE = [
  '#FF6B6B', '#FF8E53', '#FFD93D', '#6BCB77', '#4ECDC4',
  '#5B7CC9', '#9C5BA0', '#FF6B95', '#5E5CE6', '#FF9500',
  '#30D158', '#BF5AF2', '#FF2D55', '#0A84FF', '#FFAA00',
];

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0; // 32-bit
  }
  return Math.abs(h);
}

export function pickColor(seed: string | null | undefined): string {
  return PALETTE[hashCode(seed || '?') % PALETTE.length];
}

export function pickInitial(name: string | null | undefined): string {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

export function makeAvatar(name: string | null | undefined): { text: string; color: string } {
  return { text: pickInitial(name), color: pickColor(name) };
}
