'use client';

/**
 * =============================================================
 * 【学习任务】阶段 5 — Human-in-the-Loop 确认对话框
 *
 * 知识点：
 *   1. HITL 的完整流程：
 *      a. Agent 准备执行危险操作
 *      b. Python 后端暂停执行，发送 hitl SSE 事件
 *      c. 前端展示此对话框
 *      d. 用户点击确认/拒绝
 *      e. 前端调用 /chat/hitl/respond
 *      f. Python 后端收到响应，继续或中止执行
 *
 *   2. 为什么要 HITL？
 *      → 自主 Agent 执行不可逆操作（删除、发送、支付）时，
 *        需要人类监督，防止 AI 幻觉导致的灾难性操作
 *
 * 【你的任务】：
 *   添加"查看工具参数详情"的展开折叠功能
 * =============================================================
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { HitlData } from '@/types';
import { useState } from 'react';

interface Props {
  hitl: HitlData;
  onApprove: () => void;
  onReject: (reason?: string) => void;
}

export function HitlConfirmDialog({ hitl, onApprove, onReject }: Props) {
  const [showArgs, setShowArgs] = useState(false);

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Agent 请求确认</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {hitl.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">操作：{hitl.tool_name}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setShowArgs(!showArgs)}
              >
                {showArgs ? '收起' : '查看参数'}
              </Button>
            </div>

            {/* TODO: 你来实现参数展开/折叠 */}
            {showArgs && (
              <pre className="mt-2 text-xs bg-background rounded p-2 overflow-auto max-h-32">
                {JSON.stringify(hitl.tool_args, null, 2)}
              </pre>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onReject('用户拒绝操作')}
          >
            拒绝
          </Button>
          <Button
            variant="destructive"
            onClick={onApprove}
          >
            确认执行
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
