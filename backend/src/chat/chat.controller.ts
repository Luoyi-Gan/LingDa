import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { HistoryQueryDto } from './dto/history.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('online-friends')
  @ApiOperation({ summary: '最近联系人横幅(契约 §7.1.1)' })
  online(@CurrentUser('userId') userId: string) {
    return this.chatService.listOnlineFriends(userId);
  }

  @Get('conversations')
  @ApiOperation({ summary: '会话列表(契约 §7.1.2)' })
  conversations(@CurrentUser('userId') userId: string) {
    return this.chatService.listConversations(userId);
  }

  @Get('conversations/:convId/messages')
  @ApiOperation({ summary: '历史消息分页(契约 §7.1.3)' })
  history(
    @CurrentUser('userId') userId: string,
    @Param('convId') convId: string,
    @Query() query: HistoryQueryDto,
  ) {
    return this.chatService.listMessages(
      userId,
      convId,
      query.before,
      query.pageSize ?? 30,
    );
  }

  @Post('messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发消息(REST 兜底,契约 §7.1.4)' })
  async send(
    @CurrentUser('userId') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    const { message, recipientUserIds } = await this.chatService.sendMessage(
      userId,
      dto,
    );
    // REST 写完也通过 WebSocket 推送给所有相关用户(含其他设备)
    this.chatGateway.broadcastNewMessage(message, recipientUserIds);
    return message;
  }

  @Post('conversations/:convId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '标记会话已读(契约 §7.1.5)' })
  markRead(
    @CurrentUser('userId') userId: string,
    @Param('convId') convId: string,
  ) {
    return this.chatService.markRead(userId, convId);
  }

  // ============== 删除/隐藏会话 —— 用户级，持久化跨设备 ==============
  @Post('conversations/:convId/hide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除/隐藏会话(契约扩展 §7.1.6)' })
  hide(
    @CurrentUser('userId') userId: string,
    @Param('convId') convId: string,
  ) {
    return this.chatService.hideConversation(userId, convId);
  }

  @Delete('conversations/:convId/hide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '取消隐藏会话(契约扩展 §7.1.7)' })
  unhide(
    @CurrentUser('userId') userId: string,
    @Param('convId') convId: string,
  ) {
    return this.chatService.unhideConversation(userId, convId);
  }
}
