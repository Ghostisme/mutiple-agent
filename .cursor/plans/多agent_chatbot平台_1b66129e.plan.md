---
name: 多Agent Chatbot平台
overview: 搭建一个以学习为目的的多服务 Chatbot 平台，包含 Agent 管理（CRUD）、知识库（RAG）、状态机（LangGraph）、流式渲染、记忆管理等核心知识点。三个独立服务：Next.js 前端、NestJS 后端网关、Python AI 引擎。
todos:
  - id: stage1-scaffold
    content: 阶段1：搭建三个独立项目骨架 + docker-compose（PostgreSQL/Redis/ChromaDB）
    status: completed
  - id: stage2-agent-crud
    content: 阶段2：NestJS Agent CRUD 接口 + Next.js 管理页面
    status: completed
  - id: stage3-knowledge
    content: 阶段3：ChromaDB 知识库管理 + 文档上传入库
    status: completed
  - id: stage4-streaming
    content: 阶段4：SSE 流式对话 + useStreamingChat Hook
    status: completed
  - id: stage5-langgraph
    content: 阶段5：LangGraph 状态机 + Tool Calling
    status: completed
  - id: stage6-memory
    content: 阶段6：三种记忆策略实现（Buffer/Window/Summary）
    status: completed
  - id: stage7-error
    content: 阶段7：错误边界 + 异常过滤器 + 重试机制
    status: completed
  - id: stage8-perf
    content: 阶段8：性能优化（虚拟列表/Suspense/缓存）
    status: completed
isProject: false
---

# 多 Agent Chatbot 平台 — 完整规划

## 服务拆分（三个独立项目）

```
mutiple-agent/
├── web