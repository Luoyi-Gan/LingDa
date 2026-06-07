import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma 数据源封装。
 *
 * - 进程启动时自动连接、退出时断开
 * - 后端各 Service 通过依赖注入直接使用,如:
 *     constructor(private readonly prisma: PrismaService) {}
 *     this.prisma.user.findUnique(...)
 *
 * Schema 由 DBA 维护(见 prisma/schema.prisma)。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected');
    } catch (err: any) {
      this.logger.warn(
        `Prisma connect skipped (DB not ready / schema empty): ${err?.message ?? err}. ` +
          `Health endpoint will still work. First DB query will retry connection.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
