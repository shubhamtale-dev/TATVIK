"""Dataset upload, preview, quality analysis, and persistent CRUD endpoints (Parts 2, 3 & 6).
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Path, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user, get_optional_user
from app.db.base import get_db
from app.schemas.dataset import DatasetPreviewResponse, DatasetUploadErrorResponse
from app.schemas.persistent_dataset import (
    DatasetDetailResponse,
    DatasetListResponse,
    DatasetSummaryItem,
    RenameDatasetRequest,
)
from app.schemas.quality import QualityAnalysisResponse
from app.schemas.review import ReviewSessionDetailResponse
from app.services.dataset_service import (
    delete_user_dataset,
    get_user_dataset,
    list_user_datasets,
    rename_user_dataset,
    restore_session_from_dataset,
    save_dataset_to_db,
)
from app.services.parser import MAX_FILE_SIZE_BYTES, parse_dataset_preview, parse_file_to_dataframe
from app.services.quality_engine import analyze_dataset_quality
from app.services.review_service import review_manager
from app.services.storage_service import storage_service

router = APIRouter()


# ------------------------------------------------------------------------------
# Part 2: Upload & Preview (Stateless)
# ------------------------------------------------------------------------------

@router.post(
    "/preview",
    response_model=DatasetPreviewResponse,
    responses={
        400: {"model": DatasetUploadErrorResponse, "description": "Invalid file format or empty content"},
        413: {"model": DatasetUploadErrorResponse, "description": "File exceeds maximum size limit (10MB)"},
        422: {"model": DatasetUploadErrorResponse, "description": "Malformed or unparseable spreadsheet"},
    },
    summary="Upload and Preview Dataset (Stateless)",
    description=(
        "Upload a CSV or XLSX spreadsheet via multipart/form-data. "
        "Validates file type and size (<= 10MB), safely parses tabular data with pandas/openpyxl, "
        "and returns column names and preview records without persisting to disk."
    ),
)
async def preview_dataset(
    file: UploadFile = File(..., description="CSV or XLSX file to preview"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of preview rows to return"),
):
    """Processes uploaded file in-memory and returns structured dataset preview."""
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

    return parse_dataset_preview(
        filename=file.filename or "uploaded_dataset",
        content=content,
        preview_limit=limit,
    )


# ------------------------------------------------------------------------------
# Part 3: Data Quality Analysis (Optionally Persisted for Logged-In User)
# ------------------------------------------------------------------------------

@router.post(
    "/analyze",
    response_model=QualityAnalysisResponse,
    responses={
        400: {"model": DatasetUploadErrorResponse, "description": "Invalid file format or empty content"},
        413: {"model": DatasetUploadErrorResponse, "description": "File exceeds maximum size limit (10MB)"},
        422: {"model": DatasetUploadErrorResponse, "description": "Malformed or unparseable spreadsheet"},
    },
    summary="Analyze Dataset Quality",
    description=(
        "Upload a CSV or XLSX spreadsheet to run comprehensive, rule-based data quality checks. "
        "Evaluates duplicate rows, missing values, invalid emails, whitespace, and casing. "
        "Automatically persists to database if authenticated."
    ),
)
async def analyze_dataset(
    file: UploadFile = File(..., description="CSV or XLSX file to analyze"),
    max_issues: int = Query(500, ge=10, le=2000, description="Maximum number of issues to return in response"),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Runs data quality detection rules and persists for authenticated user."""
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

    if current_user:
        # Save file to private user storage
        storage_path = storage_service.save_file(
            user_id=current_user.id,
            dataset_id=f"ds-init",
            filename=filename,
            content=content,
        )
        dataset_rec, session = save_dataset_to_db(
            db=db,
            user_id=current_user.id,
            filename=filename,
            file_type=file_type,
            file_size_bytes=len(content),
            df=df,
            quality_analysis=analysis,
            storage_path=storage_path,
        )
        analysis.session_id = session.session_id
    else:
        # Initialize in-memory review session for guest / demo users
        session = review_manager.create_session(
            df=df,
            filename=filename,
            file_type=file_type,
            quality_response=analysis,
        )
        analysis.session_id = session.session_id

    return analysis


# ------------------------------------------------------------------------------
# Part 6: Persistent Datasets CRUD (Protected by Supabase Auth)
# ------------------------------------------------------------------------------

