"""
=============================================================
 【学习任务】阶段 6 — 三种记忆策略

 你需要完成的任务：
   实现 SummaryMemoryStrategy.add_messages() 和 get_messages()

 三种策略对比：
   Buffer  — 全量保存，简单粗暴，超长会触发 token 限制
   Window  — 滑动窗口，只保留最近 K 条，稳定可控
   Summary — 超出窗口时用 LLM 压缩摘要，平衡信息量与长度
=============================================================
"""

import json
from abc import ABC, abstractmethod
from typing import Optional
import redis.asyncio as aioredis
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage

from config import get_settings

settings = get_settings()

REDIS_TTL = 3600  # 1 小时


class BaseMemoryStrategy(ABC):
    @abstractmethod
    async def add_messages(self, session_id: str, human: str, ai: str): ...

    @abstractmethod
    async def get_messages(self, session_id: str) -> list[BaseMessage]: ...

    @abstractmethod
    async def clear(self, session_id: str): ...


class BufferMemoryStrategy(BaseMemoryStrategy):
    """
    全量记忆：所有历史消息都保存在 Redis。
    超出 max_tokens 时直接截断最早的消息。
    """

    def __init__(self, redis: aioredis.Redis, max_messages: int = 100):
        self.redis = redis
        self.max_messages = max_messages

    def _key(self, session_id: str) -> str:
        return f"memory:buffer:{session_id}"

    async def add_messages(self, session_id: str, human: str, ai: str):
        key = self._key(session_id)
        pipe = self.redis.pipeline()
        pipe.rpush(key, json.dumps({"role": "human", "content": human}))
        pipe.rpush(key, json.dumps({"role": "ai", "content": ai}))
        # 超出限制时删除最早的消息对
        pipe.ltrim(key, -self.max_messages * 2, -1)
        pipe.expire(key, REDIS_TTL)
        await pipe.execute()

    async def get_messages(self, session_id: str) -> list[BaseMessage]:
        key = self._key(session_id)
        raw = await self.redis.lrange(key, 0, -1)
        messages = []
        for item in raw:
            data = json.loads(item)
            if data["role"] == "human":
                messages.append(HumanMessage(content=data["content"]))
            else:
                messages.append(AIMessage(content=data["content"]))
        return messages

    async def clear(self, session_id: str):
        await self.redis.delete(self._key(session_id))


class WindowMemoryStrategy(BaseMemoryStrategy):
    """
    窗口记忆：只保留最近 K 条对话，固定内存占用。
    """

    def __init__(self, redis: aioredis.Redis, window_size: int = 10):
        self.redis = redis
        self.window_size = window_size

    def _key(self, session_id: str) -> str:
        return f"memory:window:{session_id}"

    async def add_messages(self, session_id: str, human: str, ai: str):
        key = self._key(session_id)
        pipe = self.redis.pipeline()
        pipe.rpush(key, json.dumps({"role": "human", "content": human}))
        pipe.rpush(key, json.dumps({"role": "ai", "content": ai}))
        # 严格保持窗口大小
        pipe.ltrim(key, -(self.window_size * 2), -1)
        pipe.expire(key, REDIS_TTL)
        await pipe.execute()

    async def get_messages(self, session_id: str) -> list[BaseMessage]:
        key = self._key(session_id)
        raw = await self.redis.lrange(key, 0, -1)
        messages = []
        for item in raw:
            data = json.loads(item)
            if data["role"] == "human":
                messages.append(HumanMessage(content=data["content"]))
            else:
                messages.append(AIMessage(content=data["content"]))
        return messages

    async def clear(self, session_id: str):
        await self.redis.delete(self._key(session_id))


class SummaryMemoryStrategy(BaseMemoryStrategy):
    """
    摘要记忆：保留最近 K 条 + 历史摘要。
    超出窗口时，用 LLM 将旧消息压缩成摘要存储。

    ============================================================
    【你的任务】
    1. 实现 _summarize() — 调用 LLM 对旧消息生成摘要
    2. 实现 add_messages() — 超出窗口时触发摘要压缩
    3. 实现 get_messages() — 返回 [SystemMessage(摘要)] + 最近窗口消息

    提示：
      - 摘要存在 Redis key: memory:summary:{session_id}
      - 最近消息存在 Redis key: memory:summary_window:{session_id}
      - _summarize() 的 prompt 示例：
        "请将以下对话历史压缩为简洁摘要，保留关键信息：\n{history}"
    ============================================================
    """

    def __init__(
        self,
        redis: aioredis.Redis,
        llm: Optional[ChatOllama] = None,
        window_size: int = 6,
    ):
        self.redis = redis
        self.llm = llm or ChatOllama(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
        )
        self.window_size = window_size

    def _window_key(self, session_id: str) -> str:
        return f"memory:summary_window:{session_id}"

    def _summary_key(self, session_id: str) -> str:
        return f"memory:summary:{session_id}"

    async def _summarize(self, messages: list[BaseMessage]) -> str:
        """TODO: 你来实现 — 调用 LLM 生成对话摘要"""
        raise NotImplementedError("请实现 _summarize() 方法")

    async def add_messages(self, session_id: str, human: str, ai: str):
        """TODO: 你来实现 — 添加消息，超出窗口时触发摘要"""
        raise NotImplementedError("请实现 add_messages() 方法")

    async def get_messages(self, session_id: str) -> list[BaseMessage]:
        """TODO: 你来实现 — 返回摘要 + 窗口消息"""
        raise NotImplementedError("请实现 get_messages() 方法")

    async def clear(self, session_id: str):
        pipe = self.redis.pipeline()
        pipe.delete(self._window_key(session_id))
        pipe.delete(self._summary_key(session_id))
        await pipe.execute()


class MemoryService:
    """根据 Agent 配置的 memory_type 选择记忆策略"""

    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        if not self._redis:
            self._redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        return self._redis

    async def get_strategy(self, memory_type: str) -> BaseMemoryStrategy:
        redis = await self._get_redis()
        if memory_type == "window":
            return WindowMemoryStrategy(redis)
        elif memory_type == "summary":
            return SummaryMemoryStrategy(redis)
        else:
            return BufferMemoryStrategy(redis)

    async def add_turn(
        self, session_id: str, human: str, ai: str, memory_type: str = "buffer"
    ):
        strategy = await self.get_strategy(memory_type)
        await strategy.add_messages(session_id, human, ai)

    async def get_history(
        self, session_id: str, memory_type: str = "buffer"
    ) -> list[BaseMessage]:
        strategy = await self.get_strategy(memory_type)
        return await strategy.get_messages(session_id)

    async def clear_session(self, session_id: str):
        redis = await self._get_redis()
        for prefix in ["buffer", "window", "summary_window", "summary"]:
            await redis.delete(f"memory:{prefix}:{session_id}")
