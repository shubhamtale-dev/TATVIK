import React, { useState } from 'react';
import { Database, UploadCloud, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ComingSoonModal } from '../components/common/ComingSoonModal';

export const DatasetsPage: React.FC = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const supportedFormats = [
    {
      ext: '.CSV / .TSV',
      name: 'Delimited Plaintext',
      desc: 'Comma, semicolon, or tab-delimited records. Handles UTF-8 and legacy encodings.',
      badge: 'Streaming Parser',
    },
    {
      ext: '.XLSX',
      name: 'Modern Excel Workbook',
      desc: 'Microsoft Excel OpenXML spreadsheets with multi-sheet workbook support.',
      badge: 'Cell Styles & Types',
    },
    {
      ext: '.XLS',
      name: 'Legacy Excel Binary',
      desc: 'Legacy Microsoft Excel binary documents (BIFF8 format).',
      badge: 'Auto Conversion',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy-900 tracking-tight">
            Datasets Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Central repository for ingesting, cataloging, and managing business spreadsheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full sm:w-auto"
          >
            <UploadCloud className="w-4 h-4 mr-1.5" />
            Upload Dataset
            <span className="ml-1.5 text-[10px] font-mono bg-white/20 text-white px-1.5 py-0.5 rounded">
              Phase 2
            </span>
          </Button>
        </div>
      </div>

      {/* Informative Empty State / Architecture Overview */}
      <EmptyState
        icon={<Database className="w-6 h-6 text-brand-teal-600" />}
        title="No persistent datasets uploaded yet"
        description="Dataset storage and streaming file ingestion will be introduced in Phase 2. Once connected, your uploaded CSV and Excel workbooks will appear here with schema health, record counts, and verification statuses."
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <UploadCloud className="w-4 h-4" />
              Preview Upload Workflow
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://github.com/shubhamtale-dev/TATVIK', '_blank')}
            >
              View Roadmap
            </Button>
          </div>
        }
      />

      {/* Supported Data Formats Specifications */}
      <Card>
        <CardHeader>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Supported File Specifications (Phase 2 Roadmap)</CardTitle>
              <Badge variant="teal" size="sm">
                Specifications
              </Badge>
            </div>
            <CardDescription>
              TATVIK's upcoming ingestion engine is designed to handle enterprise data formats without manual cleanup.
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
                  <Badge variant="neutral" size="sm">
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

          <div className="mt-5 p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold mb-0.5">Strict Privacy & Zero Data Leakage</p>
              <p className="text-amber-700 leading-relaxed">
                Client spreadsheets will never be exposed or sent to third-party providers. Ingestion occurs inside isolated containers with deterministic parsing algorithms.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ComingSoonModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        featureName="Dataset File Uploader"
        phaseTarget="Phase 2"
        description="Dataset uploading and chunked stream parsing is the central deliverable of Phase 2. You will be able to upload large CSV/Excel files directly from this page."
        plannedCapabilities={[
          'Streaming chunk parser for 100MB+ spreadsheets',
          'Automatic detection of delimiters, date formats, and currencies',
          'Schema mapping interface with interactive column renaming',
          'Immediate preliminary data validation report',
        ]}
      />
    </div>
  );
};
