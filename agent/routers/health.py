from fastapi import APIRouter
from config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "model": settings.ollama_model,
        "embed_model": settings.ollama_embed_model,
    }
