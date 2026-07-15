const LEGACY_GRADE_LEVELS = {
  '大一': 1,
  '大二': 2,
  '大三': 3,
  '大四': 4,
};

export function formatEnrollmentCohort(value, now = new Date()) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (/^20\d{2}届$/.test(normalized)) return normalized;
  if (/^20\d{2}$/.test(normalized)) return `${normalized}届`;

  const gradeLevel = LEGACY_GRADE_LEVELS[normalized];
  if (gradeLevel == null) return normalized;

  const academicYearStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${academicYearStart - (gradeLevel - 1)}届`;
}
