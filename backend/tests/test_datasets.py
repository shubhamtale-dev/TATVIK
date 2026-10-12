"""Automated tests for dataset upload and preview endpoints (Part 2).
"""

import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.services.parser import MAX_FILE_SIZE_BYTES

client = TestClient(app)


def create_sample_csv_bytes(encoding: str = "utf-8") -> bytes:
    """Helper to generate a valid CSV byte payload."""
    data = (
        "id,company_name,email,revenue,active,created_at\n"
        "1,Acme Corp,contact@acme.com,1250000.50,true,2024-01-15\n"
        "2,Globex LLC,info@globex.org,840200.00,false,2024-02-20\n"
        "3,Soylent Inc,sales@soylent.net,43000.00,true,2024-03-05\n"
    )
    return data.encode(encoding)


def create_sample_xlsx_bytes(sheets: dict = None) -> bytes:
    """Helper to generate a valid Excel XLSX byte payload in-memory."""
    if sheets is None:
        sheets = {
            "Vendors": pd.DataFrame({
                "vendor_id": [101, 102, 103],
                "vendor_name": ["Vertex Ltd", "Apex Log", "Starlight Co"],
                "score": [94.5, 88.0, 72.3],
            })
        }
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        for sheet_name, df in sheets.items():
            df.to_excel(writer, sheet_name=sheet_name, index=False)
    output.seek(0)
    return output.getvalue()


def test_preview_valid_csv():
    """Verify uploading a standard valid CSV returns structured preview."""
    content = create_sample_csv_bytes()
    response = client.post(
        "/api/datasets/preview",
        files={"file": ("customers.csv", content, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "customers.csv"
    assert data["file_type"] == "csv"
    assert data["total_rows"] == 3
    assert data["total_columns"] == 6
    assert data["columns"] == ["id", "company_name", "email", "revenue", "active", "created_at"]
    assert len(data["preview_rows"]) == 3
    assert data["preview_rows"][0]["company_name"] == "Acme Corp"
    assert data["preview_rows"][0]["revenue"] == 1250000.50
    assert data["sheet_names"] is None


def test_preview_csv_with_latin1_encoding():
    """Verify CSV with non-UTF-8 characters (e.g. Latin-1) parses gracefully."""
    latin1_text = "id,city,founder\n1,München,René\n2,Zürich,François\n"
    content = latin1_text.encode("latin-1")
    response = client.post(
        "/api/datasets/preview",
        files={"file": ("european_offices.csv", content, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_rows"] == 2
    assert data["preview_rows"][0]["city"] == "München"
    assert data["preview_rows"][0]["founder"] == "René"


def test_preview_valid_xlsx():
    """Verify uploading a standard valid XLSX returns structured preview."""
    content = create_sample_xlsx_bytes()
    response = client.post(
        "/api/datasets/preview",
        files={"file": ("vendors_master.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "vendors_master.xlsx"
    assert data["file_type"] == "xlsx"
    assert data["total_rows"] == 3
    assert data["total_columns"] == 3
    assert data["columns"] == ["vendor_id", "vendor_name", "score"]
    assert data["sheet_names"] == ["Vendors"]
    assert data["selected_sheet"] == "Vendors"
    assert len(data["preview_rows"]) == 3
    assert data["preview_rows"][0]["vendor_name"] == "Vertex Ltd"


def test_preview_multi_sheet_xlsx():
    """Verify uploading multi-sheet XLSX documents previews the first sheet and includes notice."""
    sheets = {
        "SheetPrimary": pd.DataFrame({"colA": [1, 2], "colB": ["x", "y"]}),
        "SheetSecondary": pd.DataFrame({"colX": [10, 20]}),
    }
    content = create_sample_xlsx_bytes(sheets=sheets)
    response = client.post(
        "/api/datasets/preview",
        files={"file": ("multisheet_catalog.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sheet_names"] == ["SheetPrimary", "SheetSecondary"]
    assert data["selected_sheet"] == "SheetPrimary"
    assert data["notice"] is not None
    assert "SheetPrimary" in data["notice"]
    assert "SheetSecondary" in data["notice"]


def test_reject_empty_file():
    """Verify empty file returns 400 Bad Request."""
    response = client.post(
        "/api/datasets/preview",
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert response.status_code == 400
    data = response.json()
    assert "empty" in data["message"].lower()


def test_reject_unsupported_extension():
    """Verify unsupported extensions (e.g. .pdf, .txt, .json) return 400."""
    response = client.post(
        "/api/datasets/preview",
        files={"file": ("unsupported.pdf", b"%PDF-1.4...", "application/pdf")},
    )
    assert response.status_code == 400
    data = response.json()
    assert "unsupported file format" in data["message"].lower()


def test_reject_oversized_file():
    """Verify files larger than 10MB return 413 Payload Too Large."""
    # Generate payload just over 10MB limit
    oversized_bytes = b"0" * (MAX_FILE_SIZE_BYTES + 1024)
    response = client.post(
        "/api/datasets/preview",
        files={"file": ("giant_dataset.csv", oversized_bytes, "text/csv")},
    )
    assert response.status_code == 413
    data = response.json()
    assert "10 mb" in data["message"].lower() or "limit" in data["message"].lower()


def test_handle_corrupted_xlsx():
    """Verify corrupted / invalid XLSX binary returns 422 Unprocessable Entity."""
    corrupted_bytes = b"PK\x03\x04corrupted-not-a-valid-zip-file-stream"
    response = client.post(
        "/api/datasets/preview",
        files={"file": ("corrupt.xlsx", corrupted_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 422
    data = response.json()
    assert "failed to parse" in data["message"].lower() or "corrupt" in data["message"].lower()


def test_preview_limit_parameter():
    """Verify preview rows are constrained by the limit query param."""
    # 10 rows CSV
    rows = "\n".join([f"{i},Name_{i}" for i in range(1, 11)])
    csv_data = f"id,name\n{rows}".encode("utf-8")
    response = client.post(
        "/api/datasets/preview?limit=4",
        files={"file": ("limited.csv", csv_data, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_rows"] == 10
    assert data["preview_row_count"] == 4
    assert len(data["preview_rows"]) == 4
