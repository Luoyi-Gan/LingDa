// lib/avatar.js — 由名字生成确定性头像色（保证白字可读）
const PALETTE = [
  '#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#0D9488',
  '#2563EB', '#7C3AED', '#DB2777', '#4F46E5', '#C2410C',
  '#15803D', '#9333EA', '#BE123C', '#0284C7', '#B45309',
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function parseColor(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length !== 6) return null;
    const n = parseInt(hex, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  return null;
}

/** 相对亮度；> 0.55 用深色字，否则白字 */
export function inkOn(bg) {
  const rgb = parseColor(bg);
  if (!rgb) return '#FFFFFF';
  const toLin = (c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
  return L > 0.55 ? '#0F172A' : '#FFFFFF';
}

export function pickColor(seed) {
  return PALETTE[hash(seed || '?') % PALETTE.length];
}

export function pickInitial(name) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

export function makeAvatar(name) {
  const color = pickColor(name);
  return { text: pickInitial(name), color, ink: inkOn(color) };
}

export default { pickColor, pickInitial, makeAvatar, inkOn };
