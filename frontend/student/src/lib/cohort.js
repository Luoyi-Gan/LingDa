const LEGACY_GRADE_OFFSETS = {
  '大一': 3,
  '大二': 2,
  '大三': 1,
  '大四': 0,
};

export function formatCohort(value, now = new Date()) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (/^20\d{2}届$/.test(normalized)) return normalized;
  if (/^20\d{2}$/.test(normalized)) return `${normalized}届`;

  const offset = LEGACY_GRADE_OFFSETS[normalized];
  if (offset == null) return normalized;

  const academicYearEnd = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  return `${academicYearEnd + offset}届`;
}
