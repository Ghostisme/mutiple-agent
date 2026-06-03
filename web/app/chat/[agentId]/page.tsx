'use client';

import { use } from 'react';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { HitlConfirmDialog } from '@/components/chat/HitlConfirmDialog';
import { ChatErrorBoundary } from '@/components/chat/ChatErrorBoundary';
import { StreamChart } from '@/components/chat/AgentChart';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface PageProps {
  params: Promise<{ agentId: string }>;
}

export default function ChatPage({ params }: PageProps) {
  const { agentId } = use(params);
  const {
    messages,
    isStreaming,
    pendingHitl,
    streamChartBuffer,
    error,
    sendMessage,
    abort,
    respondHitl,
    clearError,
  } = useStreamingChat(agentId);

  return (
    <ChatErrorBoundary>
      <div className="flex flex-col h-full">
        {/* 错误提示（阶段7：错误处理） */}
        {error && (
          <div className="p-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={clearError}
                  className="text-xs underline ml-4"
                >
                  关闭
                </button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* 实时数据流图表（始终显示在顶部） */}
        {streamChartBuffer.length > 0 && (
          <div className="p-4 border-b">
            <StreamChart
              points={streamChartBuffer}
              title="实时数据"
              maxPoints={60}
            />
          </div>
        )}

        {/* 消息列表（阶段8：虚拟列表在 MessageList 内实现） */}
        <MessageList messages={messages} />

        {/* 输入框 */}
        <ChatInput
          onSend={sendMessage}
          onAbort={abort}
          isStreaming={isStreaming}
        />

        {/* HITL 确认对话框 */}
        {pendingHitl && (
          <HitlConfirmDialog
            hitl={pendingHitl}
            onApprove={() => respondHitl(true)}
            onReject={(reason) => respondHitl(false, reason)}
          />
        )}
      </div>
    </ChatErrorBoundary>
  );
}
