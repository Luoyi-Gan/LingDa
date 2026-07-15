import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

/**
 * 解析 Authorization: Bearer <token>,
 * 校验签名 + 过期时间,把 { userId } 挂到 req.user。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    const user = await this.prisma.user.findUnique({
      where: { userId: payload.sub },
      select: { userId: true, accountStatus: true },
    });
    if (!user || user.accountStatus !== 'normal') {
      throw new UnauthorizedException('账号已失效或被限制');
    }
    return { userId: payload.sub };
  }
}
