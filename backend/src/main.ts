import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.disable('x-powered-by');
  const config = app.get(ConfigService);
  const env = config.get<string>('env') || 'development';
  const jwtSecret = config.get<string>('jwt.secret');
  if (env === 'production' && (!jwtSecret || jwtSecret === 'change-me' || jwtSecret.length < 32)) {
    throw new Error('Production requires a unique JWT_SECRET of at least 32 characters');
  }

  const allowedOrigins = config.get<string[]>('corsOrigins') || [];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
    credentials: false,
    maxAge: 86400,
  });
  app.set('trust proxy', 1);
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (
      req.path.startsWith('/api/v1/auth') ||
      req.path.startsWith('/api/v1/community/verification') ||
      req.path.startsWith('/api/v1/uploads/verification-materials')
    ) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });

  const publicUploadDirectory = config.get<string>('storage.publicDir') || join(process.cwd(), 'uploads');
  app.useStaticAssets(publicUploadDirectory, {
    prefix: '/uploads/',
    setHeaders: (response) => {
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  });

  // 统一前缀 /api/v1
  app.setGlobalPrefix('api/v1');

  // 全局校验管道 —— DTO 上 @IsString() 等装饰器生效
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // 剔除入参中未在 DTO 声明的字段
      forbidNonWhitelisted: true,
      transform: true,         // 自动把入参转换为 DTO 类型(含 query 的字符串→数字)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (env !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('校园搭子 API')
      .setDescription('NestJS + Prisma + MySQL + Socket.IO')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, doc);
  }

  const port = config.get<number>('port') || 3000;
  const host = config.get<string>('host') || '0.0.0.0';
  await app.listen(port, host);

  Logger.log(`dazi-backend ready on ${host}:${port}/api/v1`, 'Bootstrap');
  if (env !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    Logger.log(`Swagger available at http://localhost:${port}/docs`, 'Bootstrap');
  }
}

bootstrap();
