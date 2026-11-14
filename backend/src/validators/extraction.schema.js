import { z } from 'zod';

export const lineItemSchema = z.object({
  description: z.string().default('Unnamed Item'),
  quantity: z.number().nullable().optional().default(1),
  unit_price: z.number().nullable().optional().default(0),
  tax_amount: z.number().nullable().optional().default(0),
  total_amount: z.number().nullable().optional().default(0),
});

export const evidenceReferenceSchema = z.object({
  field: z.string(),
  snippet: z.string().nullable().optional(),
  page: z.number().nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.9),
});

export const agenticFindingSchema = z.object({
  issue_type: z.string().default('COMPLIANCE_ANOMALY'),
  severity: z.enum(['Critical Issue', 'Warning', 'Review Required', 'Low']).default('Warning'),
  field_name: z.string().default('general'),
  extracted_value: z.any().nullable().default(null),
  expected_value: z.string().nullable().default('Standard compliance value'),
  explanation: z.string().default('Audit finding identified.'),
  recommendation: z.string().nullable().default('Review document with issuing party.'),
});

export const agenticEvaluationSchema = z.object({
  audit_score: z.number().min(0).max(100).default(85),
  overall_status: z.enum(['Valid', 'Warning', 'Critical Issue', 'Review Required']).default('Valid'),
  executive_summary: z.string().default(''),
  actionable_recommendations: z.array(z.string()).default([]),
  findings: z.array(agenticFindingSchema).default([]),
});

export const geminiExtractionSchema = z.object({
  document_type: z.enum(['Invoice', 'Purchase Order', 'Receipt', 'Other']).default('Other'),
  classification_confidence: z.number().min(0).max(1).default(0.85),
  document_characteristics: z.array(z.string()).default([]),
  summary: z.string().default(''),
  extracted_fields: z.object({
    document_number: z.string().nullable().optional().default(null),
    purchase_order_number: z.string().nullable().optional().default(null),
    document_date: z.string().nullable().optional().default(null),
    due_date: z.string().nullable().optional().default(null),
    vendor_name: z.string().nullable().optional().default(null),
    vendor_address: z.string().nullable().optional().default(null),
    vendor_contact: z.string().nullable().optional().default(null),
    customer_name: z.string().nullable().optional().default(null),
    customer_address: z.string().nullable().optional().default(null),
    subtotal: z.number().nullable().optional().default(0),
    tax_amount: z.number().nullable().optional().default(0),
    discount: z.number().nullable().optional().default(0),
    total_amount: z.number().nullable().optional().default(0),
    currency: z.string().nullable().optional().default('USD'),
    payment_status: z.string().nullable().optional().default(null),
    payment_terms: z.string().nullable().optional().default(null),
  }),
  line_items: z.array(lineItemSchema).default([]),
  evidence_snippets: z.array(evidenceReferenceSchema).default([]),
  overall_confidence: z.number().min(0).max(1).default(0.9),
  agentic_evaluation: agenticEvaluationSchema.optional(),
}).passthrough();
