import React from 'react';
import {
  Check,
  X,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CorrectionSuggestionItem } from '../../types';

interface SuggestionCardProps {
  suggestion: CorrectionSuggestionItem;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onDecide: (decision: 'approve' | 'reject' | 'reset') => Promise<void>;
  isUpdating?: boolean;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  isSelected,
  onSelect,
  onDecide,
  isUpdating = false,
}) => {
  const getSeverityBadge = (severity: CorrectionSuggestionItem['severity']) => {
    switch (severity) {
      case 'high':
        return <Badge variant="danger" size="sm">High Severity</Badge>;
      case 'medium':
        return <Badge variant="warning" size="sm">Medium</Badge>;
      case 'low':
        return <Badge variant="info" size="sm">Low</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Info</Badge>;
    }
  };

  const getStatusBadge = () => {
    if (suggestion.applied) {
      return (
        <Badge variant="teal" size="sm">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Applied to Working Copy
        </Badge>
      );
    }
    switch (suggestion.status) {
      case 'approved':
        return (
          <Badge variant="success" size="sm">
            <Check className="w-3 h-3 mr-1" />
            Approved (Staged)
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" size="sm">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="warning" size="sm">
            Pending Review
          </Badge>
        );
    }
  };

  const formatCellValue = (val: unknown) => {
    if (val === null || val === undefined) {
      return <span className="text-slate-400 italic font-sans">(empty / null)</span>;
    }
    const str = String(val);
    if (str.trim() === '') {
      return <span className="text-slate-400 italic font-sans">(&quot;{str}&quot; whitespace-only)</span>;
    }
    return <span>&quot;{str}&quot;</span>;
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-150 ${
        suggestion.applied
          ? 'bg-teal-50/20 border-teal-200'
          : suggestion.status === 'approved'
          ? 'bg-emerald-50/30 border-emerald-300 shadow-xs'
          : suggestion.status === 'rejected'
          ? 'bg-slate-50/60 border-slate-200 opacity-75'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
      }`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          {suggestion.can_auto_correct && !suggestion.applied && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(e.target.checked)}
              disabled={isUpdating}
              className="h-4 w-4 rounded border-slate-300 text-brand-teal-600 focus:ring-brand-teal-500 cursor-pointer"
              title="Select for bulk review action"
            />
          )}

          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            {suggestion.issue_id}
          </span>

          <span className="text-xs font-medium text-slate-500">
            {suggestion.row_index ? `Row #${suggestion.row_index}` : 'Column-wide'}
            {suggestion.column_name && (
              <>
                {' '}
                &bull; Column: <span className="font-semibold text-slate-700">{suggestion.column_name}</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {getSeverityBadge(suggestion.severity)}
          {getStatusBadge()}
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3.5">
        {/* Original Value */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Original Dataset Value</span>
            <span className="text-[10px] font-normal text-slate-400">Current</span>
          </div>
          <div className="font-mono text-xs text-rose-800 break-all py-1">
            {formatCellValue(suggestion.original_value)}
          </div>
        </div>

        {/* Proposed Value or Manual Review Requirement */}
        <div
          className={`p-3 rounded-lg border ${
            suggestion.can_auto_correct
              ? 'bg-emerald-50/60 border-emerald-200'
              : 'bg-amber-50/40 border-amber-200'
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className={suggestion.can_auto_correct ? 'text-emerald-800' : 'text-amber-800'}>
              {suggestion.can_auto_correct ? 'Proposed Correction' : 'Resolution Required'}
            </span>
            {suggestion.can_auto_correct ? (
              <span className="text-[10px] text-emerald-600 font-medium">Safe Heuristic</span>
            ) : (
              <span className="text-[10px] text-amber-600 font-medium">Manual Review</span>
            )}
          </div>

          {suggestion.can_auto_correct ? (
            <div className="font-mono text-xs text-emerald-900 break-all py-1 flex items-center gap-1.5 font-medium">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {formatCellValue(suggestion.proposed_value)}
            </div>
          ) : (
            <div className="text-xs text-amber-900 flex items-start gap-1.5 py-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>No automated replacement fabricated. Human domain verification required.</span>
            </div>
          )}
        </div>
      </div>

      {/* Explanation & Action footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
        <div className="space-y-0.5 max-w-xl">
          <p className="text-slate-600 font-medium">{suggestion.reason}</p>
          {suggestion.suggested_action && (
            <p className="text-slate-500 text-[11px]">
              <span className="font-semibold text-slate-600">Guidance: </span>
              {suggestion.suggested_action}
            </p>
          )}
        </div>

        {/* Decision Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {suggestion.applied ? (
            <span className="text-xs font-medium text-teal-700 flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              Applied to Working Copy
            </span>
          ) : suggestion.can_auto_correct ? (
            <>
              {suggestion.status === 'approved' ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled
                    className="bg-emerald-600 hover:bg-emerald-600 text-white cursor-default"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Approved
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDecide('reset')}
                    disabled={isUpdating}
                    title="Reset to Pending"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                </>
              ) : suggestion.status === 'rejected' ? (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled
                    className="cursor-default"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Rejected
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDecide('reset')}
                    disabled={isUpdating}
                    title="Reset to Pending"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDecide('approve')}
                    disabled={isUpdating}
                    className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400"
                  >
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDecide('reject')}
                    disabled={isUpdating}
                    className="text-rose-700 border-rose-300 hover:bg-rose-50 hover:border-rose-400"
                  >
                    <X className="w-3.5 h-3.5 mr-1 text-rose-600" />
                    Reject
                  </Button>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                Manual Edit in Phase 5
              </span>
              {suggestion.status !== 'rejected' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDecide('reject')}
                  disabled={isUpdating}
                  className="text-slate-500 hover:text-rose-700 text-xs px-2 py-1 h-auto"
                  title="Dismiss / Reject this warning"
                >
                  Dismiss
                </Button>
              ) : (
                <Badge variant="neutral" size="sm">
                  Dismissed
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
