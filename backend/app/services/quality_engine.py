"""Data Quality Detection Engine (Part 3)

Rule-based engine analyzing tabular datasets (CSV / XLSX) for:
- Exact duplicate rows
- Duplicate values in identifier columns
- Missing or blank values (including whitespace-only and sentinel strings)
- Invalid email formats
- Invalid phone number structures (conservative validation)
- Inconsistent text values (untrimmed whitespace, mixed casing)
- Empty rows and columns
- Explainable Quality Score calculation
"""

import math
import re
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd

from app.schemas.quality import QualityAnalysisResponse, QualityIssue

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
SENTINEL_NULLS = {"n/a", "na", "null", "none", "-", "#n/a", "undefined", "nil", "nan"}

EMAIL_COL_PATTERNS = re.compile(r"(email|e-mail|e_mail|mail_address|contact_email)", re.IGNORECASE)
PHONE_COL_PATTERNS = re.compile(r"(phone|telephone|mobile|cell|contact_phone|tel_no|cellphone)", re.IGNORECASE)
ID_COL_PATTERNS = re.compile(
    r"^(id|.*_id|uuid|ssn|ein|tax_id|national_id|account_number|user_id|customer_id)$",
    re.IGNORECASE,
)


def _classify_columns(columns: List[str]) -> Dict[str, List[str]]:
    """Heuristically detects special columns based on case-insensitive patterns."""
    email_cols = []
    phone_cols = []
    id_cols = []

    for col in columns:
        cleaned = str(col).strip()
        if EMAIL_COL_PATTERNS.search(cleaned):
            email_cols.append(col)
        elif PHONE_COL_PATTERNS.search(cleaned):
            phone_cols.append(col)
        elif ID_COL_PATTERNS.match(cleaned):
            id_cols.append(col)

    return {
        "email_columns": email_cols,
        "phone_columns": phone_cols,
        "id_columns": id_cols,
    }


def _is_empty_or_whitespace(val: Any) -> Tuple[bool, str]:
    """Checks if a cell value is null, whitespace-only, or a sentinel placeholder."""
    if val is None:
        return True, "Null value"
    if isinstance(val, (float, int)) and (math.isnan(val) or pd.isna(val)):
        return True, "NaN value"
    if isinstance(val, str):
        val_stripped = val.strip()
        if len(val_stripped) == 0:
            if len(val) > 0:
                return True, "Whitespace-only characters"
            return True, "Empty string"
        if val_stripped.lower() in SENTINEL_NULLS:
            return True, f"Placeholder sentinel '{val_stripped}'"
    return False, ""


def _validate_phone_conservative(val: str) -> Tuple[bool, str]:
    """Conservative phone validation:

    Assumptions:
    - Strips valid punctuation: spaces, hyphens, plus, dots, parentheses.
    - Remaining digits must be between 7 and 15 digits (ITU E.164).
    - Contains no alphabetic or unexpected special characters.
    """
    stripped = val.strip()
    digits_only = re.sub(r"[\s\-\(\)\.\+]", "", stripped)

    # Check for unexpected non-digits
    if not digits_only.isdigit():
        return False, "Contains non-numeric characters"

    digit_count = len(digits_only)
    if digit_count < 7:
        return False, f"Too short ({digit_count} digits; expected minimum 7)"
    if digit_count > 15:
        return False, f"Too long ({digit_count} digits; standard E.164 max is 15)"

    return True, ""


def _calculate_quality_score(
    total_cells: int,
    severity_counts: Dict[str, int],
) -> Tuple[float, str, str]:
    """Computes a bounded, explainable quality score from 0.0 to 100.0."""
    high = severity_counts.get("high", 0)
    medium = severity_counts.get("medium", 0)
    low = severity_counts.get("low", 0)
    info = severity_counts.get("info", 0)

    # Weights
    w_high = 3.0
    w_med = 1.5
    w_low = 0.5
    w_info = 0.1

    weighted_penalties = (high * w_high) + (medium * w_med) + (low * w_low) + (info * w_info)
    effective_cells = max(total_cells, 1)

    # Defect ratio relative to total cells
    defect_rate = weighted_penalties / effective_cells
    raw_score = 100.0 * (1.0 - min(1.0, defect_rate))
    score = round(max(0.0, min(100.0, raw_score)), 1)

    if score >= 90.0:
        grade = "A (Excellent)"
    elif score >= 80.0:
        grade = "B (Good)"
    elif score >= 70.0:
        grade = "C (Fair)"
    elif score >= 60.0:
        grade = "D (Needs Attention)"
    else:
        grade = "F (Critical Remediation Required)"

    formula_explanation = (
        f"Score = 100 * [1 - min(1.0, WeightedPenalties / TotalCells)]. "
        f"Weighted penalties: ({high} High * 3.0) + ({medium} Med * 1.5) + ({low} Low * 0.5) "
        f"= {round(weighted_penalties, 1)} points over {effective_cells} total evaluated data cells."
    )

    return score, grade, formula_explanation


