import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlitchTipExceptionFilter } from './lib/monitoring/glitchtip-exception.filter';
import {
  glitchTipReporter,
  initGlitchTip,
  registerGlitchTipProcessHandlers,
} from './lib/monitoring/glitchtip';
import * as Sentry from '@sentry/node';

function parseAllowedOrigins() {
  const configuredOrigins =
    process.env.WEB_ORIGINS ??
    process.env.WEB_ORIGIN ??
    'http://localhost:5173';

  return configuredOrigins
    .split(/[,\s]+/)
    .map((origin) => origin.trim())
    .filter(Boolean);
}

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  initGlitchTip({
    dsn: process.env.GLITCHTIP_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.APP_RELEASE ?? process.env.npm_package_version,
  });
  registerGlitchTipProcessHandlers();
  Sentry.setupExpressErrorHandler(app);
  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
  const allowedOrigins = parseAllowedOrigins();
  const corsOrigin = (
    origin: string | undefined,
    callback: CorsOriginCallback,
  ) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
  };

  app.setGlobalPrefix('api');
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new GlitchTipExceptionFilter(glitchTipReporter, httpAdapter.httpAdapter),
  );
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  await app.listen(port);
}
void bootstrap();
