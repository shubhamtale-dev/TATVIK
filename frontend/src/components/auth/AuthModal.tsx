import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Shield,
  KeyRound,
  UserPlus,
  LogIn,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const AuthModal: React.FC = () => {
  const {
    showAuthModal,
    closeAuthModal,
    signIn,
    signUp,
    isConfigured,
    enableDevUser,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    if (mode === 'signin') {
      const result = await signIn(email.trim(), password);
      setIsLoading(false);
      if (!result.success) {
        setErrorMsg(result.error || 'Failed to sign in. Please verify your credentials.');
      }
    } else {
      const result = await signUp(email.trim(), password);
      setIsLoading(false);
      if (!result.success) {
        setErrorMsg(result.error || 'Failed to register account.');
      } else {
        setSuccessMsg(result.message || 'Account created successfully!');
      }
    }
  };

  const handleDevLogin = () => {
    enableDevUser(email.trim() || 'developer@tatvik.local');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-brand-navy-900 to-brand-navy-800 text-white border-b border-brand-navy-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-teal-500/20 border border-brand-teal-400/30 flex items-center justify-center text-brand-teal-300">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {mode === 'signin' ? 'Sign In to TATVIK' : 'Create TATVIK Account'}
              </h3>
              <p className="text-[11px] text-slate-300">
                Persistent Datasets & Review Session Storage
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Unconfigured Honest Notice Banner */}
          {!isConfigured && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-amber-900">
                    Supabase Authentication Unconfigured
                  </p>
                  <p className="text-amber-800 mt-0.5 leading-relaxed">
                    Cloud authentication credentials are not set in environment variables.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white/80 border border-amber-200 font-mono text-[11px] text-slate-700 space-y-1">
                <p className="font-semibold text-slate-900">Required Configuration:</p>
                <p>VITE_SUPABASE_URL=https://your-project.supabase.co</p>
                <p>VITE_SUPABASE_ANON_KEY=your-public-anon-key</p>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <a
                  href="https://supabase.com/docs/guides/auth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 hover:text-amber-950 underline"
                >
                  Supabase Setup Guide <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={handleDevLogin}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors shadow-2xs"
                >
                  <Terminal className="w-3 h-3" />
                  Use Local Dev Profile
                </button>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signin'
                  ? 'bg-white text-brand-navy-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signup'
                  ? 'bg-white text-brand-navy-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="reviewer@organization.com"
                  required
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal-500/20 focus:border-brand-teal-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                {mode === 'signin' && (
                  <span className="text-[11px] text-slate-400 italic">
                    Min 6 characters
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal-500/20 focus:border-brand-teal-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                disabled={!isConfigured}
                className="w-full justify-center"
              >
                <KeyRound className="w-4 h-4 mr-1.5" />
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Button>
            </div>
          </form>

          {/* Local Dev shortcut footer if unconfigured */}
          {!isConfigured && (
            <div className="pt-2 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                Running in local workshop environment?{' '}
                <button
                  type="button"
                  onClick={handleDevLogin}
                  className="text-brand-teal-600 hover:text-brand-teal-700 font-semibold underline"
                >
                  Continue with Local Dev Profile
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
