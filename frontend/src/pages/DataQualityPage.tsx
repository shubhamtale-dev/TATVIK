import React, { useState } from 'react';
import {
  Copy,
  AlertCircle,
  FileCheck,
  Sliders,
  RotateCcw,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FileUploader } from '../components/datasets/FileUploader';
import { QualityReportView } from '../components/quality/QualityReportView';
import { analyzeDatasetQuality } from '../lib/api';
import { QualityAnalysisResult } from '../types';

export const DataQualityPage: React.FC = () => {
  const [qualityReport, setQualityReport] = useState<QualityAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setIsAnalyzing(true);
    setErrorMessage(null);

    const result = await analyzeDatasetQuality(file);

    setIsAnalyzing(false);
    if (result.success && result.data) {
      setQualityReport(result.data);
    } else {
      setErrorMessage(result.error || 'Failed to complete dataset quality analysis.');
    }
  };

  const handleReset = () => {
    setQualityReport(null);
    setErrorMessage(null);
  };

  const engineRules = [
    {
      id: 'duplicates',
      title: 'Duplicate Row & Identifier Detection',
      icon: Copy,
      severity: 'high',
      description:
        'Scans for exact identical row tuples and flags potential collisions across primary identifier columns (email, phone, id, uuid).',
      formula: 'Exact subset tuple matching & case-insensitive identifier group hash',
      badgeText: 'Exact & Identifier',
    },
    {
      id: 'missing',
      title: 'Missing & Blank Sentinel Scanner',
      icon: AlertCircle,
      severity: 'high',
      description:
        'Detects null values, empty strings, whitespace-only records, and sentinel string equivalents (N/A, NA, none, null, -, ?).',
      formula: 'Null-byte & whitespace trimming + case-insensitive sentinel set lookup',
      badgeText: 'Sentinel & Whitespace',
    },
    {
      id: 'formats',
      title: 'Email & Phone Format Validation',
      icon: FileCheck,
      severity: 'medium',
      description:
        'Validates RFC 5322 email syntax and conservative 7-15 digit international phone formats on detected identifier columns.',
      formula: 'Regex RFC 5322 pattern + conservative digit extraction (7-15 digits)',
      badgeText: 'Format Rules',
    },
    {
      id: 'inconsistencies',
      title: 'Text Inconsistencies & Casing Discrepancies',
      icon: Sliders,
      severity: 'low',
      description:
        'Surfaces unstripped leading/trailing whitespaces and capitalization variations across text values as actionable suggestions.',
      formula: 'Normalized string frequency analysis & whitespace boundary check',
      badgeText: 'Casing & Trim',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-brand-navy-900 tracking-tight">
              Data Quality Engine
            </h2>
            <Badge variant="teal" size="md">
              Part 3 Live Engine
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic rule-based heuristics & anomaly detection for enterprise CSV and Excel spreadsheets.
          </p>
        </div>

        {qualityReport && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Analyze Another File
            </Button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-800">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-rose-900">Analysis Error</h4>
            <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 hover:bg-rose-100/50 p-1 h-auto"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main View: Report or Upload Form */}
      {qualityReport ? (
        <QualityReportView report={qualityReport} onReset={handleReset} />
      ) : (
        <div className="space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Upload Dataset for Instant Quality Audit</CardTitle>
                <CardDescription>
                  Select or drop a CSV or XLSX file (up to 10 MB). The engine will parse and execute all 7 deterministic checks in-memory without saving data to disk.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <FileUploader
                onUpload={handleFileSelected}
                isLoading={isAnalyzing}
                errorMessage={errorMessage}
                onClearError={() => setErrorMessage(null)}
              />
            </CardContent>
          </Card>

          {/* Engine Rules Capabilities Grid */}
          <div>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-brand-navy-900">
                Rule-Based Detection Capabilities
              </h3>
              <p className="text-xs text-slate-500">
                Deterministic checks implemented in the Part 3 FastAPI backend service.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {engineRules.map((rule) => {
                const IconComponent = rule.icon;
                return (
                  <Card key={rule.id} hoverable className="p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-navy-50 text-brand-navy-800 flex items-center justify-center border border-brand-navy-100">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <Badge
                          variant={rule.severity === 'high' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {rule.badgeText}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-semibold text-brand-navy-900">{rule.title}</h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        {rule.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-400">
                      Rule: {rule.formula}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Formula & Explainability Architecture Card */}
          <Card className="bg-slate-50/70 border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-teal-50 text-brand-teal-700 flex items-center justify-center border border-brand-teal-200 shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-brand-navy-900">
                    Transparent, Explainable Quality Score Formula
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    TATVIK calculates the dataset health score dynamically based on total cells examined and issue severities, strictly bounded between 0.0 and 100.0:
                  </p>
                  <div className="bg-white p-3 rounded-md border border-slate-200 font-mono text-xs text-slate-800 overflow-x-auto">
                    <code>
                      Defect_Rate = (3.0 * High_Issues + 1.5 * Medium_Issues + 0.5 * Low_Issues + 0.1 * Info_Issues) / Total_Cells
                      <br />
                      Quality_Score = round(max(0.0, 100.0 * (1.0 - min(1.0, Defect_Rate))), 1)
                    </code>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs text-slate-500">
                    <div>• <strong>Grade A:</strong> 90.0 – 100.0%</div>
                    <div>• <strong>Grade B:</strong> 80.0 – 89.9%</div>
                    <div>• <strong>Grade C:</strong> 70.0 – 79.9%</div>
                    <div>• <strong>Grade D/F:</strong> &lt; 70.0%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
