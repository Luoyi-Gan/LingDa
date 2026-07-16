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
          major: dto.major,
          grade: dto.grade,
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

  /**
   * 本地开发免密入口：自动确保预览用户存在并签发真实 JWT。
   * 生产环境禁用。
   */
  async previewLogin(): Promise<AuthResult> {
    if ((process.env.NODE_ENV || 'development') === 'production') {
      throw new BusinessException(
        ERROR_CODES.FORBIDDEN,
        '开发预览入口仅限非生产环境',
      );
    }

    const userId = 'DEVPREVIEW';
    const phone = '13800000001';
    let user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          userId,
          username: '开发预览',
          realName: '开发预览账号',
          passwordHash: hashPassword(`dev-preview-${Date.now()}`),
          phone,
          college: '灵搭开发中心',
          major: '全栈开发',
          grade: '2024届',
          tags: '开发,预览',
          bio: '本地开发免密入口自动创建的账号。',
          accountStatus: 'normal',
          accountRole: 'student',
          verificationStatus: 'verified',
        },
      });
    } else if (user.accountStatus !== 'normal') {
      user = await this.prisma.user.update({
        where: { userId },
        data: { accountStatus: 'normal' },
      });
    }

    return this.signFor(user);
  }

  /**
   * 管理端本地开发免密入口：自动确保 ADMINPREVIEW 管理员存在并签发真实 JWT。
   * 生产环境禁用。
   */
  async previewAdminLogin(): Promise<AuthResult> {
    if ((process.env.NODE_ENV || 'development') === 'production') {
      throw new BusinessException(
        ERROR_CODES.FORBIDDEN,
        '开发预览入口仅限非生产环境',
      );
    }

    const userId = 'ADMINPREVIEW';
    const phone = '13800000002';
    let user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          userId,
          username: '开发预览',
          realName: '管理端开发预览',
          passwordHash: hashPassword(`admin-preview-${Date.now()}`),
          phone,
          college: '灵搭开发中心',
          major: '运营管理',
          grade: '2024届',
          bio: '管理端本地开发免密入口自动创建的账号。',
          accountStatus: 'normal',
          accountRole: 'admin',
          verificationStatus: 'verified',
        },
      });
    } else {
      const needsUpdate =
        user.accountRole !== 'admin' ||
        user.accountStatus !== 'normal' ||
        user.verificationStatus !== 'verified';
      if (needsUpdate) {
        user = await this.prisma.user.update({
          where: { userId },
          data: {
            accountRole: 'admin',
            accountStatus: 'normal',
            verificationStatus: 'verified',
          },
        });
      }
    }

    return this.signFor(user);
  }

  // ============== 内部:签发 token + 返回标准 AuthResult ==============
  private async signFor(user: User): Promise<AuthResult> {
    const token = await this.jwt.signAsync({ sub: user.userId });
    return { token, user: toUserDto(user, { phone: 'mask' }) };
  }
}
