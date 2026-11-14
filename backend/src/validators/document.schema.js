import { z } from 'zod';

export const reviewDocumentSchema = z.object({
  action: z.enum(['Approve', 'Edit', 'Mark for Review', 'Reject']),
  notes: z.string().optional(),
  corrections: z.record(z.any()).optional(),
});

export const updateExtractedDataSchema = z.object({
  invoice_number: z.string().nullable().optional(),
  vendor_name: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  document_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  subtotal: z.number().nullable().optional(),
  tax_amount: z.number().nullable().optional(),
  discount: z.number().nullable().optional(),
  total_amount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  payment_status: z.string().nullable().optional(),
  payment_terms: z.string().nullable().optional(),
  line_items: z.array(z.object({
    id: z.string().optional(),
    description: z.string(),
    quantity: z.number().default(1),
    unit_price: z.number().default(0),
    tax_amount: z.number().default(0),
    total_amount: z.number().default(0),
  })).optional(),
});

export const askInsightSchema = z.object({
  question: z.string().min(2, 'Question must be at least 2 characters').max(1000),
});

export const compareDocumentsSchema = z.object({
  invoice_id: z.string().uuid('Valid invoice ID required'),
  purchase_order_id: z.string().uuid('Valid purchase order ID required'),
});

