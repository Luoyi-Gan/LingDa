import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * 更新当前用户信息 —— 全部字段可选。
 * **不允许** 通过此接口修改:userId / passwordHash / creditScore / accountStatus
 */
export class UpdateMeDto {
  @ApiPropertyOptional({ example: '小柚' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username?: string;

  @ApiPropertyOptional({ example: '李柚子' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  realName?: string;

  @ApiPropertyOptional({ example: '女' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ example: '新闻与传播学院' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  college?: string;

  @ApiPropertyOptional({ example: '网络与新媒体' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  major?: string;

  @ApiPropertyOptional({ example: '13900008421' })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiPropertyOptional({ example: ['i人', '爱看演唱会'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isSearchable?: boolean;

  @ApiPropertyOptional({ enum: ['all', 'friends', 'none'] })
  @IsOptional()
  @IsIn(['all', 'friends', 'none'])
  msgPermission?: 'all' | 'friends' | 'none';
}
