import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { LlmExceptionFilter } from './filters/llm-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 禁用 NestJS 默认 logger，稍后用 Winston 替换
    bufferLogs: false,
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true,
    },
  });

  // 将 NestJS 全局 Logger 替换为 Winston
  // 这样 NestJS 自身输出的框架日志（路由注册、模块加载等）也会经过 Winston 写入文件
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new LlmExceptionFilter());

  const port = process.env.PORT || 3001;
  await app.listen(port);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`🚀 API running on http://localhost:${port}`, 'Bootstrap');
  logger.log('日志文件写入目录: ./logs/combined.log  ./logs/error.log', 'Bootstrap');
}

bootstrap();
