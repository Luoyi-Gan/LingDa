import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * 用 Node 内置 scrypt 做密码哈希,无需引入 bcrypt 原生包。
 * 存储格式:`<salt-hex>:<hash-hex>`
 */

const KEY_LEN = 64;
const SALT_BYTES = 16;

export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = scryptSync(plain, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hashHex] = stored.split(':');
  let storedBuf: Buffer;
  let inputBuf: Buffer;
  try {
    storedBuf = Buffer.from(hashHex, 'hex');
    inputBuf = scryptSync(plain, salt, storedBuf.length);
  } catch {
    return false;
  }
  if (storedBuf.length !== inputBuf.length) return false;
  return timingSafeEqual(storedBuf, inputBuf);
}
