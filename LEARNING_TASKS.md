# 学习任务清单

每个任务都是一个独立的知识点，建议按阶段顺序完成。
完成一个打一个 ✅，遇到卡点可以回头看对应文件里的注释提示。

---

## 阶段 1 — 框架模块化 & 数据建模

### 任务 1-A：理解并完善 TypeORM 实体
**文件**：`api/src/agents/agent.entity.ts`

**你要做的**：
- 阅读现有实体，理解每个装饰器的作用
- 尝试新增一个字段，比如 `avatar_url`（可选文本）
- 思考：为什么 `tools` 用 `simple-array` 而不是单独建一张表？

**验证方式**：启动 NestJS 后查看 PostgreSQL 中 `agents` 表的结构是否符合预期

---

### 任务 1-B：理解 Pydantic 数据模型
**文件**：`agent/schemas.py`

**你要做的**：
- 阅读 `SSEEventType` 枚举，理解每种事件代表什么
- 为 `ChartData` 新增一个 `description` 可选字段
- 在 Python 控制台测试：`ChartData(chart_type="bar", title="测试", x_field="x", y_field="y", data=[])`

**关键问题**：`Literal["line", "bar", "pie", "scatter", "area"]` 和 `str` 有什么区别？

---

## 阶段 2 — NestJS 三层架构 & CRUD

### 任务 2-A：实现 AgentsService 的 5 个方法
**文件**：`api/src/agents/agents.service.ts`

逐个实现，每个方法不超过 5 行：

```typescript
// 1. create — 创建后用 saved.id 更新 collection_id
async create(dto: CreateAgentDto): Promise<Agent> {
  const agent = this.agentRepo.create(dto);
  const saved = await this.agentRepo.save(agent);
  if (!saved.collection_id) {
    await this.agentRepo.update(saved.id, { collection_id: saved.id });
  }
  return this.findOne(saved.id);
}

// 2. findAll — 只返回 is_active=true 的记录，按时间降序
// 3. findOne — 找不到时抛出 NotFoundException
// 4. update — 用 Object.assign 合并字段后保存
// 5. remove — 软删除（将 is_active 设为 false）
```

**验证方式**：用 curl 或 Postman 测试 `POST /agents`、`GET /agents`

---

### 任务 2-B：实现 Agent 编辑表单
**文件**：`web/app/agents/[id]/edit/page.tsx`

**你要做的**：
- 参考 `web/app/agents/new/page.tsx` 的结构
- 在 `handleSubmit` 中调用 `agentsApi.update(id, formData)`
- 提交成功后 `router.push('/agents')`

**额外挑战**：给 `system_prompt` 输入框加上实时字符计数

---

## 阶段 3 — RAG 向量化入库

### 任务 3-A：实现文档入库流程
**文件**：`agent/services/knowledge_service.py`，找到 `ingest_document()` 方法

**你要逐步实现**：

```python
async def ingest_document(self, agent_id: str, content: str, filename: str) -> dict:
    # 步骤 1：文本分块
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,       # 每块最多 500 字符
        chunk_overlap=50,     # 相邻块重叠 50 字符（保持上下文连续）
        separators=["\n\n", "\n", "。", ".", " ", ""],
    )
    chunks = splitter.split_text(content)

    # 步骤 2：向量化
    vectors = self.embeddings.embed_documents(chunks)

    # 步骤 3：存入 ChromaDB
    collection = self._get_collection(agent_id)
    ids = [str(uuid.uuid4()) for _ in chunks]
    collection.add(
        ids=ids,
        embeddings=vectors,
        documents=chunks,
        metadatas=[{"filename": filename, "chunk_index": i} for i in range(len(chunks))],
    )
    return {"chunks": len(chunks), "filename": filename}
```

**关键问题**：
- `chunk_size=500` 太大或太小各有什么问题？
- `chunk_overlap=50` 的目的是什么？

---

### 任务 3-B：实现知识库上传 UI
**文件**：`web/app/agents/[id]/knowledge/page.tsx`，找到 `handleUpload()` 函数

