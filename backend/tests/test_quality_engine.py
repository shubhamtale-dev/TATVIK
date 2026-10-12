"""Automated tests for Data Quality Detection Engine (Part 3).
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_analyze_exact_duplicate_rows():
    """Verify that identical rows are detected and flagged as exact duplicates."""
    csv_data = (
        "id,name,role\n"
        "1,Alice,Engineer\n"
        "2,Bob,Designer\n"
        "1,Alice,Engineer\n"  # Exact duplicate of row 1
    ).encode("utf-8")

    response = client.post(
        "/api/datasets/analyze",
        files={"file": ("duplicates.csv", csv_data, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["category_counts"]["duplicates"] >= 1
    dup_issues = [i for i in data["issues"] if i["issue_type"] == "exact_duplicate_row"]
    assert len(dup_issues) == 1
    assert dup_issues[0]["row_index"] == 3
    assert "exact duplicate" in dup_issues[0]["explanation"].lower()


def test_analyze_missing_and_whitespace_only_values():
    """Verify that blank, whitespace-only, and sentinel placeholder values are flagged."""
    csv_data = (
        "id,city,notes\n"
        "1,London,Active\n"
        "2,,Pending\n"           # Missing empty
        "3,   ,Valid\n"          # Whitespace only
        "4,Berlin,N/A\n"         # Sentinel string
    ).encode("utf-8")

    response = client.post(
        "/api/datasets/analyze",
        files={"file": ("missing_test.csv", csv_data, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["category_counts"]["missing_values"] >= 3
    missing_issues = [i for i in data["issues"] if i["category"] == "missing_values"]
    assert len(missing_issues) == 3


def test_analyze_email_format_valid_and_invalid():
    """Verify email column validation catches invalid emails and ignores valid ones."""
    csv_data = (
        "id,user_email,status\n"
        "1,valid.user@example.com,active\n"
        "2,broken-email-without-domain,active\n"  # Invalid email
        "3,missing_at_symbol.com,active\n"        # Invalid email
    ).encode("utf-8")

    response = client.post(
        "/api/datasets/analyze",
        files={"file": ("emails.csv", csv_data, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    email_issues = [i for i in data["issues"] if i["issue_type"] == "invalid_email_format"]
    assert len(email_issues) == 2
    assert {i["row_index"] for i in email_issues} == {2, 3}


def test_analyze_dataset_without_email_or_phone_columns():
    """Verify datasets lacking email or phone columns analyze cleanly without errors."""
    csv_data = (
        "item_id,weight_kg,price_usd\n"
        "101,12.5,99.99\n"
        "102,5.0,24.50\n"
    ).encode("utf-8")

    response = client.post(
        "/api/datasets/analyze",
        files={"file": ("inventory.csv", csv_data, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["detected_special_columns"]["email_columns"]) == 0
    assert len(data["detected_special_columns"]["phone_columns"]) == 0
    assert data["quality_score"] == 100.0
    assert "A" in data["score_grade"]


def test_analyze_phone_format_validation():
    """Verify conservative phone number checking flags malformed phone records."""
    csv_data = (
        "id,contact_phone\n"
        "1,+1 (555) 234-5678\n"   # Valid
        "2,1234\n"                # Too short (< 7 digits)
        "3,call-me-urgent\n"      # Contains non-digits
    ).encode("utf-8")

    response = client.post(
        "/api/datasets/analyze",
        files={"file": ("phones.csv", csv_data, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    phone_issues = [i for i in data["issues"] if i["issue_type"] == "invalid_phone_format"]
    assert len(phone_issues) == 2
    assert {i["row_index"] for i in phone_issues} == {2, 3}


def test_analyze_inconsistent_text_values():
    """Verify that leading/trailing whitespace and casing variations are surfaced as suggestions."""
    csv_data = (
        "id,country,category\n"
        "1, USA ,Widget\n"         # Untrimmed whitespace
        "2,USA,widget\n"           # Different casing
        "3,usa,WIDGET\n"           # Different casing
    ).encode("utf-8")

    response = client.post(
        "/api/datasets/analyze",
        files={"file": ("inconsistent.csv", csv_data, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["category_counts"]["inconsistent_values"] >= 1
    issue_types = {i["issue_type"] for i in data["issues"]}
    assert "untrimmed_whitespace" in issue_types or "casing_inconsistency" in issue_types


def test_analyze_empty_and_malformed_uploads():
    """Verify empty files return 400 and malformed files return 422."""
    # Empty file
    res_empty = client.post(
        "/api/datasets/analyze",
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert res_empty.status_code == 400

    # Malformed XLSX
    res_malformed = client.post(
        "/api/datasets/analyze",
        files={"file": ("bad.xlsx", b"not-a-valid-zip", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert res_malformed.status_code == 422


def test_quality_score_bounds_and_calculation():
    """Verify quality score remains strictly bounded between 0.0 and 100.0."""
    # Pristine dataset
    perfect_csv = "id,name\n1,Alpha\n2,Beta\n3,Gamma\n".encode("utf-8")
    res_perfect = client.post(
        "/api/datasets/analyze",
        files={"file": ("perfect.csv", perfect_csv, "text/csv")},
    )
    assert res_perfect.status_code == 200
    assert res_perfect.json()["quality_score"] == 100.0
    assert "A" in res_perfect.json()["score_grade"]

    # Heavily defective dataset
    bad_rows = "\n".join([f",," for _ in range(20)])
    bad_csv = f"id,email,phone\n{bad_rows}".encode("utf-8")
    res_bad = client.post(
        "/api/datasets/analyze",
        files={"file": ("bad.csv", bad_csv, "text/csv")},
    )
    assert res_bad.status_code == 200
    score = res_bad.json()["quality_score"]
    assert 0.0 <= score <= 100.0
    assert score < 70.0
    assert "scoring_formula_explanation" in res_bad.json()
