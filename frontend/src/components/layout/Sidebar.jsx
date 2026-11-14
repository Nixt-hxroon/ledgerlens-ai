import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  CheckCircle2,
  GitCompare,
  Sparkles,
  Settings,
  LogOut,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const NAV_ITEMS = [
  { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'Upload Documents', path: '/upload', icon: UploadCloud },
  { name: 'Validation Center', path: '/validation', icon: CheckCircle2 },
  { name: 'Cross-Document', path: '/comparison', icon: GitCompare },
  { name: 'AI Insights', path: '/insights', icon: Sparkles },
];

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully.');
      navigate('/login');
    } catch (e) {
      toast.error('Logout failed.');
    }
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-zinc-200/80 p-5 shadow-soft">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-2 py-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-[#111113] flex items-center justify-center text-white shadow-sm">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <circle cx="11" cy="14" r="3" />
            <path d="m15 17 2 2" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-zinc-950">LedgerLens</h1>
          <p className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">AI Document Intel</p>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen && setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#111113] text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System Status / Engine Card (Mirrors "Upgrade To Pro" card in reference image) */}
      <div className="my-5 p-4 rounded-3xl bg-[#111113] text-white shadow-elevated border border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400">Gemini 2.0 Engine</span>
        </div>
        <h4 className="text-xs font-bold text-zinc-100 leading-snug">Intelligent IDP Active</h4>
        <p className="text-[11px] text-zinc-400 mt-1 leading-normal">
          Automated multi-modal parsing & deterministic math validation.
        </p>
        <button
          onClick={() => navigate('/insights')}
          className="mt-3 w-full py-1.5 px-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
        >
          Explore Insights
        </button>
      </div>

      {/* Bottom Profile & Settings Section */}
      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <NavLink
          to="/settings"
          onClick={() => setMobileOpen && setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
              isActive ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
            }`
          }
        >
          <Settings className="w-4 h-4 text-zinc-500" />
          <span>Settings</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          <span>Log out</span>
        </button>

        {/* User Badge */}
        {user && (
          <div className="mt-2 flex items-center gap-3 px-3 py-2 rounded-2xl bg-zinc-50 border border-zinc-200/50">
            <div className="w-8 h-8 rounded-full bg-zinc-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user.full_name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-zinc-900 truncate">{user.full_name}</p>
              <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 p-4 shrink-0">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full p-4 z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