```typescript
const handleUpload = useCallback(async (files: File[]) => {
  setUploading(true);
  try {
    for (const file of files) {
      await knowledgeApi.upload(agentId, file);
      toast.success(`${file.name} 上传成功`);
    }
    // 刷新文档列表
    const docs = await knowledgeApi.list(agentId);
    setDocuments(docs);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '上传失败');
  } finally {
    setUploading(false);
  }
}, [agentId]);
```

**额外挑战**：给每个上传的文件添加进度状态（uploading/success/error）

---

## 阶段 4 — 流式输出（最核心的学习点）

### 任务 4-A：实现 generate_node 流式输出
**文件**：`agent/services/graph_service.py`，找到 `generate_node()` 函数

将当前的"一次性返回"改为"逐 token 流式"：

```python
async def generate_node(state: AgentState) -> dict:
    # ... 组装 messages 的代码保持不变 ...

    llm = ChatOllama(
        base_url=settings.ollama_base_url,
        model=state.get("model", settings.ollama_model),
    )

    # 改为流式：用 astream() 替代 ainvoke()
    events = [step_event]
    full_content = ""

    async for chunk in llm.astream(messages):
        token = chunk.content
        if token:
            full_content += token
            events.append(SSEEvent(
                event=SSEEventType.token,
                data=token,
                session_id=state["session_id"],
            ))

    # 判断是否包含图表数据（约定：AI 回答中 ```json {...} ``` 包含 chart_type 字段）
    chart = _try_extract_chart(full_content)
    if chart:
        events.append(SSEEvent(
            event=SSEEventType.chart_data,
            data=chart,
            session_id=state["session_id"],
        ))

    events.append(SSEEvent(event=SSEEventType.done, data=None, session_id=state["session_id"]))

    # 保存记忆
    await memory_service.add_turn(
        session_id=state["session_id"],
        human=state["user_message"],
        ai=full_content,
        memory_type=state.get("memory_type", "buffer"),
    )
    return {"sse_events": events}
```

**关键问题**：为什么 `astream()` 比 `ainvoke()` 用户体验更好？首个 token 延迟是多少？

---

### 任务 4-B：理解 useStreamingChat Hook 的每一行
**文件**：`web/hooks/useStreamingChat.ts`

**你要做的**（不需要改代码，而是回答问题）：
1. `chatReducer` 中 `APPEND_TOKEN` 为什么要用 `map` 而不是 `push`？
2. `AbortController` 是什么？用户点击"停止"时发生了什么？
3. `parseSseLines()` 为什么要处理 `buffer`？什么情况下一个 chunk 会包含半个事件？
4. `FINISH_STREAMING` action 做了什么？为什么需要把 `streaming: false`？

**额外挑战**：在 `handleSseEvent` 中，当收到 `stream_chart` 事件时，让实时图表在页面顶部显示

---

## 阶段 5 — LangGraph 状态机

### 任务 5-A：实现 retrieval_node（RAG 检索节点）
**文件**：`agent/services/graph_service.py`，找到 `retrieval_node()` 函数

```python
async def retrieval_node(state: AgentState) -> dict:
    step_event = SSEEvent(
        event=SSEEventType.step,
        data={"node": "retrieval", "message": "检索知识库..."},
        session_id=state["session_id"],
    )

    results = await knowledge_service.search(
        agent_id=state["agent_id"],
        query=state["user_message"],
        top_k=5,
    )

    if results:
        context = "\n\n---\n\n".join([
            f"[相关度: {r['score']:.2f}]\n{r['content']}"
            for r in results
        ])
        found_event = SSEEvent(
            event=SSEEventType.step,
            data={"node": "retrieval", "message": f"找到 {len(results)} 条相关内容"},
            session_id=state["session_id"],
        )
        return {"retrieved_context": context, "sse_events": [step_event, found_event]}

    return {"retrieved_context": "", "sse_events": [step_event]}
```

**关键问题**：如果知识库里完全没有相关内容，`route` 应该退回到 `direct` 还是继续走 `generate`？

---

### 任务 5-B：实现自定义工具
**文件**：`agent/services/tools.py`

实现 `search_web()` 和 `generate_chart()` 两个工具：

