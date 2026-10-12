"""Automated tests for Issue Review & Correction Approval (Part 4).

Covers:
- Approving a valid suggestion
- Ineligible manual review issues cannot be approved
- Rejecting a suggestion leaves value unchanged
- Applying only approved changes
- Preserving original dataset immutability
- Bulk approval and rejection
- Missing or invalid issue and session identifiers
- Duplicate application attempts prevention
- Data type handling across numbers, floats, booleans, and dates
- Working dataset preview and changes audit log
"""

import io
from fastapi.testclient import TestClient
import pandas as pd
import pytest

from app.main import app
from app.services.review_service import review_manager

client = TestClient(app)


@pytest.fixture
def sample_csv_payload():
    """Generates CSV bytes with a mixture of auto-correctable and manual review issues."""
    csv_text = (
        "id,customer_name,category,email,notes\n"
        "1, Acme Corp ,Widget,valid@acme.com,urgent\n"      # Untrimmed name
        "2,Beta LLC,widget,invalid-email,followup\n"         # Casing discrepancy, invalid email
        "3,Gamma Inc,WIDGET,gamma@corp.com,N/A\n"            # Casing discrepancy, sentinel note
        "4,Delta Ltd,Widget,delta@corp.com,active\n"         # Clean
    )
    return csv_text.encode("utf-8")


