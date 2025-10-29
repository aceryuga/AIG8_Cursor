# Redeploy Edge Functions

## Quick Fix Applied

Fixed the `reconcile-payments` Edge Function to:
- Remove `!inner` joins that were too strict
- Add better error logging
- Handle missing payments gracefully
- Filter payments properly for the current user

---

## How to Redeploy

### Option 1: Via Supabase Dashboard (Easiest)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/xsoyzbanlgxoijrweemz/functions)
2. Click on `reconcile-payments` function
3. Click **"Deploy New Version"**
4. Upload the file: `supabase/functions/reconcile-payments/index.ts`
5. Click **Deploy**

### Option 2: Via Supabase CLI
```bash
cd "/Users/mayankshah/Desktop/AIG8/Cursor/AIG8_Cursor copy 3"

# Deploy reconcile-payments
supabase functions deploy reconcile-payments

# Or deploy both functions
supabase functions deploy parse-bank-statement
supabase functions deploy reconcile-payments
```

---

## After Redeployment

Try uploading the bank statement again. The function should now:
- ✅ Handle no payments gracefully
- ✅ Show better error messages
- ✅ Log more details for debugging

---

## Most Likely Issue

**You probably have NO completed payments in your database!**

To test properly, you need to:
1. Create some properties
2. Create some leases
3. **Create some COMPLETED payments** (status = 'completed', is_reconciled = false)
4. Then try the reconciliation again

---

## Quick Test Data

Run this SQL in Supabase SQL Editor to create test payments:

```sql
-- Check if you have any payments
SELECT COUNT(*) as total_payments, 
       COUNT(*) FILTER (WHERE is_reconciled = false) as unreconciled,
       COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM payments;

-- If you have leases, create a test payment
INSERT INTO payments (
  lease_id,
  payment_date,
  payment_amount,
  payment_method,
  status,
  payment_type,
  is_reconciled
)
SELECT 
  id as lease_id,
  CURRENT_DATE as payment_date,
  monthly_rent as payment_amount,
  'upi' as payment_method,
  'completed' as status,
  'Rent' as payment_type,
  false as is_reconciled
FROM leases
WHERE is_active = true
LIMIT 5;
```

This will create 5 test payments that can be reconciled!

