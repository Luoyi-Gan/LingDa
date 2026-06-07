import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlacesService } from './places.service';

@ApiTags('Places')
@ApiBearerAuth()
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  // GET /places/suggest?q=xxx&limit=8
  // 历史地点联想：用于发布/筛选/偏好里的"地点输入"自动补全
  @Get('suggest')
  @ApiOperation({ summary: '历史地点联想(契约扩展 §6.1)' })
  suggest(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.placesService.suggest(q ?? '', limit ? Number(limit) : 8);
  }
}
