import React from 'react';
import { FileSpreadsheet, ExternalLink, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { DatasetItem } from '../../types';
import { formatNumber } from '../../lib/utils';

interface DatasetsTableProps {
  datasets: DatasetItem[];
  onInspect: (dataset: DatasetItem) => void;
}

export const DatasetsTable: React.FC<DatasetsTableProps> = ({ datasets, onInspect }) => {
  const getStatusBadge = (status: DatasetItem['status']) => {
    switch (status) {
      case 'Cleaned':
        return (
          <Badge variant="success" size="sm">
            <CheckCircle className="w-3 h-3" />
            Cleaned
          </Badge>
        );
      case 'Issues Flagged':
        return (
          <Badge variant="danger" size="sm">
            <AlertTriangle className="w-3 h-3" />
            Issues Flagged
          </Badge>
        );
      case 'Ready for Review':
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3" />
            Ready for Review
          </Badge>
        );
      case 'Processing':
        return (
          <Badge variant="info" size="sm">
            Processing
          </Badge>
        );
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-slate-50/60">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Recent Datasets</CardTitle>
            <Badge variant="neutral" size="sm">
              Illustrative Sample
            </Badge>
          </div>
          <CardDescription>
            Simulated tabular files representing enterprise directory and leads datasets.
          </CardDescription>
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Dataset Name</th>
              <th className="py-3 px-4">Source File</th>
              <th className="py-3 px-4 text-right">Records</th>
              <th className="py-3 px-4">Last Updated</th>
              <th className="py-3 px-4">Quality Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {datasets.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50/80 transition-colors group"
              >
                <td className="py-3.5 px-4 font-medium text-brand-navy-900">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-brand-teal-600 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                  {item.filename}
                </td>
                <td className="py-3.5 px-4 text-slate-700 text-right font-medium">
                  {formatNumber(item.recordCount)}
                </td>
                <td className="py-3.5 px-4 text-slate-500 text-xs">
                  {item.lastUpdated}
                </td>
                <td className="py-3.5 px-4">
                  {getStatusBadge(item.status)}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => onInspect(item)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal-700 hover:text-brand-teal-800 transition-colors p-1 rounded hover:bg-brand-teal-50"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-50/60 border-t border-slate-100 text-center text-xs text-slate-400">
        Live file parsing and multi-format dataset ingestion will be connected in Phase 2.
      </div>
    </Card>
  );
};
