import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * 发消息 —— roomId / targetUserId / socialGroupId 三选一(服务层做精确校验)。
 */
export class SendMessageDto {
  @ApiPropertyOptional({ description: '匹配房群聊 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roomId?: number;

  @ApiPropertyOptional({ description: '朋友群聊 ID(Wave 3 #7b)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  socialGroupId?: number;

  @ApiPropertyOptional({ description: '私聊对端 userId' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  targetUserId?: string;

  @ApiPropertyOptional({ example: 'OK 👍', maxLength: 1000 })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}
