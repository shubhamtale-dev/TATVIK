import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  CheckCircle2,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';

interface TopNavProps {
  onOpenSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenSidebar }) => {
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, signOut, openAuthModal } = useAuth();

  const getPageMeta = (pathname: string) => {
    switch (pathname) {
      case '/':
        return { title: 'Dashboard', section: 'Overview' };
      case '/datasets':
        return { title: 'Datasets', section: 'Data Management' };
      case '/quality':
        return { title: 'Data Quality Engine', section: 'Verification' };
      case '/verification':
        return { title: 'Research Verification', section: 'Evidence' };
      case '/audit':
        return { title: 'Audit Logs', section: 'Governance' };
      case '/settings':
        return { title: 'Settings', section: 'System' };
      default:
        return { title: 'Dashboard', section: 'Overview' };
    }
  };

  const { title, section } = getPageMeta(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200/80 shadow-2xs">
      {/* Left: Mobile hamburger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 text-slate-500 rounded-lg lg:hidden hover:bg-slate-100 focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 font-medium hidden sm:inline">
            {section}
          </span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <h1 className="text-base font-semibold text-brand-navy-900 tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Middle: Global Search Placeholder (Clearly marked disabled) */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            disabled
            placeholder="Search datasets, records, evidence (Coming in Phase 2)..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-400 cursor-not-allowed select-none placeholder:text-slate-400"
            title="Global search will be activated in Phase 2 with full-text indexing"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-slate-200/70 text-slate-500 px-1.5 py-0.5 rounded">
            DEV
          </span>
        </div>
      </div>

      {/* Right: Notifications & User Area */}
      <div className="flex items-center gap-3">
        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 text-left">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <span className="text-xs font-semibold text-brand-navy-900">Notifications</span>
                <span className="text-[10px] text-slate-400">Phase 1 Mockup</span>
              </div>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-brand-teal-500 mb-2 stroke-[1.5]" />
                <p className="text-xs font-medium text-slate-700">No Unread Alerts</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                  Real-time pipeline notifications and quality alerts will connect in Phase 3.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-brand-teal-600 hover:text-brand-teal-700 font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User profile / Authentication Area */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-teal-100 border border-brand-teal-300 flex items-center justify-center text-brand-teal-800 font-bold text-xs">
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
                    {user.email?.split('@')[0] || 'User'}
                  </span>
                  <Badge variant="teal" size="sm">
                    Auth
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{user.email}</p>
              </div>
              <button
                onClick={signOut}
                title="Sign out of current session"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-teal-600 text-white hover:bg-brand-teal-700 shadow-2xs transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
