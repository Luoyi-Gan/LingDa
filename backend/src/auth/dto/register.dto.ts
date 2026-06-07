import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: '2021xxxx', description: '学号(主键)' })
  @IsString()
  @MinLength(4)
  @MaxLength(50)
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

  @ApiProperty({ example: '新闻与传播学院' })
  @IsString()
  @MaxLength(100)
  college: string;

  @ApiProperty({ required: false, example: '网络与新媒体' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  major?: string;

  @ApiProperty({ required: false, example: '女' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;
}
