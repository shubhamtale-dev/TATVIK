import React, { useMemo, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Copy,
  FileCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Layers,
  ArrowRight,
  Sliders,
  Filter,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { QualityAnalysisResult, QualityIssueItem } from '../../types';
import { formatNumber } from '../../lib/utils';

interface QualityReportViewProps {
  report: QualityAnalysisResult;
  onReset: () => void;
  onViewPreview?: () => void;
}

export const QualityReportView: React.FC<QualityReportViewProps> = ({
  report,
  onReset,
  onViewPreview,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  // Score color formatting
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 80) return 'text-brand-teal-700 bg-brand-teal-50 border-brand-teal-200';
    if (score >= 70) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const getSeverityBadge = (severity: QualityIssueItem['severity']) => {
    switch (severity) {
      case 'high':
        return <Badge variant="danger" size="sm">High</Badge>;
      case 'medium':
        return <Badge variant="warning" size="sm">Medium</Badge>;
      case 'low':
        return <Badge variant="info" size="sm">Low</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Info</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'duplicates':
        return <Copy className="w-3.5 h-3.5 text-rose-600" />;
      case 'missing_values':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
      case 'invalid_formats':
        return <FileCheck className="w-3.5 h-3.5 text-sky-600" />;
      case 'inconsistent_values':
        return <Sliders className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  // Filter issues
  const filteredIssues = useMemo(() => {
    return report.issues.filter((issue) => {
      // Category filter
      if (selectedCategory !== 'all' && issue.category !== selectedCategory) {
        return false;
      }
      // Severity filter
      if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const colMatch = issue.column_name?.toLowerCase().includes(query) ?? false;
        const typeMatch = issue.issue_type.toLowerCase().includes(query);
        const expMatch = issue.explanation.toLowerCase().includes(query);
        const valMatch = String(issue.current_value ?? '').toLowerCase().includes(query);
        return colMatch || typeMatch || expMatch || valMatch;
      }
      return true;
    });
  }, [report.issues, selectedCategory, selectedSeverity, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / pageSize));
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIssues.slice(start, start + pageSize);
  }, [filteredIssues, currentPage, pageSize]);

  // Export JSON of issues
  const handleExportIssuesJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(report, null, 2)
    )}`;
    const anchor = document.createElement('a');
    anchor.setAttribute('href', jsonString);
    anchor.setAttribute('download', `${report.filename}_quality_report.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const categories = [
    { id: 'all', label: 'All Issues', count: report.total_issues_detected },
    { id: 'duplicates', label: 'Duplicates', count: report.category_counts['duplicates'] || 0 },
    { id: 'missing_values', label: 'Missing Values', count: report.category_counts['missing_values'] || 0 },
    { id: 'invalid_formats', label: 'Invalid Formats', count: report.category_counts['invalid_formats'] || 0 },
    { id: 'inconsistent_values', label: 'Inconsistent Text', count: report.category_counts['inconsistent_values'] || 0 },
    { id: 'empty_structures', label: 'Empty Structures', count: report.category_counts['empty_structures'] || 0 },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-teal-600" />
            <h3 className="text-lg font-bold text-brand-navy-900 tracking-tight">
              Data Quality Audit Report
            </h3>
            <Badge variant="teal" size="sm">
              {report.filename}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Evaluated {formatNumber(report.total_rows)} rows across {report.total_columns} columns ({formatNumber(report.total_cells)} total cells) using deterministic rule heuristics.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onViewPreview && (
            <Button variant="outline" size="sm" onClick={onViewPreview}>
              View Data Preview
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportIssuesJSON}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Audit JSON
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            Upload Another
          </Button>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Quality Score Card */}
        <Card className={`p-5 flex flex-col justify-between border ${getScoreColor(report.quality_score)}`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Quality Score
              </span>
              <Badge variant="neutral" size="sm">
                {report.score_grade}
              </Badge>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
              {report.quality_score}
              <span className="text-base font-semibold text-slate-500">/100</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/60">
            <button
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className="text-[11px] font-semibold text-brand-teal-800 hover:text-brand-teal-900 inline-flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              {showFormulaDetails ? 'Hide Score Formula' : 'Explain Score Formula'}
            </button>
            {showFormulaDetails && (
              <p className="text-[11px] text-slate-600 mt-1.5 leading-snug p-2 rounded bg-white/80 border border-slate-200">
                {report.scoring_formula_explanation}
              </p>
            )}
          </div>
        </Card>

        {/* Total Issues Card */}
        <Card className="p-5 flex flex-col justify-between bg-white border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Defect Flags
            </span>
            <div className="mt-2 text-3xl font-extrabold text-brand-navy-900">
              {formatNumber(report.total_issues_detected)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
            <span className="text-rose-600 font-semibold">{report.severity_counts['high'] || 0} High</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-600 font-semibold">{report.severity_counts['medium'] || 0} Med</span>
            <span className="text-slate-300">•</span>
            <span className="text-sky-600 font-semibold">{report.severity_counts['low'] || 0} Low</span>
          </div>
        </Card>

        {/* Special Columns Detected */}
        <Card className="p-5 flex flex-col justify-between bg-white border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Identified Field Types
            </span>
            <div className="mt-2 space-y-1">
              <div className="text-xs text-slate-700">
                <span className="font-semibold text-brand-navy-900">Email fields: </span>
                {report.detected_special_columns.email_columns.length > 0
                  ? report.detected_special_columns.email_columns.join(', ')
                  : 'None detected'}
              </div>
              <div className="text-xs text-slate-700">
                <span className="font-semibold text-brand-navy-900">Phone fields: </span>
                {report.detected_special_columns.phone_columns.length > 0
                  ? report.detected_special_columns.phone_columns.join(', ')
                  : 'None detected'}
              </div>
            </div>
          </div>
          <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Rule heuristics automatically targeted format checks.
          </p>
        </Card>

        {/* Cleanliness Summary */}
        <Card className="p-5 flex flex-col justify-between bg-white border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Clean Records Ratio
            </span>
            <div className="mt-2 text-3xl font-extrabold text-brand-teal-700">
              {Math.max(
                0,
                Math.round(
                  ((report.total_cells - report.total_issues_detected) /
                    Math.max(report.total_cells, 1)) *
                    100
                )
              )}%
            </div>
          </div>
          <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Unflagged data attributes across all evaluated rows.
          </p>
        </Card>
      </div>

      {/* Category Pills Bar */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              selectedCategory === cat.id
                ? 'bg-brand-navy text-white border-brand-navy shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {getCategoryIcon(cat.id)}
            <span>{cat.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                selectedCategory === cat.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Issues Table Card */}
      <Card>
        <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-brand-navy-900" />
              Detected Data Quality Anomalies
            </CardTitle>
            <CardDescription>
              Showing {filteredIssues.length} of {report.total_issues_detected} detected issues.
            </CardDescription>
          </div>

          {/* Severity & Search Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search issues..."
                className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-teal-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSeverity}
                onChange={(e) => {
                  setSelectedSeverity(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="high">High Severity</option>
                <option value="medium">Medium Severity</option>
                <option value="low">Low Severity</option>
              </select>
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none"
            >
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </CardHeader>

        {/* Issues List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-16 text-center">Row</th>
                <th className="py-2.5 px-3">Column</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Issue Type</th>
                <th className="py-2.5 px-3">Detected Value</th>
                <th className="py-2.5 px-3">Explanation</th>
                <th className="py-2.5 px-3">Suggested Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                    {report.total_issues_detected === 0 ? (
                      <div className="flex flex-col items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2 stroke-[1.5]" />
                        <span className="font-semibold text-slate-700">Pristine Dataset!</span>
                        <span className="text-slate-400 mt-0.5">No quality defects were flagged by the rule engine.</span>
                      </div>
                    ) : (
                      'No issues match the selected filter criteria.'
                    )}
                  </td>
                </tr>
              ) : (
                paginatedIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-center text-slate-500 font-medium bg-slate-50/40">
                      {issue.row_index !== null && issue.row_index !== undefined ? (
                        `#${issue.row_index}`
                      ) : (
                        <span className="text-[10px] text-slate-400 uppercase">Col</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-brand-navy-900 whitespace-nowrap">
                      {issue.column_name || 'Entire Row'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getSeverityBadge(issue.severity)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {issue.issue_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3 max-w-[140px] truncate">
                      {issue.current_value !== null && issue.current_value !== undefined ? (
                        <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-rose-700">
                          {String(issue.current_value)}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic font-mono">null</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs leading-snug">
                      {issue.explanation}
                    </td>
                    <td className="py-2.5 px-3 text-brand-teal-800 font-medium max-w-xs leading-snug">
                      {issue.suggested_action ? (
                        <div className="flex items-start gap-1">
                          <ArrowRight className="w-3 h-3 text-brand-teal-600 shrink-0 mt-0.5" />
                          <span>{issue.suggested_action}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredIssues.length > 0 && (
          <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * pageSize, filteredIssues.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-800">{filteredIssues.length}</span> issues
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2 py-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                Prev
              </Button>
              <span className="px-2 font-mono text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2 py-1 text-xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
