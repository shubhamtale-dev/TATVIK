import React, { useState, useEffect } from 'react';
import {
  Server,
  Shield,
  Sliders,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { checkBackendHealth } from '../lib/api';
import { BackendHealth } from '../types';

export const SettingsPage: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<{
    loading: boolean;
    online: boolean;
    data?: BackendHealth;
    error?: string;
  }>({
    loading: true,
    online: false,
  });

  const loadHealth = async () => {
    setHealthStatus((prev) => ({ ...prev, loading: true }));
    const res = await checkBackendHealth();
    setHealthStatus({
      loading: false,
      online: res.online,
      data: res.data,
      error: res.error,
    });
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy-900 tracking-tight">
            System & Workspace Settings
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure application parameters, quality thresholds, and inspect service connectivity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="md">
            Read-Only Preview
          </Badge>
        </div>
      </div>

      {/* Backend API Health Status Card (Live Communication) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-brand-teal-600" />
            <CardTitle>FastAPI Backend Service Connection</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadHealth}
            isLoading={healthStatus.loading}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh Status
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-brand-navy-900">
                  API Endpoint: <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded font-mono">/api/health</code>
                </span>
                {healthStatus.loading ? (
                  <Badge variant="info" size="sm">Checking...</Badge>
                ) : healthStatus.online ? (
                  <Badge variant="success" size="sm">
                    <CheckCircle className="w-3 h-3" />
                    Operational (200 OK)
                  </Badge>
                ) : (
                  <Badge variant="danger" size="sm">
                    <AlertTriangle className="w-3 h-3" />
                    Unreachable
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {healthStatus.online && healthStatus.data
                  ? `Connected to ${healthStatus.data.service} v${healthStatus.data.version} (${healthStatus.data.environment})`
                  : healthStatus.error || 'Awaiting connection verification.'}
              </p>
            </div>

            {healthStatus.online && healthStatus.data && (
              <div className="text-right text-xs font-mono text-slate-500">
                <div>CORS: {healthStatus.data.cors_origins.join(', ')}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workspace Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-navy-800" />
            <CardTitle>Workspace Metadata</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Product Name
              </label>
              <input
                type="text"
                disabled
                value="TATVIK — AI-Powered Data Intelligence"
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Development Environment
              </label>
              <input
                type="text"
                disabled
                value="Local Development (Phase 1)"
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Active Tenant Mode
              </label>
              <input
                type="text"
                disabled
                value="Single-User Sandbox (Multi-tenancy planned for Phase 7)"
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Storage Engine
              </label>
              <input
                type="text"
                disabled
                value="Local Filesystem (PostgreSQL & S3 planned for Phase 6)"
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 cursor-not-allowed"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Threshold Configuration Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-saffron-600" />
            <CardTitle>Quality Detection Threshold Presets</CardTitle>
          </div>
          <Badge variant="neutral" size="sm">Preview Only</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <h4 className="text-xs font-semibold text-brand-navy-900">
                  Fuzzy Deduplication Similarity Threshold
                </h4>
                <p className="text-[11px] text-slate-500">
                  Minimum Jaro-Winkler score required to flag potential record duplication.
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-brand-teal-700 bg-brand-teal-50 px-2 py-1 rounded border border-brand-teal-200">
                0.88
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <h4 className="text-xs font-semibold text-brand-navy-900">
                  Research Verification Confidence Floor
                </h4>
                <p className="text-[11px] text-slate-500">
                  Claims falling below this confidence require manual human review.
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-brand-teal-700 bg-brand-teal-50 px-2 py-1 rounded border border-brand-teal-200">
                85%
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Persistence Notice:</strong> Settings modifications and custom threshold persistence will be activated when user authentication and PostgreSQL storage are introduced in Phase 6. No changes can be saved in Phase 1.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
