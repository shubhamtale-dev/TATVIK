import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  FileSpreadsheet,
  RotateCcw,
  Database,
  Search,
  Sparkles,
  FileCheck2,
  Trash2,
  Edit2,
  Plus,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FileUploader } from '../components/datasets/FileUploader';
import { DatasetPreviewTable } from '../components/datasets/DatasetPreviewTable';
import { QualityReportView } from '../components/quality/QualityReportView';
import { useAuth } from '../context/AuthContext';
import {
  uploadDatasetPreview,
  analyzeDatasetQuality,
  listUserDatasets,
  uploadPersistentDataset,
  renameUserDataset,
  deleteUserDataset,
  restoreDatasetSession,
} from '../lib/api';
import {
  DatasetPreviewData,
  QualityAnalysisResult,
  PersistentDatasetSummary,
} from '../types';

export const DatasetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<'saved' | 'upload'>('saved');

  // Persistent Datasets State
  const [savedDatasets, setSavedDatasets] = useState<PersistentDatasetSummary[]>([]);
  const [totalSaved, setTotalSaved] = useState<number>(0);
  const [isLoadingSaved, setIsLoadingSaved] = useState<boolean>(false);
  const [savedSearch, setSavedSearch] = useState<string>('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Rename Dialog State
  const [editingDataset, setEditingDataset] = useState<PersistentDatasetSummary | null>(null);
  const [editFilename, setEditFilename] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState<boolean>(false);

  // Delete Confirmation State
  const [deletingDataset, setDeletingDataset] = useState<PersistentDatasetSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Upload & Analysis State (Preserved from Parts 2 & 3)
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<DatasetPreviewData | null>(null);
  const [qualityReport, setQualityReport] = useState<QualityAnalysisResult | null>(null);
  const [activeView, setActiveView] = useState<'preview' | 'quality'>('preview');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch saved datasets when user is authenticated
  const fetchSavedDatasets = async (searchTerm: string = savedSearch) => {
    if (!user) return;
    setIsLoadingSaved(true);
    const res = await listUserDatasets({ search: searchTerm || undefined });
    setIsLoadingSaved(false);
    if (res.success && res.data) {
      setSavedDatasets(res.data.items);
      setTotalSaved(res.data.total);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavedDatasets();
    } else {
      setSavedDatasets([]);
      setTotalSaved(0);
    }
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSavedDatasets(savedSearch);
  };

  // Upload handler with persistence if user is logged in
  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentFile(file);

    if (user) {
      // Authenticated user: persist to database
      const persistRes = await uploadPersistentDataset(file);
      if (persistRes.success && persistRes.data) {
        // Also fetch preview representation
        const previewRes = await uploadDatasetPreview(file, 50);
        setIsLoading(false);
        if (previewRes.success && previewRes.data) {
          setPreviewData(previewRes.data);
          setActiveView('preview');
        }
        fetchSavedDatasets();
        return;
      }
    }

    // Unauthenticated guest user fallback: in-memory preview
    const result = await uploadDatasetPreview(file, 50);
    setIsLoading(false);
    if (result.success && result.data) {
      setPreviewData(result.data);
      setActiveView('preview');
    } else {
      setErrorMessage(result.error || 'Failed to upload and parse dataset.');
    }
  };

  const handleRunQualityAnalysis = async () => {
    if (!currentFile || isAnalyzing) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    const result = await analyzeDatasetQuality(currentFile);
    setIsAnalyzing(false);

    if (result.success && result.data) {
      setQualityReport(result.data);
      setActiveView('quality');
    } else {
      setErrorMessage(result.error || 'Failed to run quality analysis.');
    }
  };

  const handleReset = () => {
    setCurrentFile(null);
    setPreviewData(null);
    setQualityReport(null);
    setErrorMessage(null);
    setActiveView('preview');
  };

  // Actions on persistent datasets
  const handleOpenInReview = async (dataset: PersistentDatasetSummary) => {
    setRestoringId(dataset.id);
    const res = await restoreDatasetSession(dataset.id);
    setRestoringId(null);
    if (res.success && res.data) {
      navigate(`/review?session_id=${res.data.session_id}`);
    } else {
      alert(res.error || 'Failed to restore dataset review session.');
    }
  };

  const handleOpenInVerification = async (dataset: PersistentDatasetSummary) => {
    setRestoringId(dataset.id);
    const res = await restoreDatasetSession(dataset.id);
    setRestoringId(null);
    if (res.success && res.data) {
      navigate(`/verification?session_id=${res.data.session_id}`);
    } else {
      alert(res.error || 'Failed to restore dataset verification session.');
    }
  };

  const handleSaveRename = async () => {
    if (!editingDataset || !editFilename.trim()) return;
    setIsRenaming(true);
    const res = await renameUserDataset(editingDataset.id, editFilename.trim());
    setIsRenaming(false);
    if (res.success) {
      setEditingDataset(null);
      fetchSavedDatasets();
    } else {
      alert(res.error || 'Failed to rename dataset.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDataset) return;
    setIsDeleting(true);
    const res = await deleteUserDataset(deletingDataset.id);
    setIsDeleting(false);
    if (res.success) {
      setDeletingDataset(null);
      fetchSavedDatasets();
    } else {
      alert(res.error || 'Failed to delete dataset.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getGradeVariant = (grade?: string | null): 'success' | 'teal' | 'warning' | 'danger' | 'neutral' => {
    switch (grade) {
      case 'A':
        return 'success';
      case 'B':
        return 'teal';
      case 'C':
        return 'warning';
      case 'D':
      case 'F':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const supportedFormats = [
    {
      ext: '.CSV / .TSV',
      name: 'Delimited Plaintext',
      desc: 'Comma, semicolon, or tab-delimited records. Handles UTF-8 and legacy encodings.',
      badge: 'Active Parser',
    },
    {
      ext: '.XLSX',
      name: 'Modern Excel Workbook',
      desc: 'Microsoft Excel OpenXML spreadsheets parsed securely with openpyxl (first sheet preview).',
      badge: 'Active Parser',
    },
    {
      ext: '.XLS',
      name: 'Legacy Excel Binary',
      desc: 'Legacy Microsoft Excel binary documents (auto-conversion pipeline planned for Phase 4).',
      badge: 'Upcoming',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-brand-navy-900 tracking-tight">
              Dataset Management & Storage
            </h2>
            <Badge variant="teal" size="sm">
              Part 6 Active
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Persist spreadsheets, track quality scores, and maintain durable review & verification audits.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'saved'
                ? 'bg-white text-brand-navy-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Saved Datasets</span>
            {user && totalSaved > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-brand-teal-100 text-brand-teal-800 font-bold">
                {totalSaved}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-brand-navy-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload New</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SAVED PERSISTENT DATASETS */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {!user ? (
            /* Unauthenticated Prompt */
            <Card className="border-dashed border-2 border-slate-300 bg-gradient-to-b from-slate-50 to-white">
              <CardContent className="py-12 px-6 text-center max-w-lg mx-auto space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-navy-100 text-brand-navy-800 flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-7 h-7 text-brand-navy-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-navy-900">
                    Sign In to Access Persistent Datasets
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Log in with Supabase Authentication to store your datasets, maintain working copies with applied corrections, and access research verification evidence across sessions.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button variant="primary" size="md" onClick={openAuthModal}>
                    Sign In or Create Account
                  </Button>
                  <Button variant="secondary" size="md" onClick={() => setActiveTab('upload')}>
                    Upload Dataset as Guest
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Authenticated User Dataset List */
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={savedSearch}
                    onChange={(e) => setSavedSearch(e.target.value)}
                    placeholder="Search by filename..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal-500/20 focus:border-brand-teal-500"
                  />
                </form>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => fetchSavedDatasets()}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Refresh dataset list"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingSaved ? 'animate-spin' : ''}`} />
                  </button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('upload')}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Upload Dataset
                  </Button>
                </div>
              </div>

              {/* Datasets Table */}
              {isLoadingSaved ? (
                <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-teal-600 mb-2" />
                  Loading your saved datasets...
                </div>
              ) : savedDatasets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center space-y-3">
                    <Database className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-semibold text-slate-700">No Saved Datasets Found</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {savedSearch
                        ? `No datasets match '${savedSearch}'. Clear the search to view all datasets.`
                        : 'Upload your first CSV or XLSX spreadsheet to store it in durable database storage.'}
                    </p>
                    <Button variant="primary" size="sm" onClick={() => setActiveTab('upload')} className="mt-2">
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Upload Dataset
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Filename</th>
                        <th className="py-3 px-3">Format</th>
                        <th className="py-3 px-3">Size</th>
                        <th className="py-3 px-3">Rows</th>
                        <th className="py-3 px-3">Columns</th>
                        <th className="py-3 px-3">Quality Score</th>
                        <th className="py-3 px-4">Uploaded</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {savedDatasets.map((ds) => (
                        <tr key={ds.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-brand-teal-600 shrink-0" />
                              <span className="font-semibold text-slate-800">{ds.filename}</span>
                              <button
                                onClick={() => {
                                  setEditingDataset(ds);
                                  setEditFilename(ds.filename);
                                }}
                                className="p-1 text-slate-300 hover:text-slate-600 transition-colors"
                                title="Rename dataset"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{ds.id}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                              {ds.file_type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                            {formatFileSize(ds.file_size_bytes)}
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium">
                            {ds.total_rows.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium">
                            {ds.total_columns}
                          </td>
                          <td className="py-3 px-3">
                            {ds.quality_score !== null && ds.quality_score !== undefined ? (
                              <div className="flex items-center gap-1.5">
                                <Badge variant={getGradeVariant(ds.score_grade)} size="sm">
                                  Grade {ds.score_grade || '—'}
                                </Badge>
                                <span className="font-mono text-[11px] text-slate-600">
                                  {ds.quality_score.toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Unanalyzed</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {new Date(ds.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenInReview(ds)}
                                isLoading={restoringId === ds.id}
                                title="Open in Correction Review workspace"
                              >
                                <Sparkles className="w-3.5 h-3.5 mr-1 text-brand-teal-600" />
                                Review
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenInVerification(ds)}
                                isLoading={restoringId === ds.id}
                                title="Open in Research Verification workspace"
                              >
                                <FileCheck2 className="w-3.5 h-3.5 mr-1 text-brand-saffron-600" />
                                Research
                              </Button>
                              <button
                                onClick={() => setDeletingDataset(ds)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete dataset"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPLOAD & PREVIEW & QUALITY ENGINE (Parts 2 & 3) */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {previewData ? (
            activeView === 'quality' && qualityReport ? (
              <QualityReportView
                report={qualityReport}
                onReset={handleReset}
                onViewPreview={() => setActiveView('preview')}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Views:</span>
                    <button
                      onClick={() => setActiveView('preview')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        activeView === 'preview'
                          ? 'bg-brand-navy-900 text-white font-semibold'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1" />
                      Preview
                    </button>
                    {qualityReport && (
                      <button
                        onClick={() => setActiveView('quality')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          activeView === 'quality'
                            ? 'bg-brand-navy-900 text-white font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 inline mr-1 text-brand-teal-400" />
                        Quality Audit ({qualityReport.total_issues_detected})
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!qualityReport && currentFile && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleRunQualityAnalysis}
                        isLoading={isAnalyzing}
                      >
                        <ShieldAlert className="w-4 h-4 mr-1.5" />
                        Analyze Quality
                      </Button>
                    )}
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      Upload Another
                    </button>
                  </div>
                </div>

                {!qualityReport && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-brand-teal-50/70 border border-brand-teal-200 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-brand-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-brand-navy-900 uppercase tracking-wider">
                          Run Rule-Based Data Quality Engine
                        </h4>
                        <p className="text-xs text-brand-teal-900 mt-0.5">
                          Audit this dataset for exact duplicate rows, email/phone format errors, missing fields, and capitalization inconsistencies.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRunQualityAnalysis}
                      isLoading={isAnalyzing}
                      className="shrink-0"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                      Analyze Dataset Quality
                    </Button>
                  </div>
                )}

                <DatasetPreviewTable data={previewData} onReset={handleReset} />
              </div>
            )
          ) : (
            <div className="space-y-6">
              <FileUploader
                onUpload={handleUpload}
                isLoading={isLoading}
                errorMessage={errorMessage}
                onClearError={() => setErrorMessage(null)}
              />

              {/* Supported Data Formats Specifications */}
              <Card>
                <CardHeader>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>Supported File Specifications & Storage Architecture</CardTitle>
                      <Badge variant={user ? 'teal' : 'neutral'} size="sm">
                        {user ? 'Durable PostgreSQL Storage' : 'In-Memory Pipeline'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {user
                        ? 'Uploaded spreadsheets are stored privately with compact 2D matrices and dual-copy versioning.'
                        : 'Guest uploads parse in-memory. Sign in to save datasets permanently.'}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {supportedFormats.map((fmt, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-brand-teal-700 bg-brand-teal-50 px-2 py-0.5 rounded border border-brand-teal-100">
                            {fmt.ext}
                          </span>
                          <Badge
                            variant={fmt.badge === 'Active Parser' ? 'success' : 'neutral'}
                            size="sm"
                          >
                            {fmt.badge}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-semibold text-brand-navy-900">
                          {fmt.name}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {fmt.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* RENAME DATASET MODAL */}
      {editingDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy-950/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-brand-navy-900">Rename Dataset</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Filename
              </label>
              <input
                type="text"
                value={editFilename}
                onChange={(e) => setEditFilename(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal-500/20 focus:border-brand-teal-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingDataset(null)}
                disabled={isRenaming}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveRename}
                isLoading={isRenaming}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy-950/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Dataset</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-slate-800">{deletingDataset.filename}</span>?
                This action will delete all stored copies, review decisions, and verification records.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeletingDataset(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
