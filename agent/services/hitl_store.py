"""
=============================================================
 【学习任务】阶段 5 — Human-in-the-Loop 状态存储
 你需要理解：
   1. asyncio.Event 如何实现异步等待/唤醒
   2. 为什么 HITL 需要持久化（进程重启后恢复）
   3. 超时机制防止 Agent 永久阻塞
=============================================================
"""

import asyncio
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class HitlPending:
    """挂起中的 HITL 确认请求"""
    event: asyncio.Event = field(default_factory=asyncio.Event)
    approved: Optional[bool] = None
    reason: Optional[str] = None


class HitlStore:
    """
    内存中的 HITL 状态存储。

    生产环境应替换为 Redis 持久化，以支持：
      - 服务重启后恢复
      - 多实例部署
    """

    def __init__(self):
        self._pending: dict[str, HitlPending] = {}

    def register(self, session_id: str) -> HitlPending:
        """注册一个新的 HITL 等待点"""
        pending = HitlPending()
        self._pending[session_id] = pending
        return pending

    async def wait_for_response(
        self,
        session_id: str,
        timeout: float = 300.0,
    ) -> tuple[bool, Optional[str]]:
        """
        阻塞等待用户响应，最多等待 timeout 秒。

        Returns:
            (approved, reason) — approved=False 表示超时或拒绝
        """
        pending = self._pending.get(session_id)
        if not pending:
            return False, "No pending HITL for this session"

        try:
            await asyncio.wait_for(pending.event.wait(), timeout=timeout)
            return pending.approved or False, pending.reason
        except asyncio.TimeoutError:
            return False, "HITL timeout: user did not respond in time"
        finally:
            self._pending.pop(session_id, None)

    async def resolve(
        self,
        session_id: str,
        approved: bool,
        reason: Optional[str] = None,
    ):
        """用户响应后唤醒等待中的 Agent"""
        pending = self._pending.get(session_id)
        if pending:
            pending.approved = approved
            pending.reason = reason
            pending.event.set()
