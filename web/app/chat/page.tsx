import Link from 'next/link';
import { agentsApi } from '@/lib/api';
import { Bot, MessageSquare, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function ChatIndexPage() {
  let agents: import('@/types').Agent[] = [];
  try {
    agents = await agentsApi.list();
  } catch {
    // API 未启动时展示空列表
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          选择 Agent 对话
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          选择一个 Agent 开始对话，每个 Agent 有独立的知识库和记忆
        </p>
      </div>

      {agents.length === 0 ? (
        <Card className="p-8 text-center">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">还没有 Agent</p>
          <p className="text-sm text-muted-foreground mt-1">
            先去{' '}
            <Link href="/agents" className="text-primary underline">
              Agent 管理
            </Link>{' '}
            创建一个
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/chat/${agent.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{agent.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {agent.memory_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {agent.description || agent.system_prompt.slice(0, 60)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
