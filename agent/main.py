from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import get_settings
from routers import chat, knowledge, health

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动/关闭时的生命周期钩子"""
    print("🚀 Agent service starting...")
    yield
    print("👋 Agent service shutting down...")


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

app.include_router(health.router, tags=["health"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
