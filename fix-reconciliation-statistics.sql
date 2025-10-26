-- =====================================================
-- Fix for Reconciliation History Statistics Issue
-- =====================================================
-- This script creates a function to recalculate session statistics
-- and fixes the data consistency issue

-- 1. Create function to update session statistics
CREATE OR REPLACE FUNCTION update_reconciliation_session_stats(p_session_id UUID)
RETURNS void AS $$
DECLARE
  v_total_transactions INT;
  v_auto_matched INT;
  v_review_required INT;
  v_unmatched INT;
BEGIN
  -- Count total transactions
  SELECT COUNT(*)
  INTO v_total_transactions
  FROM payment_reconciliations
  WHERE session_id = p_session_id;
  
  -- Count auto-matched (definite_match, high_confidence, confirmed)
  SELECT COUNT(*)
  INTO v_auto_matched
  FROM payment_reconciliations
  WHERE session_id = p_session_id
  AND match_status IN ('definite_match', 'high_confidence', 'confirmed', 'manually_linked');
  
  -- Count review required
  SELECT COUNT(*)
  INTO v_review_required
  FROM payment_reconciliations
  WHERE session_id = p_session_id
  AND match_status = 'review_required';
  
  -- Count unmatched (unmatched, rejected, or null bank_transaction_id)
  SELECT COUNT(*)
  INTO v_unmatched
  FROM payment_reconciliations
  WHERE session_id = p_session_id
  AND (match_status IN ('unmatched', 'rejected') OR bank_transaction_id IS NULL);
  
  -- Update session
  UPDATE reconciliation_sessions
  SET 
    total_transactions = v_total_transactions,
    auto_matched = v_auto_matched,
    review_required = v_review_required,
    unmatched = v_unmatched,
    updated_at = NOW()
  WHERE id = p_session_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger to auto-update stats when reconciliations change
CREATE OR REPLACE FUNCTION trigger_update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for the affected session
  PERFORM update_reconciliation_session_stats(
    COALESCE(NEW.session_id, OLD.session_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_session_stats_on_reconciliation_change ON payment_reconciliations;

-- Create trigger
CREATE TRIGGER update_session_stats_on_reconciliation_change
AFTER INSERT OR UPDATE OR DELETE ON payment_reconciliations
FOR EACH ROW
EXECUTE FUNCTION trigger_update_session_stats();

-- 3. Recalculate stats for ALL existing sessions
DO $$
DECLARE
  session_record RECORD;
BEGIN
  FOR session_record IN SELECT id FROM reconciliation_sessions
  LOOP
    PERFORM update_reconciliation_session_stats(session_record.id);
  END LOOP;
  
  RAISE NOTICE 'Successfully recalculated statistics for all sessions';
END $$;

-- 4. Fix sessions stuck in "processing" status
-- Mark as failed if they have been processing for more than 10 minutes and have no reconciliation data
UPDATE reconciliation_sessions
SET 
  processing_status = 'failed',
  error_message = 'Processing timeout - no reconciliation data found',
  updated_at = NOW()
WHERE processing_status = 'processing'
AND created_at < NOW() - INTERVAL '10 minutes'
AND NOT EXISTS (
  SELECT 1 FROM payment_reconciliations 
  WHERE payment_reconciliations.session_id = reconciliation_sessions.id
);

-- Mark as completed if they have reconciliation data but are still marked as processing
UPDATE reconciliation_sessions
SET 
  processing_status = 'completed',
  updated_at = NOW()
WHERE processing_status = 'processing'
AND EXISTS (
  SELECT 1 FROM payment_reconciliations 
  WHERE payment_reconciliations.session_id = reconciliation_sessions.id
);

-- 5. Display current session statistics
SELECT 
  rs.id,
  rs.file_name,
  rs.processing_status,
  rs.total_transactions,
  rs.auto_matched,
  rs.review_required,
  rs.unmatched,
  rs.created_at
FROM reconciliation_sessions rs
ORDER BY rs.created_at DESC
LIMIT 10;

