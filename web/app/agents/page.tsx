/**
 * =============================================================
 * 【学习任务】阶段 2 — Agent 列表页
 *
 * 你需要理解：
 *   1. 这是 Server Component（无 'use client'）
 *      → 直接在服务端调用 agentsApi.list()，不经过 useEffect
 *      → 数据在服务端获取，返回 HTML，对 SEO 友好
 *
 *   2. 为什么 AgentListClient 是单独的 Client Component？
 *      → 删除按钮需要用户交互（onClick），必须是 Client Component
 *      → 保持父组件为 Server Component 是性能最佳实践
 *
 * 【你的任务】：
 *   完善 AgentListClient 组件中的删除确认对话框逻辑
 * =============================================================
 */

import Link from 'next/link';
import { agentsApi } from '@/lib/api';
import { AgentListClient } from '@/components/agents/AgentListClient';
import { Button } from '@/components/ui/button';
import { Bot, Plus } from 'lucide-react';

export default async function AgentsPage() {
  let agents: import('@/types').Agent[] = [];
  try {
    agents = await agentsApi.list();
  } catch {
    // 服务未启动时优雅降级
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Agent 管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            创建和管理你的 AI Agent，每个 Agent 可以有独立的知识库、人设和记忆策略
          </p>
        </div>
        <Link href="/agents/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            创建 Agent
          </Button>
        </Link>
      </div>

      <AgentListClient initialAgents={agents} />
    </div>
  );
}
