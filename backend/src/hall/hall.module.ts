import { Module } from '@nestjs/common';
import { HallController } from './hall.controller';
import { HallService } from './hall.service';

@Module({
  controllers: [HallController],
  providers: [HallService],
})
export class HallModule {}