```python
# generate_chart：根据用户描述生成示例数据
@register_tool("generate_chart")
async def generate_chart(data_description: str, chart_type: str = "bar") -> dict:
    # 你来决定生成什么数据，以及如何根据 data_description 判断数据类型
    pass

# search_web：可以先用模拟数据，后期对接真实 API
@register_tool("search_web")
async def search_web(query: str) -> str:
    pass
```

**额外挑战**：在 `graph_service.py` 的 `tool_node` 中，用 LLM 分析用户意图来决定调用哪个工具（而非关键词匹配）

---

## 阶段 6 — 记忆系统

### 任务 6-A：实现摘要记忆策略
**文件**：`agent/services/memory_service.py`，找到 `SummaryMemoryStrategy` 类

**你要实现 3 个方法**：

```python
async def _summarize(self, messages: list[BaseMessage]) -> str:
    # 将消息列表转换为对话文本
    history_text = "\n".join([
        f"{'用户' if isinstance(m, HumanMessage) else 'AI'}: {m.content}"
        for m in messages
    ])
    # 调用 LLM 生成摘要
    prompt = f"请将以下对话历史压缩为简洁摘要，保留关键信息和上下文：\n\n{history_text}"
    response = await self.llm.ainvoke([HumanMessage(content=prompt)])
    return response.content

async def add_messages(self, session_id: str, human: str, ai: str):
    window_key = self._window_key(session_id)
    # 1. 将新消息加入窗口
    pipe = self.redis.pipeline()
    pipe.rpush(window_key, json.dumps({"role": "human", "content": human}))
    pipe.rpush(window_key, json.dumps({"role": "ai", "content": ai}))
    pipe.expire(window_key, REDIS_TTL)
    await pipe.execute()

    # 2. 检查窗口是否超出大小
    length = await self.redis.llen(window_key)
    if length > self.window_size * 2:
        # 取出最旧的消息准备压缩
        oldest_raw = await self.redis.lrange(window_key, 0, 3)  # 取 2 轮对话
        oldest = [json.loads(r) for r in oldest_raw]
        messages = [
            HumanMessage(content=m["content"]) if m["role"] == "human"
            else AIMessage(content=m["content"])
            for m in oldest
        ]
        # 生成摘要并追加到旧摘要
        new_summary = await self._summarize(messages)
        old_summary = await self.redis.get(self._summary_key(session_id)) or ""
        combined = f"{old_summary}\n{new_summary}".strip() if old_summary else new_summary
        await self.redis.set(self._summary_key(session_id), combined, ex=REDIS_TTL)
        # 删除已压缩的消息
        await self.redis.ltrim(window_key, 4, -1)

async def get_messages(self, session_id: str) -> list[BaseMessage]:
    result = []
    # 1. 先加载摘要（作为 SystemMessage）
    summary = await self.redis.get(self._summary_key(session_id))
    if summary:
        result.append(SystemMessage(content=f"以下是历史对话摘要：\n{summary}"))
    # 2. 再加载最近窗口消息
    raw = await self.redis.lrange(self._window_key(session_id), 0, -1)
    for item in raw:
        data = json.loads(item)
        if data["role"] == "human":
            result.append(HumanMessage(content=data["content"]))
        else:
            result.append(AIMessage(content=data["content"]))
    return result
```

**关键问题**：三种记忆策略在哪些场景下分别最合适？摘要策略的主要缺点是什么？

---

## 阶段 7 — 错误边界 & 健壮性

### 任务 7-A：完善 React Error Boundary
**文件**：`web/components/chat/ChatErrorBoundary.tsx`

在 `componentDidCatch` 中添加错误上报：

```typescript
componentDidCatch(error: Error, info: ErrorInfo) {
  // 上报到自己的日志接口（或 Sentry）
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {}); // 上报失败不影响降级 UI 展示

  this.props.onError?.(error, info);
}
```

**关键问题**：Error Boundary 为什么不能捕获事件处理器中的错误（如 `onClick`）？如何解决？

---

### 任务 7-B：理解 NestJS 异常过滤器
**文件**：`api/src/filters/llm-exception.filter.ts`

