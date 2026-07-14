import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CommunityService } from './community.service';
import { AdminContentActionDto, CreateAnnouncementDto, CreateCommentDto, CreatePostDto, CreateVerificationDto, FavoriteDto, ListPostsQueryDto, ReviewDto, UpdateAnnouncementDto } from './dto/community.dto';

@ApiTags('Community')
@ApiBearerAuth()
@Controller()
export class CommunityController {
  constructor(private readonly service: CommunityService) {}

  @Post('posts')
  createPost(@CurrentUser('userId') userId: string, @Body() dto: CreatePostDto) {
    return this.service.createPost(userId, dto);
  }

  @Get('posts')
  listPosts(@CurrentUser('userId') userId: string, @Query() query: ListPostsQueryDto) {
    return this.service.listPosts(userId, query);
  }

  @Get('posts/:postId')
  getPost(@CurrentUser('userId') userId: string, @Param('postId', ParseIntPipe) postId: number) {
    return this.service.getPost(userId, postId);
  }

  @Post('posts/:postId/like')
  like(@CurrentUser('userId') userId: string, @Param('postId', ParseIntPipe) postId: number) {
    return this.service.toggleLike(userId, postId);
  }

  @Post('posts/:postId/comments')
  comment(@CurrentUser('userId') userId: string, @Param('postId', ParseIntPipe) postId: number, @Body() dto: CreateCommentDto) {
    return this.service.createComment(userId, postId, dto);
  }

  @Post('favorites')
  favorite(@CurrentUser('userId') userId: string, @Body() dto: FavoriteDto) {
    return this.service.addFavorite(userId, dto);
  }

  @Get('favorites')
  favorites(@CurrentUser('userId') userId: string, @Query('type') type?: 'post' | 'room') {
    return this.service.listFavorites(userId, type);
  }

  @Delete('favorites/:targetType/:targetId')
  unfavorite(@CurrentUser('userId') userId: string, @Param('targetType') type: 'post' | 'room', @Param('targetId', ParseIntPipe) id: number) {
    return this.service.removeFavorite(userId, type, id);
  }

  @Post('announcements')
  createAnnouncement(@CurrentUser('userId') userId: string, @Body() dto: CreateAnnouncementDto) {
    return this.service.createAnnouncement(userId, dto);
  }

  @Get('announcements')
  announcements() {
    return this.service.listAnnouncements();
  }

  @Post('verifications')
  verify(@CurrentUser('userId') userId: string, @Body() dto: CreateVerificationDto) {
    return this.service.submitVerification(userId, dto);
  }

  @Get('verifications/me')
  myVerification(@CurrentUser('userId') userId: string) {
    return this.service.myVerification(userId);
  }

  @Get('admin/review-queue')
  reviewQueue(@CurrentUser('userId') userId: string) {
    return this.service.listReviewQueue(userId);
  }

  @Get('admin/overview')
  overview(@CurrentUser('userId') userId: string) {
    return this.service.adminOverview(userId);
  }

  @Get('admin/posts')
  adminPosts(@CurrentUser('userId') userId: string, @Query('status') status?: string, @Query('riskLevel') riskLevel?: string) {
    return this.service.listAdminPosts(userId, status, riskLevel);
  }

  @Get('admin/comments')
  adminComments(@CurrentUser('userId') userId: string, @Query('status') status?: string) {
    return this.service.listAdminComments(userId, status);
  }

  @Get('admin/verifications')
  adminVerifications(@CurrentUser('userId') userId: string, @Query('type') type?: string, @Query('status') status?: string) {
    return this.service.listAdminVerifications(userId, type, status);
  }

  @Get('admin/announcements')
  adminAnnouncements(@CurrentUser('userId') userId: string, @Query('status') status?: string) {
    return this.service.listAdminAnnouncements(userId, status);
  }

  @Patch('admin/announcements/:announcementId')
  updateAnnouncement(@CurrentUser('userId') userId: string, @Param('announcementId', ParseIntPipe) id: number, @Body() dto: UpdateAnnouncementDto) {
    return this.service.updateAnnouncement(userId, id, dto);
  }

  @Patch('admin/posts/:postId/status')
  moderatePost(@CurrentUser('userId') userId: string, @Param('postId', ParseIntPipe) id: number, @Body() dto: AdminContentActionDto) {
    return this.service.moderatePost(userId, id, dto);
  }

  @Patch('admin/comments/:commentId/status')
  moderateComment(@CurrentUser('userId') userId: string, @Param('commentId', ParseIntPipe) id: number, @Body() dto: AdminContentActionDto) {
    return this.service.moderateComment(userId, id, dto);
  }

  @Post('admin/posts/:postId/review')
  reviewPost(@CurrentUser('userId') userId: string, @Param('postId', ParseIntPipe) id: number, @Body() dto: ReviewDto) {
    return this.service.reviewPost(userId, id, dto);
  }

  @Post('admin/comments/:commentId/review')
  reviewComment(@CurrentUser('userId') userId: string, @Param('commentId', ParseIntPipe) id: number, @Body() dto: ReviewDto) {
    return this.service.reviewComment(userId, id, dto);
  }

  @Post('admin/verifications/:requestId/review')
  reviewVerification(@CurrentUser('userId') userId: string, @Param('requestId', ParseIntPipe) id: number, @Body() dto: ReviewDto) {
    return this.service.reviewVerification(userId, id, dto);
  }
}
