import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** POST /social/groups —— 创建朋友群聊 */
export class CreateGroupDto {
  @ApiProperty({ description: '群名（可空，后端会用成员名拼接兜底）' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'emoji 图标' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  iconEmoji?: string;

  @ApiPropertyOptional({ description: '图标背景色 #RRGGBB' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  iconColor?: string;

  @ApiProperty({ description: '初始成员学号列表（不含自己；至少 2 人）' })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  memberIds!: string[];
}
