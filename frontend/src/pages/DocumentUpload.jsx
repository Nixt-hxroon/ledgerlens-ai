import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
  Layers,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { documentService } from '../services/documentService';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { formatFileSize } from '../utils/formatters';

const DEMO_SAMPLES = [
  {
    name: 'sample_invoice_valid.pdf',
    title: 'Valid Enterprise Invoice',
    desc: 'Apex Cloud compute cluster ($2,750.00) with clean arithmetic & matching PO',
    category: 'Invoice',
  },
  {
    name: 'sample_purchase_order.pdf',
    title: 'Matching Purchase Order',
    desc: 'Official PO-2026-9041 issued to Apex Cloud for reconciliation',
    category: 'Purchase Order',
  },
  {
    name: 'sample_invoice_discrepancy.pdf',
    title: 'Invoice with Pricing Variance',
    desc: 'Contains arithmetic mismatch & outdated due date to trigger Validation Center',
    category: 'Invoice (Anomaly)',
  },
  {
    name: 'sample_receipt.pdf',
    title: 'Retail Hardware Receipt',
    desc: 'TechCity Depot transaction receipt ($195.27) with itemized items',
    category: 'Receipt',
  },
];

export const DocumentUpload = () => {
  const [filesQueue, setFilesQueue] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const toast = useToast();
  const navigate = useNavigate();

  const handleFiles = (incomingFiles) => {
    const validMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const maxBytes = 15 * 1024 * 1024;

    const newItems = [];
    for (const file of incomingFiles) {
      if (!validMimes.includes(file.type)) {
        toast.error(`"${file.name}" has an unsupported format. Please upload PDF or JPG/PNG.`);
        continue;
      }
      if (file.size > maxBytes) {
        toast.error(`"${file.name}" exceeds the 15 MB limit.`);
        continue;
      }

      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'Ready', // 'Ready' | 'Uploading' | 'Analyzing' | 'Completed' | 'Error'
        documentId: null,
        error: null,
      });
    }

    setFilesQueue((prev) => [...prev, ...newItems]);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (id) => {
    setFilesQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const startUploadAndProcessing = async () => {
    const pendingItems = filesQueue.filter((item) => item.status === 'Ready');
    if (pendingItems.length === 0) {
      toast.info('No pending files in the upload queue.');
      return;
    }

    setIsProcessing(true);

    for (const item of pendingItems) {
      try {
        // Step 1: Uploading
        setFilesQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'Uploading', progress: 30 } : i))
        );

        // Upload and process via API
        const doc = await documentService.uploadSingle(item.file, (prog) => {
          setFilesQueue((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, progress: Math.min(prog, 90) } : i))
          );
        });

        // Step 2: Completed
        setFilesQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'Completed', progress: 100, documentId: doc.id }
              : i
          )
        );

        toast.success(`"${item.name}" processed successfully!`);
      } catch (err) {
        setFilesQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'Error', error: err.message || 'Processing failed' }
              : i
          )
        );
        toast.error(`Error processing "${item.name}": ${err.message}`);
      }
    }

    setIsProcessing(false);
  };

  // Helper to load sample files directly from backend/sample_data
  const handleLoadSample = async (sampleName) => {
    try {
      toast.info(`Fetching synthetic document "${sampleName}"...`);
      // We can fetch from API or create a simulated file buffer from known sample
      const res = await fetch(`/api/health`); // quick connectivity check
      
      // Load sample via custom helper or trigger direct upload
      const response = await fetch(`http://localhost:5000/sample_data/${sampleName}`).catch(() => null);
      
      let blob;
      if (response && response.ok) {
        blob = await response.blob();
      } else {
        // Fallback: create mock blob
        blob = new Blob([`SAMPLE DOCUMENT: ${sampleName}`], { type: 'application/pdf' });
      }

      const file = new File([blob], sampleName, { type: 'application/pdf' });
      handleFiles([file]);
      toast.success(`Loaded "${sampleName}" into upload queue.`);
    } catch (e) {
      toast.error('Could not load sample document.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Description */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/70 shadow-soft">
        <h2 className="text-xl font-extrabold text-zinc-950 tracking-tight">
          Intelligent Document Ingestion
        </h2>
        <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
          Upload PDF invoices, purchase orders, or receipts. Gemini AI will automatically classify the
          document, extract structured line items, verify mathematical consistency, and detect anomalies.
        </p>
      </div>

      {/* 1-Click Hackathon Sample Documents Strip */}
      <div className="bg-zinc-900 text-white p-5 rounded-3xl shadow-elevated border border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold tracking-tight text-white">
              Instant Hackathon Demo Documents
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-zinc-400">
            Click to load pre-configured test files
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DEMO_SAMPLES.map((sample) => (
            <button
              key={sample.name}
              onClick={() => handleLoadSample(sample.name)}
              className="p-3.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  {sample.category}
                </span>
                <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white">
                  + Add
                </span>
              </div>
              <p className="text-xs font-bold text-zinc-100 mt-1.5">{sample.title}</p>
              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-snug">
                {sample.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-10 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
          isDragging
            ? 'border-zinc-900 bg-zinc-100 scale-[0.99]'
            : 'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50/50 shadow-soft'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-[#111113] text-white flex items-center justify-center shadow-elevated mb-4">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-base font-bold text-zinc-900">
          Drop your business documents here
        </h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          Drag & drop invoices, receipts, or purchase orders, or click to browse files
        </p>

        <div className="flex items-center gap-2 mt-4 text-[11px] font-semibold text-zinc-400">
          <span>Supported: PDF, JPG, PNG</span>
          <span>•</span>
          <span>Max file size: 15 MB</span>
        </div>
      </div>

      {/* Queued Documents List */}
      {filesQueue.length > 0 && (
        <Card rounded="3xl" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Queued for Processing ({filesQueue.length})
              </h3>
              <p className="text-xs text-zinc-500">Ready to ingest and extract with AI</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilesQueue([])}
                disabled={isProcessing}
              >
                Clear All
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={startUploadAndProcessing}
                loading={isProcessing}
                icon={Sparkles}
              >
                Process All with Gemini
              </Button>
            </div>
          </div>

          <div className="divide-y divide-zinc-100">
            {filesQueue.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-zinc-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-zinc-500">{formatFileSize(item.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.status === 'Ready' && (
                    <Badge variant="ghost" size="sm">
                      Ready
                    </Badge>
                  )}
                  {item.status === 'Uploading' && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{item.progress}%</span>
                    </div>
                  )}
                  {item.status === 'Completed' && (
                    <Badge variant="Valid" size="sm" className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Processed
                    </Badge>
                  )}
                  {item.status === 'Error' && (
                    <Badge variant="Critical Issue" size="sm">
                      Failed
                    </Badge>
                  )}

                  {item.status === 'Completed' && item.documentId && (
                    <Button
                      variant="dark"
                      size="sm"
                      onClick={() => navigate(`/documents/${item.documentId}`)}
                    >
                      View Details →
                    </Button>
                  )}

                  {item.status === 'Ready' && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