def analyze_dataset_quality(
    df: pd.DataFrame,
    filename: str,
    file_type: str,
    max_issues: int = 500,
) -> QualityAnalysisResponse:
    """Orchestrates comprehensive data quality checks on an in-memory DataFrame."""
    total_rows = len(df)
    total_columns = len(df.columns)
    total_cells = total_rows * total_columns

    issues: List[QualityIssue] = []
    issue_counter = 0

    category_counts = {
        "duplicates": 0,
        "missing_values": 0,
        "invalid_formats": 0,
        "inconsistent_values": 0,
        "empty_structures": 0,
    }

    severity_counts = {
        "high": 0,
        "medium": 0,
        "low": 0,
        "info": 0,
    }

    def record_issue(
        category: str,
        issue_type: str,
        severity: str,
        explanation: str,
        row_index: Optional[int] = None,
        column_name: Optional[str] = None,
        current_value: Optional[Any] = None,
        suggested_action: Optional[str] = None,
    ):
        nonlocal issue_counter
        issue_counter += 1
        category_counts[category] = category_counts.get(category, 0) + 1
        severity_counts[severity] = severity_counts.get(severity, 0) + 1

        if len(issues) < max_issues:
            issues.append(
                QualityIssue(
                    id=f"iss-{issue_counter}",
                    row_index=row_index,
                    column_name=column_name,
                    category=category,
                    issue_type=issue_type,
                    severity=severity,
                    current_value=current_value,
                    explanation=explanation,
                    suggested_action=suggested_action,
                )
            )

    columns = [str(c) for c in df.columns]
    special_cols = _classify_columns(columns)
    email_cols = special_cols["email_columns"]
    phone_cols = special_cols["phone_columns"]
    id_cols = set(special_cols["id_columns"] + email_cols + phone_cols)

    # 1. Empty Columns Check
    empty_col_names: Set[str] = set()
    for col in columns:
        col_series = df[col]
        is_empty_col = True
        for val in col_series:
            is_empty, _ = _is_empty_or_whitespace(val)
            if not is_empty:
                is_empty_col = False
                break
        if is_empty_col:
            empty_col_names.add(col)
            record_issue(
                category="empty_structures",
                issue_type="empty_column",
                severity="medium",
                column_name=col,
                explanation=f"Column '{col}' is completely blank across all {total_rows} rows.",
                suggested_action="Verify whether this column is required or drop it from the dataset.",
            )

    # 2. Empty Rows & Exact Duplicate Rows Check
    empty_row_indices: Set[int] = set()
    seen_row_hashes: Dict[Tuple, int] = {}

    for row_idx, (_, row) in enumerate(df.iterrows(), start=1):
        # Check if entire row is empty
        row_values = [row[c] for c in columns]
        is_row_empty = all(_is_empty_or_whitespace(v)[0] for v in row_values)

        if is_row_empty:
            empty_row_indices.add(row_idx)
            record_issue(
                category="empty_structures",
                issue_type="empty_row",
                severity="high",
                row_index=row_idx,
                explanation=f"Row {row_idx} is completely blank across all columns.",
                suggested_action="Delete blank row from dataset.",
            )
            continue

        # Exact duplicate detection
        # Create hashable tuple of row representation
        row_tuple = tuple(str(v).strip() if v is not None else "" for v in row_values)
        if row_tuple in seen_row_hashes:
            first_seen_row = seen_row_hashes[row_tuple]
            record_issue(
                category="duplicates",
                issue_type="exact_duplicate_row",
                severity="high",
                row_index=row_idx,
                explanation=f"Row {row_idx} is an exact duplicate of Row {first_seen_row}.",
                suggested_action="Remove or merge redundant duplicate record.",
            )
        else:
            seen_row_hashes[row_tuple] = row_idx

    # 3. Duplicate values in identifier columns
    for col in id_cols:
        if col in empty_col_names:
            continue
        val_counts: Dict[str, List[int]] = {}
        for row_idx, val in enumerate(df[col], start=1):
            if row_idx in empty_row_indices:
                continue
            is_empty, _ = _is_empty_or_whitespace(val)
            if is_empty:
                continue
            val_norm = str(val).strip().lower()
            val_counts.setdefault(val_norm, []).append(row_idx)

        for val_norm, row_list in val_counts.items():
            if len(row_list) > 1:
                # Flag the duplicate occurrences (from 2nd onwards)
                for dup_row in row_list[1:]:
                    record_issue(
                        category="duplicates",
                        issue_type="duplicate_identifier",
                        severity="high" if (col in email_cols or col in special_cols["id_columns"]) else "medium",
                        row_index=dup_row,
                        column_name=col,
                        current_value=val_norm,
                        explanation=(
                            f"Duplicate identifier value '{val_norm}' in column '{col}'. "
                            f"Occurs {len(row_list)} times (first seen in Row {row_list[0]})."
                        ),
                        suggested_action="Verify whether these rows represent the same entity.",
                    )

    # 4. Cell-level Missing Values, Format Validation & Text Consistency
    for col in columns:
        if col in empty_col_names:
            continue

        is_email = col in email_cols
        is_phone = col in phone_cols

        # Track casing for categorical consistency
        string_casing_map: Dict[str, Set[str]] = {}

        for row_idx, val in enumerate(df[col], start=1):
            if row_idx in empty_row_indices:
                continue

            is_empty, empty_reason = _is_empty_or_whitespace(val)

            # Missing value check
            if is_empty:
                record_issue(
                    category="missing_values",
                    issue_type="missing_value",
                    severity="high" if col in id_cols else "medium",
                    row_index=row_idx,
                    column_name=col,
                    current_value=str(val) if val is not None else None,
                    explanation=f"Missing or blank value: {empty_reason}.",
                    suggested_action="Provide verified attribute value or leave explicit null.",
                )
                continue

            val_str = str(val)

            # Untrimmed whitespace check
            if val_str.strip() != val_str:
                record_issue(
                    category="inconsistent_values",
                    issue_type="untrimmed_whitespace",
                    severity="low",
                    row_index=row_idx,
                    column_name=col,
                    current_value=val_str,
                    explanation="Value contains unnecessary leading or trailing whitespace.",
                    suggested_action=f"Trim whitespace to '{val_str.strip()}'.",
                )

            clean_val = val_str.strip()

            # Email format validation
            if is_email:
                if not EMAIL_REGEX.match(clean_val):
                    record_issue(
                        category="invalid_formats",
                        issue_type="invalid_email_format",
                        severity="high",
                        row_index=row_idx,
                        column_name=col,
                        current_value=clean_val,
                        explanation=f"Value '{clean_val}' does not match standard RFC email structure.",
                        suggested_action="Correct syntax error (e.g., missing '@' or domain).",
                    )

            # Phone format validation
            if is_phone:
                is_valid_phone, phone_reason = _validate_phone_conservative(clean_val)
                if not is_valid_phone:
                    record_issue(
                        category="invalid_formats",
                        issue_type="invalid_phone_format",
                        severity="medium",
                        row_index=row_idx,
                        column_name=col,
                        current_value=clean_val,
                        explanation=f"Invalid phone structure: {phone_reason}.",
                        suggested_action="Format with standard country code and 7-15 digits.",
                    )

            # Track casing variants for categorical inspection
            if len(clean_val) < 50:
                lowered = clean_val.lower()
                string_casing_map.setdefault(lowered, set()).add(clean_val)

        # Casing inconsistency check for column
        # Only evaluate if column has limited cardinality (categorical behavior)
        if 1 < len(string_casing_map) <= 50:
            for lowered, variants in string_casing_map.items():
                if len(variants) > 1:
                    # Pick most common or first as canonical suggestion
                    canonical = sorted(list(variants))[0]
                    for variant in variants:
                        if variant != canonical:
                            record_issue(
                                category="inconsistent_values",
                                issue_type="casing_inconsistency",
                                severity="low",
                                column_name=col,
                                current_value=variant,
                                explanation=(
                                    f"Column '{col}' contains inconsistent capitalization variants "
                                    f"for '{lowered}' (found: {', '.join(sorted(list(variants)))})."
                                ),
                                suggested_action=f"Standardize casing to '{canonical}' across dataset.",
                            )

    quality_score, score_grade, formula_explanation = _calculate_quality_score(
        total_cells=total_cells,
        severity_counts=severity_counts,
    )

    return QualityAnalysisResponse(
        filename=filename,
        file_type=file_type,
        total_rows=total_rows,
        total_columns=total_columns,
        total_cells=total_cells,
        quality_score=quality_score,
        score_grade=score_grade,
        scoring_formula_explanation=formula_explanation,
        category_counts=category_counts,
        severity_counts=severity_counts,
        issues=issues,
        total_issues_detected=issue_counter,
        returned_issues_count=len(issues),
        has_more_issues=issue_counter > len(issues),
        evaluated_columns=columns,
        detected_special_columns=special_cols,
    )
