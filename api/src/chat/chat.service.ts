/**
 * =============================================================
 * 【学习任务】阶段 4 — NestJS SSE 透传服务
 *
 * 关键知识点：
 *   Observable — RxJS 响应式流，NestJS SSE 端点的返回类型
 *   fromFetch → 从 HTTP 请求创建 Observable
 *   TextDecoder → 将 Uint8Array 字节流解码为字符串
 * =============================================================
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import { HttpService } from '@nestjs/axios';

export interface SseMessage {
  event: string;
  data: string;
}

@Injectable()
export class ChatService {
  private readonly agentUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.agentUrl = this.configService.get('AGENT_SERVICE_URL', 'http://localhost:8000');
  }

  /**
   * 将前端请求转发到 Python Agent 服务，并将 SSE 流透传回前端。
   *
   * 实现原理：
   *   1. 向 Python FastAPI 发送 POST /chat/stream（获取 SSE 流）
   *   2. 逐行解析 SSE 文本协议（event: xxx\ndata: xxx\n\n）
   *   3. 通过 RxJS Subject 将每个事件 next() 给前端
   *
   * 【学习点】：
   *   为什么用 Observable 而不是 async generator？
   *   因为 NestJS @Sse() 装饰器要求返回 Observable<MessageEvent>，
   *   这是框架约定，底层用 SSE 协议写入响应流。
   */
  streamChat(
    agentId: string,
    sessionId: string,
    message: string,
  ): Observable<SseMessage> {
    const subject = new Subject<SseMessage>();

    this.forwardToAgent(agentId, sessionId, message, subject).catch((err) => {
      subject.next({ event: 'error', data: JSON.stringify({ error: String(err) }) });
      subject.complete();
    });

    return subject.asObservable();
  }

  private async forwardToAgent(
    agentId: string,
    sessionId: string,
    message: string,
    subject: Subject<SseMessage>,
  ): Promise<void> {
    const response = await fetch(`${this.agentUrl}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, session_id: sessionId, message }),
    });

    if (!response.ok) {
      throw new Error(`Agent service error: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = 'message';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const data = line.slice(6);
          subject.next({ event: currentEvent, data });
          if (currentEvent === 'done') {
            subject.complete();
            return;
          }
          currentEvent = 'message';
        }
      }
    }
    subject.complete();
  }

  async hitlRespond(sessionId: string, approved: boolean, reason?: string) {
    const response = await fetch(`${this.agentUrl}/chat/hitl/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, approved, reason }),
    });
    return response.json();
  }
}
