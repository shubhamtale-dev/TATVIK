import React, { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle,
  Hash,
  Layers,
  FileCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DatasetPreviewData } from '../../types';
import { formatBytes, formatNumber } from '../../lib/utils';

interface DatasetPreviewTableProps {
  data: DatasetPreviewData;
  onReset: () => void;
}

export const DatasetPreviewTable: React.FC<DatasetPreviewTableProps> = ({ data, onReset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter preview rows based on search input
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return data.preview_rows;
    const term = searchTerm.toLowerCase();
    return data.preview_rows.filter((row) =>
      Object.values(row).some((val) =>
        val !== null && val !== undefined && String(val).toLowerCase().includes(term)
      )
    );
  }, [data.preview_rows, searchTerm]);

  // Paginate filtered rows
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Download raw preview JSON
  const handleDownloadJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `${data.filename}_preview.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const renderCellValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return <span className="text-slate-300 italic font-mono text-xs">null</span>;
    }
    if (typeof value === 'boolean') {
      return (
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
            value
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          {String(value)}
        </span>
      );
    }
    if (typeof value === 'number') {
      return <span className="font-mono text-slate-800">{value}</span>;
    }
    return <span className="text-slate-800">{String(value)}</span>;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Metadata Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border-slate-200">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5 text-brand-teal-600" />
            Format
          </div>
          <div className="mt-1 text-base font-bold text-brand-navy-900 uppercase">
            {data.file_type}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {formatBytes(data.file_size_bytes)}
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-brand-navy-700" />
            Total Rows
          </div>
          <div className="mt-1 text-base font-bold text-brand-navy-900">
            {formatNumber(data.total_rows)}
          </div>
          <div className="text-[11px] text-slate-500">
            {data.preview_row_count} in preview
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-brand-saffron-600" />
            Columns
          </div>
          <div className="mt-1 text-base font-bold text-brand-navy-900">
            {data.total_columns}
          </div>
          <div className="text-[11px] text-slate-500 truncate" title={data.columns.join(', ')}>
            Headers extracted
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            Status
          </div>
          <div className="mt-1 text-base font-bold text-emerald-700 flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Parsed
          </div>
          <div className="text-[11px] text-slate-500">
            Ready for validation
          </div>
        </Card>
      </div>

      {/* Multi-sheet Excel Notice */}
      {data.notice && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Worksheet Selection: </span>
            <span>{data.notice}</span>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <Card>
        <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base truncate max-w-sm sm:max-w-md">
                {data.filename}
              </CardTitle>
              <Badge variant="teal" size="sm">
                Live Data
              </Badge>
              {data.selected_sheet && (
                <Badge variant="neutral" size="sm">
                  Sheet: {data.selected_sheet}
                </Badge>
              )}
            </div>
            <CardDescription>
              Displaying {filteredRows.length} preview rows parsed in-memory.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadJSON}
              title="Export parsed preview as JSON"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Upload Another
            </Button>
          </div>
        </CardHeader>

        {/* Filter bar */}
        <div className="p-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search across preview cells..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Responsive Data Table */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 shadow-2xs">
              <tr>
                <th className="py-2.5 px-3 font-mono font-bold text-slate-500 text-[11px] w-12 text-center border-r border-slate-200 bg-slate-100">
                  #
                </th>
                {data.columns.map((colName, idx) => (
                  <th
                    key={idx}
                    className="py-2.5 px-3 font-semibold text-brand-navy-900 tracking-tight whitespace-nowrap border-r border-slate-200 last:border-r-0"
                  >
                    {colName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={data.columns.length + 1}
                    className="py-8 text-center text-slate-400 text-xs"
                  >
                    No preview rows match the search query "{searchTerm}".
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rowIdx) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + rowIdx + 1;
                  return (
                    <tr
                      key={rowIdx}
                      className="hover:bg-brand-teal-50/30 transition-colors"
                    >
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-400 text-center border-r border-slate-100 bg-slate-50/50">
                        {absoluteIndex}
                      </td>
                      {data.columns.map((colName, colIdx) => (
                        <td
                          key={colIdx}
                          className="py-2 px-3 whitespace-nowrap text-xs border-r border-slate-100 last:border-r-0 max-w-xs truncate"
                          title={String(row[colName] ?? '')}
                        >
                          {renderCellValue(row[colName])}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, filteredRows.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-800">{filteredRows.length}</span>{' '}
            filtered preview rows
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2 py-1 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
              Prev
            </Button>
            <span className="px-2 font-mono text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2 py-1 text-xs"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
