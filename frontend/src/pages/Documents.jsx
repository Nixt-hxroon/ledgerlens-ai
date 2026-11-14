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

  // Filters
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

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory, selectedStatus, sortBy, sortOrder]);

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
            <p className="text-xs text-zinc-500 mt-1">Manage, search, and audit your ingested financial records</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/upload')}
            icon={Plus}
          >
            Upload New Document
          </Button>
        </div>

        {/* Search & Category Pills */}
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

          {/* Search bar & Status Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by file or vendor..."
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-800"
              />
            </form>

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

      {/* Documents Table */}
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
                          onClick={(e) => handleReprocess(e, doc.id)}
                          title="Reprocess with AI"
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`http://localhost:5000/api/documents/${doc.id}/file`}
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

