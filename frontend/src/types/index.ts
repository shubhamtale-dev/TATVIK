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
