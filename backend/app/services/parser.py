"""Service for securely parsing CSV and Excel files into previewable datasets.
"""

import io
import math
import os
import zipfile
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from fastapi import HTTPException, status

from app.schemas.dataset import DatasetPreviewResponse

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit
DEFAULT_PREVIEW_ROWS = 50
MAX_PREVIEW_ROWS = 100
ALLOWED_EXTENSIONS = {".csv", ".xlsx"}


def validate_file_metadata(filename: Optional[str], file_size: int) -> str:
    """Validates filename extension and file size constraints."""
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing or invalid.",
        )

    _, ext = os.path.splitext(filename)
    ext = ext.lower().strip()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Only .csv and .xlsx files are supported.",
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    return ext


def _sanitize_cell_value(val: Any) -> Any:
    """Converts cell values into clean, JSON-serializable types."""
    if val is None:
        return None

    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or math.isinf(val):
            return None
        return float(val)

    if isinstance(val, (int, np.integer)):
        return int(val)

    if isinstance(val, (bool, np.bool_)):
        return bool(val)

    if isinstance(val, (datetime, date, pd.Timestamp)):
        return val.isoformat()

    # Pandas NA / null types
    if pd.isna(val):
        return None

    return val


def _sanitize_dataframe_to_records(df: pd.DataFrame, limit: int) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Extracts column headers and sanitizes a preview slice of dataframe rows."""
    # Ensure column names are unique string headers
    clean_columns: List[str] = []
    seen: Dict[str, int] = {}
    for col in df.columns:
        col_str = str(col).strip() if col is not None else "Unnamed"
        if not col_str:
            col_str = "Unnamed"
        if col_str in seen:
            seen[col_str] += 1
            clean_columns.append(f"{col_str}_{seen[col_str]}")
        else:
            seen[col_str] = 0
            clean_columns.append(col_str)

    df.columns = clean_columns

    preview_slice = df.head(limit)
    preview_rows: List[Dict[str, Any]] = []

    for _, row in preview_slice.iterrows():
        row_dict: Dict[str, Any] = {}
        for col_name in clean_columns:
            raw_val = row[col_name]
            row_dict[col_name] = _sanitize_cell_value(raw_val)
        preview_rows.append(row_dict)

    return clean_columns, preview_rows


def _parse_csv_bytes(content: bytes) -> pd.DataFrame:
    """Attempts parsing CSV bytes with common encodings and fallback delimiters."""
    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]
    last_error: Optional[Exception] = None

    for enc in encodings:
        try:
            # First try auto-sniffing delimiter using python engine
            bio = io.BytesIO(content)
            df = pd.read_csv(bio, encoding=enc, sep=None, engine="python")
            return df
        except Exception as e:
            last_error = e
            # Try with standard comma delimiter as fallback
            try:
                bio = io.BytesIO(content)
                df = pd.read_csv(bio, encoding=enc, sep=",", engine="c")
                return df
            except Exception as e2:
                last_error = e2
                continue

    # If all encodings failed, raise user-safe HTTPException
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Failed to parse CSV file. The file may be malformed or contain incompatible encoding.",
    )


def _parse_xlsx_bytes(content: bytes) -> Tuple[pd.DataFrame, List[str], str]:
    """Parses Excel XLSX bytes safely using openpyxl engine."""
    bio = io.BytesIO(content)
    try:
        excel_file = pd.ExcelFile(bio, engine="openpyxl")
        sheet_names = excel_file.sheet_names

        if not sheet_names:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Excel workbook contains no sheets.",
            )

        selected_sheet = sheet_names[0]
        # data_only ensures cached formula evaluation without executing macros
        df = pd.read_excel(excel_file, sheet_name=selected_sheet, engine="openpyxl")
        return df, sheet_names, selected_sheet

    except (zipfile.BadZipFile, ValueError, KeyError) as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Failed to parse Excel workbook. The file may be corrupt, password-protected, or not a valid XLSX document.",
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="An error occurred while reading the Excel workbook structure.",
        )


def parse_file_to_dataframe(filename: str, content: bytes) -> Tuple[pd.DataFrame, str, Optional[List[str]], Optional[str]]:
    """Validates and parses file content into a pandas DataFrame."""
    file_size = len(content)
    ext = validate_file_metadata(filename, file_size)
    sheet_names: Optional[List[str]] = None
    selected_sheet: Optional[str] = None

    if ext == ".csv":
        df = _parse_csv_bytes(content)
        file_type = "csv"
    elif ext == ".xlsx":
        df, sheet_names, selected_sheet = _parse_xlsx_bytes(content)
        file_type = "xlsx"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'.",
        )

    if df.empty and len(df.columns) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file contains no readable columns or tabular data.",
        )

    return df, file_type, sheet_names, selected_sheet


def parse_dataset_preview(
    filename: str,
    content: bytes,
    preview_limit: int = DEFAULT_PREVIEW_ROWS,
) -> DatasetPreviewResponse:
    """Main orchestration function to validate, parse, and generate preview payload."""
    file_size = len(content)
    df, file_type, sheet_names, selected_sheet = parse_file_to_dataframe(filename, content)
    effective_limit = min(max(preview_limit, 1), MAX_PREVIEW_ROWS)
    notice: Optional[str] = None

    if file_type == "xlsx" and sheet_names and len(sheet_names) > 1:
        notice = (
            f"Workbook contains {len(sheet_names)} worksheets ({', '.join(sheet_names)}). "
            f"Currently previewing the primary worksheet '{selected_sheet}'. "
            "Multi-sheet selection will be activated in upcoming phases."
        )

    columns, preview_rows = _sanitize_dataframe_to_records(df, effective_limit)

    return DatasetPreviewResponse(
        filename=filename,
        file_size_bytes=file_size,
        file_type=file_type,
        total_rows=len(df),
        total_columns=len(columns),
        columns=columns,
        preview_rows=preview_rows,
        preview_row_count=len(preview_rows),
        sheet_names=sheet_names,
        selected_sheet=selected_sheet,
        notice=notice,
    )
