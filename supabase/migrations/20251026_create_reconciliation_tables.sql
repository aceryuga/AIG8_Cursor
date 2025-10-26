-- =====================================================
-- AI Bank Reconciliation Feature - Database Schema
-- Created: 2025-10-26
-- Description: Tables for AI-powered bank statement reconciliation
-- =====================================================

-- =====================================================
-- TABLE 1: reconciliation_sessions
-- Purpose: Track each bank statement upload and processing session
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reconciliation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER NOT NULL, -- in bytes
    upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    processing_status TEXT NOT NULL DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'processing', 'completed', 'failed')),
    total_transactions INTEGER NOT NULL DEFAULT 0,
    auto_matched INTEGER NOT NULL DEFAULT 0,
    review_required INTEGER NOT NULL DEFAULT 0,
    unmatched INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user queries
CREATE INDEX idx_reconciliation_sessions_user_id ON public.reconciliation_sessions(user_id);
CREATE INDEX idx_reconciliation_sessions_status ON public.reconciliation_sessions(processing_status);
CREATE INDEX idx_reconciliation_sessions_upload_date ON public.reconciliation_sessions(upload_date DESC);

COMMENT ON TABLE public.reconciliation_sessions IS 'Tracks bank statement upload sessions and processing status';
COMMENT ON COLUMN public.reconciliation_sessions.auto_matched IS 'Count of definite_match + high_confidence + confirmed matches';

-- =====================================================
-- TABLE 2: bank_transactions
-- Purpose: Store parsed transactions from bank statements
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.reconciliation_sessions(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL, -- cleaned description
    amount NUMERIC(10,2) NOT NULL, -- positive for credits
    balance NUMERIC(10,2),
    reference_number TEXT,
    transaction_type TEXT CHECK (transaction_type IN ('UPI', 'NEFT', 'RTGS', 'IMPS', 'CASH', 'CHEQUE', 'OTHER')),
    raw_description TEXT NOT NULL, -- original unprocessed description
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast matching queries
CREATE INDEX idx_bank_transactions_session_id ON public.bank_transactions(session_id);
CREATE INDEX idx_bank_transactions_date ON public.bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_amount ON public.bank_transactions(amount);
CREATE INDEX idx_bank_transactions_date_amount ON public.bank_transactions(transaction_date, amount);

COMMENT ON TABLE public.bank_transactions IS 'Parsed and normalized bank statement transactions';
COMMENT ON COLUMN public.bank_transactions.description IS 'Cleaned and standardized description';
COMMENT ON COLUMN public.bank_transactions.raw_description IS 'Original description from bank statement';

-- =====================================================
-- TABLE 3: payment_reconciliations
-- Purpose: Store matching results between payments and bank transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payment_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    bank_transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
    session_id UUID NOT NULL REFERENCES public.reconciliation_sessions(id) ON DELETE CASCADE,
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    match_status TEXT NOT NULL CHECK (match_status IN ('definite_match', 'high_confidence', 'review_required', 'unmatched', 'confirmed', 'rejected', 'manually_linked')),
    matching_reasons JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of reason strings
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    is_reconciled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for queries
CREATE INDEX idx_payment_reconciliations_payment_id ON public.payment_reconciliations(payment_id);
CREATE INDEX idx_payment_reconciliations_session_id ON public.payment_reconciliations(session_id);
CREATE INDEX idx_payment_reconciliations_match_status ON public.payment_reconciliations(match_status);
CREATE INDEX idx_payment_reconciliations_bank_transaction_id ON public.payment_reconciliations(bank_transaction_id);

COMMENT ON TABLE public.payment_reconciliations IS 'AI matching results between payments and bank transactions';
COMMENT ON COLUMN public.payment_reconciliations.matching_reasons IS 'Array of matching reasons like ["exact_amount", "within_2days", "tenant_name_found"]';

-- =====================================================
-- TABLE 4: reconciliation_patterns
-- Purpose: Learning system - store confirmed matching patterns
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reconciliation_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    bank_description_pattern TEXT NOT NULL,
    confidence_boost INTEGER NOT NULL DEFAULT 10,
    times_confirmed INTEGER NOT NULL DEFAULT 1,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for pattern lookups
CREATE INDEX idx_reconciliation_patterns_user_tenant ON public.reconciliation_patterns(user_id, tenant_id);
CREATE INDEX idx_reconciliation_patterns_user_pattern ON public.reconciliation_patterns(user_id, bank_description_pattern);

-- Unique constraint to prevent duplicate patterns
CREATE UNIQUE INDEX idx_reconciliation_patterns_unique ON public.reconciliation_patterns(user_id, tenant_id, bank_description_pattern);

COMMENT ON TABLE public.reconciliation_patterns IS 'Learned patterns from confirmed matches to improve future accuracy';
COMMENT ON COLUMN public.reconciliation_patterns.confidence_boost IS 'Points to add when pattern matches in future reconciliations';

-- =====================================================
-- UPDATE PAYMENTS TABLE
-- Add reconciliation tracking columns
-- =====================================================
DO $$ 
BEGIN
    -- Add is_reconciled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'payments' 
                   AND column_name = 'is_reconciled') THEN
        ALTER TABLE public.payments ADD COLUMN is_reconciled BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Add last_reconciliation_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'payments' 
                   AND column_name = 'last_reconciliation_date') THEN
        ALTER TABLE public.payments ADD COLUMN last_reconciliation_date TIMESTAMPTZ;
    END IF;
