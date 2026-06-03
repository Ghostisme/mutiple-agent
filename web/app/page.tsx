import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquare, Database, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <Bot className="h-16 w-16 text-primary mb-4" />
      <h1 className="text-3xl font-bold mb-2">Multi-Agent Chatbot</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        基于 LangGraph + Ollama 的多 Agent 对话平台，支持知识库、流式输出、Human-in-the-Loop
      </p>

      <div className="grid grid-cols-2 gap-3 mb-8 max-w-sm w-full text-sm">
        {[
          { icon: Bot, label: 'Agent 管理' },
          { icon: MessageSquare, label: '流式对话' },
          { icon: Database, label: 'RAG 知识库' },
          { icon: Zap, label: 'LangGraph 状态机' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 p-3 rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-primary" />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/agents">
          <Button>创建第一个 Agent</Button>
        </Link>
        <Link href="/chat">
          <Button variant="outline">开始对话</Button>
        </Link>
      </div>
    </div>
  );
}
