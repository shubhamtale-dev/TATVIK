"""Research Verification Engine Service (Part 5).

Evaluates business dataset claims against external research providers:
- Constructs transparent, testable claim statements
- Distinguishes official sources (e.g. primary company domain, .gov registries) from third-party sources
- Evaluates grounded evidence: Supported, Conflicting, Needs Manual Review, Unable to Verify, Not Configured
- Guarantees dataset immutability
"""

from datetime import datetime, timezone
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import pandas as pd

from app.core.config import settings
from app.schemas.verification import (
    EvidenceSource,
    VerificationBatchRequest,
    VerificationBatchResponse,
    VerificationResultItem,
)
from app.services.research_provider import (
    ProviderError,
    ProviderNotConfiguredError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    RawSearchResult,
    ResearchProvider,
    get_research_provider,
)

OFFICIAL_GOV_DOMAINS = {
    "sec.gov",
    "fmc.gov",
    "cslb.ca.gov",
    "irs.gov",
    "uspto.gov",
    "companieshouse.gov.uk",
    "europa.eu",
}

CONFLICT_KEYWORDS = [
    "permanently closed",
    "defunct",
    "dissolved",
    "bankruptcy",
    "liquidation",
    "fraud warning",
    "cease and desist",
    "scam alert",
    "no longer in business",
]


class VerificationEngine:
    """Orchestrates evidence-based claim verification against research providers."""

    def __init__(self, provider: Optional[ResearchProvider] = None):
        self._provider = provider

    @property
    def provider(self) -> ResearchProvider:
        if self._provider is not None:
            return self._provider
        return get_research_provider()

    def set_provider(self, provider: Optional[ResearchProvider]):
        """Overrides provider for testing."""
        self._provider = provider

    @staticmethod
    def _extract_domain_from_value(val: Any) -> Optional[str]:
        """Attempts to extract a clean domain name from a URL or email string."""
        if not val or not isinstance(val, str):
            return None
        cleaned = val.strip().lower()
        if "@" in cleaned:
            parts = cleaned.split("@")
            return parts[-1].strip() if len(parts) > 1 else None
        if "://" in cleaned:
            try:
                host = urlparse(cleaned).netloc
                if host.startswith("www."):
                    host = host[4:]
                return host
            except Exception:
                return None
        # Plain domain like acmecorp.com
        if re.match(r"^[a-z0-9-]+(\.[a-z0-9-]+)+$", cleaned):
            if cleaned.startswith("www."):
                cleaned = cleaned[4:]
            return cleaned
        return None

    def _is_official_source(
        self,
        source_domain: str,
        expected_domain: Optional[str] = None,
    ) -> bool:
        """Determines if a citation domain represents an official source."""
        s_domain = source_domain.lower()
        # Direct match with entity's known website or email domain
        if expected_domain and expected_domain.lower() in s_domain:
            return True
        # Government or official regulatory registry
        if s_domain.endswith(".gov") or any(gov in s_domain for gov in OFFICIAL_GOV_DOMAINS):
            return True
        return False

    def build_claim_and_query(
        self,
        value: Any,
        context_val: Optional[Any],
        claim_type: str,
        custom_template: Optional[str] = None,
    ) -> Tuple[str, str, Optional[str]]:
        """Constructs a factual claim statement, search query, and expected domain."""
        val_str = str(value).strip() if value is not None else ""
        ctx_str = str(context_val).strip() if context_val is not None else ""
        expected_domain = self._extract_domain_from_value(ctx_str) or self._extract_domain_from_value(val_str)

        if custom_template and "{value}" in custom_template:
            claim_text = custom_template.format(value=val_str, context=ctx_str)
            query = f'"{val_str}" {ctx_str}'.strip()
            return claim_text, query, expected_domain

        if claim_type == "website_official":
            claim_text = f"Business entity '{val_str}' officially operates domain '{ctx_str}'."
            query = f'"{val_str}" official website "{ctx_str}"'
        elif claim_type == "address_presence":
            claim_text = f"Entity '{val_str}' maintains documented operations at '{ctx_str}'."
            query = f'"{val_str}" headquarters location address "{ctx_str}"'
        else:  # default: entity_existence
            if ctx_str:
                claim_text = f"Business entity '{val_str}' ({ctx_str}) is an active commercial organization."
                query = f'"{val_str}" {ctx_str} company official business'
            else:
                claim_text = f"Business entity '{val_str}' is an active commercial organization."
                query = f'"{val_str}" company official headquarters business'

        return claim_text, query, expected_domain

    async def verify_single_claim(
        self,
        claim_id: str,
        row_index: int,
        column_name: str,
        value: Any,
        context_column: Optional[str] = None,
        context_val: Optional[Any] = None,
        claim_type: str = "entity_existence",
        custom_template: Optional[str] = None,
    ) -> VerificationResultItem:
        """Evaluates evidence for a single dataset cell claim."""
        timestamp = datetime.now(timezone.utc).isoformat()
        active_provider = self.provider

        claim_text, query, expected_domain = self.build_claim_and_query(
            value=value,
            context_val=context_val,
            claim_type=claim_type,
            custom_template=custom_template,
        )

        # 1. Check if provider is configured
        if not active_provider.is_configured:
            return VerificationResultItem(
                claim_id=claim_id,
                row_index=row_index,
                column_name=column_name,
                context_column=context_column,
                claim_text=claim_text,
                status="not_configured",
                status_label="Not Configured",
                confidence_score=None,
                evidence_summary="Research provider is not configured. No external web search was executed.",
                explanation=(
                    f"External verification requires setting an active API key (e.g., TAVILY_API_KEY or SERPAPI_API_KEY) "
                    f"in the backend environment. TATVIK does not fabricate search results."
                ),
                sources=[],
                retrieval_timestamp=timestamp,
                provider_name=active_provider.name,
                provider_warning="Provider credentials missing. Configure .env to enable live search.",
            )

        # 2. Query provider with error & timeout handling
        provider_warning = None
        raw_results: List[RawSearchResult] = []

        try:
            raw_results = await active_provider.search(query=query, max_results=5)
        except ProviderNotConfiguredError:
            return VerificationResultItem(
                claim_id=claim_id,
                row_index=row_index,
                column_name=column_name,
                context_column=context_column,
                claim_text=claim_text,
                status="not_configured",
                status_label="Not Configured",
                confidence_score=None,
                evidence_summary="Research provider is not configured.",
                explanation="No provider credentials provided.",
                sources=[],
                retrieval_timestamp=timestamp,
                provider_name=active_provider.name,
            )
        except ProviderRateLimitError as exc:
            return VerificationResultItem(
                claim_id=claim_id,
                row_index=row_index,
                column_name=column_name,
                context_column=context_column,
                claim_text=claim_text,
                status="unable_to_verify",
                status_label="Unable to Verify",
                confidence_score=None,
                evidence_summary="Verification halted due to provider rate limit.",
                explanation=str(exc),
                sources=[],
                retrieval_timestamp=timestamp,
                provider_name=active_provider.name,
                provider_warning="Rate limit exceeded. Please retry after a brief delay.",
            )
        except ProviderTimeoutError as exc:
            return VerificationResultItem(
                claim_id=claim_id,
                row_index=row_index,
                column_name=column_name,
                context_column=context_column,
                claim_text=claim_text,
                status="unable_to_verify",
                status_label="Unable to Verify",
                confidence_score=None,
                evidence_summary="Provider network request timed out.",
                explanation=str(exc),
                sources=[],
                retrieval_timestamp=timestamp,
                provider_name=active_provider.name,
                provider_warning=f"Provider timed out after {settings.RESEARCH_TIMEOUT_SECONDS}s.",
            )
        except ProviderError as exc:
            return VerificationResultItem(
                claim_id=claim_id,
                row_index=row_index,
                column_name=column_name,
                context_column=context_column,
                claim_text=claim_text,
                status="unable_to_verify",
                status_label="Unable to Verify",
                confidence_score=None,
                evidence_summary="Search provider returned an error.",
                explanation=str(exc),
                sources=[],
                retrieval_timestamp=timestamp,
                provider_name=active_provider.name,
                provider_warning="Provider error encountered.",
            )

        # 3. Transform and classify sources
        sources: List[EvidenceSource] = []
        for r in raw_results:
            if not r.url:
                continue
            is_official = self._is_official_source(r.domain, expected_domain)
            sources.append(
                EvidenceSource(
                    title=r.title,
                    url=r.url,
                    domain=r.domain,
                    source_type="official" if is_official else "third_party",
                    snippet=r.snippet,
                )
            )

        # 4. Evaluate evidence grounding
        if not sources:
            return VerificationResultItem(
                claim_id=claim_id,
                row_index=row_index,
                column_name=column_name,
                context_column=context_column,
                claim_text=claim_text,
                status="unable_to_verify",
                status_label="Unable to Verify",
                confidence_score=None,
                evidence_summary="No matching public documents were found in search index.",
                explanation=(
                    f"Search for '{query}' returned 0 verifiable citations. "
                    f"Entity or domain may be private, brand-new, or unindexed."
                ),
                sources=[],
                retrieval_timestamp=timestamp,
                provider_name=active_provider.name,
                provider_warning=provider_warning,
            )

        val_lower = str(value).lower() if value is not None else ""
        combined_snippets = " ".join(s.snippet.lower() for s in sources)

        # Check for conflicting evidence
        found_conflicts = [kw for kw in CONFLICT_KEYWORDS if kw in combined_snippets]
        if found_conflicts:
            conflict_terms = ", ".join(f"'{c}'" for c in found_conflicts)
            return VerificationResultItem(
                claim_id=claim_id,
                row_index=row_index,
                column_name=column_name,
                context_column=context_column,
                claim_text=claim_text,
                status="conflicting_evidence",
                status_label="Conflicting Evidence",
                confidence_score=85.0,
                evidence_summary=f"Retrieved sources indicate contradictory status ({conflict_terms}).",
                explanation=(
                    f"Public search citations for '{val_lower}' explicitly reference contradicting indicators: {conflict_terms}. "
                    f"Cross-reference against legal entity filings before using this record."
                ),
                sources=sources,
                retrieval_timestamp=timestamp,
                provider_name=active_provider.name,
                provider_warning=provider_warning,
            )

        # Check for supporting evidence
        has_official = any(s.source_type == "official" for s in sources)
        mention_count = sum(1 for s in sources if val_lower in s.snippet.lower() or val_lower in s.title.lower())

        if has_official and mention_count > 0:
            official_domains = [s.domain for s in sources if s.source_type == "official"]
            return VerificationResultItem(
                claim_id=claim_id,
                row_index=row_index,
                column_name=column_name,
                context_column=context_column,
                claim_text=claim_text,
                status="supported_by_evidence",
                status_label="Supported by Evidence",
                confidence_score=94.0,
                evidence_summary=f"Corroborated by official registry / company source ({', '.join(set(official_domains))}).",
                explanation=(
                    f"Claim is directly corroborated by primary official domain ({', '.join(set(official_domains))}) "
                    f"and public documentation."
                ),
                sources=sources,
                retrieval_timestamp=timestamp,
                provider_name=active_provider.name,
                provider_warning=provider_warning,
            )

        if mention_count >= 2:
            return VerificationResultItem(
                claim_id=claim_id,
                row_index=row_index,
                column_name=column_name,
                context_column=context_column,
                claim_text=claim_text,
                status="supported_by_evidence",
                status_label="Supported by Evidence",
                confidence_score=78.0,
                evidence_summary=f"Corroborated across {len(sources)} third-party business directories.",
                explanation=(
                    f"Entity '{value}' appears consistently across multiple commercial directories and news sources, "
                    f"though no primary government registry was located in top results."
                ),
                sources=sources,
                retrieval_timestamp=timestamp,
                provider_name=active_provider.name,
                provider_warning=provider_warning,
            )

        # Ambiguous or single mention
        return VerificationResultItem(
            claim_id=claim_id,
            row_index=row_index,
            column_name=column_name,
            context_column=context_column,
            claim_text=claim_text,
            status="needs_manual_review",
            status_label="Needs Manual Review",
            confidence_score=50.0,
            evidence_summary="Search yielded indirect or ambiguous mentions requiring manual inspection.",
            explanation=(
                f"Top search results mention potential name matches but lack authoritative confirmation for '{value}'. "
                f"Operator review recommended."
            ),
            sources=sources,
            retrieval_timestamp=timestamp,
            provider_name=active_provider.name,
            provider_warning=provider_warning,
        )

    async def verify_batch(
        self,
        df: pd.DataFrame,
        request: VerificationBatchRequest,
    ) -> VerificationBatchResponse:
        """Evaluates verification for requested rows in a DataFrame."""
        if request.column_name not in df.columns:
            raise KeyError(f"Target column '{request.column_name}' not found in dataset.")

        if request.context_column and request.context_column not in df.columns:
            raise KeyError(f"Context column '{request.context_column}' not found in dataset.")

        total_rows = len(df)
        for r in request.row_indices:
            if r < 1 or r > total_rows:
                raise ValueError(f"Row index {r} is out of bounds (dataset has {total_rows} rows).")

        results: List[VerificationResultItem] = []
        status_counts = {
            "supported_by_evidence": 0,
            "conflicting_evidence": 0,
            "needs_manual_review": 0,
            "unable_to_verify": 0,
            "not_configured": 0,
        }

        for idx, row_num in enumerate(request.row_indices, start=1):
            claim_id = f"ver-{row_num}-{request.column_name[:6]}"
            row_0 = row_num - 1
            val = df.at[row_0, request.column_name]
            ctx_val = df.at[row_0, request.context_column] if request.context_column else None

            item = await self.verify_single_claim(
                claim_id=claim_id,
                row_index=row_num,
                column_name=request.column_name,
                value=val,
                context_column=request.context_column,
                context_val=ctx_val,
                claim_type=request.claim_type,
                custom_template=request.custom_claim_template,
            )
            results.append(item)
            status_counts[item.status] = status_counts.get(item.status, 0) + 1

        active_provider = self.provider
        msg = (
            f"Successfully verified {len(results)} claim(s) using {active_provider.name} provider."
            if active_provider.is_configured
            else "Verification completed in unconfigured mode. Configure provider in .env for live external search."
        )

        return VerificationBatchResponse(
            total_claims=len(request.row_indices),
            completed_count=len(results),
            status_counts=status_counts,
            results=results,
            provider_configured=active_provider.is_configured,
            provider_name=active_provider.name,
            message=msg,
        )


verification_engine = VerificationEngine()
