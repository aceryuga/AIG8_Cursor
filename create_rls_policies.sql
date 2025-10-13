-- Create comprehensive RLS policies for all public tables
-- This script creates the necessary Row Level Security policies after RLS is enabled

-- ==============================================
-- USERS TABLE POLICIES
-- ==============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ==============================================
-- PROPERTIES TABLE POLICIES
-- ==============================================

-- Users can view their own properties
CREATE POLICY "Users can view own properties" ON public.properties
    FOR SELECT USING (owner_id = auth.uid());

-- Users can insert their own properties
CREATE POLICY "Users can insert own properties" ON public.properties
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Users can update their own properties
CREATE POLICY "Users can update own properties" ON public.properties
    FOR UPDATE USING (owner_id = auth.uid());

-- Users can delete their own properties
CREATE POLICY "Users can delete own properties" ON public.properties
    FOR DELETE USING (owner_id = auth.uid());

-- ==============================================
-- TENANTS TABLE POLICIES
-- ==============================================

-- Users can view tenants for their own properties
CREATE POLICY "Users can view own tenants" ON public.tenants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = tenants.current_property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- Users can insert tenants for their own properties
CREATE POLICY "Users can insert own tenants" ON public.tenants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = tenants.current_property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- Users can update tenants for their own properties
CREATE POLICY "Users can update own tenants" ON public.tenants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = tenants.current_property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- Users can delete tenants for their own properties
CREATE POLICY "Users can delete own tenants" ON public.tenants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = tenants.current_property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- ==============================================
-- LEASES TABLE POLICIES
-- ==============================================

-- Users can view leases for their own properties
CREATE POLICY "Users can view own leases" ON public.leases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = leases.property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- Users can insert leases for their own properties
CREATE POLICY "Users can insert own leases" ON public.leases
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = leases.property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- Users can update leases for their own properties
CREATE POLICY "Users can update own leases" ON public.leases
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = leases.property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- Users can delete leases for their own properties
CREATE POLICY "Users can delete own leases" ON public.leases
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = leases.property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- ==============================================
-- PAYMENTS TABLE POLICIES
-- ==============================================

-- Users can view payments for their own properties
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leases 
            JOIN public.properties ON properties.id = leases.property_id
            WHERE leases.id = payments.lease_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Users can insert payments for their own properties
CREATE POLICY "Users can insert own payments" ON public.payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.leases 
            JOIN public.properties ON properties.id = leases.property_id
            WHERE leases.id = payments.lease_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Users can update payments for their own properties
CREATE POLICY "Users can update own payments" ON public.payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.leases 
            JOIN public.properties ON properties.id = leases.property_id
            WHERE leases.id = payments.lease_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Users can delete payments for their own properties
CREATE POLICY "Users can delete own payments" ON public.payments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.leases 
            JOIN public.properties ON properties.id = leases.property_id
            WHERE leases.id = payments.lease_id 
            AND properties.user_id = auth.uid()
        )
    );

-- ==============================================
-- DOCUMENTS TABLE POLICIES
-- ==============================================

-- Users can view documents for their own properties
CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = documents.property_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Users can insert documents for their own properties
CREATE POLICY "Users can insert own documents" ON public.documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = documents.property_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Users can update documents for their own properties
CREATE POLICY "Users can update own documents" ON public.documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = documents.property_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Users can delete documents for their own properties
CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = documents.property_id 
            AND properties.user_id = auth.uid()
        )
    );

-- ==============================================
-- MAINTENANCE_REQUESTS TABLE POLICIES
-- ==============================================

-- Users can view maintenance requests for their own properties
CREATE POLICY "Users can view own maintenance requests" ON public.maintenance_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = maintenance_requests.property_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Users can insert maintenance requests for their own properties
CREATE POLICY "Users can insert own maintenance requests" ON public.maintenance_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = maintenance_requests.property_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Users can update maintenance requests for their own properties
CREATE POLICY "Users can update own maintenance requests" ON public.maintenance_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = maintenance_requests.property_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Users can delete maintenance requests for their own properties
CREATE POLICY "Users can delete own maintenance requests" ON public.maintenance_requests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = maintenance_requests.property_id 
            AND properties.user_id = auth.uid()
        )
    );

