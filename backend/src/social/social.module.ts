import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { SocialGroupService } from './social-group.service';

@Module({
  controllers: [SocialController],
  providers: [SocialService, SocialGroupService],
  exports: [SocialService, SocialGroupService],
})
export class SocialModule {}
