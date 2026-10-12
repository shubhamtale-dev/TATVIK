import React, { useEffect, useState } from 'react';
import {
  Download,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { WorkingDatasetPreviewData } from '../../types';
import { getWorkingDatasetPreview } from '../../lib/api';
import { formatNumber } from '../../lib/utils';

interface WorkingPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export const WorkingPreviewModal: React.FC<WorkingPreviewModalProps> = ({
  isOpen,
  onClose,
  sessionId,
}) => {
  const [data, setData] = useState<WorkingDatasetPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'history'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    if (!isOpen || !sessionId) return;
    const fetchPreview = async () => {
      setIsLoading(true);
      const res = await getWorkingDatasetPreview(sessionId, 100);
      setIsLoading(false);
      if (res.success && res.data) {
        setData(res.data);
      }
    };
    fetchPreview();
  }, [isOpen, sessionId]);

  const filteredRows = (data?.preview_rows || []).filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const displayedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.preview_rows, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `working_${data.filename}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Working Dataset Preview (Active In-Memory Copy)"
      description="Reflects all approved corrections applied to the working copy without touching the original file"
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Subheader info & tab switch */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Badge variant="teal" size="md">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              {data?.total_applied_changes || 0} Applied Correction{data?.total_applied_changes === 1 ? '' : 's'}
            </Badge>
            <span className="text-xs text-slate-500">
              {formatNumber(data?.total_rows || 0)} Rows &bull; {data?.total_columns || 0} Columns
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex p-0.5 bg-slate-100 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'table' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Data Grid
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'history' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Change History ({data?.applied_changes?.length || 0})
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="w-3.5 h-3.5 mr-1" />
              Export JSON
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <div className="w-6 h-6 border-2 border-brand-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading working dataset preview...
          </div>
        ) : activeTab === 'table' ? (
          <div className="space-y-3">
            {/* Search row filter */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search working cells..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-teal-500"
                />
              </div>
              <span className="text-[11px] text-slate-400">
                Showing {displayedRows.length} of {filteredRows.length} preview records
              </span>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[380px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold z-10">
                  <tr>
                    <th className="py-2 px-3 w-12 text-slate-400">#</th>
                    {(data?.columns || []).map((col) => (
                      <th key={col} className="py-2 px-3 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={(data?.columns.length || 0) + 1}
                        className="py-8 text-center text-slate-400 font-sans"
                      >
                        No matching rows found in working dataset.
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((row, idx) => {
                      const absoluteRowIdx = (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 text-slate-400 font-sans">{absoluteRowIdx}</td>
                          {(data?.columns || []).map((col) => {
                            const val = row[col];
                            return (
                              <td key={col} className="py-2 px-3 whitespace-nowrap text-slate-800">
                                {val === null || val === undefined ? (
                                  <span className="text-slate-300 italic font-sans">(null)</span>
                                ) : (
                                  String(val)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Change History List */
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {!data?.applied_changes || data.applied_changes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No changes have been applied to this working dataset copy yet.
              </div>
            ) : (
              data.applied_changes.map((item, idx) => (
                <div key={idx} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-slate-50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {item.issue_id}
                      </span>
                      <span className="text-slate-600 font-medium">
                        Row #{item.row_index} &bull; Column: <strong>{item.column_name}</strong>
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 pt-0.5">
                      <span className="text-rose-700 line-through">&quot;{String(item.original_value ?? '')}&quot;</span>
                      <span>&rarr;</span>
                      <span className="text-emerald-700 font-semibold">&quot;{String(item.applied_value ?? '')}&quot;</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(item.applied_at).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
