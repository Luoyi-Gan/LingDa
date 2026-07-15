import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export const POST_CATEGORIES = ['club', 'course', 'lost_found', 'campus_life'] as const;

export class CreatePostDto {
  @ApiProperty({ enum: POST_CATEGORIES })
  @IsIn(POST_CATEGORIES)
  category: (typeof POST_CATEGORIES)[number];

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  @Matches(/^(https?:\/\/[^\s]+|\/uploads\/images\/[A-Za-z0-9._-]+)$/, { each: true })
  images?: string[];
}

export class ListPostsQueryDto {
  @IsOptional()
  @IsIn(POST_CATEGORIES)
  category?: (typeof POST_CATEGORIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;
}

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}

export class CreateAnnouncementDto {
  @IsOptional()
  @IsIn(['platform', 'academic', 'service', 'club'])
  category?: 'platform' | 'academic' | 'service' | 'club';

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  summary?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(20000)
  content: string;

  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/[^\s]+|\/uploads\/images\/[A-Za-z0-9._-]+)$/)
  @MaxLength(500)
  coverUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsISO8601({ strict: true })
  timelineAt?: string;
}

export class FavoriteDto {
  @ApiProperty({ enum: ['post', 'room'] })
  @IsIn(['post', 'room'])
  targetType: 'post' | 'room';

  @IsInt()
  @Min(1)
  targetId: number;
}

export class CreateVerificationDto {
  @IsIn(['student', 'club', 'official'])
  type: 'student' | 'club' | 'official';

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  applicantName: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  organizationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  studentId?: string;

  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @Matches(/^(https?:\/\/[^\s]+|\/uploads\/verification-materials\/[A-Za-z0-9_-]+\/[a-f0-9-]+\.(jpg|png|webp|gif))$/, { each: true })
  materialUrls: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  statement?: string;
}

export class ReviewDto {
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AdminContentActionDto {
  @IsIn(['approve', 'reject', 'hide', 'restore'])
  action: 'approve' | 'reject' | 'hide' | 'restore';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsIn(['platform', 'academic', 'service', 'club'])
  category?: 'platform' | 'academic' | 'service' | 'club';

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  summary?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(20000)
  content?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/[^\s]+|\/uploads\/images\/[A-Za-z0-9._-]+)$/)
  @MaxLength(500)
  coverUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsISO8601({ strict: true })
  timelineAt?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'hidden'])
  status?: 'draft' | 'published' | 'hidden';
}
