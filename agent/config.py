from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    ollama_embed_model: str = "nomic-embed-text"

    chroma_host: str = "localhost"
    chroma_port: int = 8001

    redis_url: str = "redis://localhost:6379"

    database_url: str = "postgresql+asyncpg://chatbot:chatbot123@localhost:5432/chatbot_db"

    api_base_url: str = "http://localhost:3001"

    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
