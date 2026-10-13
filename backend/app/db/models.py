"""SQLAlchemy Models for Persistent Datasets, Quality Audits, and Verification (Part 6).

Implements:
- User identity tracking mirroring Supabase auth.users(id)
- User-owned datasets and dataset metadata
- Dual-state preservation (original pristine data vs. working copy with applied corrections)
- Compact 2D array representation for row records to eliminate redundant JSON keys
- Comprehensive data quality issues, correction suggestions, and applied changes
- Evidence-grounded research verification results and citation references
"""

from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserRecord(Base):
    """Represents an application user, matching Supabase auth.users."""
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    datasets = relationship("DatasetRecord", back_populates="user", cascade="all, delete-orphan")


class DatasetRecord(Base):
    """Represents a persistent user-owned dataset."""
    __tablename__ = "datasets"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(16), nullable=False)  # csv, xlsx
    file_size_bytes = Column(Integer, nullable=False, default=0)
    total_rows = Column(Integer, nullable=False, default=0)
    total_columns = Column(Integer, nullable=False, default=0)
    columns_json = Column(Text, nullable=False)  # JSON list of column names
    quality_score = Column(Float, nullable=True)
    score_grade = Column(String(8), nullable=True)
    scoring_formula_explanation = Column(Text, nullable=True)
    storage_path = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("UserRecord", back_populates="datasets")
    data = relationship("DatasetDataRecord", back_populates="dataset", uselist=False, cascade="all, delete-orphan")
    issues = relationship("QualityIssueRecord", back_populates="dataset", cascade="all, delete-orphan")
    suggestions = relationship("CorrectionSuggestionRecord", back_populates="dataset", cascade="all, delete-orphan")
    applied_changes = relationship("AppliedCorrectionRecord", back_populates="dataset", cascade="all, delete-orphan")
    verifications = relationship("VerificationResultRecord", back_populates="dataset", cascade="all, delete-orphan")

    @property
    def columns(self) -> List[str]:
        try:
            return json.loads(self.columns_json)
        except Exception:
            return []

    @columns.setter
    def columns(self, cols: List[str]):
        self.columns_json = json.dumps(cols)


class DatasetDataRecord(Base):
    """Stores tabular dataset rows using compact 2D matrices to save storage."""
    __tablename__ = "dataset_data"

    id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(64), ForeignKey("datasets.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    # Stored as compact JSON 2D arrays: [[val1, val2, ...], [val1, val2, ...]]
    original_data_json = Column(Text, nullable=False)
    working_data_json = Column(Text, nullable=False)

    # Relationship
    dataset = relationship("DatasetRecord", back_populates="data")

    def get_original_matrix(self) -> List[List[Any]]:
        try:
            return json.loads(self.original_data_json)
        except Exception:
            return []

    def get_working_matrix(self) -> List[List[Any]]:
        try:
            return json.loads(self.working_data_json)
        except Exception:
            return []

    def set_original_matrix(self, matrix: List[List[Any]]):
        self.original_data_json = json.dumps(matrix)

    def set_working_matrix(self, matrix: List[List[Any]]):
        self.working_data_json = json.dumps(matrix)


class QualityIssueRecord(Base):
    """Detected data quality defect record."""
    __tablename__ = "quality_issues"

    id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(64), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    row_index = Column(Integer, nullable=True)
    column_name = Column(String(255), nullable=True)
    category = Column(String(64), nullable=False)
    issue_type = Column(String(64), nullable=False)
    severity = Column(String(16), nullable=False)
    current_value = Column(Text, nullable=True)
    proposed_value = Column(Text, nullable=True)
    can_auto_correct = Column(Boolean, default=False)
    explanation = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=True)

    dataset = relationship("DatasetRecord", back_populates="issues")


class CorrectionSuggestionRecord(Base):
    """Conservative correction proposal with human review status."""
    __tablename__ = "correction_suggestions"

    id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(64), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id = Column(String(64), nullable=False)
    row_index = Column(Integer, nullable=True)
    column_name = Column(String(255), nullable=True)
    category = Column(String(64), nullable=False)
    issue_type = Column(String(64), nullable=False)
    severity = Column(String(16), nullable=False)
    original_value = Column(Text, nullable=True)
    proposed_value = Column(Text, nullable=True)
    can_auto_correct = Column(Boolean, default=False)
    reason = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=True)
    status = Column(String(16), default="pending", nullable=False)  # pending, approved, rejected
    applied = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    dataset = relationship("DatasetRecord", back_populates="suggestions")


class AppliedCorrectionRecord(Base):
    """Historical audit log entry of an applied dataset modification."""
    __tablename__ = "applied_corrections"

    id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(64), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id = Column(String(64), nullable=False)
    row_index = Column(Integer, nullable=False)
    column_name = Column(String(255), nullable=False)
    original_value = Column(Text, nullable=True)
    applied_value = Column(Text, nullable=True)
    applied_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    dataset = relationship("DatasetRecord", back_populates="applied_changes")


class VerificationResultRecord(Base):
    """Persistent research verification claim audit record."""
    __tablename__ = "verification_results"

    claim_id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(64), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    row_index = Column(Integer, nullable=False)
    column_name = Column(String(255), nullable=False)
    context_column = Column(String(255), nullable=True)
    claim_text = Column(Text, nullable=False)
    status = Column(String(32), nullable=False)
    status_label = Column(String(64), nullable=False)
    confidence_score = Column(Float, nullable=True)
    evidence_summary = Column(Text, nullable=False)
    explanation = Column(Text, nullable=False)
    sources_json = Column(Text, nullable=False)  # JSON array of evidence source objects
    retrieval_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    provider_name = Column(String(32), nullable=False)
    provider_warning = Column(Text, nullable=True)
    manual_assessment = Column(String(32), nullable=True)  # verified, flagged, dismissed
    manual_notes = Column(Text, nullable=True)

    dataset = relationship("DatasetRecord", back_populates="verifications")

    @property
    def sources(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.sources_json)
        except Exception:
            return []

    @sources.setter
    def sources(self, srcs: List[Dict[str, Any]]):
        self.sources_json = json.dumps(srcs)
