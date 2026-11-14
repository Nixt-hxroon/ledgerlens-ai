-- LedgerLens AI: Production Database Schema
-- Supabase PostgreSQL Migration 001

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    document_type TEXT NOT NULL DEFAULT 'Other', -- 'Invoice', 'Purchase Order', 'Receipt', 'Other'
    processing_status TEXT NOT NULL DEFAULT 'Uploaded', -- 'Uploaded', 'Processing', 'Processed', 'Review Required', 'Failed'
    validation_status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Valid', 'Warning', 'Critical Issue', 'Review Required'
    summary TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);

-- 3. EXTRACTED DATA TABLE
CREATE TABLE IF NOT EXISTS extracted_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_number TEXT,
    vendor_name TEXT,
    vendor_address TEXT,
    vendor_contact TEXT,
    customer_name TEXT,
    customer_address TEXT,
    document_date TEXT,
    due_date TEXT,
    purchase_order_number TEXT,
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    payment_status TEXT,
    payment_terms TEXT,
    extracted_json JSONB,
    extraction_confidence NUMERIC(4,3) DEFAULT 0.000,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extracted_data_doc ON extracted_data(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_user ON extracted_data(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_vendor ON extracted_data(vendor_name);
CREATE INDEX IF NOT EXISTS idx_extracted_data_inv_num ON extracted_data(invoice_number);

-- 4. LINE ITEMS TABLE
CREATE TABLE IF NOT EXISTS line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extracted_data_id UUID NOT NULL REFERENCES extracted_data(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) DEFAULT 1,
    unit_price NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_items_extracted ON line_items(extracted_data_id);

-- 5. VALIDATION ISSUES TABLE
CREATE TABLE IF NOT EXISTS validation_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'Valid', 'Warning', 'Critical Issue', 'Review Required'
    field_name TEXT NOT NULL,
    extracted_value TEXT,
    expected_value TEXT,
    explanation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open', -- 'Open', 'Resolved', 'Dismissed'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_validation_issues_doc ON validation_issues(document_id);
CREATE INDEX IF NOT EXISTS idx_validation_issues_user ON validation_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_validation_issues_status ON validation_issues(status);

-- 6. DOCUMENT MATCHES (CROSS-DOCUMENT COMPARISONS)
CREATE TABLE IF NOT EXISTS document_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    purchase_order_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    match_status TEXT NOT NULL, -- 'Matched', 'Discrepancy Detected', 'Partial Match'
    comparison_result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_matches_user ON document_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_matches_inv ON document_matches(invoice_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_matches_po ON document_matches(purchase_order_document_id);

-- 7. DOCUMENT REVIEWS TABLE (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS document_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    reviewer_action TEXT NOT NULL, -- 'Approve', 'Edit', 'Mark for Review', 'Reject'
    correction_data JSONB,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_reviews_doc ON document_reviews(document_id);

-- 8. PROCESSING JOBS TABLE
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Processing', 'Completed', 'Failed'
    attempts INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_doc ON processing_jobs(document_id);

-- 9. REFRESH TOKENS TABLE
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies when accessed via Supabase Client with Auth:
-- Service role bypasses RLS on the backend, ensuring backend maintains strict authorization middleware.

