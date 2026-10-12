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
