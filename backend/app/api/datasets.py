"""Dataset upload, preview, and quality analysis endpoints (Parts 2 & 3).
"""

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.schemas.dataset import DatasetPreviewResponse, DatasetUploadErrorResponse
from app.schemas.quality import QualityAnalysisResponse
from app.services.parser import MAX_FILE_SIZE_BYTES, parse_dataset_preview, parse_file_to_dataframe
from app.services.quality_engine import analyze_dataset_quality

router = APIRouter()


@router.post(
    "/preview",
    response_model=DatasetPreviewResponse,
    responses={
        400: {"model": DatasetUploadErrorResponse, "description": "Invalid file format or empty content"},
        413: {"model": DatasetUploadErrorResponse, "description": "File exceeds maximum size limit (10MB)"},
        422: {"model": DatasetUploadErrorResponse, "description": "Malformed or unparseable spreadsheet"},
    },
    summary="Upload and Preview Dataset",
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

    # Pre-check file size before parsing
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
        "Evaluates duplicate rows, missing values, invalid email and phone formats, whitespace, "
        "casing inconsistencies, and calculates an explainable quality score (0-100)."
    ),
)
async def analyze_dataset(
    file: UploadFile = File(..., description="CSV or XLSX file to analyze"),
    max_issues: int = Query(500, ge=10, le=2000, description="Maximum number of issues to return in response"),
):
    """Runs data quality detection rules on uploaded dataset and returns full audit report."""
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

    return analyze_dataset_quality(
        df=df,
        filename=filename,
        file_type=file_type,
        max_issues=max_issues,
    )
