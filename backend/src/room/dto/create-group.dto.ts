import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CreateRoomBaseDto } from './create-room-base.dto';

export class CreateGroupDto extends CreateRoomBaseDto {
  @ApiPropertyOptional({ example: '高等数学 B' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  courseName?: string;

  @ApiProperty({ example: '互相抽查公式 / 一起做模拟卷' })
  @IsString()
  @MaxLength(255)
  groupTarget: string;

  @ApiProperty({ example: '绩点 3.3+；认真负责 / 会做展示' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  requireSkill: string;
}
