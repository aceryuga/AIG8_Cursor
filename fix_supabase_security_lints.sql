-- Fix Supabase Performance Security Lints
-- This script addresses the RLS (Row Level Security) issues identified in the security lints

-- Enable RLS on all public tables that currently have it disabled
-- Based on the security lints, these tables need RLS enabled:

-- 1. Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on tenants table
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on leases table
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- 4. Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5. Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 6. Enable RLS on maintenance_requests table
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- 7. Enable RLS on email_tokens table
ALTER TABLE public.email_tokens ENABLE ROW LEVEL SECURITY;

-- 8. Enable RLS on rental_increases table
ALTER TABLE public.rental_increases ENABLE ROW LEVEL SECURITY;

-- 9. Enable RLS on communication_log table
ALTER TABLE public.communication_log ENABLE ROW LEVEL SECURITY;

-- 10. Enable RLS on property_images table (this one has policies but RLS was disabled)
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- 11. Enable RLS on properties table
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 12. Enable RLS on subscription_plans table
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Note: The property_images table already has RLS policies created:
-- - "Users can delete their own property images"
-- - "Users can insert images for their own properties" 
-- - "Users can update their own property images"
-- - "Users can view their own property images"

-- For other tables, you may need to create appropriate RLS policies
-- based on your application's security requirements.

-- Example RLS policies for common patterns (uncomment and modify as needed):

-- Users table - users can only see and modify their own data
-- CREATE POLICY "Users can view own profile" ON public.users
--     FOR SELECT USING (auth.uid() = id);

-- CREATE POLICY "Users can update own profile" ON public.users
--     FOR UPDATE USING (auth.uid() = id);

-- Tenants table - users can only see tenants for their own properties
-- CREATE POLICY "Users can view own tenants" ON public.tenants
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM public.properties 
--             WHERE properties.id = tenants.property_id 
--             AND properties.user_id = auth.uid()
--         )
--     );

-- Properties table - users can only see and modify their own properties
-- CREATE POLICY "Users can view own properties" ON public.properties
--     FOR SELECT USING (user_id = auth.uid());

-- CREATE POLICY "Users can insert own properties" ON public.properties
--     FOR INSERT WITH CHECK (user_id = auth.uid());

-- CREATE POLICY "Users can update own properties" ON public.properties
--     FOR UPDATE USING (user_id = auth.uid());

-- CREATE POLICY "Users can delete own properties" ON public.properties
--     FOR DELETE USING (user_id = auth.uid());

-- Payments table - users can only see payments for their own properties
-- CREATE POLICY "Users can view own payments" ON public.payments
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM public.leases 
--             JOIN public.properties ON properties.id = leases.property_id
--             WHERE leases.id = payments.lease_id 
--             AND properties.user_id = auth.uid()
--         )
--     );

-- Documents table - users can only see documents for their own properties
-- CREATE POLICY "Users can view own documents" ON public.documents
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM public.properties 
--             WHERE properties.id = documents.property_id 
--             AND properties.user_id = auth.uid()
--         )
--     );

-- Maintenance requests - users can only see requests for their own properties
-- CREATE POLICY "Users can view own maintenance requests" ON public.maintenance_requests
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM public.properties 
--             WHERE properties.id = maintenance_requests.property_id 
--             AND properties.user_id = auth.uid()
--         )
--     );

-- Email tokens - users can only see their own tokens
-- CREATE POLICY "Users can view own email tokens" ON public.email_tokens
--     FOR SELECT USING (user_id = auth.uid());

-- Rental increases - users can only see increases for their own properties
-- CREATE POLICY "Users can view own rental increases" ON public.rental_increases
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM public.leases 
--             JOIN public.properties ON properties.id = leases.property_id
--             WHERE leases.id = rental_increases.lease_id 
--             AND properties.user_id = auth.uid()
--         )
--     );

-- Communication log - users can only see communications for their own properties
-- CREATE POLICY "Users can view own communications" ON public.communication_log
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM public.properties 
--             WHERE properties.id = communication_log.property_id 
--             AND properties.user_id = auth.uid()
--         )
--     );

-- Subscription plans - typically read-only for all authenticated users
-- CREATE POLICY "Authenticated users can view subscription plans" ON public.subscription_plans
--     FOR SELECT USING (auth.role() = 'authenticated');

-- Verify RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'tenants', 'leases', 'payments', 'documents', 
    'maintenance_requests', 'email_tokens', 'rental_increases', 
    'communication_log', 'property_images', 'properties', 'subscription_plans'
)
ORDER BY tablename;
