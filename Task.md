必须亲手写的代码（13 个任务）
入门级
任务 1-A — api/src/agents/agent.entity.ts 新增一个字段（如 avatar_url），感受 TypeORM 装饰器语法

任务 1-B — agent/schemas.py 给 ChartData 加一个可选字段，在控制台实例化验证

基础级
任务 2-A — api/src/agents/agents.service.ts 实现 5 个方法体（create / findAll / findOne / update / remove），每个不超过 5 行，代码提示已在文档里给出

任务 2-B — web/app/agents/[id]/edit/page.tsx 在 handleSubmit 里调用 agentsApi.update()，参考 new 页面的结构照着写

任务 3-B — web/app/agents/[id]/knowledge/page.tsx 实现 handleUpload() 函数体，代码提示已完整给出，理解后照抄即可

核心级（最重要）
任务 3-A — agent/services/knowledge_service.py → ingest_document() 三步走：分块 → 向量化 → 存入 ChromaDB，代码提示完整，建议你一行一行理解再写

任务 4-A — agent/services/graph_service.py → generate_node() 将一次性 ainvoke() 改成 async for chunk in llm.astream() 的流式输出，这是整个项目最关键的改动

任务 5-A — agent/services/graph_service.py → retrieval_node() 调用 knowledge_service.search() 并拼接上下文，代码提示完整

任务 5-B — agent/services/tools.py 实现 search_web() 和 generate_chart() 两个工具函数

进阶级
任务 6-A — agent/services/memory_service.py → SummaryMemoryStrategy 实现 _summarize() / add_messages() / get_messages() 三个方法，是三种记忆中最复杂的

任务 7-A — web/components/chat/ChatErrorBoundary.tsx → componentDidCatch() 加错误上报逻辑，理解 Error Boundary 与普通 try/catch 的区别

任务 7-C — agent/services/retry.py 在 with_retry 上加参数，并在 knowledge_service.py 里实际使用装饰器

任务 8-A — web/components/chat/MessageList.tsx 消息超过 50 条时切换为 VariableSizeList 虚拟列表

只需读懂、不用改的（1 个）
任务 4-B — web/hooks/useStreamingChat.ts 不改代码，只回答 4 个问题，强迫自己逐行理解 SSE 消费流程