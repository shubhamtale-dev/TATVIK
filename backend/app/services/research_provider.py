"""Research Provider Service Layer (Part 5).

Abstracts external web search and evidence retrieval providers:
- Tavily API
- SerpAPI
- Mock provider (for automated testing)
- No-op provider (when no provider key is configured)
"""

from abc import ABC, abstractmethod
import html
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx

from app.core.config import settings


class RawSearchResult:
    """Represents a raw document search hit retrieved from a search provider."""

    def __init__(
        self,
        title: str,
        url: str,
        snippet: str,
        score: Optional[float] = None,
        raw_metadata: Optional[Dict[str, Any]] = None,
        domain: Optional[str] = None,
    ):
        self.title = self._sanitize_text(title or "Untitled Document")
        self.url = self._sanitize_url(url or "")
        self.domain = domain or self._extract_domain(self.url)
        self.snippet = self._sanitize_text(snippet or "")
        self.score = score
        self.raw_metadata = raw_metadata or {}

    @staticmethod
    def _sanitize_text(text: str) -> str:
        """Strips HTML tags, script elements, and unescapes entities."""
        if not text:
            return ""
        # Strip script/style blocks
        cleaned = re.sub(r"<(script|style).*?>.*?</\1>", "", text, flags=re.DOTALL | re.IGNORECASE)
        # Strip all HTML tags
        cleaned = re.sub(r"<[^>]+>", "", cleaned)
        # Unescape HTML entities
        cleaned = html.unescape(cleaned)
        # Collapse multiple whitespace
        return re.sub(r"\s+", " ", cleaned).strip()

    @staticmethod
    def _sanitize_url(url: str) -> str:
        """Validates and cleans citation URLs (strictly http/https)."""
        if not url:
            return ""
        cleaned = url.strip()
        # Prevent javascript:, data:, file: URI schemes
        parsed = urlparse(cleaned)
        if parsed.scheme not in ("http", "https"):
            return ""
        return cleaned

    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extracts clean host domain without www prefix."""
        if not url:
            return "unknown-source"
        try:
            parsed = urlparse(url)
            host = parsed.netloc.lower()
            if host.startswith("www."):
                host = host[4:]
            return host or "unknown-source"
        except Exception:
            return "unknown-source"


class ProviderError(Exception):
    """Base exception for research provider errors."""
    pass


class ProviderNotConfiguredError(ProviderError):
    """Raised when an action is attempted without active provider credentials."""
    pass


class ProviderRateLimitError(ProviderError):
    """Raised when the provider returns HTTP 429 Too Many Requests."""
    pass


class ProviderTimeoutError(ProviderError):
    """Raised when the provider times out."""
    pass


class ResearchProvider(ABC):
    """Abstract interface for evidence search providers."""

    name: str = "base"
    is_configured: bool = False

    @abstractmethod
    async def search(self, query: str, max_results: int = 5) -> List[RawSearchResult]:
        """Executes a search query and returns sanitized results."""
        pass


class NoopResearchProvider(ResearchProvider):
    """Fallback provider when no external search provider is configured."""

    name: str = "none"
    is_configured: bool = False

    async def search(self, query: str, max_results: int = 5) -> List[RawSearchResult]:
        raise ProviderNotConfiguredError(
            "Research verification provider is not configured. "
            "Please configure TAVILY_API_KEY or SERPAPI_API_KEY in the backend environment."
        )


class TavilyResearchProvider(ResearchProvider):
    """Integrates Tavily Search API for evidence retrieval."""

    name: str = "tavily"

    def __init__(self, api_key: str, timeout_seconds: int = 10):
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.is_configured = bool(api_key and api_key.strip())

    async def search(self, query: str, max_results: int = 5) -> List[RawSearchResult]:
        if not self.is_configured:
            raise ProviderNotConfiguredError("Tavily API key is not configured.")

        payload = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": "basic",
            "max_results": max_results,
            "include_answer": False,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post("https://api.tavily.com/search", json=payload)

                if response.status_code == 429:
                    raise ProviderRateLimitError("Tavily search rate limit reached (HTTP 429). Please retry later.")
                if response.status_code != 200:
                    raise ProviderError(f"Tavily provider returned HTTP {response.status_code}: {response.text}")

                data = response.json()
                results = []
                for item in data.get("results", []):
                    results.append(
                        RawSearchResult(
                            title=item.get("title", ""),
                            url=item.get("url", ""),
                            snippet=item.get("content", ""),
                            score=item.get("score"),
                        )
                    )
                return results

        except httpx.TimeoutException:
            raise ProviderTimeoutError(f"Tavily request timed out after {self.timeout_seconds} seconds.")
        except (ProviderError, ProviderRateLimitError, ProviderTimeoutError):
            raise
        except Exception as exc:
            raise ProviderError(f"Unexpected network error connecting to Tavily: {str(exc)}")


class SerpApiResearchProvider(ResearchProvider):
    """Integrates SerpAPI Google Search for evidence retrieval."""

    name: str = "serpapi"

    def __init__(self, api_key: str, timeout_seconds: int = 10):
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.is_configured = bool(api_key and api_key.strip())

    async def search(self, query: str, max_results: int = 5) -> List[RawSearchResult]:
        if not self.is_configured:
            raise ProviderNotConfiguredError("SerpAPI key is not configured.")

        params = {
            "api_key": self.api_key,
            "q": query,
            "engine": "google",
            "num": max_results,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.get("https://serpapi.com/search.json", params=params)

                if response.status_code == 429:
                    raise ProviderRateLimitError("SerpAPI search rate limit reached (HTTP 429).")
                if response.status_code != 200:
                    raise ProviderError(f"SerpAPI returned HTTP {response.status_code}: {response.text}")

                data = response.json()
                results = []
                for item in data.get("organic_results", []):
                    results.append(
                        RawSearchResult(
                            title=item.get("title", ""),
                            url=item.get("link", ""),
                            snippet=item.get("snippet", ""),
                        )
                    )
                return results

        except httpx.TimeoutException:
            raise ProviderTimeoutError(f"SerpAPI request timed out after {self.timeout_seconds} seconds.")
        except (ProviderError, ProviderRateLimitError, ProviderTimeoutError):
            raise
        except Exception as exc:
            raise ProviderError(f"Unexpected network error connecting to SerpAPI: {str(exc)}")


class MockResearchProvider(ResearchProvider):
    """Configurable mock provider used for deterministic automated tests and offline simulation."""

    name: str = "mock"
    is_configured: bool = True

    def __init__(self):
        self.canned_results: Dict[str, List[RawSearchResult]] = {}
        self.simulated_error: Optional[Exception] = None

    def set_results(self, query_substring: str, results: List[RawSearchResult]):
        """Sets canned search results matching a query substring."""
        self.canned_results[query_substring.lower()] = results

    def set_simulated_error(self, exc: Optional[Exception]):
        """Forces provider to raise a specific simulated exception."""
        self.simulated_error = exc

    async def search(self, query: str, max_results: int = 5) -> List[RawSearchResult]:
        if self.simulated_error:
            raise self.simulated_error

        q_lower = query.lower()
        for pattern, res in self.canned_results.items():
            if pattern in q_lower:
                return res[:max_results]

        # Default fallback results for unknown queries
        return [
            RawSearchResult(
                title=f"Public Directory Entry: {query[:30]}",
                url="https://business-directory.example.org/record",
                snippet=f"Information regarding {query}. Verified registration records in official index.",
                score=0.88,
            )
        ]


def get_research_provider() -> ResearchProvider:
    """Factory creating the appropriate provider instance based on runtime settings."""
    active_name = settings.active_provider_name

    if active_name == "mock":
        return MockResearchProvider()
    if active_name == "tavily" and settings.TAVILY_API_KEY:
        return TavilyResearchProvider(
            api_key=settings.TAVILY_API_KEY,
            timeout_seconds=settings.RESEARCH_TIMEOUT_SECONDS,
        )
    if active_name == "serpapi" and settings.SERPAPI_API_KEY:
        return SerpApiResearchProvider(
            api_key=settings.SERPAPI_API_KEY,
            timeout_seconds=settings.RESEARCH_TIMEOUT_SECONDS,
        )
    return NoopResearchProvider()
