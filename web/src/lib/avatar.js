// lib/avatar.js — 由名字生成确定性头像色（直接移植自小程序 utils/avatar.js）
const PALETTE = [
  '#FF6B6B', '#FF8E53', '#FFD93D', '#6BCB77', '#4ECDC4',
  '#5B7CC9', '#9C5BA0', '#FF6B95', '#5E5CE6', '#FF9500',
  '#30D158', '#BF5AF2', '#FF2D55', '#0A84FF', '#FFAA00',
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function pickColor(seed) {
  return PALETTE[hash(seed || '?') % PALETTE.length];
}

export function pickInitial(name) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

export function makeAvatar(name) {
  return { text: pickInitial(name), color: pickColor(name) };
}

export default { pickColor, pickInitial, makeAvatar };
