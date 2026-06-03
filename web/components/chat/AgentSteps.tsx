'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu } from 'lucide-react';
import type { AgentStep } from '@/types';

interface Props {
  steps: AgentStep[];
}

const NODE_LABELS: Record<string, string> = {
  router: '路由分析',
  retrieval: '知识库检索',
  tool: '工具调用',
  generate: '生成回答',
};

export function AgentSteps({ steps }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="text-xs border rounded-lg overflow-hidden max-w-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/60 hover:bg-muted transition-colors text-left"
      >
        <Cpu className="h-3 w-3 text-primary flex-shrink-0" />
        <span className="flex-1 text-muted-foreground">
          Agent 推理过程（{steps.length} 步）
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="divide-y">
          {steps.map((step, i) => (
            <div key={i} className="px-3 py-2 flex items-start gap-2">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-mono mt-0.5">
                {i + 1}
              </div>
              <div>
                <span className="font-medium text-primary">
                  {NODE_LABELS[step.node] || step.node}
                </span>
                <p className="text-muted-foreground">{step.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
