"""Pydantic schemas for dataset uploads and previews (Part 2).
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DatasetPreviewResponse(BaseModel):
    filename: str = Field(..., description="Original filename of the uploaded file")
    file_size_bytes: int = Field(..., description="Size of the file in bytes")
    file_type: str = Field(..., description="Detected format: 'csv' or 'xlsx'")
    total_rows: int = Field(..., description="Total number of rows in the parsed dataset")
    total_columns: int = Field(..., description="Total number of columns in the dataset")
    columns: List[str] = Field(..., description="List of column header names")
    preview_rows: List[Dict[str, Any]] = Field(..., description="Preview rows as dictionary records")
    preview_row_count: int = Field(..., description="Count of rows included in the preview payload")
    sheet_names: Optional[List[str]] = Field(None, description="All sheet names found if Excel workbook")
    selected_sheet: Optional[str] = Field(None, description="Sheet currently previewed if Excel workbook")
    notice: Optional[str] = Field(None, description="Informational notice regarding file parsing or sheet selection")


class DatasetUploadErrorResponse(BaseModel):
    error: str = Field(..., description="Error category code")
    message: str = Field(..., description="User-safe error explanation")
    detail: Optional[str] = Field(None, description="Optional safe contextual details")
