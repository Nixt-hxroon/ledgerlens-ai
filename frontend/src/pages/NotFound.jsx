import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#F0F0F3] flex items-center justify-center p-6 text-center">
      <div className="max-w-md bg-white p-10 rounded-3xl border border-zinc-200/80 shadow-soft">
        <div className="w-16 h-16 rounded-3xl bg-zinc-100 flex items-center justify-center text-zinc-600 mx-auto mb-4">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Page Not Found</h1>
        <p className="text-xs text-zinc-500 mt-2 mb-6">
          The requested page or document location does not exist in LedgerLens AI.
        </p>
        <Link to="/dashboard">
          <Button variant="primary" icon={ArrowLeft}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
