/**
 * =============================================================
 * 【学习任务】阶段 7 — NestJS 异常过滤器
 *
 * 你需要理解：
 *   1. @Catch() 装饰器如何捕获特定类型的异常
 *   2. ExceptionFilter 接口的 catch() 方法签名
 *   3. 为什么要统一异常格式（方便前端统一处理）
 *
 * 【你的任务】：
 *   在 catch() 方法中实现统一的错误响应格式：
 *   {
 *     "statusCode": 500,
 *     "error": "LlmServiceError",
 *     "message": "...",
 *     "timestamp": "...",
 *     "retryable": true/false
 *   }
 * =============================================================
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export class LlmException extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean = true,
    public readonly statusCode: number = HttpStatus.SERVICE_UNAVAILABLE,
  ) {
    super(message);
    this.name = 'LlmException';
  }
}

@Catch(LlmException, HttpException)
export class LlmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LlmExceptionFilter.name);

  catch(exception: LlmException | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let message: string;
    let retryable: boolean;

    if (exception instanceof LlmException) {
      statusCode = exception.statusCode;
      message = exception.message;
      retryable = exception.retryable;
    } else {
      statusCode = exception.getStatus();
      message = String(exception.message);
      retryable = false;
    }

    this.logger.error(`[${request.method}] ${request.url} → ${message}`);

    /**
     * TODO: 你来完善这里的响应体格式
     * 加入 timestamp、path、requestId 等字段
     */
    response.status(statusCode).json({
      statusCode,
      error: exception.name,
      message,
      retryable,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
