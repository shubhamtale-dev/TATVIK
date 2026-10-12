import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, X, AlertCircle, ArrowUpCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatBytes } from '../../lib/utils';

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isLoading: boolean;
  errorMessage?: string | null;
  onClearError?: () => void;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const FileUploader: React.FC<FileUploaderProps> = ({
  onUpload,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setClientError(null);
    if (onClearError) onClearError();

    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
      setClientError('Invalid file format. Only .csv and .xlsx files are supported.');
      return false;
    }

    if (file.size === 0) {
      setClientError('The selected file is empty (0 bytes).');
      return false;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setClientError(`File size (${formatBytes(file.size)}) exceeds maximum allowed limit of 10 MB.`);
      return false;
    }

    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleTriggerUpload = async () => {
    if (!selectedFile || isLoading) return;
    await onUpload(selectedFile);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setClientError(null);
    if (onClearError) onClearError();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const activeError = clientError || errorMessage;

  return (
    <div className="space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={isLoading}
      />

      {/* Drag & Drop Surface */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all duration-200 ${
          dragActive
            ? 'border-brand-teal-500 bg-brand-teal-50/50 shadow-inner'
            : 'border-slate-300 bg-white/70 hover:border-slate-400 hover:bg-white'
        }`}
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-navy-50 text-brand-navy-800 mb-4 shadow-2xs border border-brand-navy-100/60">
          <UploadCloud className="w-7 h-7 text-brand-teal-600 stroke-[1.75]" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-brand-navy-900 tracking-tight text-center">
          Upload Business Spreadsheet
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md text-center leading-relaxed">
          Drag and drop your tabular dataset here, or browse from your computer. Supports <span className="font-semibold text-slate-700">.CSV</span> and <span className="font-semibold text-slate-700">.XLSX</span> files up to 10 MB.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="shadow-2xs"
          >
            Browse Files
          </Button>

          {selectedFile && (
            <Button
              variant="primary"
              size="md"
              onClick={handleTriggerUpload}
              isLoading={isLoading}
              className="shadow-sm"
            >
              <ArrowUpCircle className="w-4 h-4 mr-1.5" />
              Upload & Generate Preview
            </Button>
          )}
        </div>

        {/* Selected File Chip */}
        {selectedFile && (
          <div className="mt-5 inline-flex items-center gap-3 p-2.5 px-4 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 animate-in fade-in zoom-in-95">
            <FileSpreadsheet className="w-4 h-4 text-brand-teal-600 shrink-0" />
            <span className="font-mono font-semibold max-w-[200px] sm:max-w-xs truncate">
              {selectedFile.name}
            </span>
            <span className="text-slate-400">({formatBytes(selectedFile.size)})</span>
            <Badge variant="teal" size="sm">
              Ready
            </Badge>
            {!isLoading && (
              <button
                onClick={handleReset}
                className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded"
                title="Remove selected file"
                aria-label="Remove selected file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error Alert Banner */}
      {activeError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Upload Error: </span>
            <span>{activeError}</span>
          </div>
          <button
            onClick={() => {
              setClientError(null);
              if (onClearError) onClearError();
            }}
            className="text-rose-400 hover:text-rose-700 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
