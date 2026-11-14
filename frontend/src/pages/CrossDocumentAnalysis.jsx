import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { documentService } from '../services/documentService';
import { comparisonService } from '../services/comparisonService';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { formatCurrency } from '../utils/formatters';

export const CrossDocumentAnalysis = () => {
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [candidates, setCandidates] = useState([]);

  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const toast = useToast();

  useEffect(() => {
    const loadEligibleDocs = async () => {
      try {
        const invRes = await documentService.getDocuments({ category: 'Invoice', limit: 50 });
        const poRes = await documentService.getDocuments({ category: 'Purchase Order', limit: 50 });

        setInvoices(invRes.documents || []);
        setPurchaseOrders(poRes.documents || []);

        // Default selections if available
        if (invRes.documents?.length > 0) {
          setSelectedInvoiceId(invRes.documents[0].id);
        }
        if (poRes.documents?.length > 0) {
          setSelectedPoId(poRes.documents[0].id);
        }
      } catch (err) {
        console.error('Error fetching comparison candidates:', err);
      } finally {
        setLoadingDocs(false);
      }
    };

    loadEligibleDocs();
  }, []);

  // When invoice selection changes, check auto-matched PO candidates
  useEffect(() => {
    if (!selectedInvoiceId) return;

    comparisonService
      .getCandidates(selectedInvoiceId)
      .then((cands) => {
        setCandidates(cands || []);
        if (cands && cands.length > 0 && !selectedPoId) {
          setSelectedPoId(cands[0].id);
        }
      })
      .catch((e) => console.warn('Could not fetch candidates:', e));
  }, [selectedInvoiceId]);

  const handleRunComparison = async () => {
    if (!selectedInvoiceId || !selectedPoId) {
      toast.error('Please select both an Invoice and a Purchase Order to compare.');
      return;
    }

    setComparing(true);
    try {
      const res = await comparisonService.compareDocuments({
        invoice_id: selectedInvoiceId,
        purchase_order_id: selectedPoId,
      });
      setComparisonResult(res.comparison_result);
      toast.success('Reconciliation comparison completed!');
    } catch (err) {
      toast.error('Comparison error: ' + err.message);
    } finally {
      setComparing(false);
    }
  };

  const summary = comparisonResult?.summary;
  const lineItems = comparisonResult?.line_items || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Overview Banner */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/70 shadow-soft">
        <h1 className="text-xl font-extrabold text-zinc-950 tracking-tight">
          Cross-Document Intelligence & Agentic 3-Way Reconciliation
        </h1>
        <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
          Compare Vendor Invoices against authorized Purchase Orders. LedgerLens AI semantically matches line items, audits unit rate variances, flags unbilled quantities, and delivers an executive settlement recommendation powered by Gemini AI.
        </p>
      </div>

      {/* Document Selector Card */}
      <Card rounded="3xl">
        <h2 className="text-sm font-bold text-zinc-900 mb-4">Select Documents for Reconciliation</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Invoice Picker */}
          <div>
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">
              1. Select Commercial Invoice
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              {invoices.length === 0 ? (
                <option value="">No Invoices available (Upload an invoice first)</option>
              ) : (
                invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.original_filename} • {inv.vendor_name || 'Vendor'} ({formatCurrency(inv.total_amount, inv.currency)})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Purchase Order Picker */}
          <div>
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">
              2. Select Purchase Order (PO)
            </label>
            <select
              value={selectedPoId}
              onChange={(e) => setSelectedPoId(e.target.value)}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              {purchaseOrders.length === 0 ? (
                <option value="">No POs available (Upload a PO first)</option>
              ) : (
                purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.original_filename} • {po.vendor_name || 'Supplier'} ({formatCurrency(po.total_amount, po.currency)})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-end mt-6 pt-4 border-t border-zinc-100">
          <Button
            variant="primary"
            size="md"
            loading={comparing}
            onClick={handleRunComparison}
            disabled={!selectedInvoiceId || !selectedPoId}
            icon={GitCompare}
          >
            Run 3-Way Reconciliation
          </Button>
        </div>
      </Card>

      {/* Comparison Results Section */}
      {comparisonResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Executive Summary Card */}
          <Card
            rounded="3xl"
            className={`p-6 border ${
              summary.match_status === 'Matched'
                ? 'bg-emerald-950 text-white border-emerald-800'
                : 'bg-zinc-900 text-white border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Reconciliation Decision Matrix
                </h3>
              </div>
              <Badge variant={summary.match_status}>
                {summary.match_status}
              </Badge>
            </div>

            <p className="text-sm font-semibold text-zinc-100 leading-relaxed mb-3">
              {summary.explanation}
            </p>

            {summary.settlement_recommendation && (
              <div className="mb-4 p-3 rounded-2xl bg-white/10 border border-white/15 text-xs text-zinc-200 flex items-start gap-2">
                <span className="font-bold text-amber-300 shrink-0">💡 Settlement Plan:</span>
                <span>{summary.settlement_recommendation}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-800 text-xs">
              <div>
                <p className="text-zinc-400 text-[11px]">Invoice Total</p>
                <p className="text-base font-extrabold text-white mt-0.5">
                  {formatCurrency(summary.totals.invoice_total, summary.totals.currency)}
                </p>
              </div>
              <div>
                <p className="text-zinc-400 text-[11px]">Purchase Order Total</p>
                <p className="text-base font-extrabold text-white mt-0.5">
                  {formatCurrency(summary.totals.po_total, summary.totals.currency)}
                </p>
              </div>
              <div>
                <p className="text-zinc-400 text-[11px]">Financial Difference</p>
                <p
                  className={`text-base font-extrabold mt-0.5 ${
                    summary.totals.matches ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {summary.totals.difference > 0 ? '+' : ''}
                  {formatCurrency(summary.totals.difference, summary.totals.currency)}
                </p>
              </div>
              <div>
                <p className="text-zinc-400 text-[11px]">Vendor Name Check</p>
                <p
                  className={`text-base font-extrabold mt-0.5 ${
                    summary.vendor.matches ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {summary.vendor.matches ? 'Verified Match' : 'Discrepancy'}
                </p>
              </div>
            </div>
          </Card>

          {/* Line-Item Itemized Comparison Matrix */}
          <Card rounded="3xl">
            <h3 className="text-sm font-bold text-zinc-900 mb-3">Itemized Line-Item Comparison</h3>

            {lineItems.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4">No line item breakdown available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <th className="pb-3 px-3">Item / Service</th>
                      <th className="pb-3 px-3 text-right">Invoice Qty</th>
                      <th className="pb-3 px-3 text-right">PO Qty</th>
                      <th className="pb-3 px-3 text-right">Invoice Unit Price</th>
                      <th className="pb-3 px-3 text-right">PO Unit Price</th>
                      <th className="pb-3 px-3 text-right">Total Discrepancy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 font-medium">
                    {lineItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/60">
                        <td className="py-3 px-3 font-semibold text-zinc-900">
                          <p>{item.description.invoice || item.description.po}</p>
                          {!item.description.match && (
                            <span className="text-[10px] text-amber-600 font-normal">
                              PO description: "{item.description.po}"
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-700">
                          {item.quantity.invoice}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-700">
                          {item.quantity.po}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-700">
                          {formatCurrency(item.unit_price.invoice)}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-700">
                          {formatCurrency(item.unit_price.po)}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-bold ${
                            item.total_amount.match ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {item.total_amount.difference === 0
                            ? '$0.00 (Match)'
                            : `${item.total_amount.difference > 0 ? '+' : ''}${formatCurrency(
                                item.total_amount.difference
                              )}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

