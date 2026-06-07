import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: '健康检查 —— 验证脚手架与全局响应封装' })
  check() {
    return {
      ok: true,
      service: 'dazi-backend',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
