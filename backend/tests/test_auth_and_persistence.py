"""Tests for Authentication, Database, and Persistent Datasets (Part 6).

Covers:
- Auth configuration status endpoint
- Bearer token authentication & unauthorized protection
- User-isolated dataset uploads, listing, details, renaming, and deletion
- Cross-user ownership isolation (User B cannot access or modify User A's datasets)
- Dual-dataset preservation (original untouched vs working dataset copy)
- Database persistence across in-memory cache eviction / restart
- Synchronized review decisions, applied modifications, and verification persistence
"""

import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base, get_db
from app.db.models import DatasetDataRecord, DatasetRecord, UserRecord
from app.main import app
from app.services.review_service import review_manager


from sqlalchemy.pool import StaticPool

# Setup an in-memory SQLite database for isolated test execution
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    """Create all tables before each test and drop afterwards."""
    Base.metadata.create_all(bind=engine)
    # Clear in-memory review manager sessions
    review_manager._sessions.clear()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


# Mock token helper
# In local/test mode, tokens formatted as "dev:user_id:email@example.com" or "test_token_user_a"
# are accepted by app.core.auth.verify_supabase_token
USER_A_TOKEN = "dev:usr-test-a:alice@tatvik.ai"
USER_B_TOKEN = "dev:usr-test-b:bob@tatvik.ai"

AUTH_HEADER_A = {"Authorization": f"Bearer {USER_A_TOKEN}"}
AUTH_HEADER_B = {"Authorization": f"Bearer {USER_B_TOKEN}"}

SAMPLE_CSV = (
    "name,email,company\n"
    "Alice Smith ,alice@acme.com,Acme Corp\n"
    "Bob Jones,bob-invalid-email,Acme Corp\n"
    "Carol White,carol@acme.com,Acme Corp\n"
)


