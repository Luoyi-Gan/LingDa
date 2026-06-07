import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateEntertainmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) content?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(2) totalNum?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() meetTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) meetLocation?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) entType?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) equipment?: string;
}
