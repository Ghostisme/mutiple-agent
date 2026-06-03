"""
=============================================================
 【学习任务】阶段 7 — 指数退避重试装饰器

 你需要理解：
   1. tenacity 库的 @retry 装饰器原理
   2. 指数退避（Exponential Backoff）为什么比固定间隔好
      → 避免瞬间大量重试打垮服务
      → jitter（随机抖动）防止多个客户端同时重试形成"惊群效应"
   3. stop_after_attempt vs wait_exponential 参数含义

 【你的任务】：
   完善 with_retry() 函数，让它接受自定义参数：
   - max_attempts: 最大重试次数
   - min_wait / max_wait: 等待时间范围
   - reraise: 最终失败时是否重新抛出原始异常
=============================================================
"""

import asyncio
import logging
from functools import wraps
from typing import Callable, TypeVar, Awaitable

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

logger = logging.getLogger(__name__)
T = TypeVar("T")

# 定义哪些异常应该重试（连接错误、超时等）
RETRYABLE_EXCEPTIONS = (
    ConnectionError,
    TimeoutError,
    OSError,
)


def with_retry(
    max_attempts: int = 3,
    min_wait: float = 1.0,
    max_wait: float = 10.0,
):
    """
    指数退避重试装饰器

    用法：
      @with_retry(max_attempts=3)
      async def call_llm(prompt: str) -> str:
          ...

    重试间隔：1s → 2s → 4s（指数增长，上限 10s）
    """
    return retry(
        stop=stop_after_attempt(max_attempts),
        wait=wait_exponential(multiplier=1, min=min_wait, max=max_wait),
        retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )


async def retry_async(
    fn: Callable[..., Awaitable[T]],
    *args,
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 10.0,
    **kwargs,
) -> T:
    """
    手动重试版本（无装饰器，更灵活）

    【TODO：你来理解】：
    为什么 delay = min(base_delay * 2**attempt, max_delay)？
      attempt=0: delay=1.0
      attempt=1: delay=2.0
      attempt=2: delay=4.0
      attempt=3: delay=8.0
      attempt=4: delay=10.0（上限截断）

    jitter = random.uniform(0, delay * 0.1) 是什么？
      给延迟加上随机偏移，防止多个并发请求在同一时刻重试。
    """
    import random

    last_exc: Exception | None = None
    for attempt in range(max_attempts):
        try:
            return await fn(*args, **kwargs)
        except RETRYABLE_EXCEPTIONS as e:
            last_exc = e
            if attempt < max_attempts - 1:
                delay = min(base_delay * (2**attempt), max_delay)
                jitter = random.uniform(0, delay * 0.1)
                logger.warning(
                    f"Retry {attempt + 1}/{max_attempts} after {delay:.1f}s: {e}"
                )
                await asyncio.sleep(delay + jitter)

    raise last_exc or RuntimeError("Max retries exceeded")
