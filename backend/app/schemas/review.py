"""Pydantic schemas for Issue Review & Correction Approval (Part 4).

Defines models for:
- Conservative correction suggestions
- Approval and rejection decisions
- Applied change audit logs
- Working dataset previews
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CorrectionSuggestion(BaseModel):
    issue_id: str = Field(..., description="Stable issue identifier (e.g., iss-1)")
    row_index: Optional[int] = Field(None, description="1-indexed row number, or None for column-wide issues")
    column_name: Optional[str] = Field(None, description="Affected column name, or None for row-wide issues")
    category: str = Field(..., description="Issue category (inconsistent_values, invalid_formats, etc.)")
    issue_type: str = Field(..., description="Specific issue defect type")
    severity: str = Field(..., description="Severity level: high, medium, low, info")
    original_value: Optional[Any] = Field(None, description="Original raw value from uploaded dataset")
    proposed_value: Optional[Any] = Field(None, description="Conservatively proposed correction value, or None if manual review required")
    can_auto_correct: bool = Field(False, description="True if a safe automated correction is proposed")
    reason: str = Field(..., description="Reason for the suggestion or requirement for manual review")
    suggested_action: Optional[str] = Field(None, description="Remediation guidance")
    status: str = Field("pending", description="Review decision status: pending, approved, or rejected")
    applied: bool = Field(False, description="True if this correction has been applied to the working dataset")


class AppliedCorrection(BaseModel):
    issue_id: str = Field(..., description="Issue identifier")
    row_index: int = Field(..., description="1-indexed row number")
    column_name: str = Field(..., description="Modified column name")
    original_value: Optional[Any] = Field(None, description="Value prior to correction")
    applied_value: Optional[Any] = Field(None, description="Value after correction")
    applied_at: str = Field(..., description="ISO 8601 timestamp of modification")


class ReviewSessionSummary(BaseModel):
    session_id: str = Field(..., description="Unique review session ID")
    filename: str = Field(..., description="Dataset filename")
    file_type: str = Field(..., description="Format: csv or xlsx")
    total_rows: int = Field(..., description="Total rows in dataset")
    total_columns: int = Field(..., description="Total columns in dataset")
    total_issues: int = Field(..., description="Total detected issues")
    pending_count: int = Field(..., description="Count of issues with pending review")
    approved_count: int = Field(..., description="Count of issues marked approved")
    rejected_count: int = Field(..., description="Count of issues marked rejected")
    applied_count: int = Field(..., description="Count of approved issues already applied to working copy")
    auto_correctable_count: int = Field(..., description="Count of issues with automated proposed corrections")
    manual_review_count: int = Field(..., description="Count of issues requiring manual human review")
    quality_score: float = Field(..., description="Current dataset quality score (0-100)")
    score_grade: str = Field(..., description="Letter grade")
    created_at: str = Field(..., description="Session creation timestamp")


class ReviewSessionDetailResponse(BaseModel):
    session_id: str = Field(..., description="Unique review session ID")
    filename: str = Field(..., description="Dataset filename")
    file_type: str = Field(..., description="Format: csv or xlsx")
    total_rows: int = Field(..., description="Total rows in dataset")
    total_columns: int = Field(..., description="Total columns in dataset")
    columns: List[str] = Field(..., description="List of column names")
    summary: ReviewSessionSummary = Field(..., description="Summary counts and status metrics")
    suggestions: List[CorrectionSuggestion] = Field(..., description="List of correction suggestions")
    applied_changes: List[AppliedCorrection] = Field(default_factory=list, description="Log of applied changes")


class ReviewDecisionRequest(BaseModel):
    decision: str = Field(..., description="Decision choice: 'approve', 'reject', or 'reset'")


class BulkReviewDecisionRequest(BaseModel):
    issue_ids: List[str] = Field(..., description="List of issue IDs to update")
    decision: str = Field(..., description="Decision choice: 'approve', 'reject', or 'reset'")


class BulkDecisionResponse(BaseModel):
    session_id: str = Field(..., description="Session ID")
    decision: str = Field(..., description="Decision applied")
    updated_count: int = Field(..., description="Number of issues updated")
    updated_issue_ids: List[str] = Field(..., description="List of successfully updated issue IDs")
    skipped_issue_ids: List[str] = Field(default_factory=list, description="List of issue IDs skipped due to ineligibility")
    summary: ReviewSessionSummary = Field(..., description="Updated summary")


class ApplyChangesResponse(BaseModel):
    session_id: str = Field(..., description="Session ID")
    applied_count: int = Field(..., description="Number of changes newly applied")
    applied_changes: List[AppliedCorrection] = Field(..., description="List of newly applied changes")
    total_applied_to_date: int = Field(..., description="Cumulative changes applied to working dataset")
    remaining_approved_count: int = Field(..., description="Approved changes remaining to be applied")
    working_preview_rows: List[Dict[str, Any]] = Field(..., description="Preview rows of working dataset")
    message: str = Field(..., description="Operation status message")


class WorkingDatasetPreviewResponse(BaseModel):
    session_id: str = Field(..., description="Session ID")
    filename: str = Field(..., description="Dataset filename")
    total_rows: int = Field(..., description="Total rows in working dataset")
    total_columns: int = Field(..., description="Total columns in working dataset")
    columns: List[str] = Field(..., description="Column names")
    preview_rows: List[Dict[str, Any]] = Field(..., description="Preview rows from working dataset")
    total_applied_changes: int = Field(..., description="Number of applied modifications")
    applied_changes: List[AppliedCorrection] = Field(default_factory=list, description="Change history")
