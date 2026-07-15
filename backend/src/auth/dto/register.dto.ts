import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { COLLEGE_CODES, MAJOR_CODES } from '../../common/constants/academic-options';

export class RegisterDto {
  @ApiProperty({ example: '2021xxxx', description: '学号(主键)' })
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: '学号只能包含字母、数字、下划线或连字符' })
  userId: string;

  @ApiProperty({ example: '小柚' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username: string;

  @ApiProperty({ example: '李柚子' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  realName: string;

  @ApiProperty({ example: 'abcd1234', description: '至少 6 位' })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @ApiProperty({ example: '13900008421' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ example: 'FST', enum: COLLEGE_CODES })
  @IsString()
  @IsIn(COLLEGE_CODES, { message: '学院必须从 FST、SCC、FBM、FHSS 中选择' })
  college: string;

  @ApiProperty({ example: 'AI', enum: MAJOR_CODES })
  @IsString()
  @IsIn(MAJOR_CODES, { message: '请选择平台支持的专业简称' })
  major: string;

  @ApiProperty({ example: '2024届', description: '入学届别' })
  @IsString()
  @Matches(/^20\d{2}届$/, { message: '入学届别格式应为 2024届' })
  grade: string;

  @ApiProperty({ required: false, example: '女' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;
}
