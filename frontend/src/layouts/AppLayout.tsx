import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { TopNav } from '../components/navigation/TopNav';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav onOpenSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200/80 bg-white py-4 px-6 text-center sm:flex sm:justify-between sm:items-center text-xs text-slate-400">
          <div>
            <span className="font-semibold text-brand-navy-900">TATVIK</span> — Beyond Data. Discover the Truth.
          </div>
          <div className="mt-2 sm:mt-0 font-mono text-[11px]">
            Phase 1 Foundation & Dashboard Architecture
          </div>
        </footer>
      </div>
    </div>
  );
};
