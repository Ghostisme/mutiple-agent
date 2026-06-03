'use client';

/**
 * =============================================================
 * 【学习任务】阶段 3 — 知识库管理页
 *
 * 你需要理解：
 *   1. 文件拖拽上传的实现（react-dropzone）
 *   2. 上传进度状态管理
 *   3. 乐观更新：上传成功后立即添加到列表
 *
 * 【你的任务】：
 *   实现 handleUpload() 函数体
 *   添加上传进度条（Progress 组件）
 * =============================================================
 */

import { use, useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { knowledgeApi } from '@/lib/api';
import type { KnowledgeDocument } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, File, Trash2, Database } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function KnowledgePage({ params }: PageProps) {
  const { id: agentId } = use(params);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    knowledgeApi.list(agentId)
      .then(setDocuments)
      .catch(() => toast.error('加载知识库失败'))
      .finally(() => setLoading(false));
  }, [agentId]);

  const handleUpload = useCallback(async (files: File[]) => {
    /**
     * TODO: 你来实现
     *
     * 步骤：
     *   1. setUploading(true)
     *   2. 遍历 files，逐个调用 knowledgeApi.upload(agentId, file)
     *   3. 成功后 toast.success()，并刷新文档列表
     *   4. 失败后 toast.error()
     *   5. setUploading(false)
     */
    toast.info('TODO: 实现上传逻辑（knowledge/page.tsx）');
  }, [agentId]);

  const handleDelete = async (doc: KnowledgeDocument) => {
    if (!confirm(`删除文档「${doc.filename}」？`)) return;
    try {
      await knowledgeApi.delete(agentId, doc.filename);
      setDocuments((prev) => prev.filter((d) => d.filename !== doc.filename));
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: { 'text/*': ['.txt', '.md', '.csv'] },
    disabled: uploading,
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          知识库管理
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          上传文档，Agent 将通过向量搜索检索相关内容
        </p>
      </div>

      {/* 上传区 */}
      <Card
        {...getRootProps()}
        className={`p-8 border-dashed cursor-pointer transition-colors mb-6 ${
          isDragActive ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">
            {isDragActive ? '松开鼠标上传' : '拖放文件到此处'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            支持 .txt / .md / .csv 文件
          </p>
          {uploading && (
            <p className="text-sm text-primary mt-2 animate-pulse">
              上传中，请稍候...
            </p>
          )}
        </div>
      </Card>

      {/* 文档列表 */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">加载中...</div>
        ) : documents.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            还没有文档，上传第一个开始构建知识库
          </div>
        ) : (
          documents.map((doc) => (
            <Card key={doc.filename} className="p-4 flex items-center gap-3">
              <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.chunk_count} 个文档块
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">已向量化</Badge>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(doc)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
