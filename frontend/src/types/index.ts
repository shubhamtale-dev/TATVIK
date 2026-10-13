export type DatasetStatus = 'Cleaned' | 'Issues Flagged' | 'Ready for Review' | 'Processing';

export interface DatasetItem {
  id: string;
  name: string;
  filename: string;
  format: 'CSV' | 'XLSX' | 'XLS';
  recordCount: number;
  lastUpdated: string;
  status: DatasetStatus;
  issueCount: number;
}

export interface QualityCategory {
  id: string;
  label: string;
  count: number;
  percentage: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'dataset' | 'quality' | 'verification' | 'system';
}

export interface BackendHealth {
  status: string;
  service: string;
  version: string;
  environment: string;
  cors_origins: string[];
}

export interface DatasetPreviewData {
  filename: string;
  file_size_bytes: number;
  file_type: 'csv' | 'xlsx';
  total_rows: number;
  total_columns: number;
  columns: string[];
  preview_rows: Record<string, unknown>[];
  preview_row_count: number;
  sheet_names?: string[] | null;
  selected_sheet?: string | null;
  notice?: string | null;
}

export interface QualityIssueItem {
  id: string;
  row_index?: number | null;
  column_name?: string | null;
  category: string;
  issue_type: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  current_value?: unknown;
  proposed_value?: unknown;
  can_auto_correct?: boolean;
  explanation: string;
  suggested_action?: string | null;
}

export interface QualityAnalysisResult {
  filename: string;
  file_type: string;
  total_rows: number;
  total_columns: number;
  total_cells: number;
  quality_score: number;
  score_grade: string;
  scoring_formula_explanation: string;
  category_counts: Record<string, number>;
  severity_counts: Record<string, number>;
  issues: QualityIssueItem[];
  total_issues_detected: number;
  returned_issues_count: number;
  has_more_issues: boolean;
  evaluated_columns: string[];
  detected_special_columns: {
    email_columns: string[];
    phone_columns: string[];
    id_columns: string[];
  };
  session_id?: string | null;
}

// ==========================================
// Part 4: Issue Review & Correction Types
// ==========================================

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CorrectionSuggestionItem {
  issue_id: string;
  row_index?: number | null;
  column_name?: string | null;
  category: string;
  issue_type: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  original_value?: unknown;
  proposed_value?: unknown;
  can_auto_correct: boolean;
  reason: string;
  suggested_action?: string | null;
  status: ReviewStatus;
  applied: boolean;
}

export interface AppliedCorrectionItem {
  issue_id: string;
  row_index: number;
  column_name: string;
  original_value?: unknown;
  applied_value?: unknown;
  applied_at: string;
}

export interface ReviewSessionSummaryData {
  session_id: string;
  filename: string;
  file_type: string;
  total_rows: number;
  total_columns: number;
  total_issues: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  applied_count: number;
  auto_correctable_count: number;
  manual_review_count: number;
  quality_score: number;
  score_grade: string;
  created_at: string;
}

export interface ReviewSessionDetailData {
  session_id: string;
  filename: string;
  file_type: string;
  total_rows: number;
  total_columns: number;
  columns: string[];
  summary: ReviewSessionSummaryData;
  suggestions: CorrectionSuggestionItem[];
  applied_changes: AppliedCorrectionItem[];
}

export interface WorkingDatasetPreviewData {
  session_id: string;
  filename: string;
  total_rows: number;
  total_columns: number;
  columns: string[];
  preview_rows: Record<string, unknown>[];
  total_applied_changes: number;
  applied_changes: AppliedCorrectionItem[];
}

export interface ApplyChangesResultData {
  session_id: string;
  applied_count: number;
  applied_changes: AppliedCorrectionItem[];
  total_applied_to_date: number;
  remaining_approved_count: number;
  working_preview_rows: Record<string, unknown>[];
  message: string;
}

// ==========================================
// Part 5: Research Verification & Source Evidence Types
// ==========================================

export type VerificationStatus =
  | 'supported_by_evidence'
  | 'conflicting_evidence'
  | 'needs_manual_review'
  | 'unable_to_verify'
  | 'not_configured';

export type ManualAssessmentType = 'verified' | 'flagged' | 'dismissed' | 'cleared';

export interface EvidenceSourceItem {
  title: string;
  url: string;
  domain: string;
  source_type: 'official' | 'third_party';
  snippet: string;
}

export interface VerificationResultItemData {
  claim_id: string;
  row_index: number;
  column_name: string;
  context_column?: string | null;
  claim_text: string;
  status: VerificationStatus;
  status_label: string;
  confidence_score?: number | null;
  evidence_summary: string;
  explanation: string;
  sources: EvidenceSourceItem[];
  retrieval_timestamp: string;
  provider_name: string;
  provider_warning?: string | null;
  manual_assessment?: ManualAssessmentType | null;
  manual_notes?: string | null;
}

export interface ProviderStatusData {
  configured: boolean;
  provider_name: string;
  available_providers: string[];
  timeout_seconds: number;
  max_claims_per_batch: number;
  setup_instructions: string;
}

export interface VerificationBatchResponseData {
  total_claims: number;
  completed_count: number;
  status_counts: Record<string, number>;
  results: VerificationResultItemData[];
  provider_configured: boolean;
  provider_name: string;
  message: string;
}

export interface VerificationBatchRequestData {
  session_id?: string;
  column_name: string;
  context_column?: string;
  claim_type: string;
  row_indices: number[];
  custom_claim_template?: string;
}

// ==========================================
// Part 6: Authentication & Persistent Datasets
// ==========================================

export interface UserProfile {
  id: string;
  email: string | null;
  role: string;
}

export interface AuthStatusData {
  configured: boolean;
  provider: string;
  supabase_url?: string | null;
  setup_instructions: string;
}

export interface PersistentDatasetSummary {
  id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  total_rows: number;
  total_columns: number;
  quality_score?: number | null;
  score_grade?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersistentDatasetListResponse {
  total: number;
  items: PersistentDatasetSummary[];
}

export interface PersistentDatasetDetail extends PersistentDatasetSummary {
  columns: string[];
  preview_rows: Record<string, unknown>[];
  session_id?: string | null;
}

