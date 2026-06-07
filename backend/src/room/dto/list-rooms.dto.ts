import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** 三类列表共享的 query 参数 */
export class ListRoomsQueryDto {
  @ApiPropertyOptional({ enum: ['time', 'hot'], default: 'time' })
  @IsOptional()
  @IsIn(['time', 'hot'])
  sort?: 'time' | 'hot' = 'time';

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}

/** 娱乐列表多一个 cat 二级筛选 */
export class ListEntertainmentQueryDto extends ListRoomsQueryDto {
  @ApiPropertyOptional({
    example: '全部',
    description: '全部 / 演唱会 / 剧本杀 / KTV / 观影 / 展览 / 密室',
  })
  @IsOptional()
  @IsString()
  cat?: string = '全部';
}
