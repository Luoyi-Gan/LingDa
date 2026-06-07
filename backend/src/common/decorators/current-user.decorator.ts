import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 当前登录用户 —— 由 JwtStrategy.validate() 写入 req.user。
 *
 * 用法:
 *   @Get('me')
 *   getMe(@CurrentUser() user: JwtUser) { ... }
 *
 *   @Get('me/userId')
 *   getMyId(@CurrentUser('userId') userId: string) { ... }
 */
export interface JwtUser {
  userId: string;
}

export const CurrentUser = createParamDecorator(
  (field: keyof JwtUser | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtUser;
    return field ? user?.[field] : user;
  },
);
