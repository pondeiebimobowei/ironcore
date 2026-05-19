import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlitchTipExceptionFilter } from './lib/monitoring/glitchtip-exception.filter';
import {
  glitchTipReporter,
  registerGlitchTipProcessHandlers,
} from './lib/monitoring/glitchtip';

registerGlitchTipProcessHandlers();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);

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
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(port);
}
void bootstrap();
