from fastapi import APIRouter
from config import get_settings
from logger import get_logger

router = APIRouter()
settings = get_settings()
logger = get_logger(__name__)


@router.get("/health")
async def health_check():
    logger.debug("health_check called")
    return {
        "status": "ok",
        "model": settings.ollama_model,
        "embed_model": settings.ollama_embed_model,
    }
