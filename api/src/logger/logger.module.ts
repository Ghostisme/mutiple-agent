/**
 * =============================================================
 * 【学习笔记】NestJS + Winston 日志模块
 *
 * 核心知识点：
 *   1. WinstonModule.forRoot() — 全局注册 Winston 作为 NestJS Logger
 *   2. Transports（传输器）— 决定日志写到哪里：控制台 / 文件
 *   3. format — 控制日志的格式：时间戳、颜色、JSON 等
 *   4. 日志级别（Level）从低到高：error > warn > info > debug > verbose
 *
 * 文件输出位置（项目根目录 api/logs/）：
 *   - combined.log  → 所有日志（info 级别以上）
 *   - error.log     → 仅 error 级别
 * =============================================================
 */

import { Module } from '@nestjs/common';
import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';

// logs/ 目录放在 api/ 根目录下，方便直接查看
const logsDir = path.join(process.cwd(), 'logs');

@Module({
  imports: [
    WinstonModule.forRoot({
      // 全局最低记录级别，低于此级别的日志会被忽略
      level: 'debug',

      transports: [
        // ── Transport 1: 控制台输出（带颜色，开发体验友好）─────────────────
        new winston.transports.Console({
          format: winston.format.combine(
            // 为不同 level 添加颜色
            winston.format.colorize({ all: true }),
            // 打印时间戳
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            // 使用 NestJS 风格的格式：[NestWinston] {context} - message
            nestWinstonModuleUtilities.format.nestLike('App', {
              colors: true,
              prettyPrint: true,
            }),
          ),
        }),

        // ── Transport 2: combined.log（记录 info 及以上所有日志）───────────
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          level: 'info',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            // 文件使用 JSON 格式，方便机器解析 / grep
            winston.format.json(),
          ),
          // 单个文件最大 10MB，超出自动轮转
          maxsize: 10 * 1024 * 1024,
          // 保留最近 5 个轮转文件
          maxFiles: 5,
        }),

        // ── Transport 3: error.log（仅记录 error 级别）─────────────────────
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            // 将 Error stack trace 也一并输出
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 3,
        }),
      ],
    }),
  ],
  // 将 WinstonModule 导出，让其他模块也能直接注入 WINSTON_MODULE_PROVIDER
  exports: [WinstonModule],
})
export class LoggerModule {}
