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
import { ApplyMemberDto } from './dto/apply-member.dto';
import { AuditApplicationDto } from './dto/audit-application.dto';
import { ListMembersQueryDto } from './dto/list-members.dto';
import { ListMyApplicationsQueryDto } from './dto/list-my-applications.dto';
import { ListMyRoomsQueryDto } from './dto/list-my-rooms.dto';
import { MemberService } from './member.service';

@ApiTags('Member')
@ApiBearerAuth()
@Controller()
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  // ============== /rooms/:roomId/members(POST) ==============
  @Post('rooms/:roomId/members')
  @ApiOperation({ summary: '申请加入房间(契约 §4.1)' })
  apply(
    @Param('roomId', ParseIntPipe) roomId: number,
    @CurrentUser('userId') userId: string,
    @Body() dto: ApplyMemberDto,
  ) {
    return this.memberService.apply(roomId, userId, dto);
  }

  // ============== /rooms/:roomId/members(GET) ==============
  @Get('rooms/:roomId/members')
  @ApiOperation({ summary: '房间成员列表(契约 §4.2)' })
  listMembers(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Query() query: ListMembersQueryDto,
  ) {
    return this.memberService.listMembers(roomId, query);
  }

  // ============== /rooms/:roomId/applications(GET) ==============
  @Get('rooms/:roomId/applications')
  @ApiOperation({ summary: '房主查申请列表(契约 §4.3)' })
  listApplications(
    @Param('roomId', ParseIntPipe) roomId: number,
    @CurrentUser('userId') userId: string,
  ) {
    return this.memberService.listApplications(roomId, userId);
  }

  // ============== /rooms/:roomId/applications/:memberId(PATCH) ==============
  @Patch('rooms/:roomId/applications/:memberId')
  @ApiOperation({ summary: '房主审批申请(契约 §4.4)' })
  audit(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser('userId') userId: string,
    @Body() dto: AuditApplicationDto,
  ) {
    return this.memberService.audit(roomId, memberId, userId, dto);
  }

  // ============== /rooms/:roomId/members/me(DELETE) ==============
  @Delete('rooms/:roomId/members/me')
  @ApiOperation({ summary: '退出房间(契约 §4.5)' })
  leave(
    @Param('roomId', ParseIntPipe) roomId: number,
    @CurrentUser('userId') userId: string,
  ) {
    return this.memberService.leave(roomId, userId);
  }

  // ============== /users/me/applications(GET) ==============
  @Get('users/me/applications')
  @ApiOperation({ summary: '我的申请列表(契约 §4.6)' })
  myApplications(
    @CurrentUser('userId') userId: string,
    @Query() query: ListMyApplicationsQueryDto,
  ) {
    return this.memberService.listMyApplications(userId, query);
  }

  // ============== /users/me/rooms(GET) ==============
  @Get('users/me/rooms')
  @ApiOperation({ summary: '我加入的房间(契约 §4.7)' })
  myRooms(
    @CurrentUser('userId') userId: string,
    @Query() query: ListMyRoomsQueryDto,
  ) {
    return this.memberService.listMyRooms(userId, query);
  }
}
