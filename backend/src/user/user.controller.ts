import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateMeDto } from './dto/update-me.dto';
import { ListEvaluationsQueryDto } from './dto/list-evaluations.dto';
import { UserService } from './user.service';

@ApiTags('User')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前登录用户(契约 §2.1)' })
  getMe(@CurrentUser('userId') userId: string) {
    return this.userService.getMe(userId);
  }

  // 历史搭子（#6b）：所有 finished 房间中共同的 approved 成员，
  // 按共同房间数降序 + 含好友状态 + 含上次同房间标签
  @Get('me/teammates')
  @ApiOperation({ summary: '历史搭子聚合(契约扩展 §2.6)' })
  myTeammates(@CurrentUser('userId') userId: string) {
    return this.userService.listTeammates(userId);
  }

  // ============== 学号精确搜索（受 is_searchable 控制）==============
  // 用于「按学号加好友」流程：返回 {user|null} + 当前好友关系状态
  @Get('search')
  @ApiOperation({ summary: '按学号精确查找用户(契约扩展 §2.5)' })
  search(
    @Query('userId') q: string,
    @CurrentUser('userId') me: string,
  ) {
    return this.userService.searchByUserId(q, me);
  }

  @Patch('me')
  @ApiOperation({ summary: '更新当前登录用户(契约 §2.2)' })
  updateMe(@CurrentUser('userId') userId: string, @Body() dto: UpdateMeDto) {
    return this.userService.updateMe(userId, dto);
  }

  @Get(':userId/profile')
  @ApiOperation({
    summary: '用户公开主页 —— 动态评分 + 统计 + 成就(契约 §2.3)',
  })
  getProfile(
    @Param('userId') userId: string,
    @CurrentUser('userId') viewerId: string,
  ) {
    return this.userService.getProfile(userId, viewerId);
  }

  @Get(':userId/evaluations')
  @ApiOperation({ summary: '用户收到的评价(分页,契约 §2.4)' })
  listEvaluations(
    @Param('userId') userId: string,
    @Query() query: ListEvaluationsQueryDto,
  ) {
    return this.userService.listEvaluations(
      userId,
      query.page ?? 1,
      query.pageSize ?? 10,
    );
  }
}
