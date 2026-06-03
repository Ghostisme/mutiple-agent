"""
=============================================================
 【学习任务】阶段 5 — LangGraph 状态机核心

 架构说明：
   router_node  → 判断走哪条路：直接回答 / RAG检索 / 工具调用
   retrieval_node → ChromaDB 语义搜索，注入上下文
   tool_node    → 执行工具（危险工具需 HITL 确认）
   generate_node → 调用 LLM 生成最终回答（流式）

 你需要完成的任务（标注了 TODO）：
   1. retrieval_node() — 实现 RAG 检索逻辑
   2. generate_node() — 实现流式生成，区分普通文本 vs 图表数据
   3. tools.py — 实现自定义工具
=============================================================
"""

import json
from typing import AsyncIterator, TypedDict, Annotated, Optional
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from langgraph.graph import StateGraph, START, END
import operator

from config import get_settings
from schemas import ChatRequest, SSEEvent, SSEEventType, ChartData
from services.memory_service import MemoryService
from services.knowledge_service import KnowledgeService
from services.hitl_store import HitlStore

settings = get_settings()


# ── 图状态定义 ──────────────────────────────────────────────
# Annotated[list, operator.add] 表示该字段是可累加的（每个节点只追加，不覆盖）

class AgentState(TypedDict):
    session_id: str
    agent_id: str
    system_prompt: str
    memory_type: str
    model: str
    collection_id: Optional[str]
    enabled_tools: list[str]

    user_message: str
    messages: Annotated[list[BaseMessage], operator.add]
    retrieved_context: str
    route: str                  # "direct" | "rag" | "tool"
    tool_name: Optional[str]
    tool_args: Optional[dict]
    tool_result: Optional[str]

    # SSE 事件队列（节点将事件放入，graph_service 逐个 yield）
    sse_events: Annotated[list[SSEEvent], operator.add]


# ── 工具注册表 ─────────────────────────────────────────────

TOOL_REGISTRY: dict[str, callable] = {}


def register_tool(name: str):
    def decorator(fn):
        TOOL_REGISTRY[name] = fn
        return fn
    return decorator


# ── 节点函数 ───────────────────────────────────────────────

memory_service = MemoryService()
knowledge_service = KnowledgeService()
hitl_store = HitlStore()


async def router_node(state: AgentState) -> dict:
    """
    路由节点：分析用户意图，决定走哪条分支。
    输出 route = "direct" | "rag" | "tool"
    """
    step_event = SSEEvent(
        event=SSEEventType.step,
        data={"node": "router", "message": "分析用户意图..."},
        session_id=state["session_id"],
    )

    msg = state["user_message"].lower()
    has_knowledge = bool(state.get("collection_id"))
    has_tools = bool(state.get("enabled_tools"))

    # 简单关键词路由（实际项目可改为 LLM 分类）
    chart_keywords = ["图表", "图", "趋势", "统计", "数据分析", "chart", "plot"]
    tool_keywords = ["删除", "创建", "发送", "搜索", "查询", "时间", "天气"]

    if has_tools and any(k in msg for k in tool_keywords):
        route = "tool"
    elif has_knowledge and len(msg) > 5:
        route = "rag"
    else:
        route = "direct"

    route_event = SSEEvent(
        event=SSEEventType.step,
        data={"node": "router", "message": f"路由决策: {route}"},
        session_id=state["session_id"],
    )

    return {"route": route, "sse_events": [step_event, route_event]}


async def retrieval_node(state: AgentState) -> dict:
    """
    ============================================================
    【你的任务】实现 RAG 检索节点

    步骤：
      1. 发送 step 事件告知前端正在检索
      2. 调用 knowledge_service.search() 检索相关文档
      3. 将检索结果拼接为 context 字符串
      4. 返回 retrieved_context

    参考代码：
      results = await knowledge_service.search(
          agent_id=state["agent_id"],
          query=state["user_message"],
          top_k=5,
      )
      context = "\n\n".join([r["content"] for r in results])
    ============================================================
    """
    step_event = SSEEvent(
        event=SSEEventType.step,
        data={"node": "retrieval", "message": "检索知识库..."},
        session_id=state["session_id"],
    )
    # TODO: 你来实现 RAG 检索逻辑
    return {"retrieved_context": "", "sse_events": [step_event]}


async def tool_node(state: AgentState) -> dict:
    """
    工具执行节点，包含 HITL 危险操作确认机制。

    危险工具（如 delete_record）执行前会：
      1. 发送 hitl 事件给前端，展示确认对话框
      2. 挂起等待用户点击确认/拒绝
      3. 用户确认后继续执行，拒绝则跳过
    """
    step_event = SSEEvent(
        event=SSEEventType.step,
        data={"node": "tool", "message": "准备调用工具..."},
        session_id=state["session_id"],
    )

    # 这里简化处理：通过 LLM 解析工具意图
    # 实际项目使用 LangChain bind_tools() + tool calling
    tool_name = "get_current_time"  # 示例
    tool_args = {}

    DANGEROUS_TOOLS = {"delete_record", "send_email", "execute_code"}
    events = [step_event]

    if tool_name in DANGEROUS_TOOLS:
        from schemas import HitlPauseData
        hitl_data = HitlPauseData(
            tool_name=tool_name,
            tool_args=tool_args,
            description=f"Agent 即将执行危险操作：{tool_name}，请确认是否继续",
            session_id=state["session_id"],
        )
        hitl_event = SSEEvent(
            event=SSEEventType.hitl,
            data=hitl_data.model_dump(),
            session_id=state["session_id"],
        )
        events.append(hitl_event)

        pending = hitl_store.register(state["session_id"])
        approved, reason = await hitl_store.wait_for_response(state["session_id"])
        if not approved:
            return {
                "tool_result": f"操作已取消: {reason}",
                "sse_events": events,
            }

    tool_fn = TOOL_REGISTRY.get(tool_name)
    if tool_fn:
        result = await tool_fn(**tool_args)
    else:
        result = f"工具 {tool_name} 未注册"

    return {"tool_result": str(result), "tool_name": tool_name, "sse_events": events}


