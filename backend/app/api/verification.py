"""Research Verification API Endpoints (Part 5).

Provides REST endpoints to:
- Check external research provider configuration status and instructions
- Execute evidence-based claim verification across selected dataset rows and columns
- Store and retrieve verification results for review sessions
- Record manual human reviewer assessments on verified evidence
- Guarantee dataset immutability and transparent evidence provenance
"""

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Path, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import get_db
from app.db.models import DatasetRecord
from app.schemas.dataset import DatasetUploadErrorResponse
from app.schemas.verification import (
    ManualAssessmentRequest,
    ProviderStatusResponse,
    VerificationBatchRequest,
    VerificationBatchResponse,
    VerificationResultItem,
)
from app.services.dataset_service import sync_session_to_db
from app.services.parser import MAX_FILE_SIZE_BYTES, parse_file_to_dataframe
from app.services.quality_engine import analyze_dataset_quality
from app.services.review_service import review_manager
from app.services.verification_service import verification_engine

router = APIRouter()


@router.get(
    "/provider-status",
    response_model=ProviderStatusResponse,
    summary="Get Research Provider Status",
    description="Returns configuration status of external research search providers, timeout, and setup guide.",
)
async def get_provider_status() -> ProviderStatusResponse:
    """Returns whether search API keys are active and how to configure them."""
    instructions = (
        "To configure research verification with a live search provider:\n"
        "1. Obtain an API key from Tavily (https://tavily.com) or SerpApi (https://serpapi.com).\n"
        "2. Add your key to backend/.env: TAVILY_API_KEY=tvly-... or SERPAPI_API_KEY=...\n"
        "3. Optionally set RESEARCH_PROVIDER=tavily or serpapi.\n"
        "4. Restart the backend service. TATVIK will automatically detect credentials without scraping."
    )
    return ProviderStatusResponse(
        configured=settings.is_research_provider_configured,
        provider_name=settings.active_provider_name,
        available_providers=["tavily", "serpapi", "mock", "none"],
        timeout_seconds=settings.RESEARCH_TIMEOUT_SECONDS,
        max_claims_per_batch=settings.RESEARCH_MAX_CLAIMS_PER_BATCH,
        setup_instructions=instructions,
    )


@router.post(
    "/verify-batch",
    response_model=VerificationBatchResponse,
    responses={
        400: {"description": "Invalid row indices, column names, or missing session ID"},
        404: {"description": "Review session not found or expired"},
    },
    summary="Verify Claims for Session Rows",
    description=(
        "Executes evidence-based verification for up to 20 selected rows from an active review session. "
        "Grounds claims using the configured search provider without modifying the source dataset."
    ),
)
async def verify_batch_for_session(
    request: VerificationBatchRequest,
    db: Session = Depends(get_db),
) -> VerificationBatchResponse:
    """Evaluates claims for selected rows in an active session."""
    if not request.session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid 'session_id' is required for batch verification.",
        )

    session = review_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review session '{request.session_id}' not found or has expired.",
        )

    if len(request.row_indices) > settings.RESEARCH_MAX_CLAIMS_PER_BATCH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot verify more than {settings.RESEARCH_MAX_CLAIMS_PER_BATCH} claims per request.",
        )

    try:
        batch_response = await verification_engine.verify_batch(session.working_df, request)
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ke))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(exc)}",
        )

    # Persist verification items on the in-memory session
    review_manager.store_verification_results(request.session_id, batch_response.results)

    # Sync to DB if this is a persistent session
    if request.session_id.startswith("rev-ds-"):
        dataset_id = request.session_id[4:]
        dataset_rec = db.query(DatasetRecord).filter(DatasetRecord.id == dataset_id).first()
        updated_session = review_manager.get_session(request.session_id)
        if dataset_rec and updated_session:
            sync_session_to_db(db, dataset_rec.user_id, dataset_id, updated_session)

    return batch_response


