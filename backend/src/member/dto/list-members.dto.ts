import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ListMembersQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'left'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'left'])
  status?: 'pending' | 'approved' | 'rejected' | 'left';
}
