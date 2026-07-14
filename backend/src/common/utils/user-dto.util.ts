import type { User } from '@prisma/client';
import { makeAvatar } from './avatar.util';
import { maskPhone } from './phone.util';
import { splitTags } from './tags.util';

/**
 * 把 Prisma 的 User 实体转换为对外 API 出参形态:
 *  - 头像文字/颜色:按 username 生成
 *  - tags:字符串 → 数组
 *  - phone:默认掩码;在"查看自己"时可关掉掩码(showPhone='full')
 *  - creditScore Decimal → number
 *
 * 入参 user 必须包含完整 User 字段(passwordHash 等敏感字段会被剥离)。
 */
export interface UserDto {
  userId: string;
  username: string;
  realName: string;
  avatarText: string;
  avatarColor: string;
  gender: string | null;
  college: string;
  major: string | null;
  phone?: string;
  tags: string[];
  isSearchable: boolean;
  msgPermission: string;
  creditScore: number;
  accountStatus: string;
  accountRole: string;
  verificationStatus: string;
  grade: string | null;
  bio: string | null;
  avatarUrl: string | null;
  showProfile: boolean;
  notifyEnabled: boolean;
}

export interface ToUserDtoOptions {
  /** 'full' 不掩码,'mask' 掩码,'omit' 完全不返回 phone(用于公开主页) */
  phone?: 'full' | 'mask' | 'omit';
}

export function toUserDto(user: User, opts: ToUserDtoOptions = {}): UserDto {
  const avatar = makeAvatar(user.username);
  const phoneMode = opts.phone ?? 'mask';
  return {
    userId: user.userId,
    username: user.username,
    realName: user.realName,
    avatarText: avatar.text,
    avatarColor: avatar.color,
    gender: user.gender,
    college: user.college,
    major: user.major,
    ...(phoneMode === 'omit'
      ? {}
      : { phone: phoneMode === 'full' ? user.phone : maskPhone(user.phone) }),
    tags: splitTags(user.tags),
    isSearchable: user.isSearchable,
    msgPermission: user.msgPermission,
    creditScore: Number(user.creditScore),
    accountStatus: user.accountStatus,
    accountRole: user.accountRole,
    verificationStatus: user.verificationStatus,
    grade: user.grade,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    showProfile: user.showProfile,
    notifyEnabled: user.notifyEnabled,
  };
}
