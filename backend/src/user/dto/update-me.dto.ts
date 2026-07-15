import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { COLLEGE_CODES, MAJOR_CODES } from '../../common/constants/academic-options';

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

  @ApiPropertyOptional({ example: 'FST', enum: COLLEGE_CODES })
  @IsOptional()
  @IsString()
  @IsIn(COLLEGE_CODES, { message: '学院必须从 FST、SCC、FBM、FHSS 中选择' })
  college?: string;

  @ApiPropertyOptional({ example: 'AI', enum: MAJOR_CODES })
  @IsOptional()
  @IsString()
  @IsIn(MAJOR_CODES, { message: '请选择平台支持的专业简称' })
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

  @ApiPropertyOptional({ example: '2024届', description: '入学届别' })
  @IsOptional()
  @IsString()
  @Matches(/^20\d{2}届$/, { message: '入学届别格式应为 2024届' })
  grade?: string;

  @ApiPropertyOptional({ example: '喜欢产品设计，也在找课程项目搭子。' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showProfile?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notifyEnabled?: boolean;
}
