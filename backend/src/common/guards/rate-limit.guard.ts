import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '../constants/error-codes';
import { BusinessException } from '../exceptions/business.exception';

type Bucket = { count: number; resetAt: number };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private requestCount = 0;

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<{
      ip?: string;
      method?: string;
      originalUrl?: string;
      user?: { userId?: string };
    }>();
    const path = (request.originalUrl || '').split('?')[0];
    const policy = this.policyFor(path);
    const identity = request.user?.userId || request.ip || 'unknown';
    const key = `${identity}:${request.method || 'GET'}:${policy.name}`;
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + policy.windowMs });
    } else {
      current.count += 1;
      if (current.count > policy.limit) {
        throw new BusinessException(
          ERROR_CODES.TOO_MANY_REQUESTS,
          policy.message,
        );
      }
    }

    this.requestCount += 1;
    if (this.requestCount % 500 === 0) this.removeExpired(now);
    return true;
  }

  private policyFor(path: string) {
    if (path.endsWith('/auth/login') || path.endsWith('/auth/register')) {
      return {
        name: 'auth',
        limit: 10,
        windowMs: 15 * 60 * 1000,
        message: '登录或注册尝试过于频繁，请 15 分钟后再试',
      };
    }
    if (path.endsWith('/uploads/images')) {
      return {
        name: 'uploads',
        limit: 30,
        windowMs: 60 * 1000,
        message: '图片上传过于频繁，请稍后再试',
      };
    }
    return {
      name: 'api',
      limit: 180,
      windowMs: 60 * 1000,
      message: '操作过于频繁，请稍后再试',
    };
  }

  private removeExpired(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
