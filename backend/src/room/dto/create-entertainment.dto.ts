import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CreateRoomBaseDto } from './create-room-base.dto';

export class CreateEntertainmentDto extends CreateRoomBaseDto {
  @ApiProperty({ example: '演唱会', description: '娱乐类型' })
  @IsString()
  @MaxLength(100)
  entType: string;

  @ApiPropertyOptional({ example: 380, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ example: '票已订' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  equipment?: string;
}
