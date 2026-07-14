export function parseStudyContent(content) {
  if (!content || typeof content !== 'string') return {};
  try {
    const parsed = JSON.parse(content);
    return parsed && parsed.kind === 'course-team' ? parsed : {};
  } catch {
    return {};
  }
}

export function buildStudyContent(form) {
  return JSON.stringify({
    kind: 'course-team',
    courseCode: form.course_code?.trim() || '',
    courseName: form.course_name?.trim() || '',
    taskGoal: form.task_goal?.trim() || '',
    gpaRequirement: form.gpa_requirement?.trim() || '',
    yearRequirement: form.year_requirement?.trim() || '',
    majorRequirement: form.major_requirement?.trim() || '',
    skills: form.skills || [],
    note: form.note?.trim() || '',
  });
}

export function buildStudyTitle(form) {
  const code = form.course_code?.trim();
  const name = form.course_name?.trim();
  if (code && name) return `${code} · ${name}`;
  return name || code || '课程组队';
}

export function buildStudyRequirementSummary(form) {
  const parts = [];
  const gpa = form.gpa_requirement?.trim();
  const year = form.year_requirement?.trim();
  const major = form.major_requirement?.trim();
  if (gpa && gpa !== '不限') parts.push(`绩点 ${gpa}`);
  if (year && year !== '不限') parts.push(year);
  if (major && major !== '不限') parts.push(major);
  if (Array.isArray(form.skills) && form.skills.length > 0) {
    parts.push(form.skills.slice(0, 4).join(' / '));
  }
  if (form.note?.trim()) parts.push(form.note.trim());
  return parts.join('；');
}

export function buildStudyTags(form) {
  const tags = [];
  const gpa = form.gpa_requirement?.trim();
  const year = form.year_requirement?.trim();
  const major = form.major_requirement?.trim();
  if (gpa && gpa !== '不限') tags.push(`绩点 ${gpa}`);
  if (year && year !== '不限') tags.push(year);
  if (major && major !== '不限') tags.push(major);
  if (Array.isArray(form.skills)) tags.push(...form.skills);
  return tags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((tag) => tag.slice(0, 30));
}

export function getStudyMeta(room = {}) {
  const meta = parseStudyContent(room.content);
  const titleParts = String(room.title || '').split(' · ');
  const titleCode = titleParts.length > 1 ? titleParts[0] : '';
  const titleName = titleParts.length > 1 ? titleParts.slice(1).join(' · ') : '';
  return {
    courseCode: meta.courseCode || room.course_code || titleCode || '',
    courseName: meta.courseName || room.course_name || titleName || room.courseName || '',
    taskGoal: meta.taskGoal || room.group_target || room.groupTarget || '',
    gpaRequirement: meta.gpaRequirement || '',
    yearRequirement: meta.yearRequirement || '',
    majorRequirement: meta.majorRequirement || '',
    skills: Array.isArray(meta.skills) ? meta.skills : [],
    note: meta.note || '',
  };
}

export function getStudySubtitle(room = {}) {
  const meta = getStudyMeta(room);
  const parts = [];
  if (meta.courseCode) parts.push(meta.courseCode);
  if (meta.taskGoal) parts.push(meta.taskGoal);
  if (room.require_skill) parts.push(room.require_skill);
  return parts.filter(Boolean).join(' · ') || room.course_name || '课程组队';
}
