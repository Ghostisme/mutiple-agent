/**
 * =============================================================
 * 【学习任务】阶段 8 — Next.js Suspense 骨架屏
 *
 * 你需要理解：
 *   loading.tsx 是 Next.js App Router 的约定文件。
 *   当页面数据加载时，自动展示这个骨架屏。
 *   本质是将页面包裹在 <Suspense fallback={<loading />}> 中。
 * =============================================================
 */

export default function ChatLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="flex-1 p-4 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}
          >
            <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
            <div
              className={`h-10 rounded-2xl bg-muted ${i % 2 === 0 ? 'w-64' : 'w-48'}`}
            />
          </div>
        ))}
      </div>
      <div className="border-t p-4">
        <div className="h-11 rounded-md bg-muted" />
      </div>
    </div>
  );
}