END $$;

-- Index for filtering reconciled payments
CREATE INDEX IF NOT EXISTS idx_payments_is_reconciled ON public.payments(is_reconciled);

COMMENT ON COLUMN public.payments.is_reconciled IS 'Whether payment has been reconciled with bank statement';
COMMENT ON COLUMN public.payments.last_reconciliation_date IS 'Timestamp of last reconciliation';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_patterns ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: reconciliation_sessions
-- =====================================================

-- Users can view their own sessions
CREATE POLICY "Users can view own reconciliation sessions" 
ON public.reconciliation_sessions
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own sessions
CREATE POLICY "Users can insert own reconciliation sessions" 
ON public.reconciliation_sessions
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update own reconciliation sessions" 
ON public.reconciliation_sessions
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users can delete own reconciliation sessions" 
ON public.reconciliation_sessions
FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: bank_transactions
-- =====================================================

-- Users can view transactions from their own sessions
CREATE POLICY "Users can view own bank transactions" 
ON public.bank_transactions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.reconciliation_sessions
        WHERE reconciliation_sessions.id = bank_transactions.session_id
        AND reconciliation_sessions.user_id = auth.uid()
    )
);

-- Users can insert transactions for their own sessions
CREATE POLICY "Users can insert own bank transactions" 
ON public.bank_transactions
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.reconciliation_sessions
        WHERE reconciliation_sessions.id = bank_transactions.session_id
        AND reconciliation_sessions.user_id = auth.uid()
    )
);

-- Users can update transactions from their own sessions
CREATE POLICY "Users can update own bank transactions" 
ON public.bank_transactions
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.reconciliation_sessions
        WHERE reconciliation_sessions.id = bank_transactions.session_id
        AND reconciliation_sessions.user_id = auth.uid()
    )
);

-- Users can delete transactions from their own sessions
CREATE POLICY "Users can delete own bank transactions" 
ON public.bank_transactions
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.reconciliation_sessions
        WHERE reconciliation_sessions.id = bank_transactions.session_id
        AND reconciliation_sessions.user_id = auth.uid()
    )
);

-- =====================================================
-- RLS POLICIES: payment_reconciliations
-- =====================================================

-- Users can view reconciliations for their own payments
CREATE POLICY "Users can view own payment reconciliations" 
ON public.payment_reconciliations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.payments
        JOIN public.leases ON leases.id = payments.lease_id
        JOIN public.properties ON properties.id = leases.property_id
        WHERE payments.id = payment_reconciliations.payment_id
        AND properties.owner_id = auth.uid()
    )
);

-- Users can insert reconciliations for their own payments
CREATE POLICY "Users can insert own payment reconciliations" 
ON public.payment_reconciliations
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.payments
        JOIN public.leases ON leases.id = payments.lease_id
        JOIN public.properties ON properties.id = leases.property_id
        WHERE payments.id = payment_reconciliations.payment_id
        AND properties.owner_id = auth.uid()
    )
);

-- Users can update reconciliations for their own payments
CREATE POLICY "Users can update own payment reconciliations" 
ON public.payment_reconciliations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.payments
        JOIN public.leases ON leases.id = payments.lease_id
        JOIN public.properties ON properties.id = leases.property_id
        WHERE payments.id = payment_reconciliations.payment_id
        AND properties.owner_id = auth.uid()
    )
);

-- Users can delete reconciliations for their own payments
CREATE POLICY "Users can delete own payment reconciliations" 
ON public.payment_reconciliations
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.payments
        JOIN public.leases ON leases.id = payments.lease_id
        JOIN public.properties ON properties.id = leases.property_id
        WHERE payments.id = payment_reconciliations.payment_id
        AND properties.owner_id = auth.uid()
    )
);

-- =====================================================
-- RLS POLICIES: reconciliation_patterns
-- =====================================================

-- Users can view their own patterns
CREATE POLICY "Users can view own reconciliation patterns" 
ON public.reconciliation_patterns
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own patterns
CREATE POLICY "Users can insert own reconciliation patterns" 
ON public.reconciliation_patterns
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own patterns
CREATE POLICY "Users can update own reconciliation patterns" 
ON public.reconciliation_patterns
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own patterns
CREATE POLICY "Users can delete own reconciliation patterns" 
ON public.reconciliation_patterns
FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for reconciliation_sessions
DROP TRIGGER IF EXISTS update_reconciliation_sessions_updated_at ON public.reconciliation_sessions;
CREATE TRIGGER update_reconciliation_sessions_updated_at
    BEFORE UPDATE ON public.reconciliation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for payment_reconciliations
DROP TRIGGER IF EXISTS update_payment_reconciliations_updated_at ON public.payment_reconciliations;
CREATE TRIGGER update_payment_reconciliations_updated_at
    BEFORE UPDATE ON public.payment_reconciliations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reconciliation_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_reconciliations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reconciliation_patterns TO authenticated;

-- Grant usage on sequences (if any auto-increment columns exist)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'AI Bank Reconciliation tables created successfully!';
    RAISE NOTICE 'Tables: reconciliation_sessions, bank_transactions, payment_reconciliations, reconciliation_patterns';
    RAISE NOTICE 'Payments table updated with: is_reconciled, last_reconciliation_date';
    RAISE NOTICE 'RLS policies enabled and configured';
END $$;

