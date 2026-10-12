"""Review and Correction Approval API Endpoints (Part 4).

Provides REST endpoints to:
- Create review sessions from uploaded files
- Retrieve issues and conservative correction suggestions with filtering
- Approve or reject individual suggestions
- Bulk approve or reject eligible suggestions
- Safely apply approved changes to the in-memory working dataset
- Retrieve working dataset previews and applied modification audit history
"""

from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, Path, Query, UploadFile, status

from app.schemas.dataset import DatasetUploadErrorResponse
from app.schemas.review import (
    AppliedCorrection,
    ApplyChangesResponse,
    BulkDecisionResponse,
    BulkReviewDecisionRequest,
    CorrectionSuggestion,
    ReviewDecisionRequest,
    ReviewSessionDetailResponse,
    ReviewSessionSummary,
    WorkingDatasetPreviewResponse,
)
from app.services.parser import MAX_FILE_SIZE_BYTES, parse_file_to_dataframe
from app.services.quality_engine import analyze_dataset_quality
from app.services.review_service import review_manager

router = APIRouter()


@router.post(
    "/sessions",
    response_model=ReviewSessionDetailResponse,
    responses={
        400: {"model": DatasetUploadErrorResponse, "description": "Invalid file format or empty content"},
        413: {"model": DatasetUploadErrorResponse, "description": "File exceeds maximum size limit (10MB)"},
        422: {"model": DatasetUploadErrorResponse, "description": "Malformed or unparseable spreadsheet"},
    },
    summary="Create Review Session from Uploaded Dataset",
    description=(
        "Upload a CSV or XLSX spreadsheet to initialize a new in-memory review session. "
        "The engine analyzes data quality, generates conservative correction suggestions, "
        "and sets up isolated original and working copies."
    ),
)
async def create_review_session(
    file: UploadFile = File(..., description="CSV or XLSX spreadsheet"),
    max_issues: int = Query(500, ge=10, le=2000, description="Maximum issues to evaluate"),
):
    """Initializes a review session from an uploaded file."""
    try:
        content = await file.read()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file payload.",
        )
    finally:
        await file.close()

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    filename = file.filename or "uploaded_dataset"
    df, file_type, _, _ = parse_file_to_dataframe(filename, content)

    analysis = analyze_dataset_quality(
        df=df,
        filename=filename,
        file_type=file_type,
        max_issues=max_issues,
    )

    session = review_manager.create_session(
        df=df,
        filename=filename,
        file_type=file_type,
        quality_response=analysis,
    )

    return review_manager.get_session_detail(session.session_id)


