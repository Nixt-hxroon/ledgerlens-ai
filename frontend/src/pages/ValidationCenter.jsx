import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  ArrowRight,
  RefreshCw,
  Filter,
  Check,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { validationService } from '../services/validationService';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';

const SEVERITIES = ['All', 'Critical Issue', 'Warning', 'Review Required'];

export const ValidationCenter = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [resolvingId, setResolvingId] = useState(null);

  const toast = useToast();
  const navigate = useNavigate();

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const data = await validationService.getValidationIssues({
        severity: selectedSeverity !== 'All' ? selectedSeverity : undefined,
        status: 'Open',
      });
      setIssues(data.issues || []);
    } catch (err) {
      toast.error('Failed to load validation issues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [selectedSeverity]);

  const handleResolve = async (issueId) => {
    setResolvingId(issueId);
    try {
      await validationService.updateIssueStatus(issueId, 'Resolved');
      toast.success('Validation item marked as resolved.');
      setIssues((prev) => prev.filter((i) => i.id !== issueId));
    } catch (err) {
      toast.error('Could not resolve issue.');
    } finally {
      setResolvingId(null);
    }
  };

  const criticalCount = issues.filter((i) => i.severity === 'Critical Issue').length;
  const warningCount = issues.filter((i) => i.severity === 'Warning').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header and Summary Strip */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/70 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-zinc-950 tracking-tight">
                Document Validation Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold">
                {issues.length} Open Anomaly Alerts
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
              Deterministic mathematical checks, duplicate detection, and date chronology validations.
              LedgerLens AI flags discrepancies programmatically without relying on LLM arithmetic.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/60 text-center px-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Critical</p>
              <p className="text-xl font-extrabold text-rose-700 mt-0.5">{criticalCount}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/60 text-center px-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Warnings</p>
              <p className="text-xl font-extrabold text-amber-700 mt-0.5">{warningCount}</p>
            </div>
          </div>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-zinc-100 overflow-x-auto">
          {SEVERITIES.map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                selectedSeverity === sev
                  ? 'bg-[#111113] text-white shadow-sm'
                  : 'bg-zinc-100/80 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Issues List */}
      <Card rounded="3xl">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-zinc-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-500">Running validation checks...</p>
          </div>
        ) : issues.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All documents validated!"
            description="No open validation issues found. All uploaded business files comply with arithmetic, schema, and vendor checks."
            actionLabel="View All Documents"
            onAction={() => navigate('/documents')}
          />
        ) : (
          <div className="divide-y divide-zinc-100">
            {issues.map((issue) => (
              <div key={issue.id} className="py-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                      issue.severity === 'Critical Issue'
                        ? 'bg-rose-100 text-rose-600'
                        : 'bg-amber-100 text-amber-600'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-900 font-mono">
                        {issue.issue_type}
                      </span>
                      <Badge variant={issue.severity}>{issue.severity}</Badge>
                      <span className="text-xs text-zinc-400">•</span>
                      <span className="text-xs font-semibold text-zinc-600">
                        Field: <strong className="font-mono text-zinc-900">{issue.field_name}</strong>
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                      {issue.explanation}
                    </p>

                    <div className="flex items-center gap-4 text-xs font-mono pt-1">
                      <div className="bg-zinc-100 px-2.5 py-1 rounded-xl text-zinc-700">
                        Extracted: <span className="font-bold">{issue.extracted_value || 'None'}</span>
                      </div>
                      <div className="bg-emerald-50 px-2.5 py-1 rounded-xl text-emerald-800 border border-emerald-200/60">
                        Expected: <span className="font-bold">{issue.expected_value}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 pt-0.5">
                      Origin file:{' '}
                      <strong className="text-zinc-700">{issue.document_name}</strong> ({issue.document_type})
                    </p>
                  </div>
                </div>

                {/* Issue Actions */}
                <div className="flex items-center gap-2 shrink-0 md:pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/documents/${issue.document_id}`)}
                    icon={ExternalLink}
                  >
                    Inspect File
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={resolvingId === issue.id}
                    onClick={() => handleResolve(issue.id)}
                    icon={Check}
                  >
                    Mark Resolved
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

