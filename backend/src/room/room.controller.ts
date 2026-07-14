import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateCarpoolDto } from './dto/create-carpool.dto';
import { CreateEntertainmentDto } from './dto/create-entertainment.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateCarpoolDto } from './dto/update-carpool.dto';
import { UpdateEntertainmentDto } from './dto/update-entertainment.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { MatchCandidatesDto } from './dto/match-candidates.dto';
import {
  ListEntertainmentQueryDto,
  ListRoomsQueryDto,
} from './dto/list-rooms.dto';
import { RoomService } from './room.service';

@ApiTags('Room')
@ApiBearerAuth()
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  // ============== 发布 ==============
  @Post('carpool')
  @ApiOperation({ summary: '发布拼车(契约 §3.1.1)' })
  createCarpool(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCarpoolDto,
  ) {
    return this.roomService.createCarpool(userId, dto);
  }

  @Post('entertainment')
  @ApiOperation({ summary: '发布娱乐(契约 §3.1.2)' })
  createEntertainment(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateEntertainmentDto,
  ) {
    return this.roomService.createEntertainment(userId, dto);
  }

  @Post('group')
  @ApiOperation({ summary: '发布课程组队(契约 §3.1.3)' })
  createGroup(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateGroupDto,
  ) {
    return this.roomService.createGroup(userId, dto);
  }

  // ============== 列表 ==============
  @Get('carpool')
  @ApiOperation({ summary: '拼车列表(契约 §3.2.1)' })
  listCarpool(@Query() query: ListRoomsQueryDto) {
    return this.roomService.listCarpool(query);
  }

  @Get('entertainment')
  @ApiOperation({ summary: '娱乐列表(契约 §3.2.2)' })
  listEntertainment(@Query() query: ListEntertainmentQueryDto) {
    return this.roomService.listEntertainment(query);
  }

  @Get('group')
  @ApiOperation({ summary: '课程组队列表(契约 §3.2.3)' })
  listGroup(@Query() query: ListRoomsQueryDto) {
    return this.roomService.listGroup(query);
  }

  // ============== 详情 ==============
  @Get(':roomId')
  @ApiOperation({ summary: '房间详情(契约 §3.3)' })
  getDetail(
    @Param('roomId', ParseIntPipe) roomId: number,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roomService.getDetail(roomId, userId);
  }

  // ============== 房主操作 ==============
  @Patch(':roomId/cancel')
  @ApiOperation({ summary: '房主解散房间(契约 §3.5)' })
  cancel(
    @Param('roomId', ParseIntPipe) roomId: number,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roomService.cancel(roomId, userId);
  }

  @Patch(':roomId/finish')
  @ApiOperation({ summary: '房主标记完成(契约 §3.5)' })
  finish(
    @Param('roomId', ParseIntPipe) roomId: number,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roomService.finish(roomId, userId);
  }

  @Patch(':roomId/carpool')
  @ApiOperation({ summary: '房主编辑拼车房间(契约扩展 §3.6.a)' })
  updateCarpool(
    @Param('roomId', ParseIntPipe) roomId: number,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateCarpoolDto,
  ) {
    return this.roomService.updateCarpool(roomId, userId, dto);
  }

  @Patch(':roomId/entertainment')
  @ApiOperation({ summary: '房主编辑娱乐房间(契约扩展 §3.6.b)' })
  updateEntertainment(
    @Param('roomId', ParseIntPipe) roomId: number,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateEntertainmentDto,
  ) {
    return this.roomService.updateEntertainment(roomId, userId, dto);
  }

  @Patch(':roomId/group')
  @ApiOperation({ summary: '房主编辑课程组队(契约扩展 §3.6.c)' })
  updateGroup(
    @Param('roomId', ParseIntPipe) roomId: number,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.roomService.updateGroup(roomId, userId, dto);
  }

  @Post('carpool/match-candidates')
  @ApiOperation({ summary: '拼车相似度候选(契约扩展 §3.7.a)' })
  matchCarpool(
    @Body() dto: MatchCandidatesDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roomService.matchCandidates('carpool', dto, userId);
  }
  @Post('entertainment/match-candidates')
  @ApiOperation({ summary: '娱乐相似度候选(契约扩展 §3.7.b)' })
  matchEntertainment(
    @Body() dto: MatchCandidatesDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roomService.matchCandidates('entertainment', dto, userId);
  }
  @Post('group/match-candidates')
  @ApiOperation({ summary: '学习相似度候选(契约扩展 §3.7.c)' })
  matchGroup(
    @Body() dto: MatchCandidatesDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roomService.matchCandidates('group', dto, userId);
  }
}