@router.get(
    "/sessions/{session_id}",
    response_model=ReviewSessionDetailResponse,
    summary="Get Review Session Details",
    description="Fetches review session details, summary statistics, and suggestions with optional filters.",
)
async def get_review_session(
    session_id: str = Path(..., description="Unique review session ID"),
    review_status: Optional[str] = Query(None, alias="status", description="Filter by status: 'all', 'pending', 'approved', 'rejected'"),
    category: Optional[str] = Query(None, description="Filter by issue category"),
    severity: Optional[str] = Query(None, description="Filter by severity: 'high', 'medium', 'low', 'info'"),
    can_correct: Optional[bool] = Query(None, description="Filter for auto-correctable suggestions only"),
    search: Optional[str] = Query(None, description="Search term matching columns, issue IDs, or values"),
):
    """Retrieves session details and filtered correction suggestions."""
    try:
        return review_manager.get_session_detail(
            session_id=session_id,
            status_filter=review_status,
            category_filter=category,
            severity_filter=severity,
            can_correct_filter=can_correct,
            search_query=search,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.post(
    "/sessions/{session_id}/decide/{issue_id}",
    response_model=CorrectionSuggestion,
    summary="Decide Single Suggestion",
    description="Approve, reject, or reset a single correction suggestion. Only auto-correctable issues can be approved.",
)
async def decide_single_suggestion(
    payload: ReviewDecisionRequest,
    session_id: str = Path(..., description="Review session ID"),
    issue_id: str = Path(..., description="Issue identifier to update"),
):
    """Updates review decision on a specific issue."""
    try:
        suggestion, _ = review_manager.decide_suggestion(
            session_id=session_id,
            issue_id=issue_id,
            decision=payload.decision.lower(),
        )
        return suggestion
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post(
    "/sessions/{session_id}/bulk-decide",
    response_model=BulkDecisionResponse,
    summary="Bulk Decide Suggestions",
    description="Approve, reject, or reset a list of correction suggestions. Ineligible issues are safely skipped.",
)
async def bulk_decide_suggestions(
    payload: BulkReviewDecisionRequest,
    session_id: str = Path(..., description="Review session ID"),
):
    """Applies a review decision to multiple suggestions in batch."""
    try:
        updated, skipped, summary = review_manager.bulk_decide(
            session_id=session_id,
            issue_ids=payload.issue_ids,
            decision=payload.decision.lower(),
        )
        return BulkDecisionResponse(
            session_id=session_id,
            decision=payload.decision.lower(),
            updated_count=len(updated),
            updated_issue_ids=updated,
            skipped_issue_ids=skipped,
            summary=summary,
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post(
    "/sessions/{session_id}/apply",
    response_model=ApplyChangesResponse,
    summary="Apply Approved Corrections to Working Dataset",
    description="Applies all currently approved and unapplied corrections to the working dataset copy.",
)
async def apply_approved_changes(
    session_id: str = Path(..., description="Review session ID"),
    preview_limit: int = Query(50, ge=1, le=100, description="Number of preview rows to return"),
):
    """Applies approved modifications to working copy, leaving original dataset unchanged."""
    try:
        applied_count, newly_applied, summary = review_manager.apply_approved_changes(session_id)
        working_preview = review_manager.get_working_preview_rows(session_id, limit=preview_limit)

        msg = (
            f"Successfully applied {applied_count} approved correction(s) to working dataset."
            if applied_count > 0
            else "No pending approved changes found to apply."
        )

        return ApplyChangesResponse(
            session_id=session_id,
            applied_count=applied_count,
            applied_changes=newly_applied,
            total_applied_to_date=summary.applied_count,
            remaining_approved_count=summary.approved_count - summary.applied_count,
            working_preview_rows=working_preview,
            message=msg,
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/sessions/{session_id}/preview",
    response_model=WorkingDatasetPreviewResponse,
    summary="Get Working Dataset Preview",
    description="Retrieves the current state of the working dataset with preview rows and applied modifications count.",
)
async def get_working_dataset_preview(
    session_id: str = Path(..., description="Review session ID"),
    limit: int = Query(50, ge=1, le=100, description="Maximum preview rows to return"),
    offset: int = Query(0, ge=0, description="Row offset for preview pagination"),
):
    """Returns working dataset preview records."""
    try:
        session = review_manager.get_session(session_id)
        if not session:
            raise KeyError(f"Review session '{session_id}' not found or has expired.")

        preview_rows = review_manager.get_working_preview_rows(session_id, limit=limit, offset=offset)

        return WorkingDatasetPreviewResponse(
            session_id=session.session_id,
            filename=session.filename,
            total_rows=len(session.working_df),
            total_columns=len(session.columns),
            columns=session.columns,
            preview_rows=preview_rows,
            total_applied_changes=len(session.applied_changes),
            applied_changes=session.applied_changes,
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/sessions/{session_id}/changes",
    response_model=List[AppliedCorrection],
    summary="Get Applied Changes Audit Log",
    description="Returns the full change log of corrections applied to the working dataset in this session.",
)
async def get_applied_changes_log(
    session_id: str = Path(..., description="Review session ID"),
):
    """Returns audit log of all applied corrections."""
    try:
        session = review_manager.get_session(session_id)
        if not session:
            raise KeyError(f"Review session '{session_id}' not found or has expired.")
        return session.applied_changes
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
