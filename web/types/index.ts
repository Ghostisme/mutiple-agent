/**
 * =============================================================
 * 【学习任务】阶段 1 — TypeScript 类型定义
 *
 * 你需要理解：
 *   1. 为什么要在前端单独定义类型（与后端 DTO 对应）
 *   2. 可辨识联合（Discriminated Union）如何处理多种 SSE 事件
 *   3. ChartData 类型与后端 Pydantic 模型的对应关系
 * =============================================================
 */

// ── Agent 相关 ──────────────────────────────────────────────

export type MemoryType = 'buffer' | 'window' | 'summary';

export interface Agent {
  id: string;
  name: string;
  description?: string;
  system_prompt: string;
  model: string;
  memory_type: MemoryType;
  tools: string[];
  collection_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  system_prompt?: string;
  model?: string;
  memory_type?: MemoryType;
  tools?: string[];
}

// ── 消息相关 ────────────────────────────────────────────────

export type MessageRole = 'human' | 'ai' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** 流式传输中：内容还在增量追加 */
  streaming?: boolean;
  /** 附加数据：图表、工具结果等 */
  metadata?: {
    chartData?: ChartData;
    steps?: AgentStep[];
    hitl?: HitlData;
  };
  created_at?: string;
}

// ── SSE 事件类型（可辨识联合）───────────────────────────────
//
// 【核心知识点】前端如何区分不同类型的 SSE 事件：
//   前端收到 SSE 时通过 event.type 字段路由到不同处理逻辑
//   这就是为什么后端发送时要带 event: xxx 标头

export type SseEventType = 'token' | 'step' | 'chart_data' | 'stream_chart' | 'hitl' | 'error' | 'done';

export interface TokenEvent {
  event: 'token';
  data: string;
  session_id?: string;
}

export interface StepEvent {
  event: 'step';
  data: AgentStep;
  session_id?: string;
}

export interface ChartDataEvent {
  event: 'chart_data';
  data: ChartData;
  session_id?: string;
}

export interface StreamChartEvent {
  event: 'stream_chart';
  data: StreamChartPoint;
  session_id?: string;
}

export interface HitlEvent {
  event: 'hitl';
  data: HitlData;
  session_id?: string;
}

export interface ErrorEvent {
  event: 'error';
  data: string;
  session_id?: string;
}

export interface DoneEvent {
  event: 'done';
  data: null;
  session_id?: string;
}

export type SseEvent =
  | TokenEvent
  | StepEvent
  | ChartDataEvent
  | StreamChartEvent
  | HitlEvent
  | ErrorEvent
  | DoneEvent;

// ── 图表数据 ────────────────────────────────────────────────

export type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'area';

export interface ChartData {
  chart_type: ChartType;
  title: string;
  x_field: string;
  y_field: string;
  data: Record<string, unknown>[];
}

export interface StreamChartPoint {
  timestamp: number;
  value: number;
  series?: string;
}

// ── Agent 推理步骤 ───────────────────────────────────────────

export interface AgentStep {
  node: string;
  message: string;
  timestamp?: string;
}

// ── Human-in-the-Loop ───────────────────────────────────────

export interface HitlData {
  tool_name: string;
  tool_args: Record<string, unknown>;
  description: string;
  session_id: string;
}

// ── 知识库 ──────────────────────────────────────────────────

export interface KnowledgeDocument {
  filename: string;
  chunk_count: number;
  sample_id: string;
}

export interface SearchResult {
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}
