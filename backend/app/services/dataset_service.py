"""Durable Dataset Persistence and Session Synchronization Service (Part 6).

Implements:
- User-owned dataset lifecycle (create, read, rename, delete)
- Efficient compact matrix serialization for original and working dataset states
- Seamless restoration of in-memory review and verification sessions from database
- Two-way synchronization between in-memory sessions and durable database records
- Strict multi-tenant server-side ownership enforcement
"""

from datetime import datetime, timezone
import json
import math
from typing import Any, Dict, List, Optional, Tuple
import uuid

from fastapi import HTTPException, status
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.db.models import (
    AppliedCorrectionRecord,
    CorrectionSuggestionRecord,
    DatasetDataRecord,
    DatasetRecord,
    QualityIssueRecord,
    UserRecord,
    VerificationResultRecord,
)
from app.schemas.quality import QualityAnalysisResponse
from app.schemas.review import (
    AppliedCorrection,
    CorrectionSuggestion,
    ReviewSessionSummary,
)
from app.schemas.verification import EvidenceSource, VerificationResultItem
from app.services.review_service import ReviewSession, review_manager
from app.services.storage_service import storage_service


def _safe_val(val: Any) -> Any:
    """Formats cell values for safe JSON database serialization."""
    if val is None:
        return None
    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or np.isnan(val) or math.isinf(val) or np.isinf(val):
            return None
        return float(val)
    if isinstance(val, (int, np.integer)):
        return int(val)
    if isinstance(val, (bool, np.bool_)):
        return bool(val)
    if isinstance(val, (pd.Timestamp, datetime)):
        return val.isoformat()
    return str(val)


def save_dataset_to_db(
    db: Session,
    user_id: str,
    filename: str,
    file_type: str,
    file_size_bytes: int,
    df: pd.DataFrame,
    quality_analysis: QualityAnalysisResponse,
    storage_path: Optional[str] = None,
) -> Tuple[DatasetRecord, ReviewSession]:
    """Saves dataset metadata, compact row matrices, defects, and initializes a review session."""
    # Ensure user exists in db
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        user = UserRecord(id=user_id)
        db.add(user)
        db.commit()

    dataset_id = f"ds-{uuid.uuid4().hex[:12]}"
    columns = [str(c) for c in df.columns]

    # Compact 2D row matrix representation
    matrix = []
    for _, row in df.iterrows():
        matrix.append([_safe_val(row[col]) for col in columns])

    dataset = DatasetRecord(
        id=dataset_id,
        user_id=user_id,
        filename=filename,
        file_type=file_type,
        file_size_bytes=file_size_bytes,
        total_rows=len(df),
        total_columns=len(columns),
        columns_json=json.dumps(columns),
        quality_score=quality_analysis.quality_score,
        score_grade=quality_analysis.score_grade,
        scoring_formula_explanation=quality_analysis.scoring_formula_explanation,
        storage_path=storage_path,
    )
    db.add(dataset)

    # Store compact tabular matrix
    matrix_json = json.dumps(matrix)
    data_rec = DatasetDataRecord(
        id=f"data-{dataset_id}",
        dataset_id=dataset_id,
        original_data_json=matrix_json,
        working_data_json=matrix_json,
    )
    db.add(data_rec)

    # Persist quality defects
    for issue in quality_analysis.issues:
        issue_rec = QualityIssueRecord(
            id=issue.id,
            dataset_id=dataset_id,
            row_index=issue.row_index,
            column_name=issue.column_name,
            category=issue.category,
            issue_type=issue.issue_type,
            severity=issue.severity,
            current_value=str(issue.current_value) if issue.current_value is not None else None,
            proposed_value=str(issue.proposed_value) if issue.proposed_value is not None else None,
            can_auto_correct=issue.can_auto_correct,
            explanation=issue.explanation,
            suggested_action=issue.suggested_action,
        )
        db.add(issue_rec)

        # Also initialize corresponding correction suggestions
        sugg_rec = CorrectionSuggestionRecord(
            id=f"sug-{issue.id}",
            dataset_id=dataset_id,
            issue_id=issue.id,
            row_index=issue.row_index,
            column_name=issue.column_name,
            category=issue.category,
            issue_type=issue.issue_type,
            severity=issue.severity,
            original_value=str(issue.current_value) if issue.current_value is not None else None,
            proposed_value=str(issue.proposed_value) if issue.proposed_value is not None else None,
            can_auto_correct=issue.can_auto_correct,
            reason=issue.explanation,
            suggested_action=issue.suggested_action,
            status="pending",
            applied=False,
        )
        db.add(sugg_rec)

    db.commit()
    db.refresh(dataset)

    # Create active in-memory review session connected to dataset
    session_id = f"rev-{dataset_id}"
    session = ReviewSession(
        session_id=session_id,
        filename=filename,
        file_type=file_type,
        df=df,
        quality_response=quality_analysis,
    )
    with review_manager._lock:
        review_manager._sessions[session_id] = session

    return dataset, session


