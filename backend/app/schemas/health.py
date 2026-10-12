"""Pydantic schemas for service health checks.
"""

from typing import List
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall health status", examples=["healthy"])
    service: str = Field(..., description="Service identifier", examples=["TATVIK API"])
    version: str = Field(..., description="Service semantic version", examples=["0.1.0"])
    environment: str = Field(..., description="Deployment environment", examples=["development"])
    cors_origins: List[str] = Field(..., description="Allowed origins configured for CORS")
