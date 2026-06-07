import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import configuration from './config/configuration';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RoomModule } from './room/room.module';
import { HallModule } from './hall/hall.module';
import { MemberModule } from './member/member.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { SocialModule } from './social/social.module';
import { ChatModule } from './chat/chat.module';
import { HealthModule } from './health/health.module';
import { NotificationModule } from './notification/notification.module';
import { PlacesModule } from './places/places.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    RoomModule,
    HallModule,
    MemberModule,
    EvaluationModule,
    SocialModule,
    ChatModule,
    HealthModule,
    NotificationModule,
    PlacesModule,
  ],
  providers: [
    // 全局守卫 —— 所有路由默认要求 JWT,@Public() 装饰过的方法放行
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 全局响应封装 → { code, data, msg }
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // 全局异常过滤器
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