def list_user_datasets(
    db: Session,
    user_id: str,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[int, List[DatasetRecord]]:
    """Retrieves paginated list of datasets owned by the authenticated user."""
    query = db.query(DatasetRecord).filter(DatasetRecord.user_id == user_id)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(DatasetRecord.filename.ilike(term))

    total = query.count()
    items = query.order_by(DatasetRecord.updated_at.desc()).offset(offset).limit(limit).all()
    return total, items


def get_user_dataset(db: Session, user_id: str, dataset_id: str) -> DatasetRecord:
    """Fetches a dataset and strictly enforces server-side user ownership."""
    dataset = (
        db.query(DatasetRecord)
        .filter(DatasetRecord.id == dataset_id, DatasetRecord.user_id == user_id)
        .first()
    )
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found or access denied.",
        )
    return dataset


def rename_user_dataset(db: Session, user_id: str, dataset_id: str, new_filename: str) -> DatasetRecord:
    """Updates the filename of a user-owned dataset."""
    dataset = get_user_dataset(db, user_id, dataset_id)
    dataset.filename = new_filename.strip()
    dataset.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(dataset)

    # Also rename in-memory session if active
    session_id = f"rev-{dataset_id}"
    active_session = review_manager.get_session(session_id)
    if active_session:
        active_session.filename = dataset.filename

    return dataset


def delete_user_dataset(db: Session, user_id: str, dataset_id: str) -> bool:
    """Deletes a dataset, associated database tables (cascade), stored file, and active memory."""
    dataset = get_user_dataset(db, user_id, dataset_id)

    # Delete storage file if present
    if dataset.storage_path:
        storage_service.delete_file(user_id, dataset.storage_path)

    # Remove active in-memory session
    session_id = f"rev-{dataset_id}"
    review_manager.delete_session(session_id)

    # Delete database record (cascades to all children)
    db.delete(dataset)
    db.commit()
    return True


def restore_session_from_dataset(db: Session, user_id: str, dataset_id: str) -> ReviewSession:
    """Restores a persistent database dataset into an active in-memory review session."""
    dataset = get_user_dataset(db, user_id, dataset_id)
    session_id = f"rev-{dataset_id}"

    # Return existing in-memory session if already loaded
    existing = review_manager.get_session(session_id)
    if existing:
        return existing

    # Reconstruct dataframes from compact 2D matrices
    cols = dataset.columns
    data_rec = dataset.data
    if not data_rec:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dataset '{dataset_id}' data matrix is missing from storage.",
        )

    working_matrix = data_rec.get_working_matrix()
    original_matrix = data_rec.get_original_matrix()

    working_df = pd.DataFrame(data=working_matrix, columns=cols)
    original_df = pd.DataFrame(data=original_matrix, columns=cols)

    # Create dummy QualityAnalysisResponse to seed ReviewSession constructor
    dummy_qa = QualityAnalysisResponse(
        filename=dataset.filename,
        file_type=dataset.file_type,
        total_rows=dataset.total_rows,
        total_columns=dataset.total_columns,
        total_cells=dataset.total_rows * dataset.total_columns,
        quality_score=dataset.quality_score or 100.0,
        score_grade=dataset.score_grade or "A",
        scoring_formula_explanation=dataset.scoring_formula_explanation or "",
        category_counts={},
        severity_counts={},
        issues=[],
        total_issues_detected=len(dataset.issues),
        returned_issues_count=len(dataset.issues),
        has_more_issues=False,
        evaluated_columns=cols,
        detected_special_columns={"email_columns": [], "phone_columns": [], "id_columns": []},
        session_id=session_id,
    )

    session = ReviewSession(
        session_id=session_id,
        filename=dataset.filename,
        file_type=dataset.file_type,
        df=original_df,
        quality_response=dummy_qa,
    )
    # Set the working dataframe to the actual saved working copy
    session.working_df = working_df

    # Restore suggestions from database
    session.suggestions.clear()
    for s in dataset.suggestions:
        session.suggestions[s.issue_id] = CorrectionSuggestion(
            issue_id=s.issue_id,
            row_index=s.row_index,
            column_name=s.column_name,
            category=s.category,
            issue_type=s.issue_type,
            severity=s.severity,
            original_value=s.original_value,
            proposed_value=s.proposed_value,
            can_auto_correct=s.can_auto_correct,
            reason=s.reason,
            suggested_action=s.suggested_action,
            status=s.status,
            applied=s.applied,
        )

    # Restore applied modifications
    session.applied_changes = [
        AppliedCorrection(
            issue_id=c.issue_id,
            row_index=c.row_index,
            column_name=c.column_name,
            original_value=c.original_value,
            applied_value=c.applied_value,
            applied_at=c.applied_at.isoformat() if c.applied_at else datetime.now(timezone.utc).isoformat(),
        )
        for c in dataset.applied_changes
    ]

    # Restore verification results
    for v in dataset.verifications:
        session.verification_results[v.claim_id] = VerificationResultItem(
            claim_id=v.claim_id,
            row_index=v.row_index,
            column_name=v.column_name,
            context_column=v.context_column,
            claim_text=v.claim_text,
            status=v.status,
            status_label=v.status_label,
            confidence_score=v.confidence_score,
            evidence_summary=v.evidence_summary,
            explanation=v.explanation,
            sources=[EvidenceSource(**src) for src in v.sources],
            retrieval_timestamp=v.retrieval_timestamp.isoformat() if v.retrieval_timestamp else datetime.now(timezone.utc).isoformat(),
            provider_name=v.provider_name,
            provider_warning=v.provider_warning,
            manual_assessment=v.manual_assessment,
            manual_notes=v.manual_notes,
        )

    # Register in memory manager
    with review_manager._lock:
        review_manager._sessions[session_id] = session

    return session


