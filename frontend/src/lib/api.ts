import {
  BackendHealth,
  DatasetPreviewData,
  QualityAnalysisResult,
  ReviewSessionDetailData,
  CorrectionSuggestionItem,
  WorkingDatasetPreviewData,
  ApplyChangesResultData,
  AppliedCorrectionItem,
  ProviderStatusData,
  VerificationBatchRequestData,
  VerificationBatchResponseData,
  VerificationResultItemData,
  ManualAssessmentType,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function checkBackendHealth(): Promise<{
  online: boolean;
  data?: BackendHealth;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: BackendHealth = await response.json();
    return { online: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Backend unreachable';
    return { online: false, error: message };
  }
}

export async function uploadDatasetPreview(
  file: File,
  limit: number = 50
): Promise<{
  success: boolean;
  data?: DatasetPreviewData;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/datasets/preview?limit=${limit}`, {
      method: 'POST',
      body: formData,
    });

    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Upload failed with HTTP ${response.status}`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as DatasetPreviewData };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Network error occurred while connecting to the backend server.';
    return { success: false, error: message };
  }
}

export async function analyzeDatasetQuality(
  file: File,
  maxIssues: number = 500
): Promise<{
  success: boolean;
  data?: QualityAnalysisResult;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/datasets/analyze?max_issues=${maxIssues}`, {
      method: 'POST',
      body: formData,
    });

    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Quality analysis failed with HTTP ${response.status}`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as QualityAnalysisResult };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Network error occurred while connecting to the backend server.';
    return { success: false, error: message };
  }
}

// ==========================================
// Part 4: Review and Approval API Clients
// ==========================================

export async function createReviewSession(
  file: File,
  maxIssues: number = 500
): Promise<{
  success: boolean;
  data?: ReviewSessionDetailData;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/review/sessions?max_issues=${maxIssues}`, {
      method: 'POST',
      body: formData,
    });

    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Failed to create review session (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as ReviewSessionDetailData };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Network error occurred while communicating with review service.';
    return { success: false, error: message };
  }
}

export async function getReviewSession(
  sessionId: string,
  params?: {
    status?: string;
    category?: string;
    severity?: string;
    canCorrect?: boolean;
    search?: string;
  }
): Promise<{
  success: boolean;
  data?: ReviewSessionDetailData;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.category && params.category !== 'all') query.append('category', params.category);
    if (params?.severity && params.severity !== 'all') query.append('severity', params.severity);
    if (params?.canCorrect !== undefined) query.append('can_correct', String(params.canCorrect));
    if (params?.search && params.search.trim()) query.append('search', params.search.trim());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(`${API_BASE}/review/sessions/${sessionId}${queryString}`);

    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Failed to fetch review session (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as ReviewSessionDetailData };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Network error occurred while fetching review session.';
    return { success: false, error: message };
  }
}

export async function decideSuggestion(
  sessionId: string,
  issueId: string,
  decision: 'approve' | 'reject' | 'reset'
): Promise<{
  success: boolean;
  data?: CorrectionSuggestionItem;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/review/sessions/${sessionId}/decide/${issueId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ decision }),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Failed to update decision (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as CorrectionSuggestionItem };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Network error occurred while saving decision.';
    return { success: false, error: message };
  }
}

export async function bulkDecideSuggestions(
  sessionId: string,
  issueIds: string[],
  decision: 'approve' | 'reject' | 'reset'
): Promise<{
  success: boolean;
  data?: {
    updated_count: number;
    updated_issue_ids: string[];
    skipped_issue_ids: string[];
  };
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/review/sessions/${sessionId}/bulk-decide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ issue_ids: issueIds, decision }),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Bulk decision failed (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Network error occurred while processing bulk decision.';
    return { success: false, error: message };
  }
}

export async function applyApprovedChanges(
  sessionId: string,
  previewLimit: number = 50
): Promise<{
  success: boolean;
  data?: ApplyChangesResultData;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE}/review/sessions/${sessionId}/apply?preview_limit=${previewLimit}`,
      {
        method: 'POST',
      }
    );

    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Failed to apply changes (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as ApplyChangesResultData };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Network error occurred while applying changes.';
    return { success: false, error: message };
  }
}

export async function getWorkingDatasetPreview(
  sessionId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  success: boolean;
  data?: WorkingDatasetPreviewData;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE}/review/sessions/${sessionId}/preview?limit=${limit}&offset=${offset}`
    );

    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Failed to fetch working preview (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as WorkingDatasetPreviewData };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Network error occurred while fetching working preview.';
    return { success: false, error: message };
  }
}

export async function getAppliedChangesLog(
  sessionId: string
): Promise<{
  success: boolean;
  data?: AppliedCorrectionItem[];
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/review/sessions/${sessionId}/changes`);
    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Failed to fetch applied changes (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as AppliedCorrectionItem[] };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Network error occurred while fetching change log.';
    return { success: false, error: message };
  }
}

// ==========================================
// Part 5: Research Verification API Calls
// ==========================================

export async function getProviderStatus(): Promise<{
  success: boolean;
  data?: ProviderStatusData;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/verification/provider-status`);
    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Failed to fetch provider status (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as ProviderStatusData };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Network error occurred while fetching provider status.';
    return { success: false, error: message };
  }
}

export async function verifyClaimsBatch(
  request: VerificationBatchRequestData
): Promise<{
  success: boolean;
  data?: VerificationBatchResponseData;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/verification/verify-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Verification failed (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as VerificationBatchResponseData };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Network error occurred while executing verification.';
    return { success: false, error: message };
  }
}

export async function verifyClaimsUpload(
  file: File,
  columnName: string,
  rowIndices: number[],
  contextColumn?: string,
  claimType: string = 'entity_existence',
  customTemplate?: string
): Promise<{
  success: boolean;
  data?: VerificationBatchResponseData;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('column_name', columnName);
    formData.append('row_indices', JSON.stringify(rowIndices));
    formData.append('claim_type', claimType);
    if (contextColumn) formData.append('context_column', contextColumn);
    if (customTemplate) formData.append('custom_claim_template', customTemplate);

    const response = await fetch(`${API_BASE}/verification/verify-upload`, {
      method: 'POST',
      body: formData,
    });

    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Verification upload failed (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as VerificationBatchResponseData };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Network error occurred while uploading for verification.';
    return { success: false, error: message };
  }
}

export async function getSessionVerificationResults(
  sessionId: string,
  statusFilter?: string
): Promise<{
  success: boolean;
  data?: VerificationResultItemData[];
  error?: string;
}> {
  try {
    const query = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    const response = await fetch(`${API_BASE}/verification/sessions/${sessionId}/results${query}`);
    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Failed to fetch verification results (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as VerificationResultItemData[] };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Network error occurred while fetching verification results.';
    return { success: false, error: message };
  }
}

export async function recordManualAssessment(
  sessionId: string,
  claimId: string,
  assessment: ManualAssessmentType,
  notes?: string
): Promise<{
  success: boolean;
  data?: VerificationResultItemData;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE}/verification/sessions/${sessionId}/assessment/${claimId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assessment, notes }),
      }
    );

    const responseBody = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseBody.message ||
        responseBody.detail ||
        `Failed to record assessment (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data: responseBody as VerificationResultItemData };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Network error occurred while recording assessment.';
    return { success: false, error: message };
  }
}
