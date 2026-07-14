import { SetMetadata } from '@nestjs/common';

/**
 * @Public() —— 标记某个 Controller 方法不需要 JWT 鉴权。
 * JwtAuthGuard 会读取此元数据并放行。
 *
 * 用法:
 *   @Public()
 *   @Post('login')
 *   wxLogin() { ... }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
