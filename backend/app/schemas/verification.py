"""Pydantic schemas for Research Verification & Source Evidence (Part 5).
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class EvidenceSource(BaseModel):
    title: str = Field(..., description="Document or webpage title")
    url: str = Field(..., description="Direct citation URL (http/https only)")
    domain: str = Field(..., description="Extracted domain identifier")
    source_type: str = Field("third_party", description="'official' or 'third_party'")
    snippet: str = Field(..., description="Concise text excerpt grounded in retrieved source")


class VerificationResultItem(BaseModel):
    claim_id: str = Field(..., description="Stable verification item identifier (e.g. ver-1)")
    row_index: int = Field(..., description="1-indexed row number from dataset")
    column_name: str = Field(..., description="Primary column name verified")
    context_column: Optional[str] = Field(None, description="Optional supporting context column name")
    claim_text: str = Field(..., description="Verifiable factual statement under evaluation")
    status: str = Field(
        ...,
        description="Outcome status: supported_by_evidence, conflicting_evidence, needs_manual_review, unable_to_verify, not_configured",
    )
    status_label: str = Field(..., description="Human-readable status label")
    confidence_score: Optional[float] = Field(None, description="Confidence percentage (0.0 to 100.0) or None if uncalculated")
    evidence_summary: str = Field(..., description="Concise grounded evidence summary")
    explanation: str = Field(..., description="Reasoning for supporting, conflicting, or insufficient evidence")
    sources: List[EvidenceSource] = Field(default_factory=list, description="Retrieved citation sources")
    retrieval_timestamp: str = Field(..., description="ISO 8601 timestamp of evidence retrieval")
    provider_name: str = Field(..., description="Active research provider (tavily, serpapi, mock, none)")
    provider_warning: Optional[str] = Field(None, description="Provider limitation or error notice")
    manual_assessment: Optional[str] = Field(None, description="Optional human operator assessment flag")
    manual_notes: Optional[str] = Field(None, description="Optional reviewer notes or remarks")


class ManualAssessmentRequest(BaseModel):
    assessment: str = Field(..., description="Reviewer decision: verified, flagged, dismissed, cleared")
    notes: Optional[str] = Field(None, description="Optional reviewer remarks")


class VerificationBatchRequest(BaseModel):
    session_id: Optional[str] = Field(None, description="Active dataset/review session identifier")
    column_name: str = Field(..., description="Target dataset column name containing entity or claim")
    context_column: Optional[str] = Field(None, description="Optional secondary context column (e.g. website, city)")
    claim_type: str = Field("entity_existence", description="Claim definition: entity_existence, website_official, address_presence, custom")
    row_indices: List[int] = Field(..., min_length=1, max_length=20, description="List of 1-indexed row numbers to verify (max 20 per request)")
    custom_claim_template: Optional[str] = Field(None, description="Optional template with {value} and {context} placeholders")


class VerificationBatchResponse(BaseModel):
    total_claims: int = Field(..., description="Number of claims submitted")
    completed_count: int = Field(..., description="Number of claims evaluated")
    status_counts: Dict[str, int] = Field(..., description="Breakdown of results by status")
    results: List[VerificationResultItem] = Field(..., description="Individual verification evidence records")
    provider_configured: bool = Field(..., description="True if research search provider is configured")
    provider_name: str = Field(..., description="Active provider name")
    message: str = Field(..., description="Operation summary message")


class ProviderStatusResponse(BaseModel):
    configured: bool = Field(..., description="True if search provider credentials are valid and active")
    provider_name: str = Field(..., description="Active search provider: none, tavily, serpapi, mock")
    available_providers: List[str] = Field(..., description="Supported provider options")
    timeout_seconds: int = Field(..., description="Configured network request timeout")
    max_claims_per_batch: int = Field(..., description="Maximum allowable claims per verification batch")
    setup_instructions: str = Field(..., description="Clear instructions explaining how to configure search credentials")
