'use client';

/**
 * =============================================================
 * 【学习任务】阶段 4 — 流式聊天 Hook（核心学习文件）
 *
 * 这是整个项目最关键的前端代码，涵盖：
 *   1. useReducer 管理复杂聊天状态
 *   2. ReadableStream + TextDecoder 消费 SSE
 *   3. 可辨识联合处理多种 SSE 事件类型
 *   4. AbortController 实现用户中断（HITL 取消/手动停止）
 *   5. BI 图表数据的流式更新
 *   6. Human-in-the-Loop 确认流程
 *
 * 【你的任务】：
 *   找到每个 TODO 注释，理解并完善对应逻辑。
 *   重点关注 parseSseLine() 和 chatReducer 的 streaming 处理。
 * =============================================================
 */

import { useReducer, useRef, useCallback, useId } from 'react';
import type {
  ChatMessage,
  SseEvent,
  AgentStep,
  ChartData,
  HitlData,
  StreamChartPoint,
} from '@/types';
import { hitlApi } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ── 状态定义 ───────────────────────────────────────────────

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionId: string;
  pendingHitl: HitlData | null;
  streamChartBuffer: StreamChartPoint[];
  error: string | null;
}

// ── Action 类型（可辨识联合）───────────────────────────────

type ChatAction =
  | { type: 'ADD_USER_MESSAGE'; content: string }
  | { type: 'START_AI_MESSAGE'; id: string }
  | { type: 'APPEND_TOKEN'; id: string; token: string }
  | { type: 'ADD_STEP'; id: string; step: AgentStep }
  | { type: 'SET_CHART_DATA'; id: string; chart: ChartData }
  | { type: 'APPEND_STREAM_CHART'; point: StreamChartPoint }
  | { type: 'SET_HITL'; hitl: HitlData }
  | { type: 'CLEAR_HITL' }
  | { type: 'FINISH_STREAMING'; id: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_STREAMING'; value: boolean };

// ── Reducer ────────────────────────────────────────────────
//
// 【学习点】：
//   为什么用 useReducer 而不是 useState？
//   因为聊天状态是复杂的嵌套对象，多个字段需要原子更新。
//   useReducer 让状态转换逻辑集中、可预测、易于测试。

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `user-${Date.now()}`,
            role: 'human',
            content: action.content,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      };

    case 'START_AI_MESSAGE':
      return {
        ...state,
        isStreaming: true,
        messages: [
          ...state.messages,
          {
            id: action.id,
            role: 'ai',
            content: '',
            streaming: true,
            metadata: { steps: [] },
            created_at: new Date().toISOString(),
          },
        ],
      };

    case 'APPEND_TOKEN':
      /**
       * TODO: 你来理解这段代码
       *
       * 为什么用 map 而不是直接 push？
       * React 状态必须不可变（immutable）。map 会返回新数组，
       * 直接修改原数组不会触发重新渲染。
       *
       * streaming: true 的消息才是当前 AI 正在输出的消息，
       * 通过 id 精确匹配，避免更新到错误的消息。
       */
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.id
            ? { ...msg, content: msg.content + action.token }
            : msg,
        ),
      };

    case 'ADD_STEP':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.id
            ? {
                ...msg,
                metadata: {
                  ...msg.metadata,
                  steps: [...(msg.metadata?.steps || []), action.step],
                },
              }
            : msg,
        ),
      };

    case 'SET_CHART_DATA':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.id
            ? { ...msg, metadata: { ...msg.metadata, chartData: action.chart } }
            : msg,
        ),
      };

    case 'APPEND_STREAM_CHART':
      /**
       * TODO: 你来实现实时数据流图表的追加逻辑
       * 需要维护一个 streamChartBuffer，持续追加新数据点
       * 前端图表组件监听此 buffer 动态更新
       */
      return {
        ...state,
        streamChartBuffer: [...state.streamChartBuffer, action.point],
      };

    case 'SET_HITL':
      return { ...state, pendingHitl: action.hitl };

    case 'CLEAR_HITL':
      return { ...state, pendingHitl: null };

    case 'FINISH_STREAMING':
      return {
        ...state,
        isStreaming: false,
        messages: state.messages.map((msg) =>
          msg.id === action.id ? { ...msg, streaming: false } : msg,
        ),
      };

    case 'SET_ERROR':
      return { ...state, isStreaming: false, error: action.error };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_STREAMING':
      return { ...state, isStreaming: action.value };

    default:
      return state;
  }
}

// ── SSE 解析工具 ───────────────────────────────────────────

/**
 * 解析 SSE 原始行为事件对象
 *
 * SSE 协议格式：
 *   event: token
 *   data: {"event":"token","data":"你好","session_id":"xxx"}
 *
 * 【TODO：你来理解】：
 *   为什么要用 buffer 累积行？
 *   因为 ReadableStream 的 chunk 边界不等于 SSE 事件边界，
 *   一个 chunk 可能包含多个事件，也可能只包含半个事件。
 */