def sync_session_to_db(db: Session, user_id: str, dataset_id: str, session: ReviewSession):
    """Syncs in-memory working dataset and decisions to the persistent database."""
    dataset = get_user_dataset(db, user_id, dataset_id)

    # 1. Update working matrix
    columns = dataset.columns
    matrix = []
    for _, row in session.working_df.iterrows():
        matrix.append([_safe_val(row[col]) for col in columns])

    if dataset.data:
        dataset.data.set_working_matrix(matrix)

    # 2. Update suggestions status and applied flags
    for sugg_rec in dataset.suggestions:
        mem_sugg = session.suggestions.get(sugg_rec.issue_id)
        if mem_sugg:
            sugg_rec.status = mem_sugg.status
            sugg_rec.applied = mem_sugg.applied
            sugg_rec.updated_at = datetime.now(timezone.utc)

    # 3. Synchronize applied modifications
    existing_issue_ids = {c.issue_id for c in dataset.applied_changes}
    for applied in session.applied_changes:
        if applied.issue_id not in existing_issue_ids:
            new_applied = AppliedCorrectionRecord(
                id=f"app-{uuid.uuid4().hex[:12]}",
                dataset_id=dataset_id,
                issue_id=applied.issue_id,
                row_index=applied.row_index,
                column_name=applied.column_name,
                original_value=str(applied.original_value) if applied.original_value is not None else None,
                applied_value=str(applied.applied_value) if applied.applied_value is not None else None,
            )
            db.add(new_applied)

    # 4. Synchronize verification results
    existing_claim_ids = {v.claim_id: v for v in dataset.verifications}
    for item in session.verification_results.values():
        if item.claim_id in existing_claim_ids:
            rec = existing_claim_ids[item.claim_id]
            rec.manual_assessment = item.manual_assessment
            rec.manual_notes = item.manual_notes
        else:
            new_ver = VerificationResultRecord(
                claim_id=item.claim_id,
                dataset_id=dataset_id,
                row_index=item.row_index,
                column_name=item.column_name,
                context_column=item.context_column,
                claim_text=item.claim_text,
                status=item.status,
                status_label=item.status_label,
                confidence_score=item.confidence_score,
                evidence_summary=item.evidence_summary,
                explanation=item.explanation,
                sources_json=json.dumps([s.model_dump() for s in item.sources]),
                provider_name=item.provider_name,
                provider_warning=item.provider_warning,
                manual_assessment=item.manual_assessment,
                manual_notes=item.manual_notes,
            )
            db.add(new_ver)

    dataset.updated_at = datetime.now(timezone.utc)
    db.commit()
