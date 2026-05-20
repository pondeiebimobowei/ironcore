import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const windowMs = 60_000;
const maxAttempts = 20;
const attempts = new Map<string, RateLimitEntry>();

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const key = this.keyFor(request);
    const now = Date.now();
    const entry = attempts.get(key);

    if (!entry || entry.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    entry.count += 1;

    if (entry.count > maxAttempts) {
      throw new HttpException(
        'Too many authentication attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private keyFor(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const ip =
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : request.ip;
    const rawEmail =
      request.body &&
      typeof request.body === 'object' &&
      'email' in request.body
        ? (request.body as { email?: unknown }).email
        : '';
    const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase() : '';

    return `${ip ?? 'unknown'}:${email}`;
  }
}
