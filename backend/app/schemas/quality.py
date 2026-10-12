"""Pydantic schemas for data quality detection engine (Part 3).
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class QualityIssue(BaseModel):
    id: str = Field(..., description="Unique issue identifier")
    row_index: Optional[int] = Field(None, description="1-indexed row number, or None for column-wide issues")
    column_name: Optional[str] = Field(None, description="Affected column name, or None for row-wide issues")
    category: str = Field(..., description="Issue category: duplicates, missing_values, invalid_formats, inconsistent_values, empty_structures")
    issue_type: str = Field(..., description="Specific defect identifier (e.g., exact_duplicate_row, invalid_email_format)")
    severity: str = Field(..., description="Severity level: high, medium, low, info")
    current_value: Optional[Any] = Field(None, description="Detected problematic value, or None if empty")
    explanation: str = Field(..., description="Human-readable explanation of why this was flagged")
    suggested_action: Optional[str] = Field(None, description="Recommended remediation action")


class QualityAnalysisResponse(BaseModel):
    filename: str = Field(..., description="Name of the analyzed file")
    file_type: str = Field(..., description="File format: 'csv' or 'xlsx'")
    total_rows: int = Field(..., description="Total rows in dataset")
    total_columns: int = Field(..., description="Total columns in dataset")
    total_cells: int = Field(..., description="Total cells evaluated (rows * columns)")
    quality_score: float = Field(..., description="Explainable quality score bounded between 0.0 and 100.0")
    score_grade: str = Field(..., description="Letter grade: A (Excellent), B (Good), C (Fair), D (Needs Attention), F (Critical)")
    scoring_formula_explanation: str = Field(..., description="Detailed explanation of how the score was computed")
    category_counts: Dict[str, int] = Field(..., description="Issue counts grouped by category")
    severity_counts: Dict[str, int] = Field(..., description="Issue counts grouped by severity")
    issues: List[QualityIssue] = Field(..., description="List of detected quality issues (up to limit)")
    total_issues_detected: int = Field(..., description="Total number of issues identified across the dataset")
    returned_issues_count: int = Field(..., description="Number of issue records included in this payload")
    has_more_issues: bool = Field(..., description="True if total issues exceeds returned limit")
    evaluated_columns: List[str] = Field(..., description="List of all columns evaluated")
    detected_special_columns: Dict[str, List[str]] = Field(
        ...,
        description="Columns heuristically identified as email, phone, or identifier fields",
    )
