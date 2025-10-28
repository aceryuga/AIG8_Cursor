-- Comprehensive Test Payments for AI Reconciliation Feature
-- Property: AI Reconcile Test Property
-- Lease ID: 04ba8825-f9fc-46bf-9180-28659fd30295
-- Tenant: Arjun Kumar (772639e3-e6f7-43e4-85ef-8a4b900c7100)

INSERT INTO payments (id, lease_id, payment_date, payment_amount, payment_method, reference, payment_type, status, is_reconciled, created_at, updated_at)
VALUES
-- Scenario 2: Tenant name variation (P Kumar vs Arjun Kumar)
-- Expected: HIGH_CONFIDENCE (tenant name partial match)
('00000000-0000-0000-0000-000000000010', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-28', 6000, 'bank_transfer', 'PAY-NAME-VAR-001', 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 3: Partial reference match
-- Expected: HIGH_CONFIDENCE (reference substring match)
('00000000-0000-0000-0000-000000000011', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-28', 7000, 'bank_transfer', 'RENT-002', 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 4: Tenant name complete mismatch
-- Expected: REVIEW_REQUIRED or HIGH_CONFIDENCE (Rohit Sharma vs Arjun Kumar)
('00000000-0000-0000-0000-000000000012', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-28', 8000, 'upi', 'PAY-NAME-MIS-003', 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 5: Amount within ₹1
-- Expected: HIGH_CONFIDENCE (8999 vs 9000)
('00000000-0000-0000-0000-000000000013', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-28', 9000, 'bank_transfer', 'PAY-AMT1-004', 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 6: Date within 2 days
-- Expected: HIGH_CONFIDENCE (Oct 28 vs Oct 30)
('00000000-0000-0000-0000-000000000014', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-28', 10000, 'bank_transfer', 'PAY-DATE2-005', 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 7: Date within 5 days
-- Expected: REVIEW_REQUIRED (Oct 28 vs Nov 2)
('00000000-0000-0000-0000-000000000015', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-28', 11000, 'bank_transfer', 'PAY-DATE5-006', 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 8: Amount within ₹10
-- Expected: REVIEW_REQUIRED (11992 vs 12000)
('00000000-0000-0000-0000-000000000016', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-28', 12000, 'upi', 'PAY-AMT10-007', 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 9: Multiple partial matches
-- Expected: REVIEW_REQUIRED (amount +5, date -1 day, partial ref, partial name)
('00000000-0000-0000-0000-000000000017', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-27', 13000, 'bank_transfer', 'PARTIAL-008', 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 10: Date beyond tolerance (>7 days)
-- Expected: UNMATCHED or LOW SCORE (Oct 15 vs Nov 10 = 26 days)
('00000000-0000-0000-0000-000000000018', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-15', 14000, 'bank_transfer', 'PAY-DATE-FAR-009', 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 11: Amount mismatch (>₹10)
-- Expected: UNMATCHED (12000 vs 15000 = 3000 diff)
('00000000-0000-0000-0000-000000000019', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-28', 15000, 'bank_transfer', 'PAY-AMT-BIG-010', 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 12: Everything mismatched
-- Expected: UNMATCHED (completely different)
('00000000-0000-0000-0000-000000000020', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-10', 16000, 'cash', 'PAY-NO-MATCH-011', 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 13: Fuzzy name matching
-- Expected: HIGH_CONFIDENCE (Arun vs Arjun - fuzzy match)
('00000000-0000-0000-0000-000000000021', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-28', 17000, 'upi', 'PAY-FUZZY-012', 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 14: No reference in payment
-- Expected: HIGH_CONFIDENCE or REVIEW_REQUIRED (matched by amount+date+name only)
('00000000-0000-0000-0000-000000000022', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-28', 18000, 'bank_transfer', NULL, 'Rent', 'completed', FALSE, NOW(), NOW()),

-- Scenario 15: Date within 7 days (edge of tolerance)
-- Expected: REVIEW_REQUIRED (Oct 21 vs Oct 28 = 7 days)
('00000000-0000-0000-0000-000000000023', '04ba8825-f9fc-46bf-9180-28659fd30295', '2025-10-21', 19000, 'bank_transfer', 'PAY-DATE7-013', 'Rent', 'completed', FALSE, NOW(), NOW());

-- SCORING REFERENCE (from reconcile-payments/index.ts):
-- 
-- Amount Scoring:
-- - Exact match: 40 points
-- - Within ₹1: 35 points  
-- - Within ₹10: 25 points
-- - Greater difference: 0 points (rejected)
--
-- Date Scoring:
-- - Same day: 30 points
-- - Within 2 days: 25 points
-- - Within 5 days: 15 points
-- - Within 7 days: 10 points
-- - Beyond 7 days: -20 points
--
-- Reference Scoring:
-- - Exact match: 30 points
-- - Contains/substring: 20 points
-- - No match: 0 points
--
-- Tenant Name Scoring:
-- - Exact match: 25 points
-- - Contains/partial: 15 points
-- - Fuzzy match (similarity > 0.6): 10 points
-- - No match: 0 points
--
-- Thresholds:
-- - DEFINITE_MATCH: 90+ (auto-reconcile)
-- - HIGH_CONFIDENCE: 75-89 (auto-reconcile)
-- - REVIEW_REQUIRED: 50-74 (manual review)
-- - Below 50: Not matched

