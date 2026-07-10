from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./data/study_assistant.db"

    # Auth
    secret_key: str = "change-this-to-a-random-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333

    # DeepSeek
    deepseek_api_key: Optional[str] = None
    deepseek_api_base: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    # Embedding
    embedding_model: str = "BAAI/bge-m3"

    # File
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
