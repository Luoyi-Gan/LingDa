import { BusinessException } from '../common/exceptions/business.exception';
import { ERROR_CODES } from '../common/constants/error-codes';

/**
 * convId 编码:
 *   匹配房群聊 → group_<roomId>
 *   朋友群聊   → sgroup_<groupId>   (Wave 3 #7b)
 *   私聊       → private_<otherUserId>
 */

export type DecodedConv =
  | { type: 'group'; roomId: number }
  | { type: 'sgroup'; groupId: number }
  | { type: 'private'; userId: string };

export function encodeGroupConvId(roomId: number): string {
  return `group_${roomId}`;
}

export function encodeSocialGroupConvId(groupId: number): string {
  return `sgroup_${groupId}`;
}

export function encodePrivateConvId(otherUserId: string): string {
  return `private_${otherUserId}`;
}

export function decodeConvId(convId: string): DecodedConv {
  if (typeof convId !== 'string' || !convId.length) {
    throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, 'convId 格式错误');
  }
  if (convId.startsWith('sgroup_')) {
    const gid = parseInt(convId.slice(7), 10);
    if (Number.isNaN(gid) || gid <= 0) {
      throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, 'sgroup convId 格式错误');
    }
    return { type: 'sgroup', groupId: gid };
  }
  if (convId.startsWith('group_')) {
    const rid = parseInt(convId.slice(6), 10);
    if (Number.isNaN(rid) || rid <= 0) {
      throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, 'group convId 格式错误');
    }
    return { type: 'group', roomId: rid };
  }
  if (convId.startsWith('private_')) {
    const uid = convId.slice(8);
    if (!uid) {
      throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, 'private convId 格式错误');
    }
    return { type: 'private', userId: uid };
  }
  throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, '未知 convId 类型');
}

/** 房间类型 → 群聊会话 emoji */
export function groupConvEmoji(roomType: string): string {
  const map: Record<string, string> = {
    carpool: '🚗',
    entertainment: '🎭',
    group: '📚',
  };
  return map[roomType] ?? '💬';
}

/** 房间类型 → 群聊会话 icon 颜色(沿用 ROOM_ACCENT 系) */
export function groupConvIconColor(roomType: string): string {
  const map: Record<string, string> = {
    carpool: '#5B7CC9',
    entertainment: '#9C5BA0',
    group: '#4ECDC4',
  };
  return map[roomType] ?? '#999999';
}
