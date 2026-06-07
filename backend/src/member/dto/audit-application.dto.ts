import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class AuditApplicationDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';
}
