import { z } from 'zod';

export const lineItemSchema = z.object({
  description: z.string().default('Unnamed Item'),
  quantity: z.number().nullable().default(1),
  unit_price: z.number().nullable().default(0),
  tax_amount: z.number().nullable().default(0),
  total_amount: z.number().nullable().default(0),
});

export const evidenceReferenceSchema = z.object({
  field: z.string(),
  snippet: z.string().nullable().optional(),
  page: z.number().nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.9),
});

export const geminiExtractionSchema = z.object({
  document_type: z.enum(['Invoice', 'Purchase Order', 'Receipt', 'Other']).default('Other'),
  classification_confidence: z.number().min(0).max(1).default(0.85),
  document_characteristics: z.array(z.string()).default([]),
  summary: z.string().default(''),
  extracted_fields: z.object({
    document_number: z.string().nullable().default(null),
    purchase_order_number: z.string().nullable().default(null),
    document_date: z.string().nullable().default(null),
    due_date: z.string().nullable().default(null),
    vendor_name: z.string().nullable().default(null),
    vendor_address: z.string().nullable().default(null),
    vendor_contact: z.string().nullable().default(null),
    customer_name: z.string().nullable().default(null),
    customer_address: z.string().nullable().default(null),
    subtotal: z.number().nullable().default(0),
    tax_amount: z.number().nullable().default(0),
    discount: z.number().nullable().default(0),
    total_amount: z.number().nullable().default(0),
    currency: z.string().default('USD'),
    payment_status: z.string().nullable().default(null),
    payment_terms: z.string().nullable().default(null),
  }),
  line_items: z.array(lineItemSchema).default([]),
  evidence_snippets: z.array(evidenceReferenceSchema).default([]),
  overall_confidence: z.number().min(0).max(1).default(0.9),
});

