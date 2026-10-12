import React from 'react';
import { ShieldAlert, AlertCircle, Copy, FileWarning, Layers } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { QualityCategory } from '../../types';

interface QualityOverviewProps {
  categories: QualityCategory[];
}

export const QualityOverview: React.FC<QualityOverviewProps> = ({ categories }) => {
  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'missing':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'duplicates':
        return <Copy className="w-4 h-4 text-rose-500" />;
      case 'formats':
        return <FileWarning className="w-4 h-4 text-sky-500" />;
      case 'inconsistencies':
        return <Layers className="w-4 h-4 text-purple-500" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-slate-500" />;
    }
  };

  const getBarColor = (id: string) => {
    switch (id) {
      case 'missing':
        return 'bg-amber-500';
      case 'duplicates':
        return 'bg-rose-500';
      case 'formats':
        return 'bg-sky-500';
      case 'inconsistencies':
        return 'bg-purple-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="bg-slate-50/60">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Data Quality Overview</CardTitle>
            <Badge variant="neutral" size="sm">
              Illustrative Sample
            </Badge>
          </div>
          <CardDescription>
            Categorical breakdown of potential data defects flagged during validation.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {categories.map((cat) => (
          <div key={cat.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                {getCategoryIcon(cat.id)}
                <span>{cat.label}</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-semibold text-slate-900">{cat.count} issues</span>
                <span className="text-slate-400">({cat.percentage}%)</span>
              </div>
            </div>

            {/* Accessible Progress Bar */}
            <div
              className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"
              role="progressbar"
              aria-valuenow={cat.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${cat.label}: ${cat.count} issues`}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColor(cat.id)}`}
                style={{ width: `${cat.percentage}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">{cat.description}</p>
          </div>
        ))}

        <div className="mt-4 p-3 rounded-lg bg-brand-teal-50/60 border border-brand-teal-200/60 text-xs text-brand-teal-900">
          <p className="font-semibold mb-0.5">Automated Heuristic Engine (Phase 3)</p>
          <p className="text-[11px] text-brand-teal-700 leading-relaxed">
            Phase 3 will deploy rule-based deduplication and regex schema matching to generate live quality scores.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
