"""Automated tests for TATVIK backend health endpoint (Phase 1).
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify that root endpoint returns service metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "TATVIK API"
    assert "version" in data
    assert data["health"] == "/api/health"


def test_health_endpoint():
    """Verify that /api/health returns 200 with structured health schema."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "TATVIK API"
    assert "version" in data
    assert "environment" in data
    assert isinstance(data["cors_origins"], list)
