/**
 * =============================================================
 * 【学习任务】阶段 1 — Next.js 根布局
 *
 * 你需要理解：
 *   1. RootLayout 是 App Router 中所有页面的外层容器
 *   2. metadata 对象如何影响 <head> 标签
 *   3. 'use client' 和 Server Component 的边界在哪里
 *      （layout.tsx 是 Server Component，不能用 useState）
 *
 * 【你的任务】：
 *   完善导航栏 Sidebar 组件，添加 Agent 管理和聊天的入口链接
 * =============================================================
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Multi-Agent Chatbot',
  description: '多 Agent AI 对话平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
