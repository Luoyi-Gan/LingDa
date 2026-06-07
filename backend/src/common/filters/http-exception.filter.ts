import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES } from '../constants/error-codes';
import { BusinessException } from '../exceptions/business.exception';

/**
 * 全局异常过滤器 —— 把任意异常统一封装为契约规定的:
 *   { code, data: null, msg }
 *
 * 优先级:
 *   1. BusinessException → 用其自身 code / msg,HTTP 200
 *   2. HttpException(校验失败等)→ 映射到 VALIDATION_FAILED 或 UNAUTHORIZED
 *   3. 其他未知异常 → INTERNAL_ERROR,HTTP 500
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ method?: string; url?: string }>();

    // === 1. 业务异常 ===
    if (exception instanceof BusinessException) {
      const body = exception.getResponse() as { code: number; msg: string };
      return res.status(HttpStatus.OK).json({
        code: body.code,
        data: null,
        msg: body.msg,
      });
    }

    // === 2. Nest HttpException(含 ValidationPipe 抛的 400 / 401)===
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const msg =
        typeof raw === 'string'
          ? raw
          : (raw as any)?.message || exception.message;

      let code: number = ERROR_CODES.VALIDATION_FAILED;
      if (status === HttpStatus.UNAUTHORIZED) code = ERROR_CODES.UNAUTHORIZED;
      else if (status === HttpStatus.FORBIDDEN) code = ERROR_CODES.FORBIDDEN;
      else if (status === HttpStatus.NOT_FOUND) code = ERROR_CODES.NOT_FOUND;

      return res.status(HttpStatus.OK).json({
        code,
        data: null,
        msg: Array.isArray(msg) ? msg.join('; ') : msg,
      });
    }

    // === 3. 未知异常 === —— 打全 stack 方便排查
    const ex: any = exception;
    this.logger.error(
      `Unhandled exception on ${req?.method} ${req?.url}: ${ex?.message || String(ex)}`,
      ex?.stack,
    );
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ERROR_CODES.INTERNAL_ERROR,
      data: null,
      msg: ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR],
    });
  }
}