@router.get(
    "",
    response_model=DatasetListResponse,
    summary="List User Datasets",
    description="Retrieves a paginated list of persistent datasets owned by the authenticated user.",
)
async def list_datasets(
    search: Optional[str] = Query(None, description="Search term for filename"),
    limit: int = Query(50, ge=1, le=100, description="Limit results"),
    offset: int = Query(0, ge=0, description="Offset results"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DatasetListResponse:
    """Lists saved datasets for the authenticated user."""
    total, items = list_user_datasets(
        db=db,
        user_id=current_user.id,
        search=search,
        limit=limit,
        offset=offset,
    )

    summaries = [
        DatasetSummaryItem(
            id=item.id,
            filename=item.filename,
            file_type=item.file_type,
            file_size_bytes=item.file_size_bytes,
            total_rows=item.total_rows,
            total_columns=item.total_columns,
            quality_score=item.quality_score,
            score_grade=item.score_grade,
            created_at=item.created_at.isoformat() if item.created_at else "",
            updated_at=item.updated_at.isoformat() if item.updated_at else "",
        )
        for item in items
    ]
    return DatasetListResponse(total=total, items=summaries)


@router.post(
    "/upload",
    response_model=DatasetDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and Persist Dataset",
    description="Uploads a CSV/XLSX spreadsheet, runs quality analysis, and persists it to durable storage.",
)
async def upload_persistent_dataset(
    file: UploadFile = File(..., description="CSV or XLSX spreadsheet"),
    max_issues: int = Query(500, ge=10, le=2000, description="Maximum issues to evaluate"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DatasetDetailResponse:
    """Uploads, analyzes, stores binary, and persists dataset in database."""
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

    # Save to private filesystem storage
    dataset_rec, session = save_dataset_to_db(
        db=db,
        user_id=current_user.id,
        filename=filename,
        file_type=file_type,
        file_size_bytes=len(content),
        df=df,
        quality_analysis=analysis,
    )

    storage_path = storage_service.save_file(
        user_id=current_user.id,
        dataset_id=dataset_rec.id,
        filename=filename,
        content=content,
    )
    dataset_rec.storage_path = storage_path
    db.commit()

    # Build preview rows (first 10)
    cols = dataset_rec.columns
    preview_rows = []
    for _, row in df.head(10).iterrows():
        preview_rows.append({col: row[col] for col in cols})

    return DatasetDetailResponse(
        id=dataset_rec.id,
        filename=dataset_rec.filename,
        file_type=dataset_rec.file_type,
        file_size_bytes=dataset_rec.file_size_bytes,
        total_rows=dataset_rec.total_rows,
        total_columns=dataset_rec.total_columns,
        quality_score=dataset_rec.quality_score,
        score_grade=dataset_rec.score_grade,
        created_at=dataset_rec.created_at.isoformat(),
        updated_at=dataset_rec.updated_at.isoformat(),
        columns=cols,
        preview_rows=preview_rows,
        session_id=session.session_id,
    )


@router.get(
    "/{dataset_id}",
    response_model=DatasetDetailResponse,
    summary="Get Dataset Details",
    description="Retrieves dataset metadata and sample preview rows with server-side ownership verification.",
)
async def get_dataset_detail(
    dataset_id: str = Path(..., description="Dataset ID (e.g. ds-xxxx)"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DatasetDetailResponse:
    """Returns dataset details and preview rows for the authenticated owner."""
    dataset = get_user_dataset(db, current_user.id, dataset_id)
    cols = dataset.columns

    # Fetch preview rows from working matrix
    preview_rows = []
    if dataset.data:
        working_matrix = dataset.data.get_working_matrix()
        for row_vals in working_matrix[:10]:
            preview_rows.append({col: val for col, val in zip(cols, row_vals)})

    return DatasetDetailResponse(
        id=dataset.id,
        filename=dataset.filename,
        file_type=dataset.file_type,
        file_size_bytes=dataset.file_size_bytes,
        total_rows=dataset.total_rows,
        total_columns=dataset.total_columns,
        quality_score=dataset.quality_score,
        score_grade=dataset.score_grade,
        created_at=dataset.created_at.isoformat(),
        updated_at=dataset.updated_at.isoformat(),
        columns=cols,
        preview_rows=preview_rows,
        session_id=f"rev-{dataset.id}",
    )


@router.patch(
    "/{dataset_id}",
    response_model=DatasetSummaryItem,
    summary="Rename Dataset",
    description="Renames a saved dataset owned by the user.",
)
async def rename_dataset(
    dataset_id: str = Path(..., description="Dataset ID"),
    body: RenameDatasetRequest = ...,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DatasetSummaryItem:
    """Updates filename of user-owned dataset."""
    dataset = rename_user_dataset(db, current_user.id, dataset_id, body.filename)
    return DatasetSummaryItem(
        id=dataset.id,
        filename=dataset.filename,
        file_type=dataset.file_type,
        file_size_bytes=dataset.file_size_bytes,
        total_rows=dataset.total_rows,
        total_columns=dataset.total_columns,
        quality_score=dataset.quality_score,
        score_grade=dataset.score_grade,
        created_at=dataset.created_at.isoformat(),
        updated_at=dataset.updated_at.isoformat(),
    )


@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Dataset",
    description="Permanently deletes a saved dataset, stored files, and associated audits with ownership check.",
)
async def delete_dataset(
    dataset_id: str = Path(..., description="Dataset ID"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes dataset and associated records."""
    delete_user_dataset(db, current_user.id, dataset_id)
    return None


@router.post(
    "/{dataset_id}/restore-session",
    response_model=ReviewSessionDetailResponse,
    summary="Restore In-Memory Review Session",
    description="Loads persistent dataset from database into active working memory for review and verification.",
)
async def restore_dataset_session(
    dataset_id: str = Path(..., description="Dataset ID"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReviewSessionDetailResponse:
    """Restores saved dataset into active review session."""
    session = restore_session_from_dataset(db, current_user.id, dataset_id)
    return review_manager.get_session_detail(session.session_id)
