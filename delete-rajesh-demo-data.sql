-- Delete all properties and related data created by Rajesh demo user
-- User ID: 274ce749-0771-45dd-b780-467f29d6bd3d
-- Execute this script in Supabase SQL Editor

-- Start transaction for safety
BEGIN;

-- 1. Delete payments first (references leases)
DELETE FROM public.payments 
WHERE lease_id IN (
    SELECT l.id 
    FROM public.leases l
    JOIN public.properties p ON l.property_id = p.id
    WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d'
);

-- 2. Delete rental increases (references leases)
DELETE FROM public.rental_increases 
WHERE lease_id IN (
    SELECT l.id 
    FROM public.leases l
    JOIN public.properties p ON l.property_id = p.id
    WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d'
);

-- 3. Delete communication log (references leases and tenants)
DELETE FROM public.communication_log 
WHERE lease_id IN (
    SELECT l.id 
    FROM public.leases l
    JOIN public.properties p ON l.property_id = p.id
    WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d'
)
OR tenant_id IN (
    SELECT t.id 
    FROM public.tenants t
    JOIN public.properties p ON t.current_property_id = p.id
    WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d'
);

-- 4. Delete documents (references properties, leases, and tenants)
DELETE FROM public.documents 
WHERE property_id IN (
    SELECT p.id 
    FROM public.properties p
    WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d'
);

-- 5. Delete property images (references properties)
DELETE FROM public.property_images 
WHERE property_id IN (
    SELECT p.id 
    FROM public.properties p
    WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d'
);

-- 6. Delete maintenance requests (references properties and tenants)
DELETE FROM public.maintenance_requests 
WHERE property_id IN (
    SELECT p.id 
    FROM public.properties p
    WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d'
);

-- 7. Delete leases (references properties and tenants)
DELETE FROM public.leases 
WHERE property_id IN (
    SELECT p.id 
    FROM public.properties p
    WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d'
);

-- 8. Update tenants to remove current_property_id references
UPDATE public.tenants 
SET current_property_id = NULL 
WHERE current_property_id IN (
    SELECT p.id 
    FROM public.properties p
    WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d'
);

-- 9. Delete tenants that were associated with these properties
DELETE FROM public.tenants 
WHERE current_property_id IN (
    SELECT p.id 
    FROM public.properties p
    WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d'
)
OR id IN (
    SELECT t.id 
    FROM public.tenants t
    JOIN public.leases l ON t.id = l.tenant_id
    JOIN public.properties p ON l.property_id = p.id
    WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d'
);

-- 10. Delete audit events related to these properties
DELETE FROM public.audit_events 
WHERE entity_id IN (
    SELECT p.id 
    FROM public.properties p
    WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d'
)
OR user_id = '274ce749-0771-45dd-b780-467f29d6bd3d';

-- 11. Finally, delete the properties themselves
DELETE FROM public.properties 
WHERE owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d';

-- 12. Reset property count in user_settings for Rajesh
UPDATE public.user_settings 
SET property_count = 0 
WHERE user_id = '274ce749-0771-45dd-b780-467f29d6bd3d';

-- 13. Reset properties_used in user_subscriptions for Rajesh
UPDATE public.user_subscriptions 
SET properties_used = 0 
WHERE user_id = '274ce749-0771-45dd-b780-467f29d6bd3d';

-- Commit the transaction
COMMIT;

-- Verification queries to confirm deletion
SELECT 'Properties deleted:' as info, COUNT(*) as remaining_count 
FROM public.properties 
WHERE owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d';

SELECT 'Tenants deleted:' as info, COUNT(*) as remaining_count 
FROM public.tenants t
JOIN public.properties p ON t.current_property_id = p.id
WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d';

SELECT 'Leases deleted:' as info, COUNT(*) as remaining_count 
FROM public.leases l
JOIN public.properties p ON l.property_id = p.id
WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d';

SELECT 'Payments deleted:' as info, COUNT(*) as remaining_count 
FROM public.payments pay
JOIN public.leases l ON pay.lease_id = l.id
JOIN public.properties p ON l.property_id = p.id
WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d';

SELECT 'Documents deleted:' as info, COUNT(*) as remaining_count 
FROM public.documents d
JOIN public.properties p ON d.property_id = p.id
WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d';

SELECT 'Property Images deleted:' as info, COUNT(*) as remaining_count 
FROM public.property_images pi
JOIN public.properties p ON pi.property_id = p.id
WHERE p.owner_id = '274ce749-0771-45dd-b780-467f29d6bd3d';

-- Show updated user settings
SELECT 'Rajesh user settings after cleanup:' as info;
SELECT property_count FROM public.user_settings 
WHERE user_id = '274ce749-0771-45dd-b780-467f29d6bd3d';

SELECT 'Rajesh subscription after cleanup:' as info;
SELECT properties_used FROM public.user_subscriptions 
WHERE user_id = '274ce749-0771-45dd-b780-467f29d6bd3d';
