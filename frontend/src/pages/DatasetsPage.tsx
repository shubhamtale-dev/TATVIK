import React, { useState } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FileUploader } from '../components/datasets/FileUploader';
import { DatasetPreviewTable } from '../components/datasets/DatasetPreviewTable';
import { uploadDatasetPreview } from '../lib/api';
import { DatasetPreviewData } from '../types';

export const DatasetsPage: React.FC = () => {
  const [previewData, setPreviewData] = useState<DatasetPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await uploadDatasetPreview(file, 50);

    setIsLoading(false);
    if (result.success && result.data) {
      setPreviewData(result.data);
    } else {
      setErrorMessage(result.error || 'Failed to upload and parse dataset.');
    }
  };

  const handleReset = () => {
    setPreviewData(null);
    setErrorMessage(null);
  };

  const supportedFormats = [
    {
      ext: '.CSV / .TSV',
      name: 'Delimited Plaintext',
      desc: 'Comma, semicolon, or tab-delimited records. Handles UTF-8 and legacy encodings.',
      badge: 'Active Parser',
    },
    {
      ext: '.XLSX',
      name: 'Modern Excel Workbook',
      desc: 'Microsoft Excel OpenXML spreadsheets parsed securely with openpyxl (first sheet preview).',
      badge: 'Active Parser',
    },
    {
      ext: '.XLS',
      name: 'Legacy Excel Binary',
      desc: 'Legacy Microsoft Excel binary documents (auto-conversion pipeline planned for Phase 3).',
      badge: 'Upcoming',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-brand-navy-900 tracking-tight">
              Dataset Upload & Ingestion
            </h2>
            <Badge variant="teal" size="sm">
              Part 2 Active
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Upload business CSV and Excel spreadsheets to inspect raw schemas and parse in-memory previews.
          </p>
        </div>

        {previewData && (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <UploadCloud className="w-3.5 h-3.5 text-brand-teal-600" />
            Upload Another Dataset
          </button>
        )}
      </div>

      {/* Main Content: Either Active Preview Table OR File Uploader */}
      {previewData ? (
        <DatasetPreviewTable data={previewData} onReset={handleReset} />
      ) : (
        <div className="space-y-6">
          {/* File Uploader */}
          <FileUploader
            onUpload={handleUpload}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
          />

          {/* Supported Data Formats Specifications */}
          <Card>
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Supported File Specifications & Limits</CardTitle>
                  <Badge variant="neutral" size="sm">
                    In-Memory Pipeline
                  </Badge>
                </div>
                <CardDescription>
                  TATVIK's ingestion pipeline validates file extensions, size limits (up to 10 MB), and serializes tabular structures safely.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {supportedFormats.map((fmt, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-brand-teal-700 bg-brand-teal-50 px-2 py-0.5 rounded border border-brand-teal-100">
                        {fmt.ext}
                      </span>
                      <Badge
                        variant={fmt.badge === 'Active Parser' ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {fmt.badge}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-semibold text-brand-navy-900">
                      {fmt.name}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {fmt.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 p-4 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-3 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold mb-0.5">Strict Privacy & Zero Data Leakage</p>
                  <p className="text-amber-700 leading-relaxed">
                    Uploaded file contents are processed entirely in-memory and are never stored in a permanent database during this phase. Formula codes and macros are never executed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
