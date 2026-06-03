'use client';

/**
 * =============================================================
 * 【学习任务】阶段 8 — 虚拟列表性能优化
 *
 * 知识点：
 *   当消息数量超过几百条时，全量渲染会导致页面卡顿。
 *   虚拟列表（Virtual List）只渲染可视区域内的元素，
 *   其余元素用空白占位，极大减少 DOM 节点数量。
 *
 *   react-window 的 VariableSizeList：
 *     - 每个 item 高度可变（消息有长有短）
 *     - itemSize 函数动态计算每条消息的高度
 *     - scrollToItem(index) 实现自动滚动到底部
 *
 * 【TODO：你来实现】：
 *   当消息数量超过 50 条时，切换到 VariableSizeList 模式
 *   （当前是简单 div 列表，便于学习对比）
 * =============================================================
 */

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types';
import { MessageBubble } from './MessageBubble';

interface Props {
  messages: ChatMessage[];
}

export function MessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新消息到来时自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        <div className="text-center">
          <p className="font-medium">开始对话</p>
          <p className="text-xs mt-1">在下方输入框中发送消息</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/*
        TODO: 你来优化 — 当 messages.length > 50 时，
        用 react-window VariableSizeList 替换这个 div 列表。

        参考实现：
          import { VariableSizeList } from 'react-window'
          const Row = ({ index, style }) => (
            <div style={style}>
              <MessageBubble message={messages[index]} />
            </div>
          )
          <VariableSizeList
            height={containerHeight}
            itemCount={messages.length}
            itemSize={(i) => estimateMessageHeight(messages[i])}
            ref={listRef}
          >
            {Row}
          </VariableSizeList>
      */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
