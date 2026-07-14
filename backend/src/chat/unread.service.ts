import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 会话已读位置。
 *
 * 数据库持久化解决"已读后红点又出现"；内存 Map 只作为快速兜底。
 */
@Injectable()
export class UnreadService implements OnModuleInit {
  private readonly logger = new Logger(UnreadService.name);
  private readonly lastView = new Map<string, Map<string, Date>>();
  private tableReady = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureTable();
  }

  /** 取某用户在某会话的最后已读时间;不存在返回 null */
  async getLastView(userId: string, convId: string): Promise<Date | null> {
    const cached = this.lastView.get(userId)?.get(convId) ?? null;
    if (!this.tableReady) return cached;
    try {
      const rows = await this.prisma.$queryRaw<Array<{ last_read_at: Date }>>`
        SELECT last_read_at
        FROM Conversation_Read
        WHERE user_id = ${userId} AND conv_id = ${convId}
        LIMIT 1
      `;
      const persisted = rows[0]?.last_read_at ?? null;
      if (persisted) this.setMemory(userId, convId, persisted);
      return persisted ?? cached;
    } catch (err: any) {
      this.tableReady = false;
      this.logger.warn(`Conversation_Read unavailable, using memory cache: ${err?.message ?? err}`);
      return cached;
    }
  }

  /** 标记已读到现在 */
  async markRead(userId: string, convId: string, at: Date = new Date()): Promise<void> {
    this.setMemory(userId, convId, at);
    if (!this.tableReady) {
      await this.ensureTable();
    }
    if (!this.tableReady) return;
    try {
      await this.prisma.$executeRaw`
        INSERT INTO Conversation_Read (user_id, conv_id, last_read_at)
        VALUES (${userId}, ${convId}, ${at})
        ON DUPLICATE KEY UPDATE last_read_at = GREATEST(last_read_at, VALUES(last_read_at))
      `;
    } catch (err: any) {
      this.tableReady = false;
      this.logger.warn(`Failed to persist read cursor, using memory cache: ${err?.message ?? err}`);
    }
  }

  private setMemory(userId: string, convId: string, at: Date): void {
    if (!this.lastView.has(userId)) {
      this.lastView.set(userId, new Map());
    }
    const current = this.lastView.get(userId)!.get(convId);
    if (!current || current < at) {
      this.lastView.get(userId)!.set(convId, at);
    }
  }

  private async ensureTable(): Promise<void> {
    if (this.tableReady) return;
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS Conversation_Read (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL,
          conv_id VARCHAR(64) NOT NULL,
          last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uk_conv_read (user_id, conv_id),
          INDEX idx_conv_read_user (user_id),
          INDEX idx_conv_read_user_conv (user_id, conv_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      this.tableReady = true;
    } catch (err: any) {
      this.tableReady = false;
      this.logger.warn(`Conversation_Read table not ready: ${err?.message ?? err}`);
    }
  }
}
