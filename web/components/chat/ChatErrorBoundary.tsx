'use client';

/**
 * =============================================================
 * 【学习任务】阶段 7 — React Error Boundary
 *
 * 你需要理解：
 *   1. 为什么 Error Boundary 必须是类组件（Class Component）
 *      → React 只为类组件提供了 getDerivedStateFromError 和 componentDidCatch
 *      → 函数组件没有等价的 Hook（截至 React 19）
 *
 *   2. getDerivedStateFromError vs componentDidCatch 的区别：
 *      → getDerivedStateFromError：渲染阶段调用，返回新状态（用于展示降级 UI）
 *      → componentDidCatch：提交阶段调用，用于日志上报（副作用）
 *
 *   3. Error Boundary 不能捕获的错误：
 *      → 事件处理器中的错误（需 try/catch）
 *      → 异步代码（setTimeout、Promise）
 *      → 服务端渲染错误
 *      → Error Boundary 自身的错误
 *
 * 【你的任务】：
 *   在 componentDidCatch 中添加错误上报逻辑（如发送到监控系统）
 * =============================================================
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // TODO: 你来添加错误上报逻辑
    // 例如：发送到 Sentry、DataDog 或自己的日志接口
    console.error('[ChatErrorBoundary] 捕获到错误:', error);
    console.error('[ChatErrorBoundary] 组件栈:', info.componentStack);

    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="font-semibold text-lg">聊天界面出现错误</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {this.state.error?.message || '未知错误'}
            </p>
          </div>
          <Button onClick={this.handleReset} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
