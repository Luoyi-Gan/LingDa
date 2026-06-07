import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '2021xxxx' })
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  userId: string;

  @ApiProperty({ example: 'abcd1234' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  password: string;
}
