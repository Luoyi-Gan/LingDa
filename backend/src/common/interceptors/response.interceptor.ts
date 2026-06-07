import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ERROR_CODES } from '../constants/error-codes';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg: string;
}

/**
 * 全局响应封装 —— 所有 Controller 返回的对象统一被包成:
 *   { code: 0, data: <原对象>, msg: 'ok' }
 *
 * 如果 Controller 已显式返回 { code, data, msg } 结构则原样下发。
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // 已经是标准结构则透传
        if (data && typeof data === 'object' && 'code' in data && 'msg' in data) {
          return data as ApiResponse<T>;
        }
        return { code: ERROR_CODES.SUCCESS, data: data as T, msg: 'ok' };
      }),
    );
  }
}