@router.post(
    "/verify-upload",
    response_model=VerificationBatchResponse,
    responses={
        400: {"model": DatasetUploadErrorResponse, "description": "Invalid file format or parameters"},
        413: {"model": DatasetUploadErrorResponse, "description": "File exceeds maximum size limit (10MB)"},
        422: {"model": DatasetUploadErrorResponse, "description": "Malformed spreadsheet content"},
    },
    summary="Upload File and Verify Selected Rows",
    description=(
        "Upload a CSV/XLSX file and verify claims for selected rows in a single step. "
        "Also registers an in-memory review session for downstream review."
    ),
)
async def verify_upload(
    file: UploadFile = File(..., description="CSV or XLSX dataset file"),
    column_name: str = Form(..., description="Target column to verify"),
    context_column: Optional[str] = Form(None, description="Optional secondary context column"),
    claim_type: str = Form("entity_existence", description="Claim definition type"),
    row_indices: str = Form(..., description="Comma-separated or JSON list of 1-indexed row numbers (e.g. 1,2,3)"),
    custom_claim_template: Optional[str] = Form(None, description="Optional custom claim template"),
) -> VerificationBatchResponse:
    """Parses uploaded file, executes verification, and initializes review session."""
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

    # Parse row_indices
    try:
        if row_indices.strip().startswith("["):
            parsed_rows = [int(r) for r in json.loads(row_indices)]
        else:
            parsed_rows = [int(r.strip()) for r in row_indices.split(",") if r.strip()]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 'row_indices' format. Must be comma-separated integers or a JSON array of integers.",
        )

    if not parsed_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one row index must be specified.",
        )

    if len(parsed_rows) > settings.RESEARCH_MAX_CLAIMS_PER_BATCH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot verify more than {settings.RESEARCH_MAX_CLAIMS_PER_BATCH} claims per request.",
        )

    filename = file.filename or "uploaded_dataset"
    df, file_type, _, _ = parse_file_to_dataframe(filename, content)

    # Run quick quality analysis to back the session
    quality_analysis = analyze_dataset_quality(df=df, filename=filename, file_type=file_type)
    session = review_manager.create_session(
        df=df,
        filename=filename,
        file_type=file_type,
        quality_response=quality_analysis,
    )

    batch_request = VerificationBatchRequest(
        session_id=session.session_id,
        column_name=column_name,
        context_column=context_column,
        claim_type=claim_type,
        row_indices=parsed_rows,
        custom_claim_template=custom_claim_template,
    )

    try:
        batch_response = await verification_engine.verify_batch(session.working_df, batch_request)
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ke))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    # Persist results
    review_manager.store_verification_results(session.session_id, batch_response.results)

    return batch_response


@router.get(
    "/sessions/{session_id}/results",
    response_model=List[VerificationResultItem],
    responses={404: {"description": "Review session not found"}},
    summary="Get Verification Results for Session",
    description="Retrieves evidence-grounded verification results for a session, optionally filtered by status.",
)
async def get_session_verification_results(
    session_id: str = Path(..., description="Active session ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Optional filter by status"),
) -> List[VerificationResultItem]:
    """Returns stored verification results for an active review session."""
    try:
        return review_manager.get_verification_results(session_id, status_filter=status_filter)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review session '{session_id}' not found or has expired.",
        )


@router.post(
    "/sessions/{session_id}/assessment/{claim_id}",
    response_model=VerificationResultItem,
    responses={
        400: {"description": "Invalid assessment value"},
        404: {"description": "Session or Claim ID not found"},
    },
    summary="Record Manual Assessment for Claim",
    description="Records a human reviewer assessment flag (verified, flagged, dismissed, cleared) on an evidence item.",
)
async def record_manual_assessment(
    session_id: str = Path(..., description="Active session ID"),
    claim_id: str = Path(..., description="Verification claim ID"),
    body: ManualAssessmentRequest = ...,
    db: Session = Depends(get_db),
) -> VerificationResultItem:
    """Records reviewer evaluation without altering underlying dataset."""
    allowed = {"verified", "flagged", "dismissed", "cleared"}
    if body.assessment not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid assessment '{body.assessment}'. Must be one of: {', '.join(sorted(allowed))}.",
        )

    try:
        result = review_manager.update_manual_assessment(
            session_id=session_id,
            claim_id=claim_id,
            assessment=body.assessment,
            notes=body.notes,
        )

        if session_id.startswith("rev-ds-"):
            dataset_id = session_id[4:]
            dataset_rec = db.query(DatasetRecord).filter(DatasetRecord.id == dataset_id).first()
            session = review_manager.get_session(session_id)
            if dataset_rec and session:
                sync_session_to_db(db, dataset_rec.user_id, dataset_id, session)

        return result
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
