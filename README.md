# Multi-Agent Chatbot 平台

基于 LangGraph + LangChain + Ollama 的多 Agent 对话平台，以学习为目的，覆盖主流 AI 应用开发知识点。

## 服务架构

```
web/    → Next.js 15 (App Router) — 前端 UI          → :3000
api/    → NestJS 10 + TypeORM    — 后端网关           → :3001
agent/  → FastAPI + LangGraph    — AI 推理引擎        → :8000
```

## 快速启动

### 1. 启动基础设施

```bash
docker-compose up -d
```

启动 PostgreSQL(:5432) + Redis(:6379) + ChromaDB(:8001)

### 2. 启动 Python Agent 服务

> python 3.12 version
```bash
cd agent
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
.\.venv\Scripts\uvicorn.exe main:app --reload --port 8000
```

### 3. 启动 NestJS API

```bash
cd api
npm install
# .env 文件已存在
npm run start:dev
```

### 4. 启动 Next.js 前端

```bash
cd web
npm install
npm run dev
```

访问 http://localhost:3000

## 学习路线 & 你的编码任务

| 阶段 | 你需要实现的文件 | 核心知识点 |
|------|----------------|-----------|
| 1 | `agent/schemas.py`（理解 Pydantic）<br>`api/src/agents/agent.entity.ts`（理解 TypeORM） | 框架模块化、数据建模 |
| 2 | `api/src/agents/agents.service.ts`（5个TODO方法）<br>`web/app/agents/[id]/edit/page.tsx`（编辑表单） | NestJS三层架构、TypeORM CRUD |
| 3 | `agent/services/knowledge_service.py`（ingest_document）<br>`web/app/agents/[id]/knowledge/page.tsx`（handleUpload） | Embedding、向量化、ChromaDB |
| 4 | `web/hooks/useStreamingChat.ts`（理解 SSE 消费）<br>`agent/services/graph_service.py`（generate_node 流式） | SSE协议、ReadableStream、useReducer |
| 5 | `agent/services/graph_service.py`（retrieval_node）<br>`agent/services/tools.py`（工具实现） | LangGraph状态机、Tool Calling |
| 6 | `agent/services/memory_service.py`（SummaryMemoryStrategy） | 三种记忆策略、Redis、LangChain Memory |
| 7 | `web/components/chat/ChatErrorBoundary.tsx`（componentDidCatch）<br>`agent/services/retry.py`（with_retry参数） | Error Boundary、指数退避重试 |
| 8 | `web/components/chat/MessageList.tsx`（虚拟列表切换） | react-window、Suspense |

## SSE 事件类型说明

前端通过 `event` 字段区分不同类型的流式消息：

| event | 含义 | 前端处理 |
|-------|------|---------|
| `token` | 普通文字 token | 拼接到消息内容 |
| `step` | Agent 推理步骤 | 展示在"推理过程"面板 |
| `chart_data` | BI 图表数据 | 渲染 Recharts 图表 |
| `stream_chart` | 实时数据流点 | 动态追加折线图 |
| `hitl` | 危险操作确认请求 | 弹出确认对话框 |
| `error` | 错误信息 | 展示错误提示 |
| `done` | 流结束信号 | 结束 streaming 状态 |

## Human-in-the-Loop 流程

```
Agent 遇到危险工具
    ↓
发送 hitl SSE 事件
    ↓
前端弹出确认框（HitlConfirmDialog）
    ↓
用户点击"确认"/"拒绝"
    ↓
前端 POST /chat/hitl/respond
    ↓
Python Agent 从暂停处恢复/中止
```

## 本地模型要求

```bash
ollama pull llama3.2          # 对话模型
ollama pull nomic-embed-text  # Embedding 模型
```
