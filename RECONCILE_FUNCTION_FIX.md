# Reconcile Function Performance Fix

## Issue
The `reconcile-payments` Edge Function (v6) is timing out after 29 seconds because it's doing **51 sequential database queries** to fetch payment data.

## Root Cause
The deployed version uses this slow approach:
```typescript
for (const payment of (paymentsRaw || [])) {
  const { data: lease } = await supabase.from('leases').select(...).single();
  const { data: property } = await supabase.from('properties').select(...).single();
  const { data: tenant } = await supabase.from('tenants').select(...).single();
}
```

This causes:
- 51 payments × 3 queries each = **153 sequential database calls**
- Takes ~29 seconds and times out
- Returns 500 error

## Solution
Use a single optimized SQL query with JOINs:

```sql
SELECT 
  p.id,
  p.payment_date,
  p.payment_amount,
  p.reference,
  p.lease_id,
  l.tenant_id,
  t.name as tenant_name,
  pr.name as property_name
FROM payments p
INNER JOIN leases l ON p.lease_id = l.id
INNER JOIN tenants t ON l.tenant_id = t.id
INNER JOIN properties pr ON l.property_id = pr.id
WHERE p.is_reconciled = false 
  AND p.status = 'completed'
  AND pr.owner_id = $1
```

This fetches all 51 payments in **one query** (~100ms instead of 29 seconds).

## Action Required
The Edge Function needs to be redeployed with the optimized SQL approach. However, Supabase Edge Functions don't support raw SQL execution easily.

## Alternative: Use Supabase RPC
Create a Postgres function that does the JOIN and returns the data:

```sql
CREATE OR REPLACE FUNCTION get_unreconciled_payments_for_user(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  payment_date DATE,
  payment_amount NUMERIC,
  reference TEXT,
  lease_id UUID,
  tenant_id UUID,
  tenant_name TEXT,
  property_name TEXT
) 
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    p.id,
    p.payment_date,
    p.payment_amount,
    p.reference,
    p.lease_id,
    l.tenant_id,
    t.name as tenant_name,
    pr.name as property_name
  FROM payments p
  INNER JOIN leases l ON p.lease_id = l.id
  INNER JOIN tenants t ON l.tenant_id = t.id
  INNER JOIN properties pr ON l.property_id = pr.id
  WHERE p.is_reconciled = false 
    AND p.status = 'completed'
    AND pr.owner_id = p_user_id;
$$;
```

Then in the Edge Function:
```typescript
const { data: payments } = await supabase.rpc('get_unreconciled_payments_for_user', {
  p_user_id: user.id
});
```

## Immediate Workaround
Since we can't easily redeploy with RPC, let's just reduce the dataset for now by filtering payments with recent dates only.