function parseSseLines(rawText: string): Array<{ event: string; data: string }> {
  const results: Array<{ event: string; data: string }> = [];
  const blocks = rawText.split('\n\n');

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    let event = 'message';
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        event = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        data = line.slice(6);
      }
    }

    if (data) {
      results.push({ event, data });
    }
  }

  return results;
}

// ── 主 Hook ────────────────────────────────────────────────

export function useStreamingChat(agentId: string) {
  const generatedSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const abortControllerRef = useRef<AbortController | null>(null);

  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    isStreaming: false,
    sessionId: generatedSessionId,
    pendingHitl: null,
    streamChartBuffer: [],
    error: null,
  });

  const sendMessage = useCallback(
    async (content: string) => {
      if (state.isStreaming) return;

      // 1. 添加用户消息
      dispatch({ type: 'ADD_USER_MESSAGE', content });

      // 2. 创建 AI 消息占位（streaming=true）
      const aiMessageId = `ai-${Date.now()}`;
      dispatch({ type: 'START_AI_MESSAGE', id: aiMessageId });

      // 3. 创建可中断的请求
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(
          `${API_BASE}/chat/${agentId}/stream`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: state.sessionId,
              message: content,
            }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 4. 消费 ReadableStream
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        /**
         * TODO: 你来理解这个读取循环
         *
         * 为什么用 while(true) + done 判断？
         * ReadableStream 是异步迭代器，done=true 时表示流结束。
         * { stream: true } 告诉 TextDecoder 这是多段编码，不要在每个 chunk 末尾添加 BOM。
         */
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // 按双换行分割 SSE 事件块
          const events = parseSseLines(buffer);

          // 保留未完成的最后一块
          const lastDoubleNewline = buffer.lastIndexOf('\n\n');
          if (lastDoubleNewline !== -1) {
            buffer = buffer.slice(lastDoubleNewline + 2);
          }

          // 5. 处理每个 SSE 事件
          for (const { event, data } of events) {
            try {
              const parsed = JSON.parse(data) as SseEvent;
              handleSseEvent(parsed, aiMessageId, dispatch);

              if (event === 'done' || parsed.event === 'done') {
                dispatch({ type: 'FINISH_STREAMING', id: aiMessageId });
                return;
              }
            } catch {
              // 忽略解析失败的行
            }
          }
        }

        dispatch({ type: 'FINISH_STREAMING', id: aiMessageId });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          dispatch({ type: 'FINISH_STREAMING', id: aiMessageId });
        } else {
          dispatch({
            type: 'SET_ERROR',
            error: err instanceof Error ? err.message : '未知错误',
          });
        }
      }
    },
    [agentId, state.isStreaming, state.sessionId],
  );

  /** 中断当前流式输出 */
  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  /** HITL 确认：用户点击确认/拒绝后调用 */
  const respondHitl = useCallback(
    async (approved: boolean, reason?: string) => {
      if (!state.pendingHitl) return;
      await hitlApi.respond(state.pendingHitl.session_id, approved, reason);
      dispatch({ type: 'CLEAR_HITL' });
    },
    [state.pendingHitl],
  );

  return {
    messages: state.messages,
    isStreaming: state.isStreaming,
    sessionId: state.sessionId,
    pendingHitl: state.pendingHitl,
    streamChartBuffer: state.streamChartBuffer,
    error: state.error,
    sendMessage,
    abort,
    respondHitl,
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
  };
}

// ── SSE 事件分发器 ─────────────────────────────────────────

/**
 * 根据事件类型 dispatch 不同 action
 *
 * 【TODO：你来扩展】：
 *   新增 stream_chart 事件的处理逻辑
 */
function handleSseEvent(
  event: SseEvent,
  aiMessageId: string,
  dispatch: React.Dispatch<ChatAction>,
) {
  switch (event.event) {
    case 'token':
      dispatch({ type: 'APPEND_TOKEN', id: aiMessageId, token: event.data });
      break;

    case 'step':
      dispatch({
        type: 'ADD_STEP',
        id: aiMessageId,
        step: {
          node: event.data.node,
          message: event.data.message,
          timestamp: new Date().toISOString(),
        },
      });
      break;

    case 'chart_data':
      dispatch({ type: 'SET_CHART_DATA', id: aiMessageId, chart: event.data });
      break;

    case 'stream_chart':
      // TODO: 你来实现实时图表数据点的追加
      dispatch({ type: 'APPEND_STREAM_CHART', point: event.data });
      break;

    case 'hitl':
      dispatch({ type: 'SET_HITL', hitl: event.data });
      break;

    case 'error':
      dispatch({ type: 'SET_ERROR', error: event.data });
      break;

    case 'done':
      break;
  }
}
