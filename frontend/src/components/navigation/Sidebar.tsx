import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  ShieldCheck,
  FileCheck2,
  History,
  Settings,
  Activity,
  Layers,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { checkBackendHealth } from '../../lib/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      const result = await checkBackendHealth();
      if (isMounted) {
        setBackendOnline(result.online);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Datasets', path: '/datasets', icon: Database },
    { name: 'Data Quality', path: '/quality', icon: ShieldCheck },
    { name: 'Research Verification', path: '/verification', icon: FileCheck2 },
    { name: 'Audit Logs', path: '/audit', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-navy-950/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-brand-navy text-slate-300',
          'flex flex-col border-r border-brand-navy-800 transition-transform duration-200 ease-in-out',
          'lg:translate-x-0 lg:static lg:h-screen',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header / Brand Wordmark */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-navy-800/80">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-teal-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                T
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                TATVIK
              </span>
            </div>
            <p className="text-[11px] font-medium text-brand-teal-400 mt-1 uppercase tracking-wider">
              Data Intelligence
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tagline micro banner */}
        <div className="px-6 py-2.5 bg-brand-navy-950/40 border-b border-brand-navy-800/50">
          <p className="text-[11px] text-slate-400 italic">
            Beyond Data. Discover the Truth.
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-teal-600/20 text-brand-teal-300 font-semibold border-l-2 border-brand-teal-500 rounded-l-none'
                    : 'text-slate-400 hover:bg-brand-navy-800/70 hover:text-slate-200'
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer info: Backend status & phase */}
        <div className="p-4 border-t border-brand-navy-800/80 bg-brand-navy-950/30 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              Backend API
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium',
                backendOnline === true && 'bg-emerald-950/60 text-emerald-300 border border-emerald-800',
                backendOnline === false && 'bg-rose-950/60 text-rose-300 border border-rose-800',
                backendOnline === null && 'bg-slate-800 text-slate-400'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  backendOnline === true && 'bg-emerald-400',
                  backendOnline === false && 'bg-rose-400',
                  backendOnline === null && 'bg-slate-400'
                )}
              />
              {backendOnline === true
                ? 'Online'
                : backendOnline === false
                ? 'Offline'
                : 'Checking'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Platform Roadmap
            </span>
            <span className="text-brand-saffron-400 font-mono text-[11px] font-medium">
              Phase 1
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
