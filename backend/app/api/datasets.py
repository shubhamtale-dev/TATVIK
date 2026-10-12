"""Dataset upload and preview endpoints (Part 2).
"""

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.schemas.dataset import DatasetPreviewResponse, DatasetUploadErrorResponse
from app.services.parser import MAX_FILE_SIZE_BYTES, parse_dataset_preview

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
