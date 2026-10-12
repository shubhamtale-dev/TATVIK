import React, { useState } from 'react';
import { AlertCircle, ShieldAlert, FileSpreadsheet, RotateCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FileUploader } from '../components/datasets/FileUploader';
import { DatasetPreviewTable } from '../components/datasets/DatasetPreviewTable';
import { QualityReportView } from '../components/quality/QualityReportView';
import { uploadDatasetPreview, analyzeDatasetQuality } from '../lib/api';
import { DatasetPreviewData, QualityAnalysisResult } from '../types';

export const DatasetsPage: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<DatasetPreviewData | null>(null);
  const [qualityReport, setQualityReport] = useState<QualityAnalysisResult | null>(null);
  const [activeView, setActiveView] = useState<'preview' | 'quality'>('preview');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentFile(file);

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
              Dataset Upload & Quality Engine
            </h2>
            <Badge variant="teal" size="sm">
              Part 3 Active
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Upload business CSV and Excel spreadsheets to inspect raw schemas and run rule-based quality audits.
          </p>
        </div>

        {/* Header Action Controls */}
        {previewData && (
          <div className="flex items-center gap-2">
            {/* View switcher pills if both preview and quality report exist */}
            {qualityReport && (
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setActiveView('preview')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeView === 'preview'
                      ? 'bg-white text-brand-navy-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1" />
                  Preview
                </button>
                <button
                  onClick={() => setActiveView('quality')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeView === 'quality'
                      ? 'bg-white text-brand-navy-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 inline mr-1 text-brand-teal-600" />
                  Quality Audit ({qualityReport.total_issues_detected})
                </button>
              </div>
            )}

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
        )}
      </div>

      {/* Main Content Area */}
      {previewData ? (
        activeView === 'quality' && qualityReport ? (
          <QualityReportView
            report={qualityReport}
            onReset={handleReset}
            onViewPreview={() => setActiveView('preview')}
          />
        ) : (
          <div className="space-y-4">
            {/* Banner encouraging quality analysis if not run yet */}
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
          {/* File Uploader */}
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
                  <CardTitle>Supported File Specifications & Quality Rules</CardTitle>
                  <Badge variant="neutral" size="sm">
                    In-Memory Pipeline
                  </Badge>
                </div>
                <CardDescription>
                  TATVIK parses your spreadsheet in-memory, extracts schema metadata, and scans for quality defects without database persistence.
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

              <div className="mt-5 p-4 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-3 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold mb-0.5">Zero Data Retention & Confidentiality</p>
                  <p className="text-amber-700 leading-relaxed">
                    Uploaded file contents are audited strictly in-memory and discarded upon response. No cell values are logged, and formula macros are prevented from executing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