-- ==============================================
-- EMAIL_TOKENS TABLE POLICIES
-- ==============================================

-- Users can view their own email tokens
CREATE POLICY "Users can view own email tokens" ON public.email_tokens
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own email tokens
CREATE POLICY "Users can insert own email tokens" ON public.email_tokens
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own email tokens
CREATE POLICY "Users can update own email tokens" ON public.email_tokens
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own email tokens
CREATE POLICY "Users can delete own email tokens" ON public.email_tokens
    FOR DELETE USING (user_id = auth.uid());

-- ==============================================
-- RENTAL_INCREASES TABLE POLICIES
-- ==============================================

-- Users can view rental increases for their own properties
CREATE POLICY "Users can view own rental increases" ON public.rental_increases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leases 
            JOIN public.properties ON properties.id = leases.property_id
            WHERE leases.id = rental_increases.lease_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Users can insert rental increases for their own properties
CREATE POLICY "Users can insert own rental increases" ON public.rental_increases
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.leases 
            JOIN public.properties ON properties.id = leases.property_id
            WHERE leases.id = rental_increases.lease_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Users can update rental increases for their own properties
CREATE POLICY "Users can update own rental increases" ON public.rental_increases
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.leases 
            JOIN public.properties ON properties.id = leases.property_id
            WHERE leases.id = rental_increases.lease_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Users can delete rental increases for their own properties
CREATE POLICY "Users can delete own rental increases" ON public.rental_increases
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.leases 
            JOIN public.properties ON properties.id = leases.property_id
            WHERE leases.id = rental_increases.lease_id 
            AND properties.user_id = auth.uid()
        )
    );

-- ==============================================
-- COMMUNICATION_LOG TABLE POLICIES
-- ==============================================

-- Users can view communications for their own properties (via lease)
CREATE POLICY "Users can view own communications" ON public.communication_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leases 
            JOIN public.properties ON properties.id = leases.property_id
            WHERE leases.id = communication_log.lease_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- Users can insert communications for their own properties (via lease)
CREATE POLICY "Users can insert own communications" ON public.communication_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.leases 
            JOIN public.properties ON properties.id = leases.property_id
            WHERE leases.id = communication_log.lease_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- Users can update communications for their own properties (via lease)
CREATE POLICY "Users can update own communications" ON public.communication_log
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.leases 
            JOIN public.properties ON properties.id = leases.property_id
            WHERE leases.id = communication_log.lease_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- Users can delete communications for their own properties (via lease)
CREATE POLICY "Users can delete own communications" ON public.communication_log
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.leases 
            JOIN public.properties ON properties.id = leases.property_id
            WHERE leases.id = communication_log.lease_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- ==============================================
-- SUBSCRIPTION_PLANS TABLE POLICIES
-- ==============================================

-- Authenticated users can view subscription plans (read-only)
CREATE POLICY "Authenticated users can view subscription plans" ON public.subscription_plans
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can modify subscription plans
CREATE POLICY "Service role can modify subscription plans" ON public.subscription_plans
    FOR ALL USING (auth.role() = 'service_role');

-- ==============================================
-- PROPERTY_IMAGES TABLE POLICIES
-- ==============================================

-- Note: The property_images table already has policies, but let's ensure they're comprehensive

-- Users can view images for their own properties
CREATE POLICY "Users can view own property images" ON public.property_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = property_images.property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- Users can insert images for their own properties
CREATE POLICY "Users can insert images for their own properties" ON public.property_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = property_images.property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- Users can update images for their own properties
CREATE POLICY "Users can update their own property images" ON public.property_images
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = property_images.property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- Users can delete images for their own properties
CREATE POLICY "Users can delete their own property images" ON public.property_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = property_images.property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Verify all policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

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
