import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  title: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  badgeLabel?: string;
  accentColor?: 'teal' | 'navy' | 'saffron' | 'rose';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  caption,
  icon: Icon,
  badgeLabel = 'Sample',
  accentColor = 'teal',
}) => {
  const iconColorMap = {
    teal: 'bg-brand-teal-50 text-brand-teal-600 border-brand-teal-100',
    navy: 'bg-brand-navy-50 text-brand-navy-800 border-brand-navy-100',
    saffron: 'bg-brand-saffron-50 text-brand-saffron-600 border-brand-saffron-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };

  return (
    <Card hoverable className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {title}
            </span>
            <Badge variant="neutral" size="sm">
              {badgeLabel}
            </Badge>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-brand-navy-900 tracking-tight">
            {value}
          </div>
        </div>
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs shrink-0',
            iconColorMap[accentColor]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
        {caption}
      </p>
    </Card>
  );
};
