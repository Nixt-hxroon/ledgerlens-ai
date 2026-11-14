import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLE_DIR = path.resolve(__dirname);

async function createPdfFile(filename, title, lines) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  // Draw header bar
  page.drawRectangle({
    x: 40,
    y: height - 80,
    width: width - 80,
    height: 40,
    color: rgb(0.08, 0.08, 0.09),
  });

  page.drawText(title, {
    x: 55,
    y: height - 65,
    size: 16,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  let currentY = height - 110;
  for (const line of lines) {
    if (line.startsWith('==') || line.startsWith('--')) {
      page.drawLine({
        start: { x: 40, y: currentY + 5 },
        end: { x: width - 40, y: currentY + 5 },
        thickness: line.startsWith('==') ? 1.5 : 0.75,
        color: rgb(0.8, 0.8, 0.8),
      });
      currentY -= 15;
    } else {
      const isHeader = line.includes(':') && (line.startsWith('INVOICE') || line.startsWith('PURCHASE ORDER') || line.startsWith('RECEIPT') || line.startsWith('TOTAL') || line.startsWith('LINE ITEMS'));
      page.drawText(line, {
        x: 45,
        y: currentY,
        size: isHeader ? 11 : 10,
        font: isHeader ? boldFont : font,
        color: line.startsWith('TOTAL') ? rgb(0.1, 0.5, 0.2) : rgb(0.15, 0.15, 0.15),
      });
      currentY -= 18;
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(SAMPLE_DIR, filename), pdfBytes);
}

async function main() {
  // 1. Valid Invoice
  await createPdfFile('sample_invoice_valid.pdf', 'COMMERCIAL TAX INVOICE', [
    'Vendor: Apex Cloud Systems Inc.',
    'Address: 100 Innovation Way, Suite 400, San Francisco, CA',
    'Email: billing@apexcloud.io',
    '----------------------------------------',
    'Invoice Number: INV-2026-8812',
    'Invoice Date: 2026-11-01',
    'Due Date: 2026-12-01',
    'PO Reference: PO-2026-9041',
    '----------------------------------------',
    'Bill To: Enterprise Client Holdings Ltd.',
    'Address: 450 Global Corporate Blvd, New York, NY',
    '========================================',
    'LINE ITEMS:',
    '1. Enterprise Cloud Compute Cluster - Qty: 2 @ $1,000.00 = $2,000.00',
    '2. Managed Premium Support - Qty: 1 @ $500.00 = $500.00',
    '----------------------------------------',
    'Subtotal: $2,500.00',
    'Tax (10%): $250.00',
    'Discount: $0.00',
    'TOTAL AMOUNT DUE: $2,750.00 USD',
    'Payment Terms: Net 30 Days',
    'Payment Status: Pending',
  ]);

  // 2. Matching PO
  await createPdfFile('sample_purchase_order.pdf', 'OFFICIAL PURCHASE ORDER', [
    'PO Number: PO-2026-9041',
    'Order Date: 2026-10-28',
    'Expected Delivery: 2026-11-05',
    '----------------------------------------',
    'Supplier / Vendor: Apex Cloud Systems Inc.',
    'Buyer: Enterprise Client Holdings Ltd.',
    '========================================',
    'ORDERED ITEMS:',
    '1. Enterprise Cloud Compute Cluster - Qty: 2 @ $1,000.00 = $2,000.00',
    '2. Managed Premium Support - Qty: 1 @ $500.00 = $500.00',
    '----------------------------------------',
    'Subtotal: $2,500.00',
    'Estimated Tax: $250.00',
    'TOTAL ORDER VALUE: $2,750.00 USD',
    'Terms: Net 30 upon delivery confirmation',
  ]);

  // 3. Invoice with Arithmetic / Price Discrepancy
  await createPdfFile('sample_invoice_discrepancy.pdf', 'INVOICE (AUDIT REVIEW)', [
    'Vendor: Apex Cloud Systems Inc.',
    'Invoice Number: INV-2026-9905',
    'Invoice Date: 2026-11-10',
    'Due Date: 2026-10-15', // Due date error!
    'PO Reference: PO-2026-9041',
    '----------------------------------------',
    'Bill To: Enterprise Client Holdings Ltd.',
    '========================================',
    'LINE ITEMS:',
    '1. Enterprise Cloud Compute Cluster - Qty: 2 @ $1,500.00 = $3,000.00',
    '2. Unscheduled Maintenance Surcharge - Qty: 1 @ $1,000.00 = $1,000.00',
    '----------------------------------------',
    'Subtotal: $4,000.00',
    'Tax (10%): $400.00',
    'Discount: $0.00',
    'TOTAL AMOUNT DUE: $5,200.00 USD', // Calculation error: 4000+400 != 5200!
    'Payment Status: Pending',
  ]);

  // 4. Sample Receipt
  await createPdfFile('sample_receipt.pdf', 'STORE TRANSACTION RECEIPT', [
    'Merchant: TechCity Office Depot',
    'Store #0482 - San Francisco, CA',
    '========================================',
    'Receipt #: RCP-77412',
    'Date: 2026-11-12',
    'Cashier: Alex M.',
    '----------------------------------------',
    '1. Ergonomic USB-C Docking Hub - $129.99',
    '2. Ultra-Speed HDMI 2.1 Cable - $29.99',
    '3. Wireless Presentation Remote - $19.99',
    '----------------------------------------',
    'Subtotal: $179.97',
    'Tax (8.5%): $15.30',
    'TOTAL PAID: $195.27 USD',
    'Payment Method: Visa ending in 4022',
  ]);

  console.log('✅ Generated 4 pristine PDF files with pdf-lib');
}

main().catch(console.error);
