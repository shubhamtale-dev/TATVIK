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
}