def test_create_review_session(sample_csv_payload):
    """Verify session initialization, summary metrics, and conservative suggestions."""
    response = client.post(
        "/api/review/sessions",
        files={"file": ("customers.csv", sample_csv_payload, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["session_id"].startswith("rev-")
    assert data["total_rows"] == 4
    assert data["total_columns"] == 5

    summary = data["summary"]
    assert summary["total_issues"] > 0
    assert summary["pending_count"] == summary["total_issues"]
    assert summary["approved_count"] == 0
    assert summary["rejected_count"] == 0
    assert summary["applied_count"] == 0
    assert summary["auto_correctable_count"] > 0
    assert summary["manual_review_count"] > 0

    # Ensure auto-correctable suggestions have proposed values
    auto_correctable = [s for s in data["suggestions"] if s["can_auto_correct"]]
    assert len(auto_correctable) > 0
    for s in auto_correctable:
        assert s["proposed_value"] is not None
        assert s["status"] == "pending"
        assert s["applied"] is False


def test_approve_valid_suggestion(sample_csv_payload):
    """Verify approving a valid auto-correctable suggestion transitions its status."""
    res_create = client.post(
        "/api/review/sessions",
        files={"file": ("customers.csv", sample_csv_payload, "text/csv")},
    )
    session_id = res_create.json()["session_id"]

    # Pick an auto-correctable suggestion
    suggestions = res_create.json()["suggestions"]
    auto_sug = next(s for s in suggestions if s["can_auto_correct"])

    res_decide = client.post(
        f"/api/review/sessions/{session_id}/decide/{auto_sug['issue_id']}",
        json={"decision": "approve"},
    )
    assert res_decide.status_code == 200
    updated = res_decide.json()
    assert updated["issue_id"] == auto_sug["issue_id"]
    assert updated["status"] == "approved"
    assert updated["applied"] is False

    # Check session summary reflects 1 approved
    res_get = client.get(f"/api/review/sessions/{session_id}")
    assert res_get.json()["summary"]["approved_count"] == 1
    assert res_get.json()["summary"]["pending_count"] == res_get.json()["summary"]["total_issues"] - 1


def test_cannot_approve_manual_review_issue(sample_csv_payload):
    """Verify attempting to approve an issue requiring manual review is safely rejected."""
    res_create = client.post(
        "/api/review/sessions",
        files={"file": ("customers.csv", sample_csv_payload, "text/csv")},
    )
    session_id = res_create.json()["session_id"]
    suggestions = res_create.json()["suggestions"]

    # Pick an issue requiring manual review (e.g., invalid email or sentinel note)
    manual_sug = next(s for s in suggestions if not s["can_auto_correct"])

    res_decide = client.post(
        f"/api/review/sessions/{session_id}/decide/{manual_sug['issue_id']}",
        json={"decision": "approve"},
    )
    assert res_decide.status_code == 400
    assert "cannot be approved" in res_decide.json()["message"]


def test_reject_suggestion_leaves_value_unchanged(sample_csv_payload):
    """Verify rejecting a suggestion marks it rejected and leaves dataset unchanged upon apply."""
    res_create = client.post(
        "/api/review/sessions",
        files={"file": ("customers.csv", sample_csv_payload, "text/csv")},
    )
    session_id = res_create.json()["session_id"]
    auto_sug = next(s for s in res_create.json()["suggestions"] if s["can_auto_correct"])

    # Reject suggestion
    res_reject = client.post(
        f"/api/review/sessions/{session_id}/decide/{auto_sug['issue_id']}",
        json={"decision": "reject"},
    )
    assert res_reject.status_code == 200
    assert res_reject.json()["status"] == "rejected"

    # Apply approved changes (none are approved)
    res_apply = client.post(f"/api/review/sessions/{session_id}/apply")
    assert res_apply.status_code == 200
    assert res_apply.json()["applied_count"] == 0

    # Verify working preview cell remains original
    res_preview = client.get(f"/api/review/sessions/{session_id}/preview")
    rows = res_preview.json()["preview_rows"]
    row_idx = auto_sug["row_index"] - 1
    col_name = auto_sug["column_name"]
    assert rows[row_idx][col_name] == auto_sug["original_value"]


def test_apply_only_approved_changes(sample_csv_payload):
    """Verify apply modifies only approved issues and leaves pending/rejected untouched."""
    res_create = client.post(
        "/api/review/sessions",
        files={"file": ("customers.csv", sample_csv_payload, "text/csv")},
    )
    session_id = res_create.json()["session_id"]
    auto_suggestions = [s for s in res_create.json()["suggestions"] if s["can_auto_correct"]]
    assert len(auto_suggestions) >= 2

    target_approved = auto_suggestions[0]
    target_pending = auto_suggestions[1]

    # Approve only first target
    client.post(
        f"/api/review/sessions/{session_id}/decide/{target_approved['issue_id']}",
        json={"decision": "approve"},
    )

    # Apply
    res_apply = client.post(f"/api/review/sessions/{session_id}/apply")
    assert res_apply.status_code == 200
    apply_data = res_apply.json()
    assert apply_data["applied_count"] == 1
    assert apply_data["applied_changes"][0]["issue_id"] == target_approved["issue_id"]

    # Verify working preview has the applied correction
    res_preview = client.get(f"/api/review/sessions/{session_id}/preview")
    rows = res_preview.json()["preview_rows"]

    approved_row_0 = target_approved["row_index"] - 1
    approved_col = target_approved["column_name"]
    assert rows[approved_row_0][approved_col] == target_approved["proposed_value"]

    # Pending issue cell remains unedited
    pending_row_0 = target_pending["row_index"] - 1
    pending_col = target_pending["column_name"]
    assert rows[pending_row_0][pending_col] == target_pending["original_value"]


def test_preserves_original_dataset(sample_csv_payload):
    """Verify original dataset remains strictly unmodified while working copy is updated."""
    res_create = client.post(
        "/api/review/sessions",
        files={"file": ("customers.csv", sample_csv_payload, "text/csv")},
    )
    session_id = res_create.json()["session_id"]
    session = review_manager.get_session(session_id)
    assert session is not None

    orig_val_before = session.original_df.at[0, "customer_name"]
    assert orig_val_before == " Acme Corp "  # With whitespace

    # Find and approve untrimmed whitespace issue
    ws_issue = next(s for s in session.suggestions.values() if s.issue_type == "untrimmed_whitespace")
    client.post(
        f"/api/review/sessions/{session_id}/decide/{ws_issue.issue_id}",
        json={"decision": "approve"},
    )
    client.post(f"/api/review/sessions/{session_id}/apply")

    # Assert working copy is modified
    assert session.working_df.at[0, "customer_name"] == "Acme Corp"

    # Assert original copy is strictly preserved
    assert session.original_df.at[0, "customer_name"] == " Acme Corp "


def test_bulk_approval_and_rejection(sample_csv_payload):
    """Verify batch approving and rejecting multiple suggestions."""
    res_create = client.post(
        "/api/review/sessions",
        files={"file": ("customers.csv", sample_csv_payload, "text/csv")},
    )
    session_id = res_create.json()["session_id"]
    all_sugs = res_create.json()["suggestions"]

    auto_ids = [s["issue_id"] for s in all_sugs if s["can_auto_correct"]]
    manual_ids = [s["issue_id"] for s in all_sugs if not s["can_auto_correct"]]

    # Bulk approve auto_ids mixed with a manual_id
    res_bulk_app = client.post(
        f"/api/review/sessions/{session_id}/bulk-decide",
        json={"issue_ids": auto_ids + manual_ids[:1], "decision": "approve"},
    )
    assert res_bulk_app.status_code == 200
    data_app = res_bulk_app.json()
    assert data_app["updated_count"] == len(auto_ids)
    assert set(data_app["updated_issue_ids"]) == set(auto_ids)
    # Manual ID should be in skipped list
    assert manual_ids[0] in data_app["skipped_issue_ids"]

    # Bulk reject manual IDs
    res_bulk_rej = client.post(
        f"/api/review/sessions/{session_id}/bulk-decide",
        json={"issue_ids": manual_ids, "decision": "reject"},
    )
    assert res_bulk_rej.status_code == 200
    data_rej = res_bulk_rej.json()
    assert data_rej["updated_count"] == len(manual_ids)


def test_missing_or_invalid_identifiers():
    """Verify 404 for invalid session or issue, and 400 for invalid decisions."""
    # Invalid session ID
    res1 = client.get("/api/review/sessions/non-existent-session-id")
    assert res1.status_code == 404

    # Invalid issue ID on valid session
    csv_bytes = b"id,val\n1, test \n"
    res_create = client.post(
        "/api/review/sessions",
        files={"file": ("test.csv", csv_bytes, "text/csv")},
    )
    session_id = res_create.json()["session_id"]

    res2 = client.post(
        f"/api/review/sessions/{session_id}/decide/fake-issue-id",
        json={"decision": "approve"},
    )
    assert res2.status_code == 404

    # Invalid decision string
    res3 = client.post(
        f"/api/review/sessions/{session_id}/decide/iss-1",
        json={"decision": "invalid_decision"},
    )
    assert res3.status_code == 400


def test_duplicate_application_attempts(sample_csv_payload):
    """Verify that applying twice does not double-apply or error."""
    res_create = client.post(
        "/api/review/sessions",
        files={"file": ("customers.csv", sample_csv_payload, "text/csv")},
    )
    session_id = res_create.json()["session_id"]
    auto_sug = next(s for s in res_create.json()["suggestions"] if s["can_auto_correct"])

    # Approve and apply once
    client.post(
        f"/api/review/sessions/{session_id}/decide/{auto_sug['issue_id']}",
        json={"decision": "approve"},
    )
    res_apply1 = client.post(f"/api/review/sessions/{session_id}/apply")
    assert res_apply1.json()["applied_count"] == 1

    # Apply second time immediately
    res_apply2 = client.post(f"/api/review/sessions/{session_id}/apply")
    assert res_apply2.status_code == 200
    assert res_apply2.json()["applied_count"] == 0
    assert "No pending approved changes" in res_apply2.json()["message"]

    # Attempting to re-decide an already applied issue returns 400
    res_decide_again = client.post(
        f"/api/review/sessions/{session_id}/decide/{auto_sug['issue_id']}",
        json={"decision": "reject"},
    )
    assert res_decide_again.status_code == 400
    assert "already been applied" in res_decide_again.json()["message"]


def test_data_type_handling_mixed_dataset():
    """Verify corrections work safely on datasets with numbers, booleans, floats, and dates."""
    csv_text = (
        "record_id,active,rating,signup_date,city\n"
        "101,True,4.5,2024-01-15, New York \n"  # Untrimmed string in row with float/date/bool
        "102,False,NaN,2024-02-20,Chicago\n"     # Float NaN
        "103,True,5.0,2024-03-01, chicago \n"    # Untrimmed + casing
    )
    res = client.post(
        "/api/review/sessions",
        files={"file": ("mixed.csv", csv_text.encode("utf-8"), "text/csv")},
    )
    assert res.status_code == 200
    session_id = res.json()["session_id"]

    # Bulk approve all auto-correctable suggestions
    auto_ids = [s["issue_id"] for s in res.json()["suggestions"] if s["can_auto_correct"]]
    client.post(
        f"/api/review/sessions/{session_id}/bulk-decide",
        json={"issue_ids": auto_ids, "decision": "approve"},
    )

    # Apply
    res_apply = client.post(f"/api/review/sessions/{session_id}/apply")
    assert res_apply.status_code == 200
    assert res_apply.json()["applied_count"] > 0

    # Ensure preview serialization handles NaN, floats, and booleans cleanly
    res_preview = client.get(f"/api/review/sessions/{session_id}/preview")
    assert res_preview.status_code == 200
    rows = res_preview.json()["preview_rows"]
    assert len(rows) == 3
    assert rows[0]["city"] == "New York"
    # Row 1 rating should be safely null/None (not NaN string or crash)
    assert rows[1]["rating"] is None


def test_review_session_initialized_from_analyze_endpoint(sample_csv_payload):
    """Verify that calling POST /api/datasets/analyze automatically creates and returns session_id."""
    response = client.post(
        "/api/datasets/analyze",
        files={"file": ("customers.csv", sample_csv_payload, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["session_id"] is not None
    assert data["session_id"].startswith("rev-")

    # Session can be queried via review API
    res_session = client.get(f"/api/review/sessions/{data['session_id']}")
    assert res_session.status_code == 200
    assert res_session.json()["summary"]["total_issues"] == data["total_issues_detected"]
