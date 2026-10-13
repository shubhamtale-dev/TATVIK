import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Globe,
  ShieldCheck,
  Search,
  AlertTriangle,
  RotateCcw,
  Clock,
  Layers,
  Filter,
  CheckSquare,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FileUploader } from '../components/datasets/FileUploader';
import { ProviderSetupModal } from '../components/verification/ProviderSetupModal';
import { EvidenceCard } from '../components/verification/EvidenceCard';
import {
  ProviderStatusData,
  ReviewSessionDetailData,
  VerificationResultItemData,
  ManualAssessmentType,
} from '../types';
import {
  getProviderStatus,
  getReviewSession,
  getWorkingDatasetPreview,
  createReviewSession,
  verifyClaimsBatch,
  getSessionVerificationResults,
  recordManualAssessment,
} from '../lib/api';

export const ResearchVerificationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSessionId = searchParams.get('session_id');

  // Provider configuration state
  const [providerStatus, setProviderStatus] = useState<ProviderStatusData | null>(null);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);

  // Active dataset / review session state
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [sessionDetail, setSessionDetail] = useState<ReviewSessionDetailData | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Verification configuration
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [contextColumn, setContextColumn] = useState<string>('');
  const [claimType, setClaimType] = useState<string>('entity_existence');
  const [customTemplate, setCustomTemplate] = useState<string>('');
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);

  // Verification execution & results
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResultItemData[]>([]);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters for results
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assessmentFilter, setAssessmentFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // 1. Fetch search provider status on mount
  useEffect(() => {
    loadProviderStatus();
  }, []);

  const loadProviderStatus = async () => {
    const res = await getProviderStatus();
    if (res.success && res.data) {
      setProviderStatus(res.data);
    }
  };

  // 2. Load session if session_id is available in query parameter
  useEffect(() => {
    if (sessionId) {
      loadSessionData(sessionId);
    }
  }, [sessionId]);

  const loadSessionData = async (sid: string) => {
    setErrorMessage(null);

    const detailRes = await getReviewSession(sid);
    if (detailRes.success && detailRes.data) {
      setSessionDetail(detailRes.data);
      const cols = detailRes.data.columns;

      // Auto-select likely entity column
      if (cols.length > 0 && !targetColumn) {
        const likelyEntityCol =
          cols.find((c) =>
            /company|business|name|entity|vendor|organization|client/i.test(c)
          ) || cols[0];
        setTargetColumn(likelyEntityCol);

        const likelyContextCol = cols.find((c) =>
          /website|url|domain|address|city|hq|headquarters|state/i.test(c)
        );
        if (likelyContextCol && likelyContextCol !== likelyEntityCol) {
          setContextColumn(likelyContextCol);
        }
      }

      // Fetch working rows for selection
      const previewRes = await getWorkingDatasetPreview(sid, 20, 0);
      if (previewRes.success && previewRes.data) {
        setPreviewRows(previewRes.data.preview_rows);
        // Default select first 5 rows
        const initialSelected = previewRes.data.preview_rows
          .slice(0, 5)
          .map((_, idx) => idx + 1);
        setSelectedRowIndices(initialSelected);
      }

      // Load existing verification results for session if any
      const verRes = await getSessionVerificationResults(sid);
      if (verRes.success && verRes.data && verRes.data.length > 0) {
        setVerificationResults(verRes.data);
      }
    } else {
      setErrorMessage(
        detailRes.error ||
          `Session '${sid}' was not found. Please upload a dataset or select an active session.`
      );
      setSessionId(null);
      setSearchParams({});
    }
  };

  // 3. Handle file upload directly on research page
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setErrorMessage(null);

    const res = await createReviewSession(file);
    setIsUploading(false);

    if (res.success && res.data) {
      setSessionId(res.data.session_id);
      setSearchParams({ session_id: res.data.session_id });
      setVerificationResults([]);
      setVerificationMessage(null);
    } else {
      setUploadError(res.error || 'Failed to initialize session from uploaded spreadsheet.');
    }
  };

  // Row selection helpers (Max 20 rows per batch)
  const toggleRow = (rowIdx: number) => {
    setSelectedRowIndices((prev) => {
      if (prev.includes(rowIdx)) {
        return prev.filter((r) => r !== rowIdx);
      } else {
        if (prev.length >= 20) {
          alert('Maximum 20 records per verification batch.');
          return prev;
        }
        return [...prev, rowIdx].sort((a, b) => a - b);
      }
    });
  };

  const selectCount = (count: number) => {
    const indices = previewRows.slice(0, count).map((_, idx) => idx + 1);
    setSelectedRowIndices(indices);
  };

  const selectAll = () => {
    const indices = previewRows.slice(0, 20).map((_, idx) => idx + 1);
    setSelectedRowIndices(indices);
  };

  const deselectAll = () => {
    setSelectedRowIndices([]);
  };

  // Execute verification
  const handleVerifyBatch = async () => {
    if (!sessionId || !targetColumn || selectedRowIndices.length === 0) return;

    setIsVerifying(true);
    setErrorMessage(null);
    setVerificationMessage(null);

    const req = {
      session_id: sessionId,
      column_name: targetColumn,
      context_column: contextColumn || undefined,
      claim_type: claimType,
      row_indices: selectedRowIndices,
      custom_claim_template: claimType === 'custom' && customTemplate ? customTemplate : undefined,
    };

    const res = await verifyClaimsBatch(req);
    setIsVerifying(false);

    if (res.success && res.data) {
      setVerificationResults(res.data.results);
      setVerificationMessage(res.data.message);
    } else {
      setErrorMessage(res.error || 'Verification request failed. Check server connection.');
    }
  };

  // Record manual reviewer assessment
  const handleRecordAssessment = async (
    claimId: string,
    assessment: ManualAssessmentType,
    notes?: string
  ) => {
    if (!sessionId) return;
    const res = await recordManualAssessment(sessionId, claimId, assessment, notes);
    if (res.success && res.data) {
      setVerificationResults((prev) =>
        prev.map((item) => (item.claim_id === claimId ? res.data! : item))
      );
    }
  };

  // Filtered results calculation
  const filteredResults = verificationResults.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (assessmentFilter !== 'all') {
      if (assessmentFilter === 'unreviewed' && item.manual_assessment) return false;
      if (assessmentFilter !== 'unreviewed' && item.manual_assessment !== assessmentFilter)
        return false;
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const inClaim = item.claim_text.toLowerCase().includes(q);
      const inExpl = item.explanation.toLowerCase().includes(q);
      const inSummary = item.evidence_summary.toLowerCase().includes(q);
      const inDomain = item.sources.some((s) => s.domain.toLowerCase().includes(q));
      if (!inClaim && !inExpl && !inSummary && !inDomain) return false;
    }
    return true;
  });

  // Result metrics counters
  const metrics = {
    total: verificationResults.length,
    supported: verificationResults.filter((r) => r.status === 'supported_by_evidence').length,
    conflicting: verificationResults.filter((r) => r.status === 'conflicting_evidence').length,
    manualReview: verificationResults.filter((r) => r.status === 'needs_manual_review').length,
    unableOrUnconfigured: verificationResults.filter(
      (r) => r.status === 'unable_to_verify' || r.status === 'not_configured'
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy-900 tracking-tight">
            Research Verification Engine
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Ground business data claims with verifiable external evidence citations and audit records.
          </p>
        </div>

        {/* Provider Status Pill & Configuration Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsProviderModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:shadow-xs bg-white border-slate-200 text-slate-700 hover:border-brand-navy-300"
          >
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  providerStatus?.configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              Search Provider:{' '}
              <strong className="text-brand-navy-900">
                {providerStatus?.configured ? providerStatus.provider_name.toUpperCase() : 'OFFLINE'}
              </strong>
            </span>
            <Badge variant={providerStatus?.configured ? 'success' : 'warning'} size="sm">
              {providerStatus?.configured ? 'Active' : 'Unconfigured'}
            </Badge>
          </button>
        </div>
      </div>

      {/* Dataset Immutability & Audit Guarantee Notice */}
      <div className="p-3.5 bg-brand-navy-50/70 border border-brand-navy-100 rounded-xl text-xs text-brand-navy-900 flex items-start sm:items-center gap-3">
        <ShieldCheck className="w-4 h-4 text-brand-teal shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex-1 leading-relaxed">
          <strong className="font-semibold text-brand-navy-950">Evidence Immutability Notice:</strong>{' '}
          External research queries, domain citations, and confidence scores never modify your source dataset values automatically. All dataset records remain strictly immutable.
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold">Verification Notice</div>
            <p className="mt-1 text-xs">{errorMessage}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setErrorMessage(null)}
            className="text-xs h-7 text-rose-700"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* STEP 1: Dataset / Session Selection or Upload */}
      {!sessionDetail ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-brand-teal" />
              Upload Dataset for Research Verification
            </CardTitle>
            <CardDescription>
              Select a CSV or XLSX file containing business entities, websites, or addresses to evaluate against public records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader
              onUpload={handleFileUpload}
              isLoading={isUploading}
              errorMessage={uploadError}
              onClearError={() => setUploadError(null)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Dataset Summary Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-navy-50 border border-brand-navy-100 flex items-center justify-center text-brand-navy-700">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-brand-navy-900 flex items-center gap-2">
                  <span>{sessionDetail.filename}</span>
                  <Badge variant="neutral" size="sm">
                    {sessionDetail.file_type.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {sessionDetail.total_rows} rows • {sessionDetail.total_columns} columns • Session: <code className="font-mono text-slate-700">{sessionDetail.session_id}</code>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSessionDetail(null);
                  setSessionId(null);
                  setVerificationResults([]);
                  setSearchParams({});
                }}
                className="text-xs text-slate-600 hover:text-rose-600"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Change Dataset
              </Button>
            </div>
          </div>

          {/* STEP 2: Claim Configuration & Row Selection Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Claim Definition Controls */}
            <Card className="lg:col-span-1 h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-brand-navy-900">
                  <Layers className="w-4 h-4 text-brand-teal" />
                  Claim Definition Parameters
                </CardTitle>
                <CardDescription className="text-xs">
                  Define what factual claim TATVIK evaluates for each selected row.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* Target Column */}
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    Primary Target Column <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                  >
                    {sessionDetail.columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Column containing company name or entity identifier under test.
                  </p>
                </div>

                {/* Optional Context Column */}
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    Supporting Context Column (Optional)
                  </label>
                  <select
                    value={contextColumn}
                    onChange={(e) => setContextColumn(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                  >
                    <option value="">(None — verify entity name only)</option>
                    {sessionDetail.columns
                      .filter((col) => col !== targetColumn)
                      .map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Supporting website, city, or address column used to corroborate records.
                  </p>
                </div>

                {/* Claim Type */}
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    Claim Definition Model
                  </label>
                  <select
                    value={claimType}
                    onChange={(e) => setClaimType(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                  >
                    <option value="entity_existence">Entity Legitimacy & Commercial Activity</option>
                    <option value="website_official">Official Domain / Website Ownership</option>
                    <option value="address_presence">Physical Headquarters / Address Presence</option>
                    <option value="custom">Custom Claim Template</option>
                  </select>
                </div>

                {/* Custom Template Input */}
                {claimType === 'custom' && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block font-semibold text-slate-700">
                      Custom Claim Template
                    </label>
                    <textarea
                      value={customTemplate}
                      onChange={(e) => setCustomTemplate(e.target.value)}
                      placeholder="e.g. {value} is licensed in {context}"
                      rows={2}
                      className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                    />
                    <p className="text-[11px] text-slate-500">
                      Use <code className="font-mono">{'{value}'}</code> and <code className="font-mono">{'{context}'}</code> placeholders.
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-3 border-t border-slate-100">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={isVerifying || selectedRowIndices.length === 0 || !targetColumn}
                    onClick={handleVerifyBatch}
                  >
                    {isVerifying ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin mr-2" />
                        Verifying ({selectedRowIndices.length}) Claims...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Verify Selected ({selectedRowIndices.length}) Claims
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-center text-slate-500 mt-2">
                    Max 20 claims per batch • Non-destructive
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Row Selection Preview Table */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-brand-navy-900">
                    <CheckSquare className="w-4 h-4 text-brand-teal" />
                    Select Records for Verification
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose up to 20 records from your working dataset to submit for research.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectCount(5)}
                    className="h-7 text-[11px] text-slate-600 px-2"
                  >
                    First 5
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectCount(10)}
                    className="h-7 text-[11px] text-slate-600 px-2"
                  >
                    First 10
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    className="h-7 text-[11px] text-slate-600 px-2"
                  >
                    Max (20)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                    className="h-7 text-[11px] text-slate-500 px-2"
                  >
                    Clear
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-y border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-3 w-10 text-center">Select</th>
                      <th className="py-2.5 px-3 w-16">Row #</th>
                      <th className="py-2.5 px-3 font-semibold text-brand-navy-900">
                        {targetColumn || 'Target Field'}
                      </th>
                      {contextColumn && (
                        <th className="py-2.5 px-3 text-slate-600">{contextColumn}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row, idx) => {
                      const rowNum = idx + 1;
                      const isSelected = selectedRowIndices.includes(rowNum);
                      const targetVal = String(row[targetColumn] ?? '');
                      const contextVal = contextColumn ? String(row[contextColumn] ?? '') : null;

                      return (
                        <tr
                          key={rowNum}
                          onClick={() => toggleRow(rowNum)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-brand-navy-50/50 hover:bg-brand-navy-50'
                              : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by row onClick
                              className="w-3.5 h-3.5 text-brand-teal rounded border-slate-300 focus:ring-brand-teal cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-500">#{rowNum}</td>
                          <td className="py-2 px-3 font-medium text-slate-800 max-w-xs truncate">
                            {targetVal || <span className="text-slate-400 italic">(blank)</span>}
                          </td>
                          {contextColumn && (
                            <td className="py-2 px-3 text-slate-600 max-w-xs truncate">
                              {contextVal || <span className="text-slate-400 italic">(blank)</span>}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* STEP 3: Verification Results Section */}
          {verificationResults.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-brand-navy-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-brand-teal" />
                    Verification Evidence Audit ({verificationResults.length})
                  </h3>
                  {verificationMessage && (
                    <p className="text-xs text-slate-500 mt-0.5">{verificationMessage}</p>
                  )}
                </div>
              </div>

              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <div className="text-xs text-slate-500 font-medium">Supported by Evidence</div>
                  <div className="text-xl font-bold text-emerald-600 mt-1">{metrics.supported}</div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <div className="text-xs text-slate-500 font-medium">Conflicting Evidence</div>
                  <div className="text-xl font-bold text-rose-600 mt-1">{metrics.conflicting}</div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <div className="text-xs text-slate-500 font-medium">Needs Manual Review</div>
                  <div className="text-xl font-bold text-amber-600 mt-1">{metrics.manualReview}</div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <div className="text-xs text-slate-500 font-medium">Unable / Unconfigured</div>
                  <div className="text-xl font-bold text-slate-600 mt-1">
                    {metrics.unableOrUnconfigured}
                  </div>
                </div>
              </div>

              {/* Filtering Toolbar */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs p-1 rounded border border-slate-200 bg-white"
                    >
                      <option value="all">All Outcomes ({metrics.total})</option>
                      <option value="supported_by_evidence">Supported ({metrics.supported})</option>
                      <option value="conflicting_evidence">Conflicting ({metrics.conflicting})</option>
                      <option value="needs_manual_review">Needs Review ({metrics.manualReview})</option>
                      <option value="unable_to_verify">Unable to Verify</option>
                      <option value="not_configured">Not Configured</option>
                    </select>
                  </div>

                  {/* Manual Assessment Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">Reviewer:</span>
                    <select
                      value={assessmentFilter}
                      onChange={(e) => setAssessmentFilter(e.target.value)}
                      className="text-xs p-1 rounded border border-slate-200 bg-white"
                    >
                      <option value="all">All Assessments</option>
                      <option value="verified">Verified</option>
                      <option value="flagged">Flagged</option>
                      <option value="dismissed">Dismissed</option>
                      <option value="unreviewed">Unreviewed Only</option>
                    </select>
                  </div>
                </div>

                {/* Search Filter */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search claims, domains, or snippets..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                  />
                </div>
              </div>

              {/* Result Cards List */}
              {filteredResults.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="font-semibold text-slate-700">No matching claims found</div>
                  <p className="text-xs text-slate-500">
                    Try adjusting your status or search filters above.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredResults.map((item) => (
                    <EvidenceCard
                      key={item.claim_id}
                      item={item}
                      sessionId={sessionId}
                      onRecordAssessment={handleRecordAssessment}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Provider Setup & Instructions Modal */}
      <ProviderSetupModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        statusData={providerStatus}
      />
    </div>
  );
};
