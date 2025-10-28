-- Test Payments for AI Reconciliation Feature Testing
-- Property: AI Reconcile Test Property (Tenant: Arjun Kumar)
-- Execute this after getting the property_id and tenant_id from the database

-- First, get the IDs:
-- SELECT p.id as property_id, t.id as tenant_id, p.owner_id 
-- FROM properties p 
-- JOIN tenants t ON t.property_id = p.id 
-- WHERE p.property_name = 'AI Reconcile Test Property';

-- Replace <property_id>, <tenant_id>, and <user_id> with actual values

-- Payment 1: High Confidence - Exact match (already created via UI)
-- ₹5,000, 2025-10-28, REF-EXACT-001

-- Payment 2: High Confidence - Amount within ₹1
INSERT INTO payments (
  property_id, tenant_id, owner_id,
  payment_amount, payment_date, payment_method, payment_type,
  reference, status, is_reconciled
) VALUES (
  '<property_id>', '<tenant_id>', '<user_id>',
  4999, '2025-10-27', 'Bank Transfer', 'Rent',
  'REF-WITHIN1-002', 'completed', false
);

-- Payment 3: Low Confidence - Amount within ₹10, date within 3 days
INSERT INTO payments (
  property_id, tenant_id, owner_id,
  payment_amount, payment_date, payment_method, payment_type,
  reference, status, is_reconciled
) VALUES (
  '<property_id>', '<tenant_id>', '<user_id>',
  4995, '2025-10-25', 'UPI', 'Rent',
  'REF-WITHIN10-003', 'completed', false
);

-- Payment 4: Partial Reference Match
INSERT INTO payments (
  property_id, tenant_id, owner_id,
  payment_amount, payment_date, payment_method, payment_type,
  reference, status, is_reconciled
) VALUES (
  '<property_id>', '<tenant_id>', '<user_id>',
  5000, '2025-10-26', 'Bank Transfer', 'Rent',
  'PARTIAL', 'completed', false
);

-- Payment 5: Date far apart (>7 days) - should get penalty
INSERT INTO payments (
  property_id, tenant_id, owner_id,
  payment_amount, payment_date, payment_method, payment_type,
  reference, status, is_reconciled
) VALUES (
  '<property_id>', '<tenant_id>', '<user_id>',
  5000, '2025-10-15', 'Cash', 'Rent',
  'REF-DATE-FAR-005', 'completed', false
);

-- Payment 6: Amount mismatch >₹10 (should not match)
INSERT INTO payments (
  property_id, tenant_id, owner_id,
  payment_amount, payment_date, payment_method, payment_type,
  reference, status, is_reconciled
) VALUES (
  '<property_id>', '<tenant_id>', '<user_id>',
  5050, '2025-10-28', 'UPI', 'Rent',
  'REF-AMOUNT-MISMATCH-006', 'completed', false
);

-- Payment 7: No matching bank transaction (orphan payment)
INSERT INTO payments (
  property_id, tenant_id, owner_id,
  payment_amount, payment_date, payment_method, payment_type,
  reference, status, is_reconciled
) VALUES (
  '<property_id>', '<tenant_id>', '<user_id>',
  5000, '2025-10-20', 'Bank Transfer', 'Rent',
  'REF-NO-MATCH-007', 'completed', false
);

