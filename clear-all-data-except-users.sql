-- Clear all data from all tables except Users table
-- This preserves user accounts and login data but removes all business data
-- Execute this script in Supabase SQL Editor

-- Start transaction for safety
BEGIN;

-- 1. Delete all payments (references leases)
DELETE FROM public.payments;

-- 2. Delete all rental increases (references leases)
DELETE FROM public.rental_increases;

-- 3. Delete all communication log (references leases and tenants)
DELETE FROM public.communication_log;

-- 4. Delete all documents (references properties, leases, and tenants)
DELETE FROM public.documents;

-- 5. Delete all property images (references properties)
DELETE FROM public.property_images;

-- 6. Delete all maintenance requests (references properties and tenants)
DELETE FROM public.maintenance_requests;

-- 7. Delete all leases (references properties and tenants)
DELETE FROM public.leases;

-- 8. Delete all tenants (no foreign key dependencies)
DELETE FROM public.tenants;

-- 9. Delete all properties (references users, but we're keeping users)
DELETE FROM public.properties;

-- 10. Delete all audit events (references users, but we're keeping users)
DELETE FROM public.audit_events;

-- 11. Delete all error logs (references users, but we're keeping users)
DELETE FROM public.error_logs;

-- 12. Delete all email tokens (references users, but we're keeping users)
DELETE FROM public.email_tokens;

-- 13. Delete all billing history (references users and subscriptions)
DELETE FROM public.billing_history;

-- 14. Delete all login activity (references users, but we're keeping users)
DELETE FROM public.login_activity;

-- 15. Delete all data export requests (references users, but we're keeping users)
DELETE FROM public.data_export_requests;

-- 16. Reset user settings to defaults (keep the records but reset counters)
UPDATE public.user_settings 
SET 
    property_count = 0,
    updated_at = now();

-- 17. Reset user subscriptions to defaults (keep the records but reset usage)
UPDATE public.user_subscriptions 
SET 
    properties_used = 0,
    storage_used_mb = 0,
    api_calls_used = 0,
    updated_at = now();

-- Commit the transaction
COMMIT;

-- Verification queries to confirm cleanup
SELECT 'Properties deleted:' as info, COUNT(*) as remaining_count FROM public.properties;
SELECT 'Tenants deleted:' as info, COUNT(*) as remaining_count FROM public.tenants;
SELECT 'Leases deleted:' as info, COUNT(*) as remaining_count FROM public.leases;
SELECT 'Payments deleted:' as info, COUNT(*) as remaining_count FROM public.payments;
SELECT 'Documents deleted:' as info, COUNT(*) as remaining_count FROM public.documents;
SELECT 'Property Images deleted:' as info, COUNT(*) as remaining_count FROM public.property_images;
SELECT 'Maintenance Requests deleted:' as info, COUNT(*) as remaining_count FROM public.maintenance_requests;
SELECT 'Communication Log deleted:' as info, COUNT(*) as remaining_count FROM public.communication_log;
SELECT 'Rental Increases deleted:' as info, COUNT(*) as remaining_count FROM public.rental_increases;
SELECT 'Audit Events deleted:' as info, COUNT(*) as remaining_count FROM public.audit_events;
SELECT 'Error Logs deleted:' as info, COUNT(*) as remaining_count FROM public.error_logs;
SELECT 'Email Tokens deleted:' as info, COUNT(*) as remaining_count FROM public.email_tokens;
SELECT 'Billing History deleted:' as info, COUNT(*) as remaining_count FROM public.billing_history;
SELECT 'Login Activity deleted:' as info, COUNT(*) as remaining_count FROM public.login_activity;
SELECT 'Data Export Requests deleted:' as info, COUNT(*) as remaining_count FROM public.data_export_requests;

-- Show preserved data
SELECT 'Users preserved:' as info, COUNT(*) as count FROM public.users;
SELECT 'User Settings preserved:' as info, COUNT(*) as count FROM public.user_settings;
SELECT 'User Subscriptions preserved:' as info, COUNT(*) as count FROM public.user_subscriptions;
SELECT 'Subscription Plans preserved:' as info, COUNT(*) as count FROM public.subscription_plans;

-- Show user details (preserved)
SELECT 'Preserved Users:' as info;
SELECT id, name, email, role, created_at FROM public.users ORDER BY created_at;
