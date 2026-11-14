import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Clock,
  Layers,
  ChevronRight,
  RefreshCw,
  Building2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../services/analyticsService';
import { documentService } from '../services/documentService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const context = useOutletContext();
  const activeFilter = context?.activeFilter || 'Month';

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const data = await analyticsService.getDashboard();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-zinc-500">Loading intelligent workspace...</p>
        </div>
      </div>
    );
  }

  const summary = metrics?.summary || {
    totalDocuments: 0,
    successfullyProcessed: 0,
    pendingReview: 0,
    validationIssuesCount: 0,
    totalInvoiceValue: 0,
  };

  const monthlyData = metrics?.charts?.monthlyProcessing || [];
  const topVendors = metrics?.charts?.topVendors || [];
  const recentDocs = metrics?.recentDocuments || [];

  const COLORS = ['#111113', '#71717A', '#A1A1AA', '#D4D4D8'];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-zinc-200/70 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Auditor'}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </div>
          <p className="text-xs font-medium text-zinc-500 mt-1">
            Your intelligent document processing workspace. Gemini AI & deterministic validation active.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
            icon={RefreshCw}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/documents')}
            icon={FileText}
          >
            All Documents
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/upload')}
            icon={UploadCloud}
          >
            Upload Document
          </Button>
        </div>
      </div>

      {/* Row 1: Summary Metric Cards (Exact match to reference image 1 styling) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contrast Dark Card for Total Revenue / Value */}
        <Card variant="dark" rounded="3xl" className="relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Invoice Value</span>
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold tracking-tight text-white">
              {formatCurrency(summary.totalInvoiceValue)}
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs font-semibold text-emerald-400 flex items-center">
                ↑ 100% verified
              </span>
              <span className="text-xs text-zinc-400">from processed files</span>
            </div>
          </div>
        </Card>

        {/* Total Documents Card */}
        <Card variant="white" rounded="3xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Documents</span>
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold tracking-tight text-zinc-950">
              {summary.totalDocuments}
            </h3>
            <p className="text-xs font-medium text-zinc-500 mt-2">
              Invoices, POs & Receipts
            </p>
          </div>
        </Card>

        {/* Successfully Processed */}
        <Card variant="white" rounded="3xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Successfully Processed</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold tracking-tight text-zinc-950">
              {summary.successfullyProcessed}
            </h3>
            <p className="text-xs font-medium text-emerald-600 mt-2">
              Clean validation pass
            </p>
          </div>
        </Card>

        {/* Validation Issues Flagged */}
        <Card
          variant="white"
          rounded="3xl"
          onClick={() => navigate('/validation')}
          className="cursor-pointer hover:border-amber-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Validation Issues</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold tracking-tight text-zinc-950">
              {summary.validationIssuesCount}
            </h3>
            <p className="text-xs font-medium text-amber-600 mt-2 flex items-center gap-1">
              Review Required in Center <ArrowUpRight className="w-3.5 h-3.5" />
            </p>
          </div>
        </Card>
      </div>

      {/* Row 2: Analytics Charts & Insights Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart: Processing Volume Over Time */}
        <Card rounded="3xl" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-950">Document Processing & Financial Volume</h3>
              <p className="text-xs text-zinc-500">Distribution of documents and value over recent calendar months</p>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="p-2 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke="#A1A1AA"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#A1A1AA"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#111113] text-white p-3 rounded-2xl shadow-elevated border border-zinc-800 text-xs">
                          <p className="font-bold text-zinc-200">{data.name}</p>
                          <p className="text-emerald-400 font-semibold mt-1">Amount: {formatCurrency(data.amount)}</p>
                          <p className="text-zinc-400">Documents: {data.count}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" radius={[8, 8, 8, 8]} barSize={34}>
                  {monthlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === monthlyData.length - 1 ? '#111113' : '#71717A'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right Panel: Top Vendors & Category Breakdown */}
        <Card rounded="3xl" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-950">Top Vendors by Spend</h3>
              <span className="text-xs font-semibold text-zinc-400">Ranked</span>
            </div>

            {topVendors.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400">
                No vendor spending data yet. Upload an invoice to view supplier rankings.
              </div>
            ) : (
              <div className="space-y-3">
                {topVendors.slice(0, 4).map((v, i) => (
                  <div
                    key={v.name}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200/50"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-zinc-900 truncate">{v.name}</p>
                        <p className="text-[11px] text-zinc-500">{v.count} invoice(s)</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-zinc-900 shrink-0">
                      {formatCurrency(v.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick AI Query CTA banner */}
          <div className="mt-6 p-4 rounded-2xl bg-zinc-100 border border-zinc-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs font-bold text-zinc-900">Ask Document Questions</p>
                <p className="text-[11px] text-zinc-500">Natural language AI queries</p>
              </div>
            </div>
            <Button
              variant="dark"
              size="sm"
              onClick={() => navigate('/insights')}
            >
              Ask AI
            </Button>
          </div>
        </Card>
      </div>

      {/* Row 3: Recent Documents Table */}
      <Card rounded="3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950">Recent Documents</h3>
            <p className="text-xs text-zinc-500">Latest business files processed through the IDP pipeline</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/documents')}
            icon={ChevronRight}
          >
            View All
          </Button>
        </div>

        {recentDocs.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-700">No documents uploaded yet</p>
            <p className="text-xs text-zinc-500 mt-1 mb-4">Upload your first invoice or purchase order to get started</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/upload')}>
              Upload Document
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">Document Name</th>
                  <th className="pb-3 px-3">Category</th>
                  <th className="pb-3 px-3">Vendor / Entity</th>
                  <th className="pb-3 px-3">Doc Number</th>
                  <th className="pb-3 px-3">Uploaded</th>
                  <th className="pb-3 px-3">Amount</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 text-xs">
                {recentDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className="hover:bg-zinc-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-3 font-semibold text-zinc-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate max-w-[180px]">{doc.filename}</span>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="ghost" size="sm">
                        {doc.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-medium text-zinc-700">{doc.vendor}</td>
                    <td className="py-3 px-3 font-mono text-zinc-500">{doc.document_number}</td>
                    <td className="py-3 px-3 text-zinc-500">{formatDate(doc.uploaded_at)}</td>
                    <td className="py-3 px-3 font-bold text-zinc-900">
                      {formatCurrency(doc.amount, doc.currency)}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={doc.validation_status || doc.processing_status}>
                        {doc.validation_status === 'Valid' ? 'Valid' : doc.validation_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-xs font-bold text-zinc-800 group-hover:text-black underline underline-offset-2">
                        Inspect →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
