import 'reflect-metadata';

import { NestFactory, Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { apiEnv } from './env';
import { AppModule } from './app.module';
import { StructuredLogger } from './common/logging/structured-logger.service';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(StructuredLogger);
  app.useLogger(logger);
  app.use(cookieParser());
  app.use(helmet());
  app.use('/api/v1/webhooks/tradingview', express.text({ type: '*/*', limit: '1mb' }));
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new RequestContextInterceptor(logger));
  app.useGlobalGuards(new RolesGuard(app.get(Reflector)));
  app.enableCors({
    origin: [apiEnv.WEB_APP_URL],
    credentials: true,
  });

  const swagger = new DocumentBuilder()
    .setTitle('TradeBridge API')
    .setDescription('Multi-tenant TradingView to MT5 execution platform')
    .setVersion('0.1.0')
    .addCookieAuth('tb_session')
    .build();
  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(apiEnv.PORT);
  logger.log(`API listening on port ${apiEnv.PORT}`, 'Bootstrap');
}

bootstrap();
