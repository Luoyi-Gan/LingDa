import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyMemberDto {
  @ApiPropertyOptional({
    description: '仅 joinRule=password 时必填',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  joinPassword?: string;

  @ApiPropertyOptional({
    description: '课程组队申请时必须确认已阅读组员要求',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  confirmRequirements?: boolean;
}
