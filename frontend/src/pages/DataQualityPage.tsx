import React, { useState } from 'react';
import {
  Copy,
  AlertCircle,
  FileCheck,
  Filter,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DemoDataNotice } from '../components/common/DemoDataNotice';
import { ComingSoonModal } from '../components/common/ComingSoonModal';

export const DataQualityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'duplicates' | 'missing' | 'formats' | 'inconsistencies'>('all');
  const [selectedIssueModal, setSelectedIssueModal] = useState<string | null>(null);

  const categories = [
    {
      id: 'duplicates',
      title: 'Fuzzy & Exact Duplicates',
      icon: Copy,
      count: '94 detected',
      severity: 'high',
      description: 'Identifies phonetic collisions, nickname variations, and transposed digits across company names and emails.',
      sampleRule: 'Jaro-Winkler & Levenshtein distance > 0.88 with domain normalization',
    },
    {
      id: 'missing',
      title: 'Missing Context & Values',
      icon: AlertCircle,
      count: '148 detected',
      severity: 'high',
      description: 'Detects critical empty fields, null-equivalent strings (N/A, none, null), and incomplete relational keys.',
      sampleRule: 'Null-byte and sentinel string detection with frequency interpolation',
    },
    {
      id: 'formats',
      title: 'Invalid Data Formats',
      icon: FileCheck,
      count: '62 detected',
      severity: 'medium',
      description: 'Validates RFC 5322 email syntax, E.164 phone formats, ISO 8601 timestamps, and local currency representations.',
      sampleRule: 'Strict regex schema & locale-aware regex pattern matching',
    },
    {
      id: 'inconsistencies',
      title: 'Relational Inconsistencies',
      icon: Layers,
      count: '38 detected',
      severity: 'medium',
      description: 'Flags contradictory records such as start dates scheduled after end dates, or zip codes mismatched with stated states.',
      sampleRule: 'Cross-column temporal order & geographical constraint rules',
    },
  ];

  // Illustrative sample issues
  const sampleIssues = [
    {
      id: 'iss-1',
      type: 'duplicates',
      dataset: 'enterprise_leads_q3.csv',
      field: 'Company Name & Email',
      original: '"Acme Global Corp" (sales@acmeglobal.com)',
      flaggedAs: 'Duplicate of Row #41 ("Acme Corp Global")',
      confidence: '96% Match',
      severity: 'high',
    },
    {
      id: 'iss-2',
      type: 'missing',
      dataset: 'enterprise_leads_q3.csv',
      field: 'Primary Phone Number',
      original: 'N/A',
      flaggedAs: 'Empty critical attribute (Required for outreach)',
      confidence: '100% Certain',
      severity: 'high',
    },
    {
      id: 'iss-3',
      type: 'formats',
      dataset: 'na_vendors_master.xlsx',
      field: 'Tax Registration ID',
      original: 'XX-98124A (Malformed)',
      flaggedAs: 'Does not match federal EIN standard pattern ##-#######',
      confidence: '92% Violation',
      severity: 'medium',
    },
    {
      id: 'iss-4',
      type: 'inconsistencies',
      dataset: 'apac_pos_transactions.csv',
      field: 'Contract Effective Dates',
      original: 'Start: 2024-06-15, End: 2023-12-01',
      flaggedAs: 'Chronological paradox: Termination precedes initiation',
      confidence: '100% Conflict',
      severity: 'high',
    },
  ];

  const filteredIssues = activeTab === 'all'
    ? sampleIssues
    : sampleIssues.filter((i) => i.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy-900 tracking-tight">
            Data Quality Engine
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic rule heuristics and semantic anomaly scanner for enterprise datasets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" size="md">
            Phase 3 Engine Architecture
          </Badge>
        </div>
      </div>

      <DemoDataNotice message="Illustrative Quality Preview: Rules and sample issue cards demonstrate the upcoming detection rules engine." />

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id} hoverable className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-brand-navy-50 text-brand-navy-800 flex items-center justify-center border border-brand-navy-100">
                  <cat.icon className="w-4 h-4" />
                </div>
                <Badge
                  variant={cat.severity === 'high' ? 'danger' : 'warning'}
                  size="sm"
                >
                  {cat.count}
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-brand-navy-900">{cat.title}</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {cat.description}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-400">
              Rule: {cat.sampleRule}
            </div>
          </Card>
        ))}
      </div>

      {/* Illustrative Flagged Issues Table */}
      <Card>
        <CardHeader>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Sample Flagged Issues & Discrepancies</CardTitle>
              <Badge variant="neutral" size="sm">
                Demo Spec
              </Badge>
            </div>
            <CardDescription>
              Demonstration of how TATVIK surfaces anomalies with confidence metrics and suggested fixes.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex gap-1 text-xs">
              {(['all', 'duplicates', 'missing', 'formats', 'inconsistencies'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                    activeTab === tab
                      ? 'bg-brand-teal-600 text-white font-medium'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-brand-navy-900">
                      {issue.field}
                    </span>
                    <Badge variant="neutral" size="sm">
                      {issue.dataset}
                    </Badge>
                    <Badge
                      variant={issue.severity === 'high' ? 'danger' : 'warning'}
                      size="sm"
                    >
                      {issue.confidence}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="text-slate-400">Found value: </span>
                    <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-rose-700">
                      {issue.original}
                    </span>
                  </p>
                  <p className="text-xs text-brand-teal-800 flex items-center gap-1 font-medium">
                    <ArrowRight className="w-3 h-3 text-brand-teal-600 shrink-0" />
                    <span>{issue.flaggedAs}</span>
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIssueModal(issue.id)}
                  >
                    Review Suggestion (Demo)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Modal */}
      {selectedIssueModal && (
        <ComingSoonModal
          isOpen={!!selectedIssueModal}
          onClose={() => setSelectedIssueModal(null)}
          featureName="Interactive Issue Review & Correction Workspace"
          phaseTarget="Phase 5"
          description="In Phase 5, users can accept, edit, or reject AI-recommended corrections in real time with side-by-side diffs and automated dataset regeneration."
          plannedCapabilities={[
            'Side-by-side cell comparison before applying changes',
            'Batch accept for high-confidence duplicate merges',
            'Manual value override with live re-validation',
            'Immutable audit logging of every operator decision',
          ]}
        />
      )}
    </div>
  );
};
