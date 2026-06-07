import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyMemberDto {
  @ApiPropertyOptional({
    description: '仅 joinRule=password 时必填',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  joinPassword?: string;
}
