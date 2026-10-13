"""TATVIK - Application Configuration Module (Phase 1)
"""

from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    APP_NAME: str = "TATVIK API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    VERSION: str = "0.1.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Configurable CORS for frontend development
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Research Verification Provider (Part 5)
    # Options: "none", "tavily", "serpapi", "mock"
    RESEARCH_PROVIDER: str = "none"
    TAVILY_API_KEY: Optional[str] = None
    SERPAPI_API_KEY: Optional[str] = None
    RESEARCH_TIMEOUT_SECONDS: int = 10
    RESEARCH_MAX_CLAIMS_PER_BATCH: int = 20

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_research_provider_configured(self) -> bool:
        """Determines if a legitimate research provider is configured with credentials."""
        if self.RESEARCH_PROVIDER == "mock":
            return True
        if self.RESEARCH_PROVIDER == "tavily" and bool(self.TAVILY_API_KEY and self.TAVILY_API_KEY.strip()):
            return True
        if self.RESEARCH_PROVIDER == "serpapi" and bool(self.SERPAPI_API_KEY and self.SERPAPI_API_KEY.strip()):
            return True
        # Auto-detect if provider key exists
        if self.TAVILY_API_KEY and self.TAVILY_API_KEY.strip():
            return True
        if self.SERPAPI_API_KEY and self.SERPAPI_API_KEY.strip():
            return True
        return False

    @property
    def active_provider_name(self) -> str:
        """Returns the active provider descriptor."""
        if self.RESEARCH_PROVIDER == "mock":
            return "mock"
        if self.TAVILY_API_KEY and self.TAVILY_API_KEY.strip():
            return "tavily"
        if self.SERPAPI_API_KEY and self.SERPAPI_API_KEY.strip():
            return "serpapi"
        if self.RESEARCH_PROVIDER in ("tavily", "serpapi"):
            return self.RESEARCH_PROVIDER
        return "none"


settings = Settings()
