import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('users/me/notifications')
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '我的通知列表(契约扩展 §8.1)' })
  list(
    @CurrentUser('userId') uid: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.svc.list(uid, unreadOnly === '1' || unreadOnly === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: '未读通知数(契约扩展 §8.2)' })
  unreadCount(@CurrentUser('userId') uid: string) {
    return this.svc.unreadCount(uid);
  }

  @Post('read-all')
  @ApiOperation({ summary: '一键全部已读(契约扩展 §8.3)' })
  markAllRead(@CurrentUser('userId') uid: string) {
    return this.svc.markAllRead(uid);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记某条已读(契约扩展 §8.4)' })
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') uid: string,
  ) {
    return this.svc.markRead(BigInt(id), uid);
  }
}
