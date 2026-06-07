import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES, ERROR_MESSAGES } from '../constants/error-codes';

/**
 * 业务异常 —— 抛出后由 GlobalExceptionFilter 统一封装为
 *   { code, data: null, msg }
 *
 * 用法:
 *   throw new BusinessException(ERROR_CODES.ROOM_FULL);
 *   throw new BusinessException(ERROR_CODES.NOT_FOUND, '该用户不存在');
 */
export class BusinessException extends HttpException {
  readonly code: number;

  constructor(code: number, msg?: string, httpStatus: HttpStatus = HttpStatus.OK) {
    const message = msg || ERROR_MESSAGES[code] || '未知错误';
    super({ code, msg: message }, httpStatus);
    this.code = code;
  }
}
