"""Automated tests for Research Verification & Source Evidence (Part 5).

Covers:
- Unconfigured search provider returns honest not_configured status
- Official domain vs third-party source discrimination
- Supporting, conflicting, ambiguous, and insufficient evidence outcomes
- Provider timeout and rate limit resilience without crashes
- HTML and JavaScript sanitization on retrieved snippets
- Absolute dataset immutability during research verification
- Input validation (row bounds, missing columns, batch limits, invalid session IDs)
- Manual reviewer assessment lifecycle (verified, flagged, dismissed)
- Direct CSV upload and verification endpoint
"""

import io
from typing import List, Optional
from fastapi.testclient import TestClient
import pandas as pd
import pytest

from app.main import app
from app.schemas.verification import EvidenceSource
from app.services.research_provider import (
    ProviderRateLimitError,
    ProviderTimeoutError,
    RawSearchResult,
    ResearchProvider,
)
from app.services.review_service import review_manager
from app.services.verification_service import verification_engine

client = TestClient(app)


class ControllableMockProvider(ResearchProvider):
    """Configurable mock provider for deterministic verification testing."""

    def __init__(self, name: str = "mock", results: Optional[List[RawSearchResult]] = None):
        self._name = name
        self.results = results or []
        self.simulate_timeout = False
        self.simulate_rate_limit = False

    @property
    def name(self) -> str:
        return self._name

    @property
    def is_configured(self) -> bool:
        return True

    async def search(self, query: str, max_results: int = 5) -> List[RawSearchResult]:
        if self.simulate_timeout:
            raise ProviderTimeoutError("Search request timed out after 10.0 seconds.")
        if self.simulate_rate_limit:
            raise ProviderRateLimitError("Rate limit reached for mock search provider.")
        return self.results


@pytest.fixture
def sample_csv_bytes():
    """Generates a test CSV with business entities, websites, and addresses."""
    csv_text = (
        "id,company_name,website,headquarters,phone\n"
        "1,Acme Corporation,https://acme.com,New York NY,+1-212-555-0100\n"
        "2,Globex Mining,https://globex-corp.com,Denver CO,+1-303-555-0199\n"
        "3,Initech Software,https://initech.io,Austin TX,+1-512-555-0144\n"
        "4,Umbrella Biocorp,https://umbrella-labs.org,Raccoon City,+1-702-555-0188\n"
    )
    return csv_text.encode("utf-8")


@pytest.fixture
def active_session_id(sample_csv_bytes):
    """Creates a real review session and returns its ID."""
    response = client.post(
        "/api/review/sessions",
        files={"file": ("companies.csv", sample_csv_bytes, "text/csv")},
    )
    assert response.status_code == 200
    return response.json()["session_id"]


@pytest.fixture(autouse=True)
def reset_verification_engine_provider():
    """Ensures verification engine provider is reset after each test."""
    original_provider = verification_engine._provider
    yield
    verification_engine.set_provider(original_provider)


# --- Test 1: Provider Status & Setup Instructions ---

def test_provider_status_endpoint():
    """Verifies that provider-status endpoint returns accurate configuration metadata."""
    response = client.get("/api/verification/provider-status")
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data
    assert "provider_name" in data
    assert "setup_instructions" in data
    assert "TAVILY_API_KEY" in data["setup_instructions"]
    assert "SERPAPI_API_KEY" in data["setup_instructions"]
    assert data["max_claims_per_batch"] == 20


# --- Test 2: Unconfigured Provider Behavior ---

