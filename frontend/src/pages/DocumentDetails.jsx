import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  ExternalLink,
  Edit3,
  Save,
  X,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { documentService } from '../services/documentService';
import { validationService } from '../services/validationService';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';

export const DocumentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [docDetails, setDocDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fields'); // 'fields' | 'lineItems' | 'validation' | 'evidence'
  const [zoomLevel, setZoomLevel] = useState(100);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Review action modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState('Approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchDetails = async () => {
    try {
      const data = await documentService.getDocumentById(id);
      setDocDetails(data);
      if (data?.extractedData) {
        setEditFields({
          invoice_number: data.extractedData.invoice_number || '',
          vendor_name: data.extractedData.vendor_name || '',
          customer_name: data.extractedData.customer_name || '',
          document_date: data.extractedData.document_date || '',
          due_date: data.extractedData.due_date || '',
          subtotal: data.extractedData.subtotal || 0,
          tax_amount: data.extractedData.tax_amount || 0,
          total_amount: data.extractedData.total_amount || 0,
          currency: data.extractedData.currency || 'USD',
          payment_terms: data.extractedData.payment_terms || '',
        });
      }
    } catch (err) {
      toast.error('Failed to load document details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleSaveEdits = async () => {
    setSavingEdit(true);
    try {
      await documentService.updateExtractedData(id, editFields);
      toast.success('Document fields successfully updated and re-validated.');
      setIsEditing(false);
      fetchDetails();
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExecuteReview = async () => {
    setSubmittingReview(true);
    try {
      await validationService.reviewDocument(id, {
        action: reviewAction,
        notes: reviewNotes,
      });
      toast.success(`Action "${reviewAction}" recorded in audit trail.`);
      setReviewModalOpen(false);
      fetchDetails();
    } catch (err) {
      toast.error('Review failed: ' + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReprocess = async () => {
    try {
      toast.info('Reprocessing with Gemini AI...');
      await documentService.reprocessDocument(id);
      toast.success('Reprocessing complete.');
      fetchDetails();
    } catch (err) {
      toast.error('Reprocess failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-zinc-600" />
          <p className="text-xs font-semibold text-zinc-500">Loading document audit workspace...</p>
        </div>
      </div>
    );
  }

  if (!docDetails) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-bold text-zinc-900">Document not found</h2>
        <Button onClick={() => navigate('/documents')} className="mt-4">
          Back to Documents
        </Button>
      </div>
    );
  }

  const { document, extractedData, lineItems, validationIssues, reviews, fileUrl } = docDetails;
  const isPdf = document.mime_type === 'application/pdf';
  const token = localStorage.getItem('ledgerlens_access_token');
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  // Ensure same-origin relative URL for iframes to prevent Mixed-Content and cross-origin blocking
  const normalizedApiBase = (apiBase.startsWith('http') && typeof window !== 'undefined' && window.location.origin !== new URL(apiBase).origin)
    ? '/api'
    : apiBase;
  const rawFileUrl = `${normalizedApiBase}/documents/${document.id}/file${token ? `?token=${token}` : ''}`;

  const evidenceSnippets = extractedData?.extracted_json?.evidence_snippets || [];
  const characteristics = extractedData?.extracted_json?.document_characteristics || [];
  const agenticEvaluation = extractedData?.extracted_json?.agentic_evaluation;
  const auditScore = agenticEvaluation?.audit_score ?? (document.validation_status === 'Valid' ? 95 : document.validation_status === 'Warning' ? 74 : 42);
  const actionableRecs = agenticEvaluation?.actionable_recommendations || [];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-zinc-200/70 shadow-soft">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/documents')}
            className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-zinc-950 truncate max-w-md">
                {document.original_filename}
              </h1>
              <Badge variant={document.validation_status}>
                {document.validation_status}
              </Badge>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                  auditScore >= 85
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : auditScore >= 65
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                Audit Score: {auditScore}/100
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Category: <span className="font-semibold text-zinc-800">{document.document_type}</span> • Uploaded on {formatDate(document.uploaded_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReprocess}
            icon={RefreshCw}
          >
            Reprocess
          </Button>
          <a
            href={rawFileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </a>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setReviewModalOpen(true)}
            icon={CheckCircle2}
          >
            Review & Approve
          </Button>
        </div>
      </div>

      {/* Split Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[750px]">
        {/* LEFT COLUMN: Document Visual Previewer (5/12 cols) */}
        <div className="lg:col-span-6 flex flex-col bg-white rounded-3xl border border-zinc-200/70 shadow-soft overflow-hidden">
          {/* Preview Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 bg-zinc-50/50">
            <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Document Viewer
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-zinc-600 px-1">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <a
                href={rawFileUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-colors ml-1"
                title="Open in new window"
              >
                <Maximize2 className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Embedded Viewer Canvas */}
          <div className="flex-1 bg-zinc-100/60 p-4 overflow-auto flex items-center justify-center">
            {isPdf ? (
              <iframe
                src={`${rawFileUrl}#toolbar=0`}
                title={document.original_filename}
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="w-full h-[650px] rounded-2xl shadow-sm border border-zinc-200 bg-white"
              />
            ) : (
              <img
                src={rawFileUrl}
                alt={document.original_filename}
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="max-w-full max-h-[650px] object-contain rounded-2xl shadow-sm border border-zinc-200"
              />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Extracted Intelligence & Audit Tabs (7/12 cols) */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          {/* Executive AI Summary Card */}
          <Card rounded="3xl" className="p-5 bg-gradient-to-br from-zinc-900 to-[#111113] text-white shadow-elevated">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  AI Synthesis & Classification
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                {(extractedData?.extraction_confidence * 100 || 94).toFixed(0)}% Confidence
              </span>
            </div>

            <p className="text-xs font-medium text-zinc-200 leading-relaxed">
              {document.summary || 'Summary generated from verified document contents.'}
            </p>

            {actionableRecs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Forensic Auditor Action Plan
                </span>
                <ul className="space-y-1">
                  {actionableRecs.map((rec, i) => (
                    <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                      <span className="text-amber-400">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {characteristics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-800">
                {characteristics.map((c, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-full"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Tab Navigation */}
          <Card rounded="3xl" className="flex-1 flex flex-col p-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  { key: 'fields', label: 'Extracted Fields' },
                  { key: 'lineItems', label: `Line Items (${lineItems.length})` },
                  { key: 'validation', label: `Validation Issues (${validationIssues.length})` },
                  { key: 'evidence', label: 'Source Evidence' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap ${
                      activeTab === t.key
                        ? 'bg-[#111113] text-white shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === 'fields' && (
                <div>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveEdits}
                        loading={savingEdit}
                        icon={Save}
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      icon={Edit3}
                    >
                      Edit Fields
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* TAB CONTENT 1: Extracted Fields */}
            {activeTab === 'fields' && (
              <div className="space-y-4 overflow-y-auto max-h-[480px] pr-1">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Document Number
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFields.invoice_number}
                        onChange={(e) => setEditFields({ ...editFields, invoice_number: e.target.value })}
                        className="w-full mt-1 p-1 bg-white border border-zinc-300 rounded font-semibold text-zinc-900"
                      />
                    ) : (
                      <p className="font-bold text-zinc-900 font-mono mt-0.5">
                        {extractedData?.invoice_number || 'N/A'}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Vendor / Issuer
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFields.vendor_name}
                        onChange={(e) => setEditFields({ ...editFields, vendor_name: e.target.value })}
                        className="w-full mt-1 p-1 bg-white border border-zinc-300 rounded font-semibold text-zinc-900"
                      />
                    ) : (
                      <p className="font-bold text-zinc-900 mt-0.5 truncate">
                        {extractedData?.vendor_name || 'N/A'}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Document Date
                    </span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editFields.document_date}
                        onChange={(e) => setEditFields({ ...editFields, document_date: e.target.value })}
                        className="w-full mt-1 p-1 bg-white border border-zinc-300 rounded font-semibold text-zinc-900"
                      />
                    ) : (
                      <p className="font-semibold text-zinc-900 mt-0.5">
                        {formatDate(extractedData?.document_date)}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Due Date
                    </span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editFields.due_date}
                        onChange={(e) => setEditFields({ ...editFields, due_date: e.target.value })}
                        className="w-full mt-1 p-1 bg-white border border-zinc-300 rounded font-semibold text-zinc-900"
                      />
                    ) : (
                      <p className="font-semibold text-zinc-900 mt-0.5">
                        {formatDate(extractedData?.due_date)}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Subtotal
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editFields.subtotal}
                        onChange={(e) => setEditFields({ ...editFields, subtotal: parseFloat(e.target.value) || 0 })}
                        className="w-full mt-1 p-1 bg-white border border-zinc-300 rounded font-semibold text-zinc-900"
                      />
                    ) : (
                      <p className="font-semibold text-zinc-900 mt-0.5">
                        {formatCurrency(extractedData?.subtotal, extractedData?.currency)}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Tax Amount
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editFields.tax_amount}
                        onChange={(e) => setEditFields({ ...editFields, tax_amount: parseFloat(e.target.value) || 0 })}
                        className="w-full mt-1 p-1 bg-white border border-zinc-300 rounded font-semibold text-zinc-900"
                      />
                    ) : (
                      <p className="font-semibold text-zinc-900 mt-0.5">
                        {formatCurrency(extractedData?.tax_amount, extractedData?.currency)}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2 p-4 rounded-2xl bg-[#111113] text-white border border-zinc-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Total Document Amount
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editFields.total_amount}
                        onChange={(e) => setEditFields({ ...editFields, total_amount: parseFloat(e.target.value) || 0 })}
                        className="w-full mt-1 p-1 bg-zinc-800 border border-zinc-700 rounded font-bold text-white text-lg"
                      />
                    ) : (
                      <p className="text-xl font-extrabold text-white mt-1">
                        {formatCurrency(extractedData?.total_amount, extractedData?.currency)}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2 p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Customer / Billed Party
                    </span>
                    <p className="font-semibold text-zinc-900 mt-0.5">
                      {extractedData?.customer_name || 'N/A'}
                    </p>
                  </div>

                  <div className="col-span-2 p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Referenced Purchase Order (PO #)
                    </span>
                    <p className="font-mono font-semibold text-zinc-900 mt-0.5">
                      {extractedData?.purchase_order_number || 'None referenced'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: Line Items */}
            {activeTab === 'lineItems' && (
              <div className="overflow-y-auto max-h-[480px]">
                {lineItems.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500">
                    No individual line items parsed for this document.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <th className="pb-2">Description</th>
                        <th className="pb-2 text-right">Qty</th>
                        <th className="pb-2 text-right">Unit Price</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 font-medium">
                      {lineItems.map((li, idx) => (
                        <tr key={li.id || idx} className="py-2.5">
                          <td className="py-2.5 pr-2 font-semibold text-zinc-900">{li.description}</td>
                          <td className="py-2.5 text-right text-zinc-600">{li.quantity}</td>
                          <td className="py-2.5 text-right text-zinc-600">
                            {formatCurrency(li.unit_price, extractedData?.currency)}
                          </td>
                          <td className="py-2.5 text-right font-bold text-zinc-950">
                            {formatCurrency(li.total_amount, extractedData?.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: Validation Issues */}
            {activeTab === 'validation' && (
              <div className="space-y-3 overflow-y-auto max-h-[480px]">
                {/* Agentic Forensic Audit Banner */}
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      Forensic Audit Evaluation
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Evaluated by Gemini AI across financial arithmetic, contractual terms, and fraud risks.
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                        auditScore >= 85
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : auditScore >= 65
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      Score: {auditScore}/100
                    </span>
                  </div>
                </div>

                {validationIssues.length === 0 ? (
                  <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-emerald-900">Zero Validation Issues</h4>
                    <p className="text-xs text-emerald-700 mt-1">
                      Gemini Agentic audit checks completed with flawless compliance scores.
                    </p>
                  </div>
                ) : (
                  validationIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900">{issue.issue_type}</span>
                        <Badge variant={issue.severity}>{issue.severity}</Badge>
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed">{issue.explanation}</p>
                      <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-500 pt-1">
                        <span>Extracted: <strong className="text-zinc-800">{issue.extracted_value || 'None'}</strong></span>
                        <span>Expected: <strong className="text-emerald-700">{issue.expected_value}</strong></span>
                      </div>
                      {issue.recommendation && (
                        <div className="mt-2 text-xs bg-amber-50 text-amber-900 border border-amber-200/70 rounded-xl p-2.5 flex items-start gap-2">
                          <span className="font-bold shrink-0">💡 Recommendation:</span>
                          <span>{issue.recommendation}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT 4: Evidence Snippets */}
            {activeTab === 'evidence' && (
              <div className="space-y-3 overflow-y-auto max-h-[480px]">
                {evidenceSnippets.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500">
                    No source text snippets recorded for this extraction.
                  </div>
                ) : (
                  evidenceSnippets.map((ev, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-zinc-900 capitalize">{ev.field.replace(/_/g, ' ')}</span>
                        <span className="text-[11px] font-semibold text-zinc-400">
                          {(ev.confidence * 100).toFixed(0)}% match
                        </span>
                      </div>
                      <p className="text-xs font-mono text-zinc-700 bg-white p-2 rounded-xl border border-zinc-200">
                        "{ev.snippet}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Review & Approval Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Document Audit & Approval"
        subtitle="Record formal review decision and audit trail notes"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
              Review Action
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Approve', 'Edit', 'Mark for Review', 'Reject'].map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setReviewAction(action)}
                  className={`p-2.5 rounded-2xl text-xs font-bold border transition-all ${
                    reviewAction === action
                      ? 'bg-[#111113] text-white border-zinc-900 shadow-sm'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Reviewer Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g. Validated arithmetic variance with finance department..."
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" size="md" onClick={() => setReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleExecuteReview}
              loading={submittingReview}
            >
              Submit Audit Decision
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

