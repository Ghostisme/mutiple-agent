'use client';

/**
 * =============================================================
 * 【学习任务】阶段 4 — BI 图表流式渲染
 *
 * 知识点：
 *   1. Recharts 组件的受控模式：data prop 变化时自动重渲染
 *   2. ResponsiveContainer 如何实现自适应宽度
 *   3. 为什么图表组件必须是 Client Component（'use client'）
 *      → Recharts 使用 DOM API，不能在服务端渲染
 *
 * 【你的任务】：
 *   1. 添加 PieChart 类型的渲染逻辑
 *   2. 实现 StreamChart 组件（接受 StreamChartPoint[] 实时绘制折线图）
 * =============================================================
 */

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ChartData, StreamChartPoint } from '@/types';

interface Props {
  data: ChartData;
}

export function AgentChart({ data }: Props) {
  const { chart_type, title, x_field, y_field, data: chartData } = data;

  const commonProps = {
    data: chartData,
    margin: { top: 5, right: 20, left: 0, bottom: 5 },
  };

  const renderChart = () => {
    switch (chart_type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={x_field} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey={y_field} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={x_field} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={y_field}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={x_field} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey={y_field}
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.2)"
            />
          </AreaChart>
        );

      default:
        // TODO: 你来添加 PieChart 和 ScatterChart
        return (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            暂不支持 {chart_type} 图表类型
          </div>
        );
    }
  };

  return (
    <div className="w-full bg-card border rounded-xl p-4 space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <ResponsiveContainer width="100%" height={220}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 实时数据流图表组件
 * 接受持续追加的数据点，动态更新折线图
 *
 * TODO: 你来实现这个组件
 */
interface StreamChartProps {
  points: StreamChartPoint[];
  maxPoints?: number;
  title?: string;
}

export function StreamChart({ points, maxPoints = 50, title }: StreamChartProps) {
  // 只显示最近 maxPoints 个点，避免图表过于密集
  const visiblePoints = points.slice(-maxPoints).map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString(),
    value: p.value,
    series: p.series,
  }));

  return (
    <div className="w-full bg-card border rounded-xl p-4 space-y-2">
      {title && <h4 className="text-sm font-medium">{title} (实时)</h4>}
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-muted-foreground">实时更新中</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={visiblePoints}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
