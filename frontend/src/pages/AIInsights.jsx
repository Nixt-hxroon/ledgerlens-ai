import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Download,
  Building2,
  TrendingUp,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  Database,
} from 'lucide-react';
import { insightService } from '../services/insightService';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { formatCurrency } from '../utils/formatters';

const EXAMPLE_QUESTIONS = [
  'What is the total value of all uploaded invoices?',
  'Which vendor has the highest billing amount?',
  'Show invoices with missing due dates or validation issues.',
  'Summarize my recent uploaded business documents.',
  'What is our average invoice transaction value?',
];

export const AIInsights = () => {
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);

  // Chat Q&A State
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [conversation, setConversation] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your LedgerLens AI Intelligence Assistant. Ask any question about your uploaded business documents, spend totals, or vendor validations. My answers are strictly grounded in your verified database records.',
      citations: [],
    },
  ]);

  const toast = useToast();

  const fetchReports = async () => {
    try {
      const data = await insightService.getReports();
      setReport(data);
    } catch (err) {
      console.error('Error loading AI insights report:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleAskQuestion = async (customQ) => {
    const qText = customQ || question;
    if (!qText.trim()) return;

    // Add user question to conversation
    setConversation((prev) => [...prev, { sender: 'user', text: qText }]);
    setQuestion('');
    setAsking(true);

    try {
      const res = await insightService.askQuestion(qText);
      setConversation((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: res.answer,
          citations: res.citedDocuments || [],
          facts: res.groundedFacts,
        },
      ]);
    } catch (err) {
      toast.error('AI query error: ' + err.message);
      setConversation((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'I encountered an error querying the verified database records: ' + err.message,
          citations: [],
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleExportCSV = () => {
    const url = insightService.getExportCSVUrl();
    window.open(url, '_blank');
    toast.success('Document audit report export initiated.');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner & Export CSV CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-zinc-200/70 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-zinc-950 tracking-tight">
              Knowledge Discovery & AI Insights
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
              Grounded Database Intel
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
            Convert extracted document data into actionable business intelligence. Query documents with
            natural language, inspect vendor concentrations, and export verified financial reports.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleExportCSV}
          icon={Download}
        >
          Export CSV Report
        </Button>
      </div>

      {/* Section 1: Executive Business Intelligence Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card rounded="3xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Recorded Spend</p>
          <h3 className="text-2xl font-extrabold text-zinc-950 mt-1">
            {formatCurrency(report?.financials?.totalSpend || 0)}
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Across all uploaded files</p>
        </Card>

        <Card rounded="3xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Average Invoice</p>
          <h3 className="text-2xl font-extrabold text-zinc-950 mt-1">
            {formatCurrency(report?.financials?.averageInvoice || 0)}
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Mean transaction volume</p>
        </Card>

        <Card rounded="3xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Peak Transaction</p>
          <h3 className="text-2xl font-extrabold text-zinc-950 mt-1">
            {formatCurrency(report?.financials?.maxInvoice || 0)}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 truncate">
            {report?.financials?.maxInvoiceDoc?.vendor || 'Largest invoice'}
          </p>
        </Card>

        <Card rounded="3xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pipeline Ingestion Rate</p>
          <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
            {report?.operational?.successRate || 100}%
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            {report?.operational?.openIssues || 0} issues open in validation
          </p>
        </Card>
      </div>

      {/* Section 2: Split Intelligence Workspace (Executive Synthesis Left, Natural Language Q&A Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Executive Narrative & Vendor Breakdown (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <Card rounded="3xl" variant="dark" className="p-6 shadow-elevated">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                AI Executive Intelligence Synthesis
              </h3>
            </div>

            <div className="space-y-3">
              {report?.narrativeInsights?.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-200 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                  <p dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>') }} />
                </div>
              ))}
            </div>
          </Card>

          <Card rounded="3xl" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-900">Supplier Concentration</h3>
              <span className="text-xs text-zinc-400 font-semibold">Ranked by Volume</span>
            </div>

            <div className="space-y-2.5">
              {(report?.topVendors || []).map((v, i) => (
                <div
                  key={v.name}
                  className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200/50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center">
                      {i + 1}
                    </div>
                    <span className="text-xs font-bold text-zinc-900 truncate max-w-[160px]">{v.name}</span>
                  </div>
                  <span className="text-xs font-extrabold text-zinc-900">
                    {formatCurrency(v.amount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT: Natural Language Grounded Q&A Assistant (7/12) */}
        <div className="lg:col-span-7 flex flex-col">
          <Card rounded="3xl" className="flex-1 flex flex-col p-6 min-h-[560px]">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#111113] text-white flex items-center justify-center">
                  <Database className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    Grounded Document Q&A
                  </h3>
                  <p className="text-[11px] text-zinc-500">Zero-hallucination database calculations</p>
                </div>
              </div>
              <Badge variant="ghost" size="sm">
                Gemini 2.0
              </Badge>
            </div>

            {/* Conversation Log */}
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[380px] pr-2 mb-4">
              {conversation.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-3xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#111113] text-white font-medium rounded-br-none'
                        : 'bg-zinc-100/90 text-zinc-900 font-medium rounded-bl-none border border-zinc-200/60'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-200/80 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Citations:</span>
                        {msg.citations.map((c, ci) => (
                          <span
                            key={ci}
                            className="text-[10px] font-mono bg-white text-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {asking && (
                <div className="flex items-start">
                  <div className="p-3 rounded-2xl bg-zinc-100 text-zinc-600 text-xs flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying database & synthesizing response...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Suggested Question Chips */}
            <div className="pt-2 pb-3 border-t border-zinc-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Suggested Prompts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_QUESTIONS.map((eq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAskQuestion(eq)}
                    disabled={asking}
                    className="text-[11px] font-medium px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-full transition-colors truncate max-w-full"
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion();
              }}
              className="relative mt-2"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about document totals, vendors, due dates..."
                disabled={asking}
                className="w-full pl-4 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-full text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#111113] hover:bg-zinc-800 disabled:bg-zinc-300 text-white flex items-center justify-center transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