async def generate_node(state: AgentState) -> dict:
    """
    ============================================================
    【你的任务】实现流式生成节点

    关键点：
      1. 组装完整 prompt（system_prompt + 历史消息 + 上下文 + 用户消息）
      2. 用 ChatOllama.astream() 获取 token 流
      3. 对每个 token 发送 SSEEventType.token 事件
      4. 识别图表意图时，发送 SSEEventType.chart_data 事件

    图表识别逻辑（简化示例）：
      如果 AI 回答包含 ```json ... ``` 且有 chart_type 字段，
      则解析为 ChartData 并发送 chart_data 事件

    参考流式代码：
      llm = ChatOllama(base_url=..., model=..., streaming=True)
      async for chunk in llm.astream(messages):
          token = chunk.content
          yield SSEEvent(event=SSEEventType.token, data=token)
    ============================================================
    """
    step_event = SSEEvent(
        event=SSEEventType.step,
        data={"node": "generate", "message": "生成回答..."},
        session_id=state["session_id"],
    )

    # 获取历史记忆
    history = await memory_service.get_history(
        state["session_id"], state.get("memory_type", "buffer")
    )

    # 组装消息列表
    messages: list[BaseMessage] = []

    system_content = state["system_prompt"]
    if state.get("retrieved_context"):
        system_content += f"\n\n以下是相关知识库内容，请参考回答：\n{state['retrieved_context']}"
    if state.get("tool_result"):
        system_content += f"\n\n工具执行结果：{state['tool_result']}"

    messages.append(SystemMessage(content=system_content))
    messages.extend(history)
    messages.append(HumanMessage(content=state["user_message"]))

    # TODO: 你来实现流式生成逻辑
    # 临时占位，返回非流式结果
    llm = ChatOllama(
        base_url=settings.ollama_base_url,
        model=state.get("model", settings.ollama_model),
    )
    response = await llm.ainvoke(messages)
    ai_content = response.content

    # 保存到记忆
    await memory_service.add_turn(
        session_id=state["session_id"],
        human=state["user_message"],
        ai=ai_content,
        memory_type=state.get("memory_type", "buffer"),
    )

    # 将完整内容作为单个 token 事件发送（TODO：改为流式）
    token_event = SSEEvent(
        event=SSEEventType.token,
        data=ai_content,
        session_id=state["session_id"],
    )
    done_event = SSEEvent(
        event=SSEEventType.done,
        data=None,
        session_id=state["session_id"],
    )

    return {"sse_events": [step_event, token_event, done_event]}


def route_condition(state: AgentState) -> str:
    """条件边：根据 route 字段决定下一个节点"""
    return state.get("route", "direct")


# ── 构建图 ─────────────────────────────────────────────────

def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("router", router_node)
    graph.add_node("retrieval", retrieval_node)
    graph.add_node("tool", tool_node)
    graph.add_node("generate", generate_node)

    graph.add_edge(START, "router")
    graph.add_conditional_edges(
        "router",
        route_condition,
        {
            "direct": "generate",
            "rag": "retrieval",
            "tool": "tool",
        },
    )
    graph.add_edge("retrieval", "generate")
    graph.add_edge("tool", "generate")
    graph.add_edge("generate", END)

    return graph.compile()


# ── GraphService ───────────────────────────────────────────

class GraphService:
    def __init__(self):
        self.graph = build_graph()

    async def run_stream(self, request: ChatRequest) -> AsyncIterator[SSEEvent]:
        """
        执行 Agent 图并流式 yield SSE 事件。

        注意：LangGraph 的 astream() 返回每个节点执行后的完整状态快照。
        我们从每个快照的 sse_events 字段中提取事件 yield 出去。
        """
        import httpx
        from config import get_settings
        cfg = get_settings()

        # 从 NestJS API 加载 Agent 配置
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"{cfg.api_base_url}/agents/{request.agent_id}",
                    timeout=5.0,
                )
                agent_cfg = resp.json()
            except Exception:
                agent_cfg = {
                    "system_prompt": "你是一个有帮助的 AI 助手。",
                    "model": cfg.ollama_model,
                    "memory_type": "buffer",
                    "tools": [],
                    "collection_id": None,
                }

        initial_state: AgentState = {
            "session_id": request.session_id,
            "agent_id": request.agent_id,
            "system_prompt": agent_cfg.get("system_prompt", "你是一个有帮助的 AI 助手。"),
            "memory_type": agent_cfg.get("memory_type", "buffer"),
            "model": agent_cfg.get("model", cfg.ollama_model),
            "collection_id": agent_cfg.get("collection_id"),
            "enabled_tools": agent_cfg.get("tools", []),
            "user_message": request.message,
            "messages": [],
            "retrieved_context": "",
            "route": "direct",
            "tool_name": None,
            "tool_args": None,
            "tool_result": None,
            "sse_events": [],
        }

        async for snapshot in self.graph.astream(initial_state):
            for node_output in snapshot.values():
                if isinstance(node_output, dict):
                    for event in node_output.get("sse_events", []):
                        yield event

    async def clear_session(self, session_id: str):
        await memory_service.clear_session(session_id)
