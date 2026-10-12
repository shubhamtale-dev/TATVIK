import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DemoDataNoticeProps {
  className?: string;
  message?: string;
}

export const DemoDataNotice: React.FC<DemoDataNoticeProps> = ({
  className,
  message = 'Demo Mode: Displayed figures and dataset records are illustrative sample values for Phase 1 interface preview.',
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-3.5 py-2 rounded-lg',
        'bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs',
        className
      )}
    >
      <Info className="w-4 h-4 text-amber-600 shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  );
};
