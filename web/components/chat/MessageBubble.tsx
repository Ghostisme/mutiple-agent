'use client';

import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, ChartData } from '@/types';
import { AgentChart } from './AgentChart';
import { AgentSteps } from './AgentSteps';

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isAi = message.role === 'ai';

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3',
        isAi ? 'flex-row' : 'flex-row-reverse',
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isAi ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        {isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          'max-w-[75%] space-y-2',
          isAi ? 'items-start' : 'items-end',
        )}
      >
        {/* 推理步骤（可折叠） */}
        {isAi && message.metadata?.steps && message.metadata.steps.length > 0 && (
          <AgentSteps steps={message.metadata.steps} />
        )}

        {/* 消息文本 */}
        {message.content && (
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5 text-sm',
              isAi
                ? 'bg-muted text-foreground rounded-tl-sm'
                : 'bg-primary text-primary-foreground rounded-tr-sm',
            )}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            {/* 流式光标 */}
            {message.streaming && (
              <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse" />
            )}
          </div>
        )}

        {/* BI 图表 */}
        {isAi && message.metadata?.chartData && (
          <AgentChart data={message.metadata.chartData} />
        )}
      </div>
    </div>
  );
}
