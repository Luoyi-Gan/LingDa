/**
 * 手机号掩码:139****8421
 * 输出给非本人时使用。
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