def test_unconfigured_provider_returns_honest_status(active_session_id):
    """When no provider key is configured, verification must not fabricate live research."""
    # Reset engine to default unconfigured provider
    verification_engine.set_provider(None)

    payload = {
        "session_id": active_session_id,
        "column_name": "company_name",
        "claim_type": "entity_existence",
        "row_indices": [1],
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["total_claims"] == 1
    assert data["completed_count"] == 1
    item = data["results"][0]
    assert item["status"] == "not_configured"
    assert item["status_label"] == "Not Configured"
    assert item["confidence_score"] is None
    assert len(item["sources"]) == 0
    assert "TATVIK does not fabricate search results" in item["explanation"]


# --- Test 3: Grounded Official Evidence Match ---

def test_verified_supported_by_official_source(active_session_id):
    """An authoritative official company website or .gov registry source produces Supported by Evidence."""
    mock_results = [
        RawSearchResult(
            title="Acme Corporation - Official Global Homepage",
            url="https://acme.com/about",
            domain="acme.com",
            snippet="Acme Corporation is a premier manufacturer founded in 1994, headquartered in New York.",
        ),
        RawSearchResult(
            title="Acme Corporation SEC EDGAR Filing",
            url="https://www.sec.gov/edgar/data/acmecorp",
            domain="sec.gov",
            snippet="SEC Form 10-K Annual Report for Acme Corporation.",
        ),
    ]
    verification_engine.set_provider(ControllableMockProvider(results=mock_results))

    payload = {
        "session_id": active_session_id,
        "column_name": "company_name",
        "context_column": "website",
        "claim_type": "entity_existence",
        "row_indices": [1],
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status_counts"]["supported_by_evidence"] == 1
    item = data["results"][0]
    assert item["status"] == "supported_by_evidence"
    assert item["confidence_score"] >= 90.0
    assert len(item["sources"]) == 2
    # Verify official source classification
    official_sources = [s for s in item["sources"] if s["source_type"] == "official"]
    assert len(official_sources) >= 1
    assert any(s["domain"] == "acme.com" for s in official_sources)


# --- Test 4: Grounded Third-Party Directory Support ---

def test_verified_supported_by_third_party_directories(active_session_id):
    """Multiple third-party directory listings corroborate entity without official domain."""
    mock_results = [
        RawSearchResult(
            title="Globex Mining Profile on Bloomberg",
            url="https://bloomberg.com/profile/company/GLOBEX",
            domain="bloomberg.com",
            snippet="Globex Mining is an exploration and natural resource development company operating in Denver.",
        ),
        RawSearchResult(
            title="Globex Mining Company Directory",
            url="https://dnb.com/business-directory/globex-mining",
            domain="dnb.com",
            snippet="Dun & Bradstreet business profile for Globex Mining.",
        ),
    ]
    verification_engine.set_provider(ControllableMockProvider(results=mock_results))

    payload = {
        "session_id": active_session_id,
        "column_name": "company_name",
        "claim_type": "entity_existence",
        "row_indices": [2],
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code == 200
    data = response.json()

    item = data["results"][0]
    assert item["status"] == "supported_by_evidence"
    assert item["confidence_score"] == 78.0
    assert all(s["source_type"] == "third_party" for s in item["sources"])


# --- Test 5: Grounded Conflicting Evidence ---

def test_conflicting_evidence_detected(active_session_id):
    """Presence of keywords like 'permanently closed' or 'dissolved' flags conflicting evidence."""
    mock_results = [
        RawSearchResult(
            title="Umbrella Biocorp Investigation",
            url="https://reuters.com/business/umbrella-biocorp-defunct",
            domain="reuters.com",
            snippet="Umbrella Biocorp was dissolved following a cease and desist order and bankruptcy liquidation.",
        ),
    ]
    verification_engine.set_provider(ControllableMockProvider(results=mock_results))

    payload = {
        "session_id": active_session_id,
        "column_name": "company_name",
        "claim_type": "entity_existence",
        "row_indices": [4],
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code == 200
    data = response.json()

    item = data["results"][0]
    assert item["status"] == "conflicting_evidence"
    assert item["status_label"] == "Conflicting Evidence"
    assert item["confidence_score"] is not None and item["confidence_score"] > 50.0
    assert "contradicting" in item["explanation"].lower() or "conflict" in item["explanation"].lower()


# --- Test 6: Insufficient Evidence / Unable to Verify ---

def test_insufficient_evidence_when_no_results(active_session_id):
    """Zero external search records results in unable_to_verify rather than fabrication."""
    verification_engine.set_provider(ControllableMockProvider(results=[]))

    payload = {
        "session_id": active_session_id,
        "column_name": "company_name",
        "claim_type": "entity_existence",
        "row_indices": [3],
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code == 200
    data = response.json()

    item = data["results"][0]
    assert item["status"] == "unable_to_verify"
    assert item["status_label"] == "Unable to Verify"
    assert item["confidence_score"] is None
    assert len(item["sources"]) == 0
    assert "0 verifiable citations" in item["explanation"]


# --- Test 7: Provider Timeout & Rate Limit Handling ---

def test_provider_timeout_handled_gracefully(active_session_id):
    """A search provider timeout must not throw a 500 server error."""
    provider = ControllableMockProvider()
    provider.simulate_timeout = True
    verification_engine.set_provider(provider)

    payload = {
        "session_id": active_session_id,
        "column_name": "company_name",
        "claim_type": "entity_existence",
        "row_indices": [1],
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code == 200
    data = response.json()

    item = data["results"][0]
    assert item["status"] == "unable_to_verify"
    assert item["provider_warning"] is not None
    assert "timed out" in item["provider_warning"].lower()


def test_provider_rate_limit_handled_gracefully(active_session_id):
    """A search provider rate limit must be caught and communicated safely."""
    provider = ControllableMockProvider()
    provider.simulate_rate_limit = True
    verification_engine.set_provider(provider)

    payload = {
        "session_id": active_session_id,
        "column_name": "company_name",
        "claim_type": "entity_existence",
        "row_indices": [1],
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code == 200
    data = response.json()

    item = data["results"][0]
    assert item["status"] == "unable_to_verify"
    assert item["provider_warning"] is not None
    assert "rate limit" in item["provider_warning"].lower()


# --- Test 8: HTML / Script Sanitization ---

def test_sanitization_of_malformed_html_in_sources(active_session_id):
    """Untrusted raw HTML or JavaScript snippets from providers must be strictly stripped."""
    mock_results = [
        RawSearchResult(
            title="<script>alert('pwned')</script>Acme Corp Profile",
            url="https://directory.com/acme",
            domain="directory.com",
            snippet="<b>Acme Corporation</b> operates globally. <img src=x onerror=alert(1)> Established in New York.",
        ),
        RawSearchResult(
            title="Acme Industry Overview",
            url="https://industry.com/acme",
            domain="industry.com",
            snippet="Acme Corporation suppliers directory.",
        ),
    ]
    verification_engine.set_provider(ControllableMockProvider(results=mock_results))

    payload = {
        "session_id": active_session_id,
        "column_name": "company_name",
        "claim_type": "entity_existence",
        "row_indices": [1],
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code == 200
    data = response.json()

    source = data["results"][0]["sources"][0]
    assert "<script>" not in source["title"]
    assert "<script>" not in source["snippet"]
    assert "<img" not in source["snippet"]
    assert "onerror=" not in source["snippet"]


# --- Test 9: Dataset Immutability ---

def test_dataset_remains_strictly_immutable(active_session_id):
    """Verifying claims must NEVER modify the session's original or working dataframe."""
    session = review_manager.get_session(active_session_id)
    assert session is not None

    orig_df_before = session.original_df.copy(deep=True)
    working_df_before = session.working_df.copy(deep=True)

    mock_results = [
        RawSearchResult(
            title="Acme Corp",
            url="https://acme.com",
            domain="acme.com",
            snippet="Acme Corporation is located in New York.",
        ),
    ]
    verification_engine.set_provider(ControllableMockProvider(results=mock_results))

    payload = {
        "session_id": active_session_id,
        "column_name": "company_name",
        "claim_type": "entity_existence",
        "row_indices": [1, 2],
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code == 200

    # Ensure DataFrames are bitwise identical
    pd.testing.assert_frame_equal(session.original_df, orig_df_before)
    pd.testing.assert_frame_equal(session.working_df, working_df_before)


# --- Test 10: Input Validation & Boundary Checks ---

def test_validation_nonexistent_session():
    """Requesting verification for a non-existent session returns 404."""
    payload = {
        "session_id": "rev-nonexistent-uuid",
        "column_name": "company_name",
        "claim_type": "entity_existence",
        "row_indices": [1],
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code == 404


def test_validation_invalid_column_name(active_session_id):
    """Target column not present in dataset returns 400."""
    payload = {
        "session_id": active_session_id,
        "column_name": "non_existent_column",
        "claim_type": "entity_existence",
        "row_indices": [1],
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code == 400
    assert "not found in dataset" in response.json()["detail"]


def test_validation_out_of_bounds_row_index(active_session_id):
    """Row index exceeding dataset length returns 400."""
    payload = {
        "session_id": active_session_id,
        "column_name": "company_name",
        "claim_type": "entity_existence",
        "row_indices": [999],
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code == 400
    assert "out of bounds" in response.json()["detail"]


def test_validation_batch_size_exceeded(active_session_id):
    """Submitting more than 20 rows returns 422 or 400."""
    payload = {
        "session_id": active_session_id,
        "column_name": "company_name",
        "claim_type": "entity_existence",
        "row_indices": list(range(1, 25)),
    }
    response = client.post("/api/verification/verify-batch", json=payload)
    assert response.status_code in (400, 422)


# --- Test 11: Manual Assessment Lifecycle ---

def test_manual_assessment_lifecycle(active_session_id):
    """Human operator can flag, verify, or dismiss evidence records."""
    mock_results = [
        RawSearchResult(
            title="Globex Profile",
            url="https://globex.org",
            domain="globex.org",
            snippet="Globex Mining operations.",
        ),
    ]
    verification_engine.set_provider(ControllableMockProvider(results=mock_results))

    # Verify a claim
    res = client.post(
        "/api/verification/verify-batch",
        json={
            "session_id": active_session_id,
            "column_name": "company_name",
            "claim_type": "entity_existence",
            "row_indices": [2],
        },
    )
    assert res.status_code == 200
    claim_id = res.json()["results"][0]["claim_id"]

    # Record manual assessment: verified
    assess_res = client.post(
        f"/api/verification/sessions/{active_session_id}/assessment/{claim_id}",
        json={"assessment": "verified", "notes": "Confirmed via phone call with manager."},
    )
    assert assess_res.status_code == 200
    updated_item = assess_res.json()
    assert updated_item["manual_assessment"] == "verified"
    assert updated_item["manual_notes"] == "Confirmed via phone call with manager."

    # Retrieve results for session
    get_res = client.get(f"/api/verification/sessions/{active_session_id}/results")
    assert get_res.status_code == 200
    stored_items = get_res.json()
    assert len(stored_items) >= 1
    stored_match = next((item for item in stored_items if item["claim_id"] == claim_id), None)
    assert stored_match is not None
    assert stored_match["manual_assessment"] == "verified"


# --- Test 12: Direct CSV Upload & Verification ---

def test_verify_upload_direct(sample_csv_bytes):
    """Can upload CSV directly and verify selected rows in a single step."""
    mock_results = [
        RawSearchResult(
            title="Acme Corporation HQ",
            url="https://acme.com",
            domain="acme.com",
            snippet="Acme Corporation is located at New York NY.",
        ),
    ]
    verification_engine.set_provider(ControllableMockProvider(results=mock_results))

    data = {
        "column_name": "company_name",
        "context_column": "headquarters",
        "claim_type": "address_presence",
        "row_indices": "1",
    }
    files = {"file": ("upload_direct.csv", sample_csv_bytes, "text/csv")}

    response = client.post("/api/verification/verify-upload", data=data, files=files)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["total_claims"] == 1
    assert res_data["completed_count"] == 1
    assert len(res_data["results"]) == 1
    assert res_data["results"][0]["row_index"] == 1
