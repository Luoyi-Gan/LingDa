/**
 * DB 里 tags 是 VARCHAR(255) 用英文逗号分隔,
 * API 出参是 string[],入参也是 string[]。
 */

export function splitTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function joinTags(arr: string[] | null | undefined): string | null {
  if (!arr || arr.length === 0) return null;
  return arr
    .map((t) => (t || '').trim())
    .filter((t) => t.length > 0)
    .join(',');
}
