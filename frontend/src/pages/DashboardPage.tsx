import React, { useState } from 'react';
import { Database, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { WelcomeBanner } from '../components/dashboard/WelcomeBanner';
import { StatCard } from '../components/dashboard/StatCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { DatasetsTable } from '../components/dashboard/DatasetsTable';
import { QualityOverview } from '../components/dashboard/QualityOverview';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { DemoDataNotice } from '../components/common/DemoDataNotice';
import { ComingSoonModal } from '../components/common/ComingSoonModal';
import { DatasetItem, QualityCategory, ActivityItem } from '../types';

export const DashboardPage: React.FC = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [inspectingDataset, setInspectingDataset] = useState<DatasetItem | null>(null);

  // Sample Datasets for development baseline
  const sampleDatasets: DatasetItem[] = [
    {
      id: 'ds-1',
      name: 'Q3 Enterprise Lead Pipeline',
      filename: 'enterprise_leads_q3.csv',
      format: 'CSV',
      recordCount: 8450,
      lastUpdated: '12 mins ago',
      status: 'Issues Flagged',
      issueCount: 142,
    },
    {
      id: 'ds-2',
      name: 'North America Vendor Directory',
      filename: 'na_vendors_master.xlsx',
      format: 'XLSX',
      recordCount: 4210,
      lastUpdated: '2 hours ago',
      status: 'Ready for Review',
      issueCount: 68,
    },
    {
      id: 'ds-3',
      name: 'Clinical Trial Site Registries',
      filename: 'trial_sites_verified.csv',
      format: 'CSV',
      recordCount: 3820,
      lastUpdated: 'Yesterday',
      status: 'Cleaned',
      issueCount: 0,
    },
    {
      id: 'ds-4',
      name: 'APAC Retail Point-of-Sale Audit',
      filename: 'apac_pos_transactions.csv',
      format: 'CSV',
      recordCount: 1940,
      lastUpdated: '3 days ago',
      status: 'Cleaned',
      issueCount: 4,
    },
  ];

  // Sample Quality Breakdown
  const sampleQualityCategories: QualityCategory[] = [
    {
      id: 'missing',
      label: 'Missing Critical Fields',
      count: 148,
      percentage: 43,
      severity: 'high',
      description: 'Missing phone numbers, blank tax IDs, or unpopulated regions.',
    },
    {
      id: 'duplicates',
      label: 'Possible Duplicate Records',
      count: 94,
      percentage: 27,
      severity: 'high',
      description: 'Fuzzy name and email address collisions across multiple rows.',
    },
    {
      id: 'formats',
      label: 'Invalid Formats & Standards',
      count: 62,
      percentage: 18,
      severity: 'medium',
      description: 'Non-standard date structures, invalid postal codes, corrupted phone numbers.',
    },
    {
      id: 'inconsistencies',
      label: 'Logical Inconsistencies',
      count: 38,
      percentage: 12,
      severity: 'medium',
      description: 'Contradictory city-country pairings or start dates chronologically after end dates.',
    },
  ];

  // Sample Activity Feed
  const sampleActivities: ActivityItem[] = [
    {
      id: 'act-1',
      title: 'Dataset Ingestion Completed',
      description: 'enterprise_leads_q3.csv (8,450 records) parsed with 142 potential quality flags.',
      timestamp: '12m ago',
      type: 'dataset',
    },
    {
      id: 'act-2',
      title: 'Heuristic Deduplication Run',
      description: 'Detected 94 potential fuzzy duplicate pairs in NA Vendor Directory.',
      timestamp: '2h ago',
      type: 'quality',
    },
    {
      id: 'act-3',
      title: 'Verification Report Prepared',
      description: 'Clinical Trial Site Registries marked Cleaned with 100% verification confidence.',
      timestamp: 'Yesterday',
      type: 'verification',
    },
    {
      id: 'act-4',
      title: 'System Schema Updated',
      description: 'Validation rules updated with ISO 8601 date checking and E.164 phone formats.',
      timestamp: '3 days ago',
      type: 'system',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Demo Notice Banner */}
      <DemoDataNotice message="Phase 1 Dashboard Preview: Key metrics, datasets, and activity feeds below represent illustrative demo figures." />

      {/* Welcome Section */}
      <WelcomeBanner onUploadClick={() => setIsUploadModalOpen(true)} />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Datasets Managed"
          value="4"
          caption="Total CSV & Excel repositories loaded"
          icon={Database}
          badgeLabel="Sample"
          accentColor="navy"
        />
        <StatCard
          title="Records Reviewed"
          value="18,420"
          caption="Aggregated rows across all datasets"
          icon={Users}
          badgeLabel="Sample"
          accentColor="teal"
        />
        <StatCard
          title="Issues Detected"
          value="342"
          caption="Anomalies flagged across 4 categories"
          icon={ShieldAlert}
          badgeLabel="Sample"
          accentColor="rose"
        />
        <StatCard
          title="Verification Coverage"
          value="94.2%"
          caption="Average confidence across checked entries"
          icon={CheckCircle2}
          badgeLabel="Sample"
          accentColor="saffron"
        />
      </div>

      {/* Quick Actions */}
      <QuickActions onUploadClick={() => setIsUploadModalOpen(true)} />

      {/* Core Grid: Datasets Table & Quality Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DatasetsTable
            datasets={sampleDatasets}
            onInspect={(ds) => setInspectingDataset(ds)}
          />
        </div>

        <div className="space-y-6">
          <QualityOverview categories={sampleQualityCategories} />
        </div>
      </div>

      {/* Activity Feed Section */}
      <div>
        <ActivityFeed activities={sampleActivities} />
      </div>

      {/* Upload Coming Soon Modal */}
      <ComingSoonModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        featureName="Dataset Upload & Streaming Ingestion"
        phaseTarget="Phase 2 (File Ingestion & Parsers)"
        description="The dataset upload engine is scheduled for Phase 2. It will support chunked streaming uploads of CSV, TSV, XLSX, and XLS files, automatic encoding detection, and schema inference."
        plannedCapabilities={[
          'Drag-and-drop file uploader for files up to 100MB',
          'Automatic delimiter (comma, semicolon, tab) detection',
          'Header mapping and schema type inference',
          'High-performance Polars & DuckDB streaming ingestion',
        ]}
      />

      {/* Inspect Dataset Modal */}
      {inspectingDataset && (
        <ComingSoonModal
          isOpen={!!inspectingDataset}
          onClose={() => setInspectingDataset(null)}
          featureName={`Inspect Dataset: ${inspectingDataset.name}`}
          phaseTarget="Phase 2 & Phase 3"
          description={`Full interactive spreadsheet viewing for "${inspectingDataset.filename}" with cell-by-cell error highlighting and inline diff review will be available in Phase 3.`}
          plannedCapabilities={[
            `Record count: ${inspectingDataset.recordCount.toLocaleString()} rows`,
            `Detected anomalies: ${inspectingDataset.issueCount} items`,
            'Virtual scrolling TanStack Table data grid',
            'Side-by-side diff comparison with original values',
          ]}
        />
      )}
    </div>
  );
};
