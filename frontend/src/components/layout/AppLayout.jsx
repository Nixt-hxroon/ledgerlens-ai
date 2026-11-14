import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const TITLE_MAP = {
  '/dashboard': 'Dashboard',
  '/documents': 'Documents Management',
  '/upload': 'Upload Documents',
  '/validation': 'Validation Center',
  '/comparison': 'Cross-Document Intelligence',
  '/insights': 'Knowledge Discovery & Insights',
  '/settings': 'Account Settings',
};

export const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Month');
  const location = useLocation();

  const title = TITLE_MAP[location.pathname] || 'LedgerLens AI';

  return (
    <div className="min-h-screen bg-[#F0F0F3] flex">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden">
        <Header
          title={title}
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <main className="flex-1 px-4 sm:px-6 pb-8 overflow-y-auto">
          <Outlet context={{ activeFilter }} />
        </main>
      </div>
    </div>
  );
};

