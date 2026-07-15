/** 组队详情右侧抽屉：事件总线 + URL 识别 */

export const ROOM_DETAIL_EVENT = 'lingda:room-detail';
export const ROOM_DETAIL_CLOSE = 'lingda:room-detail-close';

const TYPE_MAP = {
  carpool: 'carpool',
  entertainment: 'entertainment',
  study: 'study',
  group: 'study',
};

export function normalizeRoomType(type) {
  if (!type) return 'study';
  return TYPE_MAP[String(type).toLowerCase()] || 'study';
}

/** 解析 /detail-carpool?id=1 或 /pages/detail-carpool/...?id=1 */
export function parseRoomDetailUrl(url) {
  if (!url) return null;
  const raw = String(url).trim();
  const [pathPart, query = ''] = raw.split('?');
  const path = pathPart.replace(/^\//, '');
  const segs = path.split('/').filter(Boolean);
  let name = '';
  if (segs[0] === 'pages' && segs[1]) name = segs[1];
  else name = segs[0] || '';
  const m = name.match(/^detail-(carpool|entertainment|study)$/);
  if (!m) return null;
  const sp = new URLSearchParams(query);
  const id = sp.get('id') || sp.get('roomId');
  if (!id) return null;
  return { type: normalizeRoomType(m[1]), id: String(id) };
}

export function openRoomDetail({ type, id }) {
  const payload = {
    type: normalizeRoomType(type),
    id: String(id),
  };
  if (!payload.id || payload.id === 'undefined' || payload.id === 'null') return;
  window.dispatchEvent(new CustomEvent(ROOM_DETAIL_EVENT, { detail: payload }));
}

export function closeRoomDetail() {
  window.dispatchEvent(new CustomEvent(ROOM_DETAIL_CLOSE));
}
