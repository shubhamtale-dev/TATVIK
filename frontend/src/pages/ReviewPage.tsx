import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldAlert,
  Sparkles,
  RotateCcw,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FileUploader } from '../components/datasets/FileUploader';
import { ReviewWorkspace } from '../components/review/ReviewWorkspace';
import { ReviewSessionDetailData } from '../types';
import { createReviewSession, getReviewSession } from '../lib/api';

export const ReviewPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSessionId = searchParams.get('session_id');

  const [sessionData, setSessionData] = useState<ReviewSessionDetailData | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load session if session_id is in URL query parameters
  useEffect(() => {
    if (initialSessionId && !sessionData) {
      loadSession(initialSessionId);
    }
  }, [initialSessionId]);

  const loadSession = async (sessionId: string) => {
    setIsLoadingSession(true);
    setErrorMessage(null);
    const res = await getReviewSession(sessionId);
    setIsLoadingSession(false);

    if (res.success && res.data) {
      setSessionData(res.data);
    } else {
      setErrorMessage(
        res.error ||
          `Session '${sessionId}' was not found or has expired. Please upload the dataset again to start a new review session.`
      );
      // Clean query parameter
      setSearchParams({});
    }
  };

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    setErrorMessage(null);

    const res = await createReviewSession(file);
    setIsUploading(false);

    if (res.success && res.data) {
      setSessionData(res.data);
      setSearchParams({ session_id: res.data.session_id });
    } else {
      setErrorMessage(res.error || 'Failed to initialize review session from uploaded file.');
    }
  };

  const handleRefresh = async () => {
    if (!sessionData) return;
    const res = await getReviewSession(sessionData.session_id);
    if (res.success && res.data) {
      setSessionData(res.data);
    }
  };

  const handleReset = () => {
    setSessionData(null);
    setErrorMessage(null);
    setSearchParams({});
  };

  const reviewPrinciples = [
    {
      title: 'Conservative Auto-Corrections',
      icon: Sparkles,
      desc: 'Only safe, high-confidence corrections are proposed automatically: whitespace trimming, repeated space normalization, and dominant column casing standardization.',
    },
    {
      title: 'Human-in-the-Loop Safeguards',
      icon: AlertCircle,
      desc: 'Missing values, duplicate rows, and invalid contact formats are never replaced with fabricated data. Manual review is strictly required.',
    },
    {
      title: 'Isolated Working Copy',
      icon: Layers,
      desc: 'Your uploaded source dataset remains 100% pristine and unmodified. Approved changes are applied solely to an active in-memory working copy.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-brand-navy-900 tracking-tight">
              Issue Review & Correction Approval
            </h2>
            <Badge variant="teal" size="md">
              Part 4 Active
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Inspect detected data-quality issues, review conservative proposed fixes, and approve or reject modifications safely.
          </p>
        </div>

        {sessionData && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Upload Another Dataset
            </Button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-800">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-rose-900">Review Error</h4>
            <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 hover:bg-rose-100/50 p-1 h-auto"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoadingSession && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-2 border-brand-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Loading review session data...</p>
        </div>
      )}

      {/* Active Review Workspace */}
      {!isLoadingSession && sessionData ? (
        <ReviewWorkspace
          session={sessionData}
          onRefresh={handleRefresh}
          onResetSession={handleReset}
        />
      ) : (
        !isLoadingSession && (
          /* Empty / Upload View */
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Initiate Dataset Review & Correction Workflow</CardTitle>
                  <CardDescription>
                    Upload a CSV or XLSX spreadsheet (up to 10 MB). The engine will analyze defects and generate conservative correction suggestions ready for your review and approval.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <FileUploader
                  onUpload={handleUploadFile}
                  isLoading={isUploading}
                  errorMessage={errorMessage}
                  onClearError={() => setErrorMessage(null)}
                />
              </CardContent>
            </Card>

            {/* Principles Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reviewPrinciples.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <Card key={idx} className="p-4 flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-brand-navy-50 text-brand-navy-800 flex items-center justify-center border border-brand-navy-100 mb-3">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-brand-navy-900">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
};
