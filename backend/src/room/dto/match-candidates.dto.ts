import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/** POST /rooms/:type/match-candidates —— 用户填表过程中，按已填字段拉相似候选 */
export class MatchCandidatesDto {
  // 拼车
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) startLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) endLocation?: string;
  // 娱乐
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) entType?: string;
  // 学习
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) courseName?: string;
  // 共用
  @ApiPropertyOptional() @IsOptional() @IsDateString() meetTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) meetLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) title?: string;
}
