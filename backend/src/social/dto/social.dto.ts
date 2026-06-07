import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class TargetUserDto {
  @ApiProperty({ example: '2021xxxx' })
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  targetUserId: string;
}

export class AuditFriendRequestDto {
  @ApiProperty({ enum: ['accept', 'reject'] })
  @IsIn(['accept', 'reject'])
  action: 'accept' | 'reject';
}

export class ListFriendRequestsQueryDto {
  @ApiPropertyOptional({ enum: ['incoming', 'outgoing'], default: 'incoming' })
  @IsOptional()
  @IsIn(['incoming', 'outgoing'])
  direction?: 'incoming' | 'outgoing' = 'incoming';
}
