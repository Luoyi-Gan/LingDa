import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * 标记为 @Global() —— 任何模块都可直接注入 PrismaService,
 * 不需要在自己的 Module imports 里重复声明。
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
