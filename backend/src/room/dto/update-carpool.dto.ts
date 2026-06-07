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

/** PATCH /rooms/:id/carpool —— 全部字段可选；保留校验规则 */
export class UpdateCarpoolDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) content?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(2) totalNum?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() meetTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) meetLocation?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) startLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) endLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) carType?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  costSplit?: number;
}
