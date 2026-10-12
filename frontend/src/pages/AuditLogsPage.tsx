import React, { useState } from 'react';
import { History, Shield, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ComingSoonModal } from '../components/common/ComingSoonModal';

export const AuditLogsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const plannedAuditDimensions = [
    {
      title: 'Cell Mutation History',
      desc: 'Tracks original vs updated value, timestamp, modifying user ID, and justification.',
      badge: 'Data Integrity',
    },
    {
      title: 'Reviewer Approval Trail',
      desc: 'Records reviewer decisions (Accepted, Rejected, Overridden) for full team compliance.',
      badge: 'Accountability',
    },
    {
      title: 'Dataset Version Checkpoints',
      desc: 'Enables deterministic rollbacks to any prior point in the data cleaning lifecycle.',
      badge: 'Versioning',
    },
    {
      title: 'Export & Download Attestations',
      desc: 'Cryptographic hash signature generated on every dataset export for enterprise audits.',
      badge: 'SOC2 / GDPR',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy-900 tracking-tight">
            Audit Logs & Governance
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Immutable audit trails, reviewer decision logs, and dataset transformation checkpoints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" size="md">
            Phase 6 Governance
          </Badge>
        </div>
      </div>

      {/* Honest Empty State */}
      <EmptyState
        icon={<History className="w-6 h-6 text-brand-navy-800" />}
        title="Audit ledger inactive in Phase 1"
        description="Persistent event logging will be activated alongside database models in Phase 6. In this initial foundation phase, no dataset mutations have been executed, and no audit entries have been manufactured."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Shield className="w-4 h-4 mr-1.5 text-brand-teal-600" />
            Inspect Planned Audit Schema
          </Button>
        }
      />

      {/* Audit Schema Specification Cards */}
      <Card>
        <CardHeader>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Enterprise Audit Trail Capabilities (Phase 6)</CardTitle>
              <Badge variant="saffron" size="sm">
                Roadmap Spec
              </Badge>
            </div>
            <CardDescription>
              Designed to meet strict regulatory and compliance standards for data engineering pipelines.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plannedAuditDimensions.map((dim, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-brand-navy-900">
                    {dim.title}
                  </h4>
                  <Badge variant="neutral" size="sm">
                    {dim.badge}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {dim.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 p-4 rounded-xl bg-slate-900 text-white flex items-start gap-3 text-xs">
            <Lock className="w-4 h-4 text-brand-teal-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-white mb-0.5">Immutable Append-Only Architecture</p>
              <p className="text-slate-300 leading-relaxed">
                Audit logs are written to an append-only ledger in PostgreSQL with SHA-256 state hashes, ensuring that retroactive alterations cannot take place undetected.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ComingSoonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        featureName="Immutable Audit Trail Engine"
        phaseTarget="Phase 6"
        description="The audit ledger will be powered by PostgreSQL triggers and SQLAlchemy audit models in Phase 6. It will provide transparent traceability from raw uploads to final exports."
        plannedCapabilities={[
          'Granular row-and-column diff history',
          'Reviewer user tracking and approval timestamps',
          'Deterministic dataset snapshot rollbacks',
          'Downloadable SOC2-compliant compliance audit reports',
        ]}
      />
    </div>
  );
};
