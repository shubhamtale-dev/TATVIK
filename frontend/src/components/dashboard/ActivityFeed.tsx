import React from 'react';
import { Clock, PlusCircle, CheckCircle2, FileText, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ActivityItem } from '../../types';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'dataset':
        return <PlusCircle className="w-3.5 h-3.5 text-brand-teal-600" />;
      case 'quality':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'verification':
        return <FileText className="w-3.5 h-3.5 text-sky-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="bg-slate-50/60">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Recent Activity</CardTitle>
            <Badge variant="neutral" size="sm">
              Sample Activity
            </Badge>
          </div>
          <CardDescription>
            Audit events simulate upcoming dataset operations and verification actions.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-5">
        <div className="flow-root">
          <ul className="-mb-6">
            {activities.map((item, idx) => (
              <li key={item.id} className="relative pb-6">
                {idx !== activities.length - 1 && (
                  <span
                    className="absolute top-4 left-3.5 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 ring-4 ring-white shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-xs font-semibold text-brand-navy-900">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {item.description}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {item.timestamp}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
