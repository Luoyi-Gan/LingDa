import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateGroupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) content?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(2) totalNum?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() meetTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) meetLocation?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) courseName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) groupTarget?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) requireSkill?: string;
}
