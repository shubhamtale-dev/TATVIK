import React from 'react';
import { Sparkles, Calendar, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  phaseTarget: string;
  description: string;
  plannedCapabilities?: string[];
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({
  isOpen,
  onClose,
  featureName,
  phaseTarget,
  description,
  plannedCapabilities = [],
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={featureName}
      description="Feature Roadmap Status"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="saffron" size="md">
            <Calendar className="w-3.5 h-3.5 text-brand-saffron-600" />
            Scheduled for {phaseTarget}
          </Badge>
          <Badge variant="info" size="md">
            Under Active Design
          </Badge>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          {description}
        </p>

        {plannedCapabilities.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-teal-600" />
              Planned Capabilities
            </h4>
            <ul className="space-y-1.5">
              {plannedCapabilities.map((cap, index) => (
                <li key={index} className="text-xs text-slate-700 flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-brand-teal-500 mt-0.5 shrink-0" />
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button variant="primary" size="md" onClick={onClose}>
            Understood
          </Button>
        </div>
      </div>
    </Modal>
  );
};
