import React, { useMemo, useState } from 'react';
import {
  Check,
  X,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Search,
  Filter,
  CheckSquare,
  Square,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SuggestionCard } from './SuggestionCard';
import { ApplyConfirmationModal } from './ApplyConfirmationModal';
import { WorkingPreviewModal } from './WorkingPreviewModal';
import { ReviewSessionDetailData } from '../../types';
import {
  decideSuggestion,
  bulkDecideSuggestions,
  applyApprovedChanges,
} from '../../lib/api';
import { formatNumber } from '../../lib/utils';

interface ReviewWorkspaceProps {
  session: ReviewSessionDetailData;
  onRefresh: () => Promise<void>;
  onResetSession: () => void;
}

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({
  session,
  onRefresh,
  onResetSession,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Eligible for selection/approval: auto-correctable and not yet applied
  const eligibleSuggestions = useMemo(() => {
    return session.suggestions.filter((s) => s.can_auto_correct && !s.applied);
  }, [session.suggestions]);

  // Filtered issues
  const filteredSuggestions = useMemo(() => {
    return session.suggestions.filter((s) => {
      // Status filter
      if (statusFilter === 'pending' && s.status !== 'pending') return false;
      if (statusFilter === 'approved' && s.status !== 'approved') return false;
      if (statusFilter === 'rejected' && s.status !== 'rejected') return false;
      if (statusFilter === 'applied' && !s.applied) return false;
      if (statusFilter === 'auto_correctable' && !s.can_auto_correct) return false;
      if (statusFilter === 'manual' && s.can_auto_correct) return false;

      // Category filter
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;

      // Severity filter
      if (severityFilter !== 'all' && s.severity !== severityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCol = s.column_name?.toLowerCase().includes(q) ?? false;
        const matchesId = s.issue_id.toLowerCase().includes(q);
        const matchesReason = s.reason.toLowerCase().includes(q);
        const matchesOrig = String(s.original_value ?? '').toLowerCase().includes(q);
        const matchesProp = String(s.proposed_value ?? '').toLowerCase().includes(q);
        return matchesCol || matchesId || matchesReason || matchesOrig || matchesProp;
      }

      return true;
    });
  }, [session.suggestions, statusFilter, categoryFilter, severityFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSuggestions.length / pageSize));
  const paginatedSuggestions = filteredSuggestions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Selection handlers
  const handleToggleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAllEligible = () => {
    const allEligibleIds = new Set(eligibleSuggestions.map((s) => s.issue_id));
    setSelectedIds(allEligibleIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Single Decision
  const handleDecideSingle = async (
    issueId: string,
    decision: 'approve' | 'reject' | 'reset'
  ) => {
    const res = await decideSuggestion(session.session_id, issueId, decision);
    if (res.success) {
      await onRefresh();
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.error || 'Failed to update suggestion status.',
      });
    }
  };

  // Bulk Decisions
  const handleBulkDecide = async (decision: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    setFeedbackMessage(null);

    const idsArray = Array.from(selectedIds);
    const res = await bulkDecideSuggestions(session.session_id, idsArray, decision);

    setIsBulkProcessing(false);
    if (res.success) {
      const updatedCount = res.data?.updated_count || 0;
      setFeedbackMessage({
        type: 'success',
        text: `Successfully ${decision === 'approve' ? 'approved' : 'rejected'} ${updatedCount} selected item(s).`,
      });
      setSelectedIds(new Set());
      await onRefresh();
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.error || 'Failed to process bulk review update.',
      });
    }
  };

  // Apply Changes
  const handleApplyChanges = async () => {
    setIsApplying(true);
    setFeedbackMessage(null);

    const res = await applyApprovedChanges(session.session_id);

    setIsApplying(false);
    setShowApplyModal(false);

    if (res.success && res.data) {
      setFeedbackMessage({
        type: 'success',
        text: res.data.message || `Applied ${res.data.applied_count} correction(s) to working dataset!`,
      });
      await onRefresh();
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.error || 'Failed to apply approved changes.',
      });
    }
  };

  const unappliedApprovedCount = session.summary.approved_count - session.summary.applied_count;

  return (
    <div className="space-y-6">
      {/* Top Banner & Session Summary Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-brand-navy-900 tracking-tight">
                Review & Correction Approval Workspace
              </h3>
              <Badge variant="neutral" size="sm">
                Session: {session.session_id}
              </Badge>
              <Badge variant="teal" size="sm">
                In-Memory Working Copy
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              File: <strong className="text-slate-700">{session.filename}</strong> &bull; {formatNumber(session.total_rows)} Rows &bull; {session.total_columns} Columns &bull; Initial Quality Score: <strong>{session.summary.quality_score}% ({session.summary.score_grade})</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewModal(true)}
              className="text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <Eye className="w-4 h-4 mr-1.5 text-brand-teal-600" />
              View Working Dataset ({session.summary.applied_count} edits)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowApplyModal(true)}
              disabled={unappliedApprovedCount === 0 || isApplying}
              className="bg-brand-teal-600 hover:bg-brand-teal-700 text-white"
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Apply Approved Changes ({unappliedApprovedCount})
            </Button>
            <Button variant="ghost" size="sm" onClick={onResetSession} title="Upload a different file">
              <RotateCcw className="w-4 h-4 mr-1.5 text-slate-400" />
              New File
            </Button>
          </div>
        </div>

        {/* Dynamic Metric Counter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Flagged</div>
            <div className="text-lg font-bold text-slate-800 mt-0.5">{session.summary.total_issues}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200">
            <div className="text-[11px] text-amber-700 uppercase font-semibold">Pending Review</div>
            <div className="text-lg font-bold text-amber-900 mt-0.5">{session.summary.pending_count}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
            <div className="text-[11px] text-emerald-700 uppercase font-semibold">Approved (Staged)</div>
            <div className="text-lg font-bold text-emerald-900 mt-0.5">{session.summary.approved_count}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200">
            <div className="text-[11px] text-rose-700 uppercase font-semibold">Rejected</div>
            <div className="text-lg font-bold text-rose-900 mt-0.5">{session.summary.rejected_count}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-200">
            <div className="text-[11px] text-teal-700 uppercase font-semibold">Applied to Copy</div>
            <div className="text-lg font-bold text-teal-900 mt-0.5">{session.summary.applied_count}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-200">
            <div className="text-[11px] text-sky-700 uppercase font-semibold">Auto-Correctable</div>
            <div className="text-lg font-bold text-sky-900 mt-0.5">{session.summary.auto_correctable_count}</div>
          </div>
        </div>
      </div>

      {/* Dismissible Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-lg flex items-center justify-between gap-3 text-xs ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs"
          >
            &times;
          </button>
        </div>
      )}

      {/* Review Filter & Bulk Action Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3.5">
          {/* Top Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap gap-1 text-xs">
              {[
                { id: 'all', label: `All (${session.summary.total_issues})` },
                { id: 'pending', label: `Pending (${session.summary.pending_count})` },
                { id: 'approved', label: `Approved (${session.summary.approved_count})` },
                { id: 'rejected', label: `Rejected (${session.summary.rejected_count})` },
                { id: 'applied', label: `Applied (${session.summary.applied_count})` },
                { id: 'auto_correctable', label: `Auto-Correctable (${session.summary.auto_correctable_count})` },
                { id: 'manual', label: `Manual Only (${session.summary.manual_review_count})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-brand-teal-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Bulk Selection Controls */}
            {eligibleSuggestions.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                {selectedIds.size === 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllEligible}
                    className="text-xs text-slate-600"
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    Select All Auto-Correctable ({eligibleSuggestions.length})
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="text-xs text-slate-500"
                    >
                      <Square className="w-3.5 h-3.5 mr-1" />
                      Clear Selection ({selectedIds.size})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkDecide('approve')}
                      disabled={isBulkProcessing}
                      className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Approve Selected ({selectedIds.size})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkDecide('reject')}
                      disabled={isBulkProcessing}
                      className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                    >
                      <X className="w-3.5 h-3.5 mr-1 text-rose-600" />
                      Reject Selected ({selectedIds.size})
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Secondary Filters: Category, Severity, Search */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by column, value, reason, issue ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-teal-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-md border border-slate-200 py-1.5 px-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-teal-500"
              >
                <option value="all">All Issue Categories</option>
                <option value="inconsistent_values">Inconsistent Values (Whitespace & Casing)</option>
                <option value="invalid_formats">Invalid Formats (Email & Phone)</option>
                <option value="missing_values">Missing Values & Sentinels</option>
                <option value="duplicates">Duplicates & Collisions</option>
                <option value="empty_structures">Empty Rows & Columns</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-md border border-slate-200 py-1.5 px-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-teal-500"
              >
                <option value="all">All Severities</option>
                <option value="high">High Severity</option>
                <option value="medium">Medium Severity</option>
                <option value="low">Low Severity</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestion List Cards */}
      <div className="space-y-3">
        {paginatedSuggestions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No matching issues found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No issues match the selected filter criteria. Try clearing the search query or selecting a different status tab.
            </p>
          </div>
        ) : (
          paginatedSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.issue_id}
              suggestion={suggestion}
              isSelected={selectedIds.has(suggestion.issue_id)}
              onSelect={(checked) => handleToggleSelect(suggestion.issue_id, checked)}
              onDecide={(decision) => handleDecideSingle(suggestion.issue_id, decision)}
            />
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1 py-2">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredSuggestions.length)} of{' '}
            {filteredSuggestions.length} filtered issues
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Previous
            </Button>
            <span className="px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Apply Confirmation Modal */}
      {showApplyModal && (
        <ApplyConfirmationModal
          isOpen={showApplyModal}
          onClose={() => setShowApplyModal(false)}
          onConfirm={handleApplyChanges}
          approvedCount={unappliedApprovedCount}
          isApplying={isApplying}
          filename={session.filename}
        />
      )}

      {/* Working Dataset Preview Modal */}
      {showPreviewModal && (
        <WorkingPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          sessionId={session.session_id}
        />
      )}
    </div>
  );
};
