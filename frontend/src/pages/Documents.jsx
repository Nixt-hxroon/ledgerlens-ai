import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  ExternalLink,
  Download,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  Plus,
  Printer,
  FileCheck,
  Eye,
  Layers,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { documentService } from '../services/documentService';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency, formatDate } from '../utils/formatters';

const CATEGORIES = ['All', 'Invoice', 'Purchase Order', 'Receipt', 'Other'];
const STATUSES = ['All', 'Processed', 'Review Required', 'Processing', 'Failed'];

export const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // View Mode: 'table' | 'invoices'
  const [viewMode, setViewMode] = useState(searchParams.get('view') === 'invoices' ? 'invoices' : 'table');
  const [arrangedData, setArrangedData] = useState(null);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Filters & Ordering
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'All');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('uploaded_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await documentService.getDocuments({
        category: selectedCategory,
        status: selectedStatus,
        search: searchQuery,
        sortBy,
        sortOrder,
        limit: 100,
      });
      setDocuments(data.documents || []);
    } catch (err) {
      toast.error('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  const fetchArrangedInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const data = await documentService.getArrangedInvoices({
        category: selectedCategory,
        status: selectedStatus,
        sortBy,
        sortOrder,
      });
      setArrangedData(data);
    } catch (err) {
      toast.error('Failed to load arranged document invoices.');
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'invoices') {
      fetchArrangedInvoices();
    } else {
      fetchDocuments();
    }
  }, [viewMode, selectedCategory, selectedStatus, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleReprocess = async (e, id) => {
    e.stopPropagation();
    try {
      toast.info('Reprocessing document with AI...');
      await documentService.reprocessDocument(id);
      toast.success('Document reprocessed successfully.');
      fetchDocuments();
    } catch (err) {
      toast.error('Reprocess failed: ' + err.message);
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await documentService.deleteDocument(docToDelete.id);
      toast.success(`"${docToDelete.original_filename}" deleted.`);
      setDeleteModalOpen(false);
      setDocToDelete(null);
      fetchDocuments();
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/70 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-zinc-950 tracking-tight">Documents Repository</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Arrange, audit, and generate invoices across all your ingested documents & spreadsheets
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex bg-zinc-100 p-1 rounded-full border border-zinc-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Table View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('invoices')}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 ${
                  viewMode === 'invoices'
                    ? 'bg-[#111113] text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" /> Arranged Invoices ({documents.length})
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/upload')}
              icon={Plus}
            >
              Upload Document
            </Button>
          </div>
        </div>

        {/* Search, Category Pills & Arranging Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-zinc-100">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#111113] text-white shadow-sm'
                    : 'bg-zinc-100/80 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar, Arrange Order & Status Filter */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search file, vendor, doc #..."
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-800"
              />
            </form>

            {/* Arrange Order Dropdown */}
            <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-full px-2 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 ml-1" />
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split(':');
                  setSortBy(sb);
                  setSortOrder(so);
                }}
                className="bg-transparent text-xs font-semibold text-zinc-700 focus:outline-none pr-1"
                title="Arrange documents by"
              >
                <option value="uploaded_at:desc">Arrange: Newest First</option>
                <option value="uploaded_at:asc">Arrange: Oldest First</option>
                <option value="total_amount:desc">Arrange: Amount (High to Low)</option>
                <option value="total_amount:asc">Arrange: Amount (Low to High)</option>
                <option value="original_filename:asc">Arrange: Name (A-Z)</option>
                <option value="vendor_name:asc">Arrange: Vendor (A-Z)</option>
              </select>
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-full text-xs font-semibold text-zinc-700 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Processed">Processed</option>
              <option value="Review Required">Review Required</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: TABLE VIEW */}
      {viewMode === 'table' && (
        <Card rounded="3xl">
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-zinc-500">Querying documents repository...</p>
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents found"
              description="No documents matched your current search criteria. Try modifying your filters or upload a new file."
              actionLabel="Upload First Document"
              onAction={() => navigate('/upload')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="pb-3 px-3">Document Name</th>
                    <th className="pb-3 px-3">Category</th>
                    <th className="pb-3 px-3">Vendor / Entity</th>
                    <th className="pb-3 px-3">Doc #</th>
                    <th className="pb-3 px-3">Uploaded</th>
                    <th className="pb-3 px-3">Total Amount</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 text-xs">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="hover:bg-zinc-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-3 font-semibold text-zinc-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="truncate max-w-[200px]">{doc.original_filename}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant="ghost" size="sm">
                          {doc.document_type}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-zinc-700">
                        {doc.vendor_name || 'N/A'}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-zinc-500">
                        {doc.invoice_number || 'N/A'}
                      </td>
                      <td className="py-3.5 px-3 text-zinc-500">{formatDate(doc.uploaded_at)}</td>
                      <td className="py-3.5 px-3 font-bold text-zinc-950">
                        {formatCurrency(doc.total_amount, doc.currency)}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant={doc.validation_status || doc.processing_status}>
                          {doc.validation_status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            title="View Generated Invoice"
                            className="p-1.5 text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleReprocess(e, doc.id)}
                            title="Reprocess with AI"
                            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`${import.meta.env.VITE_API_BASE_URL || '/api'}/documents/${doc.id}/file${localStorage.getItem('ledgerlens_access_token') ? `?token=${localStorage.getItem('ledgerlens_access_token')}` : ''}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Download Document"
                            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => {
                              setDocToDelete(doc);
                              setDeleteModalOpen(true);
                            }}
                            title="Delete Document"
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* VIEW MODE 2: ARRANGED INVOICES SEQUENTIAL PACK */}
      {viewMode === 'invoices' && (
        <div className="space-y-6">
          {/* Arranged Invoices Summary Header */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-[#111113] text-white p-6 rounded-3xl shadow-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold tracking-tight">
                  Arranged Commercial Invoices Pack
                </h2>
              </div>
              <p className="text-xs text-zinc-400">
                Displaying each uploaded document's commercial invoice, arranged sequentially by{' '}
                <strong className="text-white capitalize">
                  {sortBy.replace(/_/g, ' ')} ({sortOrder === 'asc' ? 'ascending' : 'descending'})
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right sm:border-r sm:border-zinc-700 sm:pr-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Cumulative Valuation
                </span>
                <span className="text-lg font-black text-amber-400">
                  {formatCurrency(arrangedData?.cumulativeTotal || 0, arrangedData?.currency || 'USD')}
                </span>
              </div>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-zinc-900 bg-white rounded-2xl hover:bg-zinc-100 transition-all shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print All Invoices
              </button>
            </div>
          </div>

          {/* Sequential Invoices */}
          {invoicesLoading ? (
            <Card rounded="3xl" className="py-20 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-zinc-500">
                Arranging documents and generating commercial invoices...
              </p>
            </Card>
          ) : !arrangedData || arrangedData.invoices?.length === 0 ? (
            <Card rounded="3xl">
              <EmptyState
                icon={Receipt}
                title="No invoices to arrange"
                description="Upload documents or spreadsheets (.csv, .xlsx, .xlsm) to generate and arrange commercial invoices."
                actionLabel="Upload New Documents"
                onAction={() => navigate('/upload')}
              />
            </Card>
          ) : (
            <div className="space-y-8">
              {arrangedData.invoices.map((inv, index) => (
                <div
                  key={inv.document_id || index}
                  className="bg-white rounded-3xl border border-zinc-200/80 shadow-soft overflow-hidden"
                >
                  {/* Sequence Bar */}
                  <div className="bg-zinc-50 px-6 py-3 border-b border-zinc-200/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-zinc-900 text-white">
                        Invoice #{index + 1} of {arrangedData.invoices.length}
                      </span>
                      <span className="text-xs font-semibold text-zinc-700 truncate max-w-xs">
                        {inv.original_filename}
                      </span>
                      <Badge variant="ghost" size="sm">
                        {inv.category}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/documents/${inv.document_id}`)}
                        icon={ArrowRight}
                      >
                        Inspect Workspace
                      </Button>
                    </div>
                  </div>

                  {/* Commercial Invoice Body */}
                  <div className="p-8 space-y-6">
                    {/* Header: Vendor & Invoice Meta */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-200 pb-6">
                      <div>
                        <h3 className="text-xl font-black text-zinc-950 uppercase tracking-tight">
                          {inv.vendor.name}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">{inv.vendor.address}</p>
                        <p className="text-xs text-zinc-500">{inv.vendor.contact}</p>
                      </div>

                      <div className="sm:text-right">
                        <span className="text-2xl font-black tracking-tight text-zinc-950 block">
                          COMMERCIAL INVOICE
                        </span>
                        <p className="text-xs font-mono font-bold text-zinc-700 mt-0.5">
                          #{inv.invoice_number}
                        </p>
                        <div className="mt-1">
                          <Badge variant={inv.audit.validation_status}>
                            {inv.audit.validation_status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Customer & Payment Meta Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                          Billed To (Client / Customer)
                        </span>
                        <p className="font-extrabold text-zinc-900 text-sm">{inv.customer.name}</p>
                        <p className="text-zinc-500 mt-0.5">{inv.customer.address}</p>
                        {inv.customer.purchase_order_number && (
                          <p className="text-[11px] font-mono text-zinc-700 mt-1.5">
                            Referenced PO: <strong>{inv.customer.purchase_order_number}</strong>
                          </p>
                        )}
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Document Date:</span>
                          <span className="font-semibold">{formatDate(inv.document_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Payment Due:</span>
                          <span className="font-semibold">{formatDate(inv.due_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Payment Terms:</span>
                          <span className="font-semibold">{inv.financials.payment_terms}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Currency:</span>
                          <span className="font-mono font-bold">{inv.financials.currency}</span>
                        </div>
                      </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="border border-zinc-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase border-b border-zinc-200">
                          <tr>
                            <th className="py-2.5 px-4">Item Description</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Unit Price</th>
                            <th className="py-2.5 px-4 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-medium">
                          {inv.line_items.map((li, idx) => (
                            <tr key={li.id || idx} className="hover:bg-zinc-50/50">
                              <td className="py-2.5 px-4 font-semibold text-zinc-900">{li.description}</td>
                              <td className="py-2.5 px-3 text-right text-zinc-600">{li.quantity}</td>
                              <td className="py-2.5 px-3 text-right text-zinc-600">
                                {formatCurrency(li.unit_price, inv.financials.currency)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-zinc-950">
                                {formatCurrency(li.total_amount, inv.financials.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Financial Totals & Verification Badge */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-2">
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs space-y-1 max-w-sm">
                        <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>LedgerLens Forensic Verified</span>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                          Autonomous AI audit completed with an audit score of{' '}
                          <strong>{inv.audit.audit_score}/100</strong>.
                        </p>
                      </div>

                      <div className="w-full sm:w-64 space-y-2 text-xs text-right">
                        <div className="flex justify-between text-zinc-600">
                          <span>Subtotal:</span>
                          <span className="font-semibold">
                            {formatCurrency(inv.financials.subtotal, inv.financials.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-600">
                          <span>Tax Amount:</span>
                          <span className="font-semibold">
                            {formatCurrency(inv.financials.tax_amount, inv.financials.currency)}
                          </span>
                        </div>
                        {inv.financials.discount > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>Discount:</span>
                            <span className="font-semibold">
                              -{formatCurrency(inv.financials.discount, inv.financials.currency)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-zinc-950 font-black text-lg pt-2 border-t border-zinc-200">
                          <span>Grand Total Due:</span>
                          <span className="text-zinc-950">
                            {formatCurrency(inv.financials.total_amount, inv.financials.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Document Deletion */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Deletion"
        subtitle="This action cannot be undone."
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Are you sure you want to permanently delete{' '}
            <strong className="text-zinc-900">"{docToDelete?.original_filename}"</strong>? All
            extracted records, line items, and validation history for this document will be
            removed.
          </p>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={confirmDelete}
              loading={deleting}
            >
              Delete Document
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

