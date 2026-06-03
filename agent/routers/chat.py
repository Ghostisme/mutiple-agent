"""
=============================================================
 【学习任务】阶段 4 — SSE 流式端点
 你需要理解：
   1. FastAPI StreamingResponse 如何实现 SSE
   2. async generator (yield) 为何是流式的关键
   3. 不同 event type 如何让前端区分处理逻辑
   4. HITL 中断时如何挂起 Agent 并等待恢复
=============================================================
"""

import json
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from schemas import ChatRequest, HitlResponse, SSEEvent, SSEEventType
from services.graph_service import GraphService
from services.hitl_store import HitlStore

router = APIRouter()
graph_service = GraphService()
hitl_store = HitlStore()


def format_sse(event: SSEEvent) -> str:
    """将 SSEEvent 格式化为标准 SSE 文本协议"""
    data = json.dumps(event.model_dump(), ensure_ascii=False)
    return f"event: {event.event.value}\ndata: {data}\n\n"


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    主聊天流式端点 — 返回 SSE 事件流

    事件流示例：
      event: step\ndata: {"event":"step","data":"[router] 分析用户意图..."}\n\n
      event: token\ndata: {"event":"token","data":"你好"}\n\n
      event: chart_data\ndata: {"event":"chart_data","data":{...}}\n\n
      event: hitl\ndata: {"event":"hitl","data":{"tool_name":"delete_record",...}}\n\n
      event: done\ndata: {"event":"done","data":null}\n\n
    """

    async def event_generator():
        try:
            async for event in graph_service.run_stream(request):
                yield format_sse(event)
                # 给前端一点喘息时间，避免背压
                await asyncio.sleep(0)
        except asyncio.CancelledError:
            yield format_sse(SSEEvent(
                event=SSEEventType.done,
                data=None,
                session_id=request.session_id,
            ))
        except Exception as e:
            yield format_sse(SSEEvent(
                event=SSEEventType.error,
                data=str(e),
                session_id=request.session_id,
            ))
            yield format_sse(SSEEvent(
                event=SSEEventType.done,
                data=None,
                session_id=request.session_id,
            ))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/hitl/respond")
async def hitl_respond(response: HitlResponse):
    """
    Human-in-the-Loop 确认接口

    当 Agent 遇到危险操作时会暂停并发送 hitl 事件给前端，
    用户点击确认/拒绝后调用此接口，Agent 从暂停处恢复执行。
    """
    await hitl_store.resolve(response.session_id, response.approved, response.reason)
    return {"status": "ok", "session_id": response.session_id}


@router.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    """清除会话记忆"""
    await graph_service.clear_session(session_id)
    return {"status": "cleared", "session_id": session_id}
