"""In-Memory Review Session Service (Part 4)

Provides:
- Thread-safe storage of dataset review sessions
- Original immutable dataset preservation alongside mutable working copy
- Conservative correction approvals and rejections
- Audit logging for applied changes
- Graceful session expiration handling
"""

from datetime import datetime, timezone
import math
import threading
from typing import Any, Dict, List, Optional, Tuple
import uuid

import numpy as np
import pandas as pd

from app.schemas.quality import QualityAnalysisResponse
from app.schemas.review import (
    AppliedCorrection,
    CorrectionSuggestion,
    ReviewSessionDetailResponse,
    ReviewSessionSummary,
)
from app.schemas.verification import VerificationResultItem


def _safe_json_value(val: Any) -> Any:
    """Recursively formats cell values for safe JSON serialization."""
    if val is None:
        return None
    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or np.isnan(val):
            return None
        if math.isinf(val) or np.isinf(val):
            return None
        return float(val)
    if isinstance(val, (int, np.integer)):
        return int(val)
    if isinstance(val, (bool, np.bool_)):
        return bool(val)
    if isinstance(val, (pd.Timestamp, datetime)):
        return val.isoformat()
    return str(val)


class ReviewSession:
    """Encapsulates an active in-memory review session."""

    def __init__(
        self,
        session_id: str,
        filename: str,
        file_type: str,
        df: pd.DataFrame,
        quality_response: QualityAnalysisResponse,
    ):
        self.session_id = session_id
        self.filename = filename
        self.file_type = file_type
        # Keep original_df strictly pristine and immutable
        self.original_df: pd.DataFrame = df.copy(deep=True)
        # Working copy starts identical to original and receives approved modifications
        self.working_df: pd.DataFrame = df.copy(deep=True)
        self.columns: List[str] = [str(c) for c in df.columns]
        self.quality_score: float = quality_response.quality_score
        self.score_grade: str = quality_response.score_grade
        self.created_at: str = datetime.now(timezone.utc).isoformat()
        self.last_accessed_at: datetime = datetime.now(timezone.utc)

        # Build suggestions dictionary keyed by issue_id
        self.suggestions: Dict[str, CorrectionSuggestion] = {}
        for issue in quality_response.issues:
            self.suggestions[issue.id] = CorrectionSuggestion(
                issue_id=issue.id,
                row_index=issue.row_index,
                column_name=issue.column_name,
                category=issue.category,
                issue_type=issue.issue_type,
                severity=issue.severity,
                original_value=issue.current_value,
                proposed_value=issue.proposed_value,
                can_auto_correct=issue.can_auto_correct,
                reason=issue.explanation,
                suggested_action=issue.suggested_action,
                status="pending",
                applied=False,
            )

        self.applied_changes: List[AppliedCorrection] = []
        self.verification_results: Dict[str, VerificationResultItem] = {}

    def touch(self):
        """Updates last accessed timestamp."""
        self.last_accessed_at = datetime.now(timezone.utc)

    def store_verification_results(self, items: List[VerificationResultItem]) -> None:
        """Stores evidence-based verification results without modifying dataset."""
        self.touch()
        for item in items:
            self.verification_results[item.claim_id] = item

    def get_verification_results(
        self, status_filter: Optional[str] = None
    ) -> List[VerificationResultItem]:
        """Retrieves stored verification results, optionally filtered by status."""
        self.touch()
        if not status_filter or status_filter == "all":
            return list(self.verification_results.values())
        return [r for r in self.verification_results.values() if r.status == status_filter]

    def update_manual_assessment(
        self, claim_id: str, assessment: str, notes: Optional[str] = None
    ) -> Optional[VerificationResultItem]:
        """Records a human reviewer assessment for a claim without modifying dataset."""
        self.touch()
        if claim_id in self.verification_results:
            item = self.verification_results[claim_id]
            item.manual_assessment = assessment if assessment != "cleared" else None
            if notes is not None:
                item.manual_notes = notes
            return item
        return None

    def get_summary(self) -> ReviewSessionSummary:
        """Calculates dynamic summary metrics for this session."""
        total_issues = len(self.suggestions)
        pending_count = sum(1 for s in self.suggestions.values() if s.status == "pending")
        approved_count = sum(1 for s in self.suggestions.values() if s.status == "approved")
        rejected_count = sum(1 for s in self.suggestions.values() if s.status == "rejected")
        applied_count = sum(1 for s in self.suggestions.values() if s.applied)
        auto_correctable_count = sum(1 for s in self.suggestions.values() if s.can_auto_correct)
        manual_review_count = total_issues - auto_correctable_count

        return ReviewSessionSummary(
            session_id=self.session_id,
            filename=self.filename,
            file_type=self.file_type,
            total_rows=len(self.original_df),
            total_columns=len(self.columns),
            total_issues=total_issues,
            pending_count=pending_count,
            approved_count=approved_count,
            rejected_count=rejected_count,
            applied_count=applied_count,
            auto_correctable_count=auto_correctable_count,
            manual_review_count=manual_review_count,
            quality_score=self.quality_score,
            score_grade=self.score_grade,
            created_at=self.created_at,
        )


