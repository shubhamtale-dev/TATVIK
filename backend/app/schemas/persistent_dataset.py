"""Schemas for Persistent Datasets, Ownership, and Authentication Status (Part 6).
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DatasetSummaryItem(BaseModel):
    id: str = Field(..., description="Unique dataset identifier (e.g. ds-xxxx)")
    filename: str = Field(..., description="File name")
    file_type: str = Field(..., description="Extension type: csv, xlsx")
    file_size_bytes: int = Field(..., description="Original file size in bytes")
    total_rows: int = Field(..., description="Total row count")
    total_columns: int = Field(..., description="Total column count")
    quality_score: Optional[float] = Field(None, description="Quality health score (0-100)")
    score_grade: Optional[str] = Field(None, description="Letter grade (A, B, C, D, F)")
    created_at: str = Field(..., description="Creation ISO 8601 timestamp")
    updated_at: str = Field(..., description="Last updated ISO 8601 timestamp")


class DatasetListResponse(BaseModel):
    total: int = Field(..., description="Total saved datasets owned by user")
    items: List[DatasetSummaryItem] = Field(..., description="Dataset summaries")


class DatasetDetailResponse(DatasetSummaryItem):
    columns: List[str] = Field(..., description="Column names")
    preview_rows: List[Dict[str, Any]] = Field(..., description="Sample preview rows")
    session_id: Optional[str] = Field(None, description="Active or restored review session ID")


class RenameDatasetRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255, description="New filename")


class AuthStatusResponse(BaseModel):
    configured: bool = Field(..., description="True if Supabase Auth is configured")
    provider: str = Field(..., description="Auth provider name (supabase, local_dev)")
    supabase_url: Optional[str] = Field(None, description="Configured Supabase project URL")
    setup_instructions: str = Field(..., description="Setup guide for Supabase project credentials")


class UserProfileResponse(BaseModel):
    id: str = Field(..., description="User ID")
    email: Optional[str] = Field(None, description="User email address")
    role: str = Field("authenticated", description="User role")
