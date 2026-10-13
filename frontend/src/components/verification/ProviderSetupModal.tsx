import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Terminal, ExternalLink, Key, Info } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProviderStatusData } from '../../types';

interface ProviderSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusData?: ProviderStatusData | null;
}

export const ProviderSetupModal: React.FC<ProviderSetupModalProps> = ({
  isOpen,
  onClose,
  statusData,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const sampleEnvConfig = `# TATVIK External Research Provider Configuration
# Choose Tavily (recommended for factual business claims) or SerpApi
RESEARCH_PROVIDER=tavily
TAVILY_API_KEY=tvly-your_tavily_api_key_here

# Alternatively, configure SerpApi:
# RESEARCH_PROVIDER=serpapi
# SERPAPI_API_KEY=your_serpapi_api_key_here

# Provider timeout and safety limits:
RESEARCH_TIMEOUT_SECONDS=10
RESEARCH_MAX_CLAIMS_PER_BATCH=20`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Research Provider Setup & Transparency"
      description="External search grounding configuration for evidence-based claim verification"
      maxWidth="lg"
    >
      <div className="space-y-5 text-sm">
        {/* Status Callout */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            statusData?.configured
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/60 border-amber-200 text-amber-900'
          }`}
        >
          {statusData?.configured ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <span>Status:</span>
              <Badge variant={statusData?.configured ? 'success' : 'warning'} size="sm">
                {statusData?.configured
                  ? `Active Provider: ${statusData.provider_name.toUpperCase()}`
                  : 'Unconfigured (Offline Mode)'}
              </Badge>
            </div>
            <p className="mt-1 text-xs opacity-90 leading-relaxed">
              {statusData?.configured
                ? 'Valid API credentials detected on the backend. Verification queries will be grounded in live external search citations.'
                : 'No search credentials found. TATVIK will transparently return "Not Configured" without fabricating mock URLs, fake citations, or simulated search findings.'}
            </p>
          </div>
        </div>

        {/* Core Principles */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <h4 className="font-semibold text-brand-navy-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <Key className="w-3.5 h-3.5 text-brand-teal" />
            Verification Guardrails & Principles
          </h4>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
            <li>
              <strong className="text-slate-800">Zero Fabrication:</strong> Never invents search hits, quotations, or sources.
            </li>
            <li>
              <strong className="text-slate-800">Domain Discrimination:</strong> Distinguishes official company domains and <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">.gov</code> registries from third-party directories.
            </li>
            <li>
              <strong className="text-slate-800">Air-Gapped Keys:</strong> API keys reside exclusively in backend environment variables and are never sent to the browser.
            </li>
            <li>
              <strong className="text-slate-800">Data Immutability:</strong> External research never modifies source dataset values automatically.
            </li>
          </ul>
        </div>

        {/* Configuration Steps */}
        <div className="space-y-3">
          <h4 className="font-semibold text-brand-navy-900 flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-brand-navy-700" />
            How to Enable Live Research
          </h4>

          <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside pl-1">
            <li>
              Obtain a free or commercial search API key from{' '}
              <a
                href="https://tavily.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-navy-700 hover:text-brand-teal font-medium underline inline-flex items-center gap-0.5"
              >
                Tavily <ExternalLink className="w-3 h-3" />
              </a>{' '}
              or{' '}
              <a
                href="https://serpapi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-navy-700 hover:text-brand-teal font-medium underline inline-flex items-center gap-0.5"
              >
                SerpApi <ExternalLink className="w-3 h-3" />
              </a>.
            </li>
            <li>
              Add the key to your <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono border border-slate-200">backend/.env</code> file:
            </li>
          </ol>

          {/* Code block with copy */}
          <div className="relative rounded-xl bg-brand-navy-950 text-slate-200 p-3 font-mono text-xs overflow-x-auto border border-brand-navy-800 shadow-inner">
            <button
              onClick={() => copyToClipboard(sampleEnvConfig, 'env')}
              className="absolute top-2.5 right-2.5 px-2 py-1 bg-brand-navy-800 hover:bg-brand-navy-700 text-slate-300 rounded text-[11px] flex items-center gap-1 transition-colors border border-brand-navy-700"
              title="Copy snippet"
            >
              {copiedKey === 'env' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <pre className="pr-14 leading-relaxed">{sampleEnvConfig}</pre>
          </div>

          <p className="text-xs text-slate-500">
            After editing <code className="font-mono">backend/.env</code>, restart the FastAPI server. TATVIK will detect the provider credentials automatically.
          </p>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
