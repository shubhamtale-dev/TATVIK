import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface WelcomeBannerProps {
  onUploadClick: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ onUploadClick }) => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-brand-navy-900 via-brand-navy-800 to-brand-navy-900 rounded-2xl p-6 sm:p-8 text-white shadow-md border border-brand-navy-700">
      {/* Decorative accent element */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-brand-teal-500/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-brand-saffron-500/10 blur-xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="saffron" size="md">
            Phase 1 Foundation
          </Badge>
          <span className="text-xs text-brand-teal-300 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            AI-Powered Data Intelligence
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          Good to see you
        </h2>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6 max-w-2xl">
          TATVIK helps businesses improve data reliability by systematically identifying duplicate
          records, missing attributes, invalid formats, and logical contradictions across your CSV
          and Excel files before they compromise critical decisions.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={onUploadClick}
            className="shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Dataset
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/quality')}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-none"
          >
            Explore Data Quality
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
