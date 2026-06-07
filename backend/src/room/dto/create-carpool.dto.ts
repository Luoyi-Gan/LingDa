import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CreateRoomBaseDto } from './create-room-base.dto';

export class CreateCarpoolDto extends CreateRoomBaseDto {
  @ApiProperty({ example: '学校南门' })
  @IsString()
  @MaxLength(255)
  startLocation: string;

  @ApiProperty({ example: '虹桥火车站' })
  @IsString()
  @MaxLength(255)
  endLocation: string;

  @ApiPropertyOptional({ example: '7座SUV' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carType?: string;

  @ApiPropertyOptional({ example: 50, minimum: 0, description: '人均费用 ¥' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costSplit?: number;
}
