'use client';

/**
 * =============================================================
 * 【学习任务】阶段 2 — Agent 编辑页
 *
 * 【你的任务】：
 *   实现这个页面。参考 /agents/new 的代码，
 *   区别是需要先 fetch 现有数据，再用 PUT 接口更新。
 *
 *   步骤：
 *   1. 用 agentsApi.get(agentId) 获取当前数据
 *   2. 用 useState 初始化表单（与 new 页面相同）
 *   3. 提交时调用 agentsApi.update(agentId, formData)
 * =============================================================
 */

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { agentsApi } from '@/lib/api';
import type { Agent, MemoryType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAgentPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    agentsApi.get(id)
      .then(setAgent)
      .catch(() => toast.error('加载 Agent 失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: 你来实现提交逻辑
    // 提示：从 e.currentTarget 获取表单数据
    // const formData = new FormData(e.currentTarget)
    // await agentsApi.update(id, { name: formData.get('name') as string, ... })
    toast.info('TODO: 实现保存逻辑');
  };

  if (loading) return <div className="p-6 text-muted-foreground">加载中...</div>;
  if (!agent) return <div className="p-6 text-destructive">Agent 不存在</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">编辑 Agent</h1>
        <p className="text-muted-foreground text-sm mt-1">{agent.name}</p>
      </div>

      {/*
        TODO: 你来完成这个表单，参考 /agents/new/page.tsx
        需要用 agent 对象初始化每个字段的默认值。
      */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold">基本信息</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Agent 名称</Label>
            <Input id="name" name="name" defaultValue={agent.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt</Label>
            <Textarea
              id="system_prompt"
              name="system_prompt"
              defaultValue={agent.system_prompt}
              rows={5}
              className="font-mono text-sm"
            />
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? '保存中...' : '保存更改'}
          </Button>
        </div>
      </form>
    </div>
  );
}
