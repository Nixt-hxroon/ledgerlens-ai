import React from 'react';
import { Menu, Search, Bell, Calendar as CalendarIcon, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Header = ({ title = 'Dashboard', onToggleMobile, activeFilter = 'Month', onFilterChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const filters = ['Day', 'Week', 'Month', 'Year'];

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 px-4 sm:px-6 mb-2">
      {/* Page Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="lg:hidden p-2 text-zinc-600 hover:text-zinc-900 bg-white rounded-full border border-zinc-200 shadow-sm"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-950 tracking-tight">{title}</h2>
        </div>
      </div>

      {/* Center/Right Controls matching reference image */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Day / Week / Month / Year Pill Selector */}
        <div className="hidden sm:flex items-center bg-white p-1 rounded-full border border-zinc-200/80 shadow-soft">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange && onFilterChange(f)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 ${
                activeFilter === f
                  ? 'bg-[#111113] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Global Date Indicator Pill */}
        <div className="hidden xl:flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-zinc-200/80 shadow-soft text-xs font-semibold text-zinc-700">
          <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
          <span>Active Period: Q4 2026</span>
        </div>

        {/* Search Bar Pill */}
        <div className="relative flex-1 sm:w-60">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents, vendors..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-full border border-zinc-200/80 shadow-soft text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-800 transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                navigate(`/documents?search=${encodeURIComponent(e.target.value.trim())}`);
              }
            }}
          />
        </div>

        {/* Notifications Button */}
        <button
          onClick={() => navigate('/validation')}
          className="p-2.5 bg-white text-zinc-600 hover:text-zinc-950 rounded-full border border-zinc-200/80 shadow-soft transition-colors relative"
          title="Validation Center Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 ring-2 ring-white" />
        </button>

        {/* Profile Avatar Pill */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 p-1.5 pr-3 bg-white hover:bg-zinc-50 rounded-full border border-zinc-200/80 shadow-soft transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#111113] text-white flex items-center justify-center font-bold text-xs">
            {user?.full_name?.charAt(0) || <User className="w-3.5 h-3.5" />}
          </div>
          <span className="text-xs font-semibold text-zinc-800 hidden md:inline">
            {user?.full_name?.split(' ')[0] || 'Account'}
          </span>
        </button>
      </div>
    </header>
  );
};
