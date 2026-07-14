import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * 三类房间共享字段(写 Match_Room 主表)
 * §3.1 公共字段
 */
export abstract class CreateRoomBaseDto {
  @ApiProperty({ example: '南门 → 虹桥火车站' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: '长描述,选填' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;

  @ApiProperty({ example: 4, minimum: 2, maximum: 20, description: '房间总人数, 2-20' })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(20)
  totalNum: number;

  @ApiPropertyOptional({ example: '2026-05-13T16:00:00.000Z', description: 'ISO 8601' })
  @IsOptional()
  @IsDateString()
  meetTime?: string;

  @ApiPropertyOptional({ example: '学校南门' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  meetLocation?: string;

  @ApiPropertyOptional({ enum: ['direct', 'audit', 'password'], default: 'direct' })
  @IsOptional()
  @IsIn(['direct', 'audit', 'password'])
  joinRule?: 'direct' | 'audit' | 'password' = 'direct';

  /** 仅 joinRule = 'password' 时必填 */
  @ApiPropertyOptional({ description: '仅 joinRule=password 时必填', maxLength: 50 })
  @ValidateIf((o) => o.joinRule === 'password')
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  joinPassword?: string;

  @ApiPropertyOptional({ type: [String], example: ['不抽烟', '准时'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];
}