class ReviewSessionManager:
    """Thread-safe singleton managing active dataset review sessions."""

    def __init__(self, ttl_seconds: int = 7200, max_sessions: int = 50):
        self._sessions: Dict[str, ReviewSession] = {}
        self._lock = threading.RLock()
        self.ttl_seconds = ttl_seconds
        self.max_sessions = max_sessions

    def create_session(
        self,
        df: pd.DataFrame,
        filename: str,
        file_type: str,
        quality_response: QualityAnalysisResponse,
    ) -> ReviewSession:
        """Creates and registers a new review session."""
        with self._lock:
            self._cleanup_locked()
            session_id = f"rev-{uuid.uuid4().hex[:12]}"
            session = ReviewSession(
                session_id=session_id,
                filename=filename,
                file_type=file_type,
                df=df,
                quality_response=quality_response,
            )
            self._sessions[session_id] = session
            return session

    def get_session(self, session_id: str) -> Optional[ReviewSession]:
        """Retrieves a session by ID and updates its access time."""
        with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.touch()
            return session

    def delete_session(self, session_id: str) -> bool:
        """Removes a session."""
        with self._lock:
            return self._sessions.pop(session_id, None) is not None

    def decide_suggestion(
        self,
        session_id: str,
        issue_id: str,
        decision: str,
    ) -> Tuple[CorrectionSuggestion, ReviewSessionSummary]:
        """Updates decision on a single suggestion.

        Valid decisions: 'approve', 'reject', 'reset'.
        Raises ValueError for invalid arguments or states.
        """
        session = self.get_session(session_id)
        if not session:
            raise KeyError(f"Review session '{session_id}' not found or has expired.")

        suggestion = session.suggestions.get(issue_id)
        if not suggestion:
            raise KeyError(f"Issue '{issue_id}' not found in review session '{session_id}'.")

        if suggestion.applied:
            raise ValueError(f"Issue '{issue_id}' has already been applied to the working dataset.")

        if decision == "approve":
            if not suggestion.can_auto_correct or suggestion.proposed_value is None:
                raise ValueError(
                    f"Issue '{issue_id}' cannot be approved because it has no automated proposed correction and requires manual review."
                )
            suggestion.status = "approved"
        elif decision == "reject":
            suggestion.status = "rejected"
        elif decision == "reset":
            suggestion.status = "pending"
        else:
            raise ValueError(f"Invalid decision '{decision}'. Must be 'approve', 'reject', or 'reset'.")

        session.touch()
        return suggestion, session.get_summary()

    def bulk_decide(
        self,
        session_id: str,
        issue_ids: List[str],
        decision: str,
    ) -> Tuple[List[str], List[str], ReviewSessionSummary]:
        """Applies decision to multiple issues in batch.

        Returns (updated_issue_ids, skipped_issue_ids, updated_summary).
        """
        session = self.get_session(session_id)
        if not session:
            raise KeyError(f"Review session '{session_id}' not found or has expired.")

        if decision not in ("approve", "reject", "reset"):
            raise ValueError(f"Invalid decision '{decision}'. Must be 'approve', 'reject', or 'reset'.")

        updated_ids: List[str] = []
        skipped_ids: List[str] = []

        for issue_id in issue_ids:
            suggestion = session.suggestions.get(issue_id)
            if not suggestion or suggestion.applied:
                skipped_ids.append(issue_id)
                continue

            if decision == "approve":
                if not suggestion.can_auto_correct or suggestion.proposed_value is None:
                    skipped_ids.append(issue_id)
                    continue
                suggestion.status = "approved"
                updated_ids.append(issue_id)
            elif decision == "reject":
                suggestion.status = "rejected"
                updated_ids.append(issue_id)
            elif decision == "reset":
                suggestion.status = "pending"
                updated_ids.append(issue_id)

        session.touch()
        return updated_ids, skipped_ids, session.get_summary()

    def apply_approved_changes(
        self,
        session_id: str,
    ) -> Tuple[int, List[AppliedCorrection], ReviewSessionSummary]:
        """Applies all currently approved, unapplied corrections to the working DataFrame.

        Leaves original_df strictly unchanged.
        Returns (newly_applied_count, newly_applied_list, summary).
        """
        session = self.get_session(session_id)
        if not session:
            raise KeyError(f"Review session '{session_id}' not found or has expired.")

        newly_applied: List[AppliedCorrection] = []

        for suggestion in session.suggestions.values():
            if suggestion.status == "approved" and not suggestion.applied:
                if (
                    suggestion.can_auto_correct
                    and suggestion.proposed_value is not None
                    and suggestion.row_index is not None
                    and suggestion.column_name is not None
                ):
                    row_idx_0 = suggestion.row_index - 1
                    col_name = suggestion.column_name

                    if 0 <= row_idx_0 < len(session.working_df) and col_name in session.working_df.columns:
                        # Fetch original/current value from working dataset
                        orig_val = session.working_df.at[row_idx_0, col_name]

                        # Ensure column accepts diverse types without crashing
                        if session.working_df[col_name].dtype != object:
                            session.working_df[col_name] = session.working_df[col_name].astype(object)

                        # Apply new value to working dataset
                        session.working_df.at[row_idx_0, col_name] = suggestion.proposed_value

                        applied_record = AppliedCorrection(
                            issue_id=suggestion.issue_id,
                            row_index=suggestion.row_index,
                            column_name=col_name,
                            original_value=_safe_json_value(orig_val),
                            applied_value=_safe_json_value(suggestion.proposed_value),
                            applied_at=datetime.now(timezone.utc).isoformat(),
                        )

                        session.applied_changes.append(applied_record)
                        newly_applied.append(applied_record)
                        suggestion.applied = True

        session.touch()
        return len(newly_applied), newly_applied, session.get_summary()

    def get_working_preview_rows(
        self,
        session_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Returns preview records from the working dataset with safe serialization."""
        session = self.get_session(session_id)
        if not session:
            raise KeyError(f"Review session '{session_id}' not found or has expired.")

        slice_df = session.working_df.iloc[offset : offset + limit]
        rows: List[Dict[str, Any]] = []

        for _, row in slice_df.iterrows():
            row_dict: Dict[str, Any] = {}
            for col in session.columns:
                row_dict[col] = _safe_json_value(row[col])
            rows.append(row_dict)

        return rows

    def get_session_detail(
        self,
        session_id: str,
        status_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        severity_filter: Optional[str] = None,
        can_correct_filter: Optional[bool] = None,
        search_query: Optional[str] = None,
    ) -> ReviewSessionDetailResponse:
        """Retrieves session details and applies optional filtering to suggestions."""
        session = self.get_session(session_id)
        if not session:
            raise KeyError(f"Review session '{session_id}' not found or has expired.")

        summary = session.get_summary()
        filtered_suggestions: List[CorrectionSuggestion] = []

        for s in session.suggestions.values():
            if status_filter and status_filter != "all" and s.status != status_filter:
                continue
            if category_filter and category_filter != "all" and s.category != category_filter:
                continue
            if severity_filter and severity_filter != "all" and s.severity != severity_filter:
                continue
            if can_correct_filter is not None and s.can_auto_correct != can_correct_filter:
                continue
            if search_query and search_query.strip():
                query = search_query.strip().lower()
                matches_col = s.column_name and query in s.column_name.lower()
                matches_id = query in s.issue_id.lower()
                matches_reason = query in s.reason.lower()
                matches_orig = s.original_value and query in str(s.original_value).lower()
                matches_prop = s.proposed_value and query in str(s.proposed_value).lower()
                if not (matches_col or matches_id or matches_reason or matches_orig or matches_prop):
                    continue

            filtered_suggestions.append(s)

        return ReviewSessionDetailResponse(
            session_id=session.session_id,
            filename=session.filename,
            file_type=session.file_type,
            total_rows=len(session.original_df),
            total_columns=len(session.columns),
            columns=session.columns,
            summary=summary,
            suggestions=filtered_suggestions,
            applied_changes=session.applied_changes,
        )

    def store_verification_results(
        self, session_id: str, items: List[VerificationResultItem]
    ) -> List[VerificationResultItem]:
        """Stores research verification results on a session."""
        with self._lock:
            session = self.get_session(session_id)
            if not session:
                raise KeyError(f"Review session '{session_id}' not found or has expired.")
            session.store_verification_results(items)
            return list(session.verification_results.values())

    def get_verification_results(
        self, session_id: str, status_filter: Optional[str] = None
    ) -> List[VerificationResultItem]:
        """Retrieves research verification results for a session."""
        with self._lock:
            session = self.get_session(session_id)
            if not session:
                raise KeyError(f"Review session '{session_id}' not found or has expired.")
            return session.get_verification_results(status_filter)

    def update_manual_assessment(
        self, session_id: str, claim_id: str, assessment: str, notes: Optional[str] = None
    ) -> VerificationResultItem:
        """Records a human reviewer assessment on an evidence record."""
        with self._lock:
            session = self.get_session(session_id)
            if not session:
                raise KeyError(f"Review session '{session_id}' not found or has expired.")
            updated = session.update_manual_assessment(claim_id, assessment, notes)
            if not updated:
                raise KeyError(f"Claim ID '{claim_id}' not found in session '{session_id}'.")
            return updated

    def _cleanup_locked(self):
        """Removes expired sessions when lock is already held."""
        now = datetime.now(timezone.utc)
        expired_ids = [
            sid
            for sid, s in self._sessions.items()
            if (now - s.last_accessed_at).total_seconds() > self.ttl_seconds
        ]
        for sid in expired_ids:
            self._sessions.pop(sid, None)

        # Enforce max sessions bound (LRU based on last_accessed_at)
        if len(self._sessions) >= self.max_sessions:
            sorted_sessions = sorted(
                self._sessions.items(),
                key=lambda item: item[1].last_accessed_at,
            )
            to_remove = len(self._sessions) - self.max_sessions + 1
            for sid, _ in sorted_sessions[:to_remove]:
                self._sessions.pop(sid, None)


# Global singleton instance
review_manager = ReviewSessionManager()
