import { db } from '../storage/db.js';
import { parseNumber, roundCurrency } from '../utils/calculations.js';

export const analyticsService = {
  /**
   * Complete Dashboard Metrics & Charts data
   */
  async getDashboardMetrics(userId) {
    const { documents } = await db.documents.findByUserId(userId, { limit: 1000 });
    const validationIssues = await db.validationIssues.findByUserId(userId, {});

    let totalDocuments = documents.length;
    let successfullyProcessed = 0;
    let pendingReview = 0;
    let failed = 0;
    let totalInvoiceValue = 0;

    // Category distribution
    const categoryCounts = {
      Invoice: 0,
      'Purchase Order': 0,
      Receipt: 0,
      Other: 0,
    };

    // Monthly processing timeline
    const monthlyProcessingMap = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Initialize current and past 5 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]}`;
      monthlyProcessingMap[key] = { name: key, count: 0, amount: 0 };
    }

    // Vendor spending map
    const vendorMap = {};
    const extractions = [];

    for (const doc of documents) {
      if (doc.processing_status === 'Processed' && doc.validation_status === 'Valid') {
        successfullyProcessed++;
      } else if (doc.processing_status === 'Review Required' || doc.validation_status === 'Review Required' || doc.validation_status === 'Critical Issue') {
        pendingReview++;
      } else if (doc.processing_status === 'Failed') {
        failed++;
      }

      const cat = doc.document_type || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      // Extract data
      const ext = await db.extractedData.findByDocumentId(doc.id);
      if (ext) {
        extractions.push(ext);
        const amount = parseNumber(ext.total_amount);
        totalInvoiceValue += amount;

        const vendor = ext.vendor_name || 'Unspecified Vendor';
        if (!vendorMap[vendor]) {
          vendorMap[vendor] = { name: vendor, total: 0, count: 0 };
        }
        vendorMap[vendor].total = roundCurrency(vendorMap[vendor].total + amount);
        vendorMap[vendor].count += 1;

        // Group by month
        const docDate = ext.document_date ? new Date(ext.document_date) : new Date(doc.uploaded_at);
        if (!isNaN(docDate.getTime())) {
          const mKey = months[docDate.getMonth()];
          if (monthlyProcessingMap[mKey]) {
            monthlyProcessingMap[mKey].count += 1;
            monthlyProcessingMap[mKey].amount = roundCurrency(monthlyProcessingMap[mKey].amount + amount);
          }
        }
      }
    }

    // Top vendors sorted by total spending
    const topVendors = Object.values(vendorMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Category chart array
    const categoryChart = Object.entries(categoryCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // Monthly chart array
    const monthlyChart = Object.values(monthlyProcessingMap);

    // Validation issue breakdown
    const issueBreakdown = {
      Critical: 0,
      Warning: 0,
      ReviewRequired: 0,
    };

    validationIssues.forEach((issue) => {
      if (issue.severity === 'Critical Issue') issueBreakdown.Critical++;
      else if (issue.severity === 'Warning') issueBreakdown.Warning++;
      else issueBreakdown.ReviewRequired++;
    });

    // Recent 5 documents
    const recentDocuments = documents.slice(0, 5).map((doc) => {
      const ext = extractions.find((e) => e.document_id === doc.id);
      return {
        id: doc.id,
        filename: doc.original_filename,
        category: doc.document_type,
        vendor: ext?.vendor_name || 'N/A',
        document_number: ext?.invoice_number || 'N/A',
        amount: ext?.total_amount || 0,
        currency: ext?.currency || 'USD',
        uploaded_at: doc.uploaded_at,
        processing_status: doc.processing_status,
        validation_status: doc.validation_status,
      };
    });

    return {
      summary: {
        totalDocuments,
        successfullyProcessed,
        pendingReview,
        validationIssuesCount: validationIssues.length,
        totalInvoiceValue: roundCurrency(totalInvoiceValue),
      },
      charts: {
        monthlyProcessing: monthlyChart,
        categoryDistribution: categoryChart,
        topVendors,
        issueBreakdown,
      },
      recentDocuments,
    };
  },

  /**
   * Deep business intelligence and executive insights report
   */
  async getInsightsReport(userId) {
    const { documents } = await db.documents.findByUserId(userId, { limit: 1000 });
    const validationIssues = await db.validationIssues.findByUserId(userId, {});

    let totalSpend = 0;
    let maxInvoice = 0;
    let maxInvoiceDoc = null;
    const vendorSpend = {};
    const extractions = [];

    for (const doc of documents) {
      const ext = await db.extractedData.findByDocumentId(doc.id);
      if (ext) {
        extractions.push({ ...ext, doc_name: doc.original_filename });
        const amt = parseNumber(ext.total_amount);
        totalSpend += amt;
        if (amt > maxInvoice) {
          maxInvoice = amt;
          maxInvoiceDoc = { name: doc.original_filename, vendor: ext.vendor_name, amount: amt };
        }

        const vendor = ext.vendor_name || 'Unknown Vendor';
        vendorSpend[vendor] = (vendorSpend[vendor] || 0) + amt;
      }
    }

    const avgInvoice = extractions.length > 0 ? roundCurrency(totalSpend / extractions.length) : 0;
    const sortedVendors = Object.entries(vendorSpend)
      .map(([name, amount]) => ({ name, amount: roundCurrency(amount) }))
      .sort((a, b) => b.amount - a.amount);

    const topVendor = sortedVendors[0] || { name: 'None', amount: 0 };
    const successRate = documents.length > 0 
      ? Math.round((documents.filter((d) => d.processing_status === 'Processed').length / documents.length) * 100) 
      : 100;

    const narrativeInsights = [
      `Your organization has recorded a total document spend of $${roundCurrency(totalSpend).toLocaleString(undefined, { minimumFractionDigits: 2 })} across ${documents.length} business documents.`,
      `Primary supplier **${topVendor.name}** accounts for the largest share of expenditures, totaling $${topVendor.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
      `The average invoice processed is valued at $${avgInvoice.toLocaleString(undefined, { minimumFractionDigits: 2 })}, with the peak transaction recorded at $${maxInvoice.toLocaleString(undefined, { minimumFractionDigits: 2 })}${maxInvoiceDoc ? ` from ${maxInvoiceDoc.vendor}` : ''}.`,
      `Document ingestion health is currently running at a **${successRate}%** processing success rate, with ${validationIssues.length} open items flagged in the Validation Center.`,
    ];

    return {
      financials: {
        totalSpend: roundCurrency(totalSpend),
        averageInvoice: avgInvoice,
        maxInvoice: roundCurrency(maxInvoice),
        maxInvoiceDoc,
      },
      operational: {
        totalDocuments: documents.length,
        successRate,
        openIssues: validationIssues.length,
      },
      topVendors: sortedVendors.slice(0, 8),
      narrativeInsights,
    };
  },
};

