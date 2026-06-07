import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const config = app.get(ConfigService);

  // 统一前缀 /api/v1
  app.setGlobalPrefix('api/v1');

  // 全局校验管道 —— DTO 上 @IsString() 等装饰器生效
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // 剔除入参中未在 DTO 声明的字段
      forbidNonWhitelisted: false,
      transform: true,         // 自动把入参转换为 DTO 类型(含 query 的字符串→数字)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('校园搭子 API')
    .setDescription('NestJS + Prisma + MySQL + Socket.IO')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, doc);

  const port = config.get<number>('port') || 3000;
  // 显式监听 0.0.0.0,这样手机/局域网才能访问
  await app.listen(port, '0.0.0.0');

  Logger.log(`🚀 dazi-backend ready at http://localhost:${port}/api/v1`, 'Bootstrap');
  Logger.log(`📘 Swagger at http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap();
