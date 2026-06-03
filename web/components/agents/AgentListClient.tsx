'use client';

/**
 * =============================================================
 * 【学习任务】阶段 2 — Agent 列表客户端组件
 *
 * 你需要理解：
 *   1. 为什么需要 optimistic update（乐观更新）？
 *      → 用户点击删除时，先从 UI 移除，再等待 API 响应
 *      → 如果 API 失败，再把数据恢复回来
 *      → 体验比"等待 API 响应后再更新 UI"好得多
 *
 *   2. useTransition 的作用：
 *      → 将状态更新标记为"低优先级"，不阻塞用户交互
 *      → isPending 可用于显示加载状态
 * =============================================================
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Agent } from '@/types';
import { agentsApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Edit,
  Trash2,
  MessageSquare,
  Database,
  Plus,
} from 'lucide-react';

const MEMORY_TYPE_LABELS: Record<string, string> = {
  buffer: '全量记忆',
  window: '窗口记忆',
  summary: '摘要记忆',
};

interface Props {
  initialAgents: Agent[];
}

export function AgentListClient({ initialAgents }: Props) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`确认删除 Agent「${agent.name}」？此操作不可撤销。`)) return;

    // 乐观更新：先从 UI 移除
    setAgents((prev) => prev.filter((a) => a.id !== agent.id));

    try {
      await agentsApi.delete(agent.id);
      toast.success(`已删除 Agent「${agent.name}」`);
    } catch (err) {
      // 失败时恢复
      setAgents((prev) => [...prev, agent]);
      toast.error('删除失败，请重试');
    }
  };

  if (agents.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg">还没有 Agent</h3>
        <p className="text-muted-foreground text-sm mt-2 mb-6">
          创建第一个 Agent，给它设置专属人设和知识库
        </p>
        <Link href="/agents/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            创建第一个 Agent
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {agents.map((agent) => (
        <Card key={agent.id} className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{agent.name}</h3>
                <Badge variant="outline" className="text-xs">
                  {MEMORY_TYPE_LABELS[agent.memory_type] || agent.memory_type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {agent.description || agent.system_prompt}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-0.5 rounded font-mono">
              {agent.model}
            </span>
            {agent.tools.length > 0 && (
              <span className="bg-muted px-2 py-0.5 rounded">
                {agent.tools.length} 个工具
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Link href={`/chat/${agent.id}`} className="flex-1">
              <Button size="sm" className="w-full">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                开始对话
              </Button>
            </Link>
            <Link href={`/agents/${agent.id}/knowledge`}>
              <Button size="sm" variant="outline">
                <Database className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href={`/agents/${agent.id}/edit`}>
              <Button size="sm" variant="outline">
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleDelete(agent)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
