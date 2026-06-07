import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEvaluationDto {
  @ApiProperty({ example: '2021xxxx', description: '被评价人学号' })
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  targetUserId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @ApiPropertyOptional({ example: '超准时!', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;
}
