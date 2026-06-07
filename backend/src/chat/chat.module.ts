import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';
import { UnreadService } from './unread.service';

@Module({
  imports: [AuthModule], // 需要 JwtModule 来在 Gateway 里校验 token
  controllers: [ChatController],
  providers: [ChatService, UnreadService, PresenceService, ChatGateway],
  exports: [ChatService, UnreadService, PresenceService, ChatGateway],
})
export class ChatModule {}
