import React from 'react';
import { ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ApplyConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  approvedCount: number;
  isApplying: boolean;
  filename: string;
}

export const ApplyConfirmationModal: React.FC<ApplyConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  approvedCount,
  isApplying,
  filename,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Application of Approved Corrections"
      description="Apply staged decisions to active working copy"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-teal-900">
              Apply {approvedCount} Approved Modification{approvedCount === 1 ? '' : 's'}
            </h4>
            <p className="text-xs text-teal-700 mt-0.5 leading-relaxed">
              These approved suggestions will be written into the in-memory working dataset for{' '}
              <span className="font-semibold">{filename}</span>.
            </p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div className="font-semibold text-slate-700 flex items-center gap-1.5 pb-1 border-b border-slate-200">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
            Safety & Data Integrity Guarantees
          </div>
          <ul className="space-y-1.5 pt-1 text-slate-600">
            <li className="flex items-start gap-1.5">
              <ArrowRight className="w-3 h-3 text-brand-teal-600 mt-0.5 shrink-0" />
              <span><strong>Original dataset remains unchanged:</strong> The raw uploaded file copy is preserved in pristine condition.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ArrowRight className="w-3 h-3 text-brand-teal-600 mt-0.5 shrink-0" />
              <span><strong>Rejections preserved:</strong> Rejected suggestions are completely bypassed and leave values unchanged.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ArrowRight className="w-3 h-3 text-brand-teal-600 mt-0.5 shrink-0" />
              <span><strong>Audit logged:</strong> Every cell edit is recorded with previous and new values in the session history.</span>
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isLoading={isApplying}
            className="bg-brand-teal-600 hover:bg-brand-teal-700 text-white"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            Confirm & Apply {approvedCount} Change{approvedCount === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
