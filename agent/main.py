import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import get_settings
from logger import get_logger
from routers import chat, knowledge, health

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动/关闭时的生命周期钩子"""
    logger.info("🚀 Agent service starting...")
    logger.info(
        "Config: model=%s  embed=%s  chroma=%s:%s",
        settings.ollama_model,
        settings.ollama_embed_model,
        settings.chroma_host,
        settings.chroma_port,
    )
    yield
    logger.info("👋 Agent service shutting down...")


app = FastAPI(
    title="Multi-Agent AI Engine",
    description="LangGraph + LangChain powered AI agent service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── HTTP 请求日志中间件（对标 NestJS 内置请求日志）──────────────

_http_logger = get_logger("http")


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """
    记录每条 HTTP 请求的方法、路径、状态码和耗时。

    输出示例：
      [INFO]  [http]  POST /chat/stream  →  200  (123ms)
    """
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000

    _http_logger.info(
        "%s %s  →  %s  (%.0fms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


app.include_router(health.router, tags=["health"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
