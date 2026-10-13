import React, { useState } from 'react';
import {
  ShieldCheck,
  Globe,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  VerificationResultItemData,
  ManualAssessmentType,
} from '../../types';

interface EvidenceCardProps {
  item: VerificationResultItemData;
  sessionId?: string | null;
  onRecordAssessment?: (
    claimId: string,
    assessment: ManualAssessmentType,
    notes?: string
  ) => Promise<void>;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  item,
  sessionId,
  onRecordAssessment,
}) => {
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesInput, setNotesInput] = useState(item.manual_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'supported_by_evidence':
        return (
          <Badge variant="success" size="md" className="gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Supported by Evidence
          </Badge>
        );
      case 'conflicting_evidence':
        return (
          <Badge variant="danger" size="md" className="gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Conflicting Evidence
          </Badge>
        );
      case 'needs_manual_review':
        return (
          <Badge variant="warning" size="md" className="gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Needs Manual Review
          </Badge>
        );
      case 'unable_to_verify':
        return (
          <Badge variant="neutral" size="md" className="gap-1">
            <Clock className="w-3.5 h-3.5" />
            Unable to Verify
          </Badge>
        );
      case 'not_configured':
      default:
        return (
          <Badge variant="saffron" size="md" className="gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Provider Not Configured
          </Badge>
        );
    }
  };

  const getConfidencePill = (score?: number | null) => {
    if (score === null || score === undefined) {
      return (
        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          Confidence: Uncalculated
        </span>
      );
    }

    let color = 'text-slate-700 bg-slate-50 border-slate-200';
    if (score >= 80) {
      color = 'text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold';
    } else if (score >= 60) {
      color = 'text-amber-700 bg-amber-50 border-amber-200 font-medium';
    } else {
      color = 'text-rose-700 bg-rose-50 border-rose-200 font-medium';
    }

    return (
      <span className={`text-xs px-2 py-0.5 rounded border ${color}`}>
        Confidence: {Math.round(score)}%
      </span>
    );
  };

  const handleAssessment = async (assessment: ManualAssessmentType) => {
    if (!onRecordAssessment) return;
    try {
      setIsSubmitting(true);
      await onRecordAssessment(item.claim_id, assessment, notesInput.trim() || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all p-5 space-y-4">
      {/* Top Bar: Row Info, Column & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            Row #{item.row_index}
          </span>
          <span className="text-xs font-semibold text-brand-navy-900 bg-brand-navy-50 px-2 py-0.5 rounded border border-brand-navy-100">
            {item.column_name}
          </span>
          {item.context_column && (
            <span className="text-xs text-slate-600">
              via context: <strong className="text-slate-800">{item.context_column}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {getConfidencePill(item.confidence_score)}
          {getStatusBadge(item.status)}
        </div>
      </div>

      {/* Claim Statement */}
      <div className="bg-slate-50/70 rounded-lg p-3 border border-slate-200/80">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
          Verifiable Claim
        </div>
        <div className="text-sm font-semibold text-brand-navy-900 leading-snug">
          &ldquo;{item.claim_text}&rdquo;
        </div>
      </div>

      {/* Summary and Explanation */}
      <div className="space-y-1.5 text-xs text-slate-600">
        <p className="font-medium text-slate-800 leading-relaxed">
          {item.evidence_summary}
        </p>
        <p className="text-slate-600 leading-relaxed">
          {item.explanation}
        </p>

        {item.provider_warning && (
          <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2 mt-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{item.provider_warning}</span>
          </div>
        )}
      </div>

      {/* Grounded Citation Sources */}
      {item.sources && item.sources.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-navy-900">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-teal" />
              Retrieved Citations ({item.sources.length})
            </span>
            <span className="text-[11px] text-slate-600 font-normal">
              Retrieved: {new Date(item.retrieval_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="space-y-2">
            {item.sources.map((src, idx) => (
              <div
                key={idx}
                className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-brand-navy-800 hover:text-brand-teal inline-flex items-center gap-1 group transition-colors"
                  >
                    <span className="group-hover:underline">{src.title}</span>
                    <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-brand-teal shrink-0" />
                  </a>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      {src.domain}
                    </span>
                    {src.source_type === 'official' ? (
                      <Badge variant="teal" size="sm" className="gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Official Source
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Third-Party
                      </Badge>
                    )}
                  </div>
                </div>

                <blockquote className="text-xs text-slate-600 italic bg-slate-50/80 p-2 rounded border-l-2 border-brand-teal-400">
                  &ldquo;{src.snippet}&rdquo;
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Reviewer Assessment Section */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">Reviewer Assessment:</span>
          {item.manual_assessment ? (
            <Badge
              variant={
                item.manual_assessment === 'verified'
                  ? 'success'
                  : item.manual_assessment === 'flagged'
                  ? 'danger'
                  : 'neutral'
              }
              size="sm"
            >
              {item.manual_assessment.toUpperCase()}
            </Badge>
          ) : (
            <span className="text-xs text-slate-600 italic">Unreviewed</span>
          )}
        </div>

        {sessionId && onRecordAssessment && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={item.manual_assessment === 'verified' ? 'primary' : 'outline'}
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleAssessment('verified')}
              className="h-7 text-xs"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Verify
            </Button>

            <Button
              variant={item.manual_assessment === 'flagged' ? 'danger' : 'outline'}
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleAssessment('flagged')}
              className="h-7 text-xs"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Flag Concern
            </Button>

            <Button
              variant={item.manual_assessment === 'dismissed' ? 'secondary' : 'ghost'}
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleAssessment('dismissed')}
              className="h-7 text-xs text-slate-600"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Dismiss
            </Button>

            <button
              onClick={() => setIsNotesOpen(!isNotesOpen)}
              className="p-1 text-slate-600 hover:text-brand-navy-900 rounded hover:bg-slate-100 transition-colors ml-1"
              title="Add reviewer notes"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Reviewer Notes Expansion */}
      {isNotesOpen && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
          <label className="block font-semibold text-slate-700">
            Operator Audit Notes:
          </label>
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            placeholder="Record internal verification notes, telephone contact details, or cross-checks..."
            rows={2}
            className="w-full text-xs p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-teal"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNotesOpen(false)}
              className="h-6 text-[11px]"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => {
                if (item.manual_assessment) {
                  handleAssessment(item.manual_assessment);
                }
                setIsNotesOpen(false);
              }}
              className="h-6 text-[11px]"
            >
              Save Notes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
