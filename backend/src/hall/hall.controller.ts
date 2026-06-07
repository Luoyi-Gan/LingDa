import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { HallService } from './hall.service';

@ApiTags('Hall')
@ApiBearerAuth()
@Controller('hall')
export class HallController {
  constructor(private readonly hallService: HallService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: '大厅整屏聚合(契约 §3.4)—— 一接口出 user/upcoming/counts/hot/onlineCount/matchToday',
  })
  getDashboard(@CurrentUser('userId') userId: string) {
    return this.hallService.getDashboard(userId);
  }
}
