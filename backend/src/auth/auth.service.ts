import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import { toUserDto, UserDto } from '../common/utils/user-dto.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface AuthResult {
  token: string;
  user: UserDto;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ============== 注册 ==============
  async register(dto: RegisterDto): Promise<AuthResult> {
    // 1. 学号 / 手机号 冲突预检
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ userId: dto.userId }, { phone: dto.phone }] },
      select: { userId: true, phone: true },
    });
    if (existing) {
      const msg = existing.userId === dto.userId ? '该学号已注册' : '该手机号已注册';
      throw new BusinessException(ERROR_CODES.USER_ID_TAKEN, msg);
    }

    // 2. 哈希密码 + 入库
    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          userId: dto.userId,
          username: dto.username,
          realName: dto.realName,
          passwordHash: hashPassword(dto.password),
          phone: dto.phone,
          college: dto.college,
          major: dto.major ?? null,
          gender: dto.gender ?? null,
        },
      });
    } catch (err) {
      // 并发场景下唯一约束可能再次撞上,兜底
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BusinessException(
          ERROR_CODES.USER_ID_TAKEN,
          '学号或手机号已注册',
        );
      }
      throw err;
    }

    return this.signFor(user);
  }

  // ============== 登录 ==============
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { userId: dto.userId },
    });

    // 模糊错误 —— 避免学号枚举
    if (!user || !verifyPassword(dto.password, user.passwordHash)) {
      throw new BusinessException(ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (user.accountStatus !== 'normal') {
      throw new BusinessException(
        ERROR_CODES.ACCOUNT_RESTRICTED,
        `账号状态:${user.accountStatus}`,
      );
    }

    return this.signFor(user);
  }

  // ============== 内部:签发 token + 返回标准 AuthResult ==============
  private async signFor(user: User): Promise<AuthResult> {
    const token = await this.jwt.signAsync({ sub: user.userId });
    return { token, user: toUserDto(user, { phone: 'mask' }) };
  }
}
