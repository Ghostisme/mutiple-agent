"""
=============================================================
 【学习任务】阶段 3 — 知识库服务（RAG 核心）

 【你需要完成的任务】：
   实现 ingest_document() 函数体（当前是骨架）

 学习目标：
   1. RecursiveCharacterTextSplitter 参数调优
      - chunk_size: 每块多少字符？太大失去精度，太小失去上下文
      - chunk_overlap: 重叠多少？保证跨块语义连续
   2. OllamaEmbeddings 如何将文本变成向量
   3. ChromaDB collection 的 add() 方法参数含义
=============================================================
"""

import uuid
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
import chromadb

from config import get_settings
from logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


class KnowledgeService:
    def __init__(self):
        self.chroma_client = chromadb.HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port,
        )
        self.embeddings = OllamaEmbeddings(
            base_url=settings.ollama_base_url,
            model=settings.ollama_embed_model,
        )

    def _get_collection(self, agent_id: str):
        """每个 Agent 拥有独立的 ChromaDB collection"""
        return self.chroma_client.get_or_create_collection(
            name=f"agent_{agent_id}",
            metadata={"hnsw:space": "cosine"},
        )

    async def ingest_document(
        self, agent_id: str, content: str, filename: str
    ) -> dict:
        """
        ============================================================
        【你的任务】完成文档向量化入库的完整流程

        步骤：
          1. 用 RecursiveCharacterTextSplitter 将 content 分块
             参考参数：chunk_size=500, chunk_overlap=50
          2. 对每个 chunk 调用 self.embeddings.embed_documents() 获取向量
          3. 调用 collection.add() 存入 ChromaDB
             需要传入：ids, embeddings, documents, metadatas

        提示：
          collection = self._get_collection(agent_id)
          splitter = RecursiveCharacterTextSplitter(...)
          chunks = splitter.split_text(content)
          vectors = self.embeddings.embed_documents(chunks)
        ============================================================
        """
        # TODO: 你来实现这里
        logger.info("ingest_document: agent_id=%s  filename=%s", agent_id, filename)
        # collection = self._get_collection(agent_id)
        # splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        # chunks = splitter.split_text(content)
        # logger.debug("ingest_document: split into %d chunks", len(chunks))
        # vectors = self.embeddings.embed_documents(chunks)
        # collection.add(vectors)
        raise NotImplementedError("请在 knowledge_service.py 中实现 ingest_document()")

    async def search(
        self, agent_id: str, query: str, top_k: int = 5
    ) -> list[dict]:
        logger.debug("search: agent_id=%s  top_k=%d  query=%.50s...", agent_id, top_k, query)
        """
        向量相似度检索

        【你需要理解】：
          query_vector = self.embeddings.embed_query(query)  # 单个向量
          results = collection.query(
              query_embeddings=[query_vector],
              n_results=top_k,
          )
          # results["documents"][0] 是匹配的文本列表
          # results["distances"][0] 是相似度距离（越小越相似）
        """
        collection = self._get_collection(agent_id)
        query_vector = self.embeddings.embed_query(query)
        results = collection.query(
            query_embeddings=[query_vector],
            n_results=top_k,
        )

        output = []
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        dists = results.get("distances", [[]])[0]

        for doc, meta, dist in zip(docs, metas, dists):
            output.append({
                "content": doc,
                "metadata": meta,
                "score": 1 - dist,  # cosine distance → similarity
            })
        logger.debug("search: returned %d results", len(output))
        return output

    async def list_documents(self, agent_id: str) -> list[dict]:
        """列出 Agent 知识库中所有文档（按文件名去重）"""
        collection = self._get_collection(agent_id)
        results = collection.get(include=["metadatas"])
        metas = results.get("metadatas", [])
        ids = results.get("ids", [])

        seen_files: dict[str, dict] = {}
        for doc_id, meta in zip(ids, metas):
            fname = meta.get("filename", "unknown")
            if fname not in seen_files:
                seen_files[fname] = {
                    "filename": fname,
                    "chunk_count": 0,
                    "sample_id": doc_id,
                }
            seen_files[fname]["chunk_count"] += 1

        return list(seen_files.values())

    async def delete_document(self, agent_id: str, doc_id: str):
        """按 id 删除文档块（或按 filename 批量删除）"""
        collection = self._get_collection(agent_id)
        # 先尝试按 filename 查找所有相关块
        results = collection.get(where={"filename": doc_id})
        if results["ids"]:
            logger.info(
                "delete_document: agent_id=%s  filename=%s  chunks=%d",
                agent_id, doc_id, len(results["ids"]),
            )
            collection.delete(ids=results["ids"])
        else:
            logger.info("delete_document: agent_id=%s  doc_id=%s", agent_id, doc_id)
            collection.delete(ids=[doc_id])
