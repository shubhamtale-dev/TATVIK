import React, { useState } from 'react';
import {
  Globe,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DemoDataNotice } from '../components/common/DemoDataNotice';
import { ComingSoonModal } from '../components/common/ComingSoonModal';

export const ResearchVerificationPage: React.FC = () => {
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

  // Sample illustrative research verification claims
  const sampleEvidence = [
    {
      id: 'ev-1',
      entityName: 'Vertex BioPharma Inc.',
      claim: 'Headquarters registered at 450 Technology Square, Cambridge, MA 02139',
      sourceUrl: 'https://sec.gov/edgar/data/vertex-biopharma-10k.htm',
      sourceDomain: 'sec.gov (EDGAR Registry)',
      confidence: 98,
      status: 'Verified',
      verifiedDate: '2024-05-18',
    },
    {
      id: 'ev-2',
      entityName: 'Apex Logistics Global',
      claim: 'Operating Federal Maritime Commission OTI License #021948N',
      sourceUrl: 'https://fmc.gov/ocean-transportation-intermediaries/apex',
      sourceDomain: 'fmc.gov (Federal Maritime Commission)',
      confidence: 94,
      status: 'Verified',
      verifiedDate: '2024-05-17',
    },
    {
      id: 'ev-3',
      entityName: 'Starlight Solar Solutions',
      claim: 'Active California Contractors State License Board Class C-46 #109482',
      sourceUrl: 'https://cslb.ca.gov/onlineservices/checklicense/109482',
      sourceDomain: 'cslb.ca.gov',
      confidence: 72,
      status: 'Pending Evidence Review',
      verifiedDate: '2024-05-15',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy-900 tracking-tight">
            Research Verification Engine
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Ground business data claims with verifiable external evidence citations and audit records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="saffron" size="md">
            Phase 4 Architecture
          </Badge>
        </div>
      </div>

      <DemoDataNotice message="Verification Notice: No external web search or live regulatory registries were queried. The entries below illustrate the Phase 4 evidence schema." />

      {/* Conceptual Architecture Card */}
      <Card className="bg-gradient-to-br from-slate-900 via-brand-navy to-slate-900 text-white border-brand-navy-700">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-brand-teal-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Ground Truth Verification Pipeline
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white max-w-xl">
            From Unverified Assertions to Cryptographically Audited Citations
          </h3>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            TATVIK's upcoming verification engine cross-references tabular records against federal registries, corporate filings, scholarly articles, and live domains to produce confidence scores and persistent archive links.
          </p>
          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEvidenceModalOpen(true)}
            >
              Learn About AI Research Verifier (Phase 4)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Illustrative Evidence Records */}
      <Card>
        <CardHeader>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Illustrative Evidence Ledger</CardTitle>
              <Badge variant="neutral" size="sm">
                Sample Verification Records
              </Badge>
            </div>
            <CardDescription>
              Demonstration of how verified data rows bind to external authoritative documents.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Entity & Claim</th>
                  <th className="py-3 px-4">Evidence Citation Source</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4">Verified Date</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sampleEvidence.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-brand-navy-900">
                        {ev.entityName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {ev.claim}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 text-brand-teal-700">
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold">{ev.sourceDomain}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {ev.sourceUrl}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {ev.confidence}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={ev.status === 'Verified' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {ev.status === 'Verified' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {ev.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                      {ev.verifiedDate}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setIsEvidenceModalOpen(true)}
                        className="text-xs text-brand-teal-700 hover:text-brand-teal-800 font-medium inline-flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ComingSoonModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        featureName="AI Research Verification Engine"
        phaseTarget="Phase 4"
        description="The Research Verification engine will be implemented in Phase 4. It will integrate semantic LLM retrievers and web-grounding APIs to cross-verify claims automatically."
        plannedCapabilities={[
          'Grounding citations in authoritative regulatory registries (SEC, FDA, Companies House)',
          'Automated fact-checking of enterprise business registry addresses',
          'Explainable confidence score breakdowns per attribute',
          'Permanent snapshot archiving of cited source webpages',
        ]}
      />
    </div>
  );
};
