"""TATVIK - Application Configuration Module
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "TATVIK"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "tatvik-default-insecure-secret-key-change-in-production"
    
    # API configuration
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://tatvik_user:tatvik_password@localhost:5432/tatvik_db"

    # AI Verification
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    DEFAULT_LLM_MODEL: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
