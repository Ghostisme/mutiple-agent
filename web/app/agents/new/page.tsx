'use client';

/**
 * =============================================================
 * 【学习任务】阶段 2 — Agent 创建表单
 *
 * 你需要理解：
 *   1. 受控表单（controlled form）vs 非受控表单
 *   2. 为什么用 useState 管理每个表单字段
 *      （可以改用 react-hook-form 获得更好的表单验证体验）
 *
 * 【你的任务】：
 *   添加 system_prompt 字段的实时字符计数
 *   添加表单验证（name 不能为空，system_prompt 至少 10 字）
 * =============================================================
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { agentsApi } from '@/lib/api';
import type { MemoryType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const MEMORY_OPTIONS: { value: MemoryType; label: string; desc: string }[] = [
  { value: 'buffer', label: '全量记忆', desc: '保存所有历史消息，适合短对话' },
  { value: 'window', label: '窗口记忆', desc: '只保留最近 10 条，内存固定' },
  { value: 'summary', label: '摘要记忆', desc: '超出窗口时用 LLM 压缩，平衡信息与长度' },
];

const AVAILABLE_TOOLS = [
  { id: 'get_current_time', label: '获取当前时间' },
  { id: 'generate_chart', label: '生成 BI 图表' },
  { id: 'search_web', label: '网络搜索' },
  { id: 'delete_record', label: '删除记录（危险，需 HITL 确认）' },
];

export default function NewAgentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    system_prompt: '你是一个有帮助的 AI 助手，请用中文回答用户的问题。',
    model: 'llama3.2',
    memory_type: 'buffer' as MemoryType,
    tools: [] as string[],
  });

  const toggleTool = (toolId: string) => {
    setForm((prev) => ({
      ...prev,
      tools: prev.tools.includes(toolId)
        ? prev.tools.filter((t) => t !== toolId)
        : [...prev.tools, toolId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('请输入 Agent 名称');
      return;
    }

    setLoading(true);
    try {
      await agentsApi.create(form);
      toast.success('Agent 创建成功！');
      router.push('/agents');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">创建新 Agent</h1>
        <p className="text-muted-foreground text-sm mt-1">
          配置 Agent 的人设、记忆策略和工具权限
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold">基本信息</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Agent 名称 *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="例如：销售助手、技术支持、数据分析师"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述（可选）</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="简短描述这个 Agent 的用途"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt（人设指令）</Label>
            <Textarea
              id="system_prompt"
              value={form.system_prompt}
              onChange={(e) => setForm((p) => ({ ...p, system_prompt: e.target.value }))}
              rows={5}
              placeholder="告诉 Agent 它是谁、擅长什么、如何回答..."
              className="font-mono text-sm"
            />
            {/* TODO: 你来添加字符计数 */}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Ollama 模型</Label>
            <Input
              id="model"
              value={form.model}
              onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
              placeholder="llama3.2"
            />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div>
            <h2 className="font-semibold">记忆策略</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              决定 Agent 如何记住历史对话
            </p>
          </div>

          <div className="space-y-2">
            {MEMORY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  form.memory_type === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="memory_type"
                  value={opt.value}
                  checked={form.memory_type === opt.value}
                  onChange={() => setForm((p) => ({ ...p, memory_type: opt.value }))}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div>
            <h2 className="font-semibold">启用工具</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              赋予 Agent 调用工具的能力（危险工具需 HITL 确认）
            </p>
          </div>

          <div className="space-y-2">
            {AVAILABLE_TOOLS.map((tool) => (
              <label
                key={tool.id}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={form.tools.includes(tool.id)}
                  onChange={() => toggleTool(tool.id)}
                />
                <span className="text-sm">{tool.label}</span>
              </label>
            ))}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? '创建中...' : '创建 Agent'}
          </Button>
        </div>
      </form>
    </div>
  );
}
