import {
  ArgumentsHost,
  Catch,
  HttpException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { HttpServer } from '@nestjs/common';
import type { Request } from 'express';
import { GlitchTipReporter } from './glitchtip';

@Catch()
export class GlitchTipExceptionFilter extends BaseExceptionFilter {
  constructor(
    private readonly reporter: GlitchTipReporter,
    applicationRef?: HttpServer,
  ) {
    super(applicationRef);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    if (status >= 500) {
      this.reporter.captureException(exception, {
        mechanism: 'nestjs_exception_filter',
        tags: {
          status,
          method: request.method,
          path: request.path,
        },
      });
    }

    super.catch(exception, host);
  }
}