**你要做的**：
- 在 `catch()` 方法中给响应加上 `requestId` 字段（用 `uuid` 生成）
- 在 `main.ts` 中确认 `app.useGlobalFilters(new LlmExceptionFilter())` 已注册
- 在 `ChatService` 中，当 Agent 服务返回非 2xx 时，抛出 `new LlmException('Agent 服务异常', true)`

**关键问题**：`retryable: true` 字段有什么用？前端如何根据这个字段决定是否自动重试？

---

### 任务 7-C：理解指数退避重试
**文件**：`agent/services/retry.py`

**你要做的**：
- 给 `with_retry` 装饰器添加自定义 `max_attempts` 参数
- 在 `knowledge_service.py` 的 `ingest_document` 方法上应用 `@with_retry(max_attempts=2)`
- 在 Python 控制台运行一次模拟重试（让函数前两次抛出 `ConnectionError`）

**关键问题**：
- `wait_exponential(min=1, max=10)` 的重试间隔序列是什么？
- 为什么要加 jitter（随机抖动）？

---

## 阶段 8 — 性能优化

### 任务 8-A：实现虚拟列表
**文件**：`web/components/chat/MessageList.tsx`

当消息数量超过 50 条时切换到 `react-window`：

```typescript
import { VariableSizeList, type ListChildComponentProps } from 'react-window';

// 估算消息高度（根据内容长度）
function estimateHeight(msg: ChatMessage): number {
  const baseHeight = 80;
  const charsPerLine = 40;
  const lineHeight = 24;
  const lines = Math.ceil(msg.content.length / charsPerLine);
  return baseHeight + lines * lineHeight;
}

// 在组件中：
const listRef = useRef<VariableSizeList>(null);
const Row = ({ index, style }: ListChildComponentProps) => (
  <div style={style}>
    <MessageBubble message={messages[index]} />
  </div>
);

// messages.length > 50 时渲染 VariableSizeList
```

**关键问题**：为什么虚拟列表能显著提升性能？DOM 节点数量从多少减少到多少？

---

### 任务 8-B：添加 PieChart 图表支持
**文件**：`web/components/chat/AgentChart.tsx`，找到 `default` case

```typescript
case 'pie':
  return (
    <PieChart>
      <Pie
        data={chartData}
        dataKey={y_field}
        nameKey={x_field}
        cx="50%"
        cy="50%"
        outerRadius={80}
        label
      />
      <Tooltip />
      <Legend />
    </PieChart>
  );
```

别忘了在顶部导入 `PieChart, Pie, Legend`。

---

## 综合挑战（选做）

### 挑战 A：让 router_node 使用 LLM 分类而非关键词
**文件**：`agent/services/graph_service.py`，`router_node()` 函数

用 LLM 分析用户意图，返回结构化的路由决策（`direct` / `rag` / `tool`）

### 挑战 B：实现会话标题自动生成
首条消息发送后，用 LLM 生成 10 字以内的会话标题，更新到 `sessions` 表

### 挑战 C：实现消息导出
在聊天页面添加"导出对话"按钮，将消息列表导出为 Markdown 文件

### 挑战 D：ScatterChart 图表类型
在 `AgentChart.tsx` 中实现散点图，并在 `tools.py` 的 `generate_chart` 中添加生成散点图数据的逻辑

---

## 快速参考：关键文件位置

```
agent/services/knowledge_service.py  → 任务 3-A（ingest_document）
agent/services/memory_service.py     → 任务 6-A（SummaryMemoryStrategy）
agent/services/graph_service.py      → 任务 4-A（generate_node 流式）
                                       任务 5-A（retrieval_node）
agent/services/tools.py              → 任务 5-B（search_web / generate_chart）

api/src/agents/agents.service.ts     → 任务 2-A（5 个 CRUD 方法）

web/app/agents/[id]/edit/page.tsx    → 任务 2-B（编辑表单提交）
web/app/agents/[id]/knowledge/page.tsx → 任务 3-B（handleUpload）
web/components/chat/MessageList.tsx  → 任务 8-A（虚拟列表）
web/components/chat/AgentChart.tsx   → 任务 8-B（PieChart）
web/components/chat/ChatErrorBoundary.tsx → 任务 7-A（错误上报）
```
