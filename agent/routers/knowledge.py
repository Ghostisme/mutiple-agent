"""
=============================================================
 【学习任务】阶段 3 — 知识库管理端点
 你需要理解：
   1. 文档如何分块（Chunking Strategy）
   2. Embedding 向量如何存入 ChromaDB
   3. 查询时相似度计算的原理
=============================================================
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas import SearchRequest
from services.knowledge_service import KnowledgeService

router = APIRouter()
knowledge_service = KnowledgeService()


@router.post("/{agent_id}/upload")
async def upload_document(
    agent_id: str,
    file: UploadFile = File(...),
):
    """
    上传文档并向量化入库

    流程：文件内容 → 分块 → Embedding → ChromaDB
    """
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="只支持 UTF-8 文本文件")

    result = await knowledge_service.ingest_document(
        agent_id=agent_id,
        content=text,
        filename=file.filename or "unknown",
    )
    return result


@router.post("/search")
async def search_documents(request: SearchRequest):
    """向量相似度检索"""
    results = await knowledge_service.search(
        agent_id=request.agent_id,
        query=request.query,
        top_k=request.top_k,
    )
    return {"results": results}


@router.get("/{agent_id}/documents")
async def list_documents(agent_id: str):
    """列出某个 Agent 知识库中的所有文档"""
    docs = await knowledge_service.list_documents(agent_id)
    return {"documents": docs}


@router.delete("/{agent_id}/documents/{doc_id}")
async def delete_document(agent_id: str, doc_id: str):
    """删除知识库中的文档"""
    await knowledge_service.delete_document(agent_id, doc_id)
    return {"status": "deleted", "doc_id": doc_id}