def test_auth_status_endpoint(client):
    """GET /api/auth/status should return configuration state and instructions."""
    resp = client.get("/api/auth/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "configured" in data
    assert "provider" in data
    assert "setup_instructions" in data


def test_unauthorized_endpoints(client):
    """Protected endpoints must return 401 Unauthorized when no token is provided."""
    resp = client.get("/api/datasets")
    assert resp.status_code == 401

    resp = client.get("/api/auth/me")
    assert resp.status_code == 401

    resp = client.get("/api/datasets/ds-nonexistent")
    assert resp.status_code == 401

    resp = client.delete("/api/datasets/ds-nonexistent")
    assert resp.status_code == 401


def test_current_user_profile(client):
    """GET /api/auth/me should return authenticated user profile."""
    resp = client.get("/api/auth/me", headers=AUTH_HEADER_A)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "usr-test-a"
    assert data["email"] == "alice@tatvik.ai"


def test_persistent_dataset_upload_and_listing(client):
    """User can upload a dataset persistently and list their own datasets."""
    file_bytes = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    files = {"file": ("contacts.csv", file_bytes, "text/csv")}

    upload_resp = client.post("/api/datasets/upload", files=files, headers=AUTH_HEADER_A)
    assert upload_resp.status_code == 201
    created = upload_resp.json()
    assert created["id"].startswith("ds-")
    assert created["filename"] == "contacts.csv"
    assert created["total_rows"] == 3
    assert created["total_columns"] == 3
    assert created["quality_score"] > 0
    assert "score_grade" in created

    dataset_id = created["id"]

    # List datasets
    list_resp = client.get("/api/datasets", headers=AUTH_HEADER_A)
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["total"] == 1
    assert list_data["items"][0]["id"] == dataset_id


def test_cross_user_ownership_isolation(client):
    """User B cannot access, rename, or delete User A's dataset (strict multi-tenant isolation)."""
    file_bytes = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    files = {"file": ("alice_private.csv", file_bytes, "text/csv")}

    upload_resp = client.post("/api/datasets/upload", files=files, headers=AUTH_HEADER_A)
    assert upload_resp.status_code == 201
    dataset_id = upload_resp.json()["id"]

    # User B list should be empty
    list_b = client.get("/api/datasets", headers=AUTH_HEADER_B)
    assert list_b.status_code == 200
    assert list_b.json()["total"] == 0

    # User B attempts to get User A's dataset -> 404 Not Found (prevents ID enumeration)
    get_b = client.get(f"/api/datasets/{dataset_id}", headers=AUTH_HEADER_B)
    assert get_b.status_code == 404

    # User B attempts to rename User A's dataset -> 404 Not Found
    patch_b = client.patch(
        f"/api/datasets/{dataset_id}",
        json={"filename": "hacked.csv"},
        headers=AUTH_HEADER_B,
    )
    assert patch_b.status_code == 404

    # User B attempts to delete User A's dataset -> 404 Not Found
    del_b = client.delete(f"/api/datasets/{dataset_id}", headers=AUTH_HEADER_B)
    assert del_b.status_code == 404

    # User A can still access their dataset unharmed
    get_a = client.get(f"/api/datasets/{dataset_id}", headers=AUTH_HEADER_A)
    assert get_a.status_code == 200
    assert get_a.json()["filename"] == "alice_private.csv"


def test_dataset_rename_and_deletion(client):
    """User A can rename and delete their own dataset."""
    file_bytes = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    files = {"file": ("old_name.csv", file_bytes, "text/csv")}

    upload_resp = client.post("/api/datasets/upload", files=files, headers=AUTH_HEADER_A)
    dataset_id = upload_resp.json()["id"]

    # Rename
    patch_resp = client.patch(
        f"/api/datasets/{dataset_id}",
        json={"filename": "new_name.csv"},
        headers=AUTH_HEADER_A,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["filename"] == "new_name.csv"

    # Delete
    del_resp = client.delete(f"/api/datasets/{dataset_id}", headers=AUTH_HEADER_A)
    assert del_resp.status_code == 204

    # Verify subsequent fetch returns 404
    get_resp = client.get(f"/api/datasets/{dataset_id}", headers=AUTH_HEADER_A)
    assert get_resp.status_code == 404


def test_dual_dataset_preservation_and_sync(client):
    """Applying corrections modifies the working copy while preserving original data intact in the DB."""
    file_bytes = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    files = {"file": ("dual_check.csv", file_bytes, "text/csv")}

    upload_resp = client.post("/api/datasets/upload", files=files, headers=AUTH_HEADER_A)
    dataset_id = upload_resp.json()["id"]

    # Restore/get review session
    restore_resp = client.post(f"/api/datasets/{dataset_id}/restore-session", headers=AUTH_HEADER_A)
    assert restore_resp.status_code == 200
    session_id = restore_resp.json()["session_id"]
    assert session_id == f"rev-{dataset_id}"

    # Fetch review session details to get a suggestion
    session_detail = client.get(f"/api/review/sessions/{session_id}")
    assert session_detail.status_code == 200
    suggestions = session_detail.json()["suggestions"]
    correctable = [s for s in suggestions if s["can_auto_correct"]]
    assert len(correctable) > 0, "Expected at least one correctable suggestion for trailing whitespace"

    target_issue = correctable[0]
    issue_id = target_issue["issue_id"]
    row_idx = target_issue["row_index"]
    col_name = target_issue["column_name"]
    original_val = target_issue["original_value"]
    proposed_val = target_issue["proposed_value"]

    # 1. Approve suggestion
    decide_resp = client.post(
        f"/api/review/sessions/{session_id}/decide/{issue_id}",
        json={"decision": "approve"},
    )
    assert decide_resp.status_code == 200
    assert decide_resp.json()["status"] == "approved"

    # 2. Apply approved changes
    apply_resp = client.post(f"/api/review/sessions/{session_id}/apply")
    assert apply_resp.status_code == 200
    assert apply_resp.json()["applied_count"] >= 1

    # 3. Verify in database: original vs working matrices
    db = TestingSessionLocal()
    try:
        data_rec = db.query(DatasetDataRecord).filter(DatasetDataRecord.dataset_id == dataset_id).first()
        assert data_rec is not None
        orig_matrix = data_rec.get_original_matrix()
        working_matrix = data_rec.get_working_matrix()

        ds_rec = db.query(DatasetRecord).filter(DatasetRecord.id == dataset_id).first()
        col_idx = ds_rec.columns.index(col_name)

        # 0-indexed row in matrix is row_idx - 1
        assert orig_matrix[row_idx - 1][col_idx] == original_val
        assert working_matrix[row_idx - 1][col_idx] == proposed_val
        assert orig_matrix[row_idx - 1][col_idx] != working_matrix[row_idx - 1][col_idx]
    finally:
        db.close()


def test_session_restoration_across_restarts(client):
    """Review session and applied state can be completely rebuilt from DB after clearing memory cache."""
    file_bytes = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    files = {"file": ("restart_test.csv", file_bytes, "text/csv")}

    upload_resp = client.post("/api/datasets/upload", files=files, headers=AUTH_HEADER_A)
    dataset_id = upload_resp.json()["id"]
    session_id = f"rev-{dataset_id}"

    # Approve and apply a change
    session_detail = client.get(f"/api/review/sessions/{session_id}")
    correctable = [s for s in session_detail.json()["suggestions"] if s["can_auto_correct"]]
    issue_id = correctable[0]["issue_id"]

    client.post(f"/api/review/sessions/{session_id}/decide/{issue_id}", json={"decision": "approve"})
    client.post(f"/api/review/sessions/{session_id}/apply")

    # SIMULATE APP RESTART: clear all in-memory review sessions
    review_manager._sessions.clear()
    assert session_id not in review_manager._sessions

    # Restore session from database
    restore_resp = client.post(f"/api/datasets/{dataset_id}/restore-session", headers=AUTH_HEADER_A)
    assert restore_resp.status_code == 200
    restored_data = restore_resp.json()
    assert restored_data["session_id"] == session_id
    assert restored_data["summary"]["applied_count"] >= 1

    # Session is back in memory with working dataset reflecting the change
    restored_session = review_manager.get_session(session_id)
    assert restored_session is not None
    assert len(restored_session.applied_changes) >= 1
