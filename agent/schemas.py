"""
=============================================================
 【学习任务】阶段 1 — Pydantic 数据模型
 你需要理解：
   1. Pydantic BaseModel 如何做请求/响应验证
   2. Optional vs 必填字段的区别
   3. Literal 类型如何限制枚举值
   4. SSE 事件为什么需要 event_type 字段区分消息种类
=============================================================
"""

from pydantic import BaseModel, Field
from typing import Optional, Any, Literal
from enum import Enum


# ── Agent 配置相关 ──────────────────────────────────────────

class MemoryType(str, Enum):
    buffer = "buffer"
    window = "window"
    summary = "summary"


class AgentConfig(BaseModel):
    """Agent 完整配置，从 NestJS API 加载"""
    id: str
    name: str
    description: Optional[str] = None
    system_prompt: str
    model: str = "llama3.2"
    memory_type: MemoryType = MemoryType.buffer
    tools: list[str] = Field(default_factory=list)
    collection_id: Optional[str] = None


# ── 聊天请求/响应 ───────────────────────────────────────────

class ChatRequest(BaseModel):
    """前端发起聊天的请求体"""
    agent_id: str
    session_id: str
    message: str
    stream: bool = True


class HitlResponse(BaseModel):
    """Human-in-the-Loop 确认响应"""
    session_id: str
    approved: bool
    reason: Optional[str] = None


# ── SSE 事件类型 ────────────────────────────────────────────
#
# 【核心知识点】SSE 流式输出的多种事件类型：
#
#  event: token       → 普通文字 token，前端拼接显示
#  event: step        → Agent 思考步骤（LangGraph 节点名），前端展示推理过程
#  event: chart_data  → Agent 生成的 BI 图表数据（结构化 JSON），前端用 Recharts 渲染
#  event: stream_chart→ 实时数据流图表，数据持续推送，图表动态更新
#  event: hitl        → Human-in-the-Loop 暂停，等待用户确认
#  event: error       → 错误信息
#  event: done        → 流结束信号

class SSEEventType(str, Enum):
    token = "token"
    step = "step"
    chart_data = "chart_data"
    stream_chart = "stream_chart"
    hitl = "hitl"
    error = "error"
    done = "done"


class SSEEvent(BaseModel):
    """统一的 SSE 事件结构"""
    event: SSEEventType
    data: Any
    session_id: Optional[str] = None


class ChartData(BaseModel):
    """BI 图表数据结构"""
    chart_type: Literal["line", "bar", "pie", "scatter", "area"]
    title: str
    x_field: str
    y_field: str
    data: list[dict[str, Any]]


class HitlPauseData(BaseModel):
    """HITL 暂停时发给前端的数据"""
    tool_name: str
    tool_args: dict[str, Any]
    description: str
    session_id: str


# ── 知识库相关 ──────────────────────────────────────────────

class DocumentChunk(BaseModel):
    """向量化后存入 ChromaDB 的文档块"""
    id: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class IngestRequest(BaseModel):
    agent_id: str
    filename: str
    content: str


class SearchRequest(BaseModel):
    agent_id: str
    query: str
    top_k: int = Field(default=5, ge=1, le=20)
