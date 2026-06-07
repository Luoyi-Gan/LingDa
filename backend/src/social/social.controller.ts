import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  AuditFriendRequestDto,
  ListFriendRequestsQueryDto,
  TargetUserDto,
} from './dto/social.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { SocialService } from './social.service';
import { SocialGroupService } from './social-group.service';

@ApiTags('Social')
@ApiBearerAuth()
@Controller('social')
export class SocialController {
  constructor(
    private readonly social: SocialService,
    private readonly groups: SocialGroupService,
  ) {}

  // ============== /social/friends ==============
  @Get('friends')
  @ApiOperation({ summary: '好友列表(契约 §6.1)' })
  listFriends(@CurrentUser('userId') userId: string) {
    return this.social.listFriends(userId);
  }

  @Delete('friends/:userId')
  @ApiOperation({ summary: '删除好友(契约 §6.5)' })
  removeFriend(
    @CurrentUser('userId') currentUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.social.removeFriend(currentUserId, targetUserId);
  }

  // ============== /social/friend-requests ==============
  @Post('friend-requests')
  @ApiOperation({ summary: '发起好友请求(契约 §6.2)' })
  sendFriendRequest(
    @CurrentUser('userId') userId: string,
    @Body() dto: TargetUserDto,
  ) {
    return this.social.sendFriendRequest(userId, dto.targetUserId);
  }

  @Get('friend-requests')
  @ApiOperation({ summary: '好友请求列表 incoming|outgoing(契约 §6.3)' })
  listFriendRequests(
    @CurrentUser('userId') userId: string,
    @Query() query: ListFriendRequestsQueryDto,
  ) {
    return this.social.listFriendRequests(userId, query);
  }

  @Patch('friend-requests/:friendId')
  @ApiOperation({ summary: '处理好友请求 accept/reject(契约 §6.4)' })
  auditFriendRequest(
    @CurrentUser('userId') userId: string,
    @Param('friendId', ParseIntPipe) friendId: number,
    @Body() dto: AuditFriendRequestDto,
  ) {
    return this.social.auditFriendRequest(userId, friendId, dto);
  }

  // ============== /social/blocks ==============
  @Get('blocks')
  @ApiOperation({ summary: '黑名单列表(契约 §6.6)' })
  listBlocks(@CurrentUser('userId') userId: string) {
    return this.social.listBlocks(userId);
  }

  @Post('blocks')
  @ApiOperation({ summary: '拉黑用户(契约 §6.6)' })
  blockUser(
    @CurrentUser('userId') userId: string,
    @Body() dto: TargetUserDto,
  ) {
    return this.social.blockUser(userId, dto.targetUserId);
  }

  @Delete('blocks/:userId')
  @ApiOperation({ summary: '解除拉黑(契约 §6.6)' })
  unblockUser(
    @CurrentUser('userId') currentUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.social.unblockUser(currentUserId, targetUserId);
  }

  // ============== /social/groups (Wave 3 #7b 朋友群聊) ==============
  @Post('groups')
  @ApiOperation({ summary: '创建朋友群聊' })
  createGroup(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateGroupDto,
  ) {
    return this.groups.create(userId, dto);
  }

  @Get('groups')
  @ApiOperation({ summary: '我的群聊列表' })
  listMyGroups(@CurrentUser('userId') userId: string) {
    return this.groups.listMine(userId);
  }

  @Get('groups/:groupId')
  @ApiOperation({ summary: '群详情(含成员)' })
  groupDetail(
    @CurrentUser('userId') userId: string,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.groups.detail(groupId, userId);
  }

  @Delete('groups/:groupId/members/me')
  @ApiOperation({ summary: '退出群（房主退出 = 解散）' })
  leaveGroup(
    @CurrentUser('userId') userId: string,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.groups.leave(groupId, userId);
  }
}
