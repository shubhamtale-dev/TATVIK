import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, ShieldAlert, FileSearch, History, ArrowUpRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface QuickActionsProps {
  onUploadClick: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onUploadClick }) => {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'upload',
      title: 'Import a Dataset',
      description: 'Upload CSV or Excel files for streaming parsing and validation.',
      icon: UploadCloud,
      badge: 'Phase 2',
      onClick: onUploadClick,
      color: 'text-brand-teal-600 bg-brand-teal-50 border-brand-teal-100',
    },
    {
      id: 'quality',
      title: 'Review Data Issues',
      description: 'Inspect duplicate detection, missing values, and format errors.',
      icon: ShieldAlert,
      badge: 'Interactive',
      onClick: () => navigate('/quality'),
      color: 'text-brand-navy-800 bg-brand-navy-50 border-brand-navy-100',
    },
    {
      id: 'verify',
      title: 'Verify Research Sources',
      description: 'Explore external evidence linking and source confidence scoring.',
      icon: FileSearch,
      badge: 'Preview',
      onClick: () => navigate('/verification'),
      color: 'text-sky-700 bg-sky-50 border-sky-100',
    },
    {
      id: 'audit',
      title: 'View Audit History',
      description: 'Examine immutable change logs and dataset inspection checkpoints.',
      icon: History,
      badge: 'Governance',
      onClick: () => navigate('/audit'),
      color: 'text-brand-saffron-700 bg-brand-saffron-50 border-brand-saffron-100',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-navy-900 tracking-tight">
          Quick Actions & Workflows
        </h3>
        <span className="text-xs text-slate-400">Core SaaS capabilities</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {actions.map((act) => (
          <Card
            key={act.id}
            hoverable
            onClick={act.onClick}
            className="p-4 cursor-pointer group hover:border-brand-teal-300 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center border shadow-2xs ${act.color}`}
              >
                <act.icon className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="neutral" size="sm">
                  {act.badge}
                </Badge>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-teal-600 transition-colors" />
              </div>
            </div>
            <h4 className="text-sm font-semibold text-brand-navy-900 group-hover:text-brand-teal-700 transition-colors">
              {act.title}
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {act.description}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
};
