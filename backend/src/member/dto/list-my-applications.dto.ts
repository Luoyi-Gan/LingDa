import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListMyApplicationsQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'left'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'left'])
  status?: 'pending' | 'approved' | 'rejected' | 'left';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}
