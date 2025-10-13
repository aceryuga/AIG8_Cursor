-- Comprehensive fix for 406 errors on settings tables
-- Execute this in Supabase SQL Editor

-- 1. First, let's check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'user_settings', 
    'user_subscriptions', 
    'billing_history', 
    'login_activity', 
    'data_export_requests'
)
ORDER BY tablename;

-- 2. Enable RLS on all tables (in case it wasn't enabled)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view own billing history" ON public.billing_history;
DROP POLICY IF EXISTS "Users can view own login activity" ON public.login_activity;
DROP POLICY IF EXISTS "Users can view own export requests" ON public.data_export_requests;
DROP POLICY IF EXISTS "Users can create own export requests" ON public.data_export_requests;

-- 4. Create comprehensive RLS policies
-- User Settings Policies
CREATE POLICY "Users can view own settings" ON public.user_settings 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Subscriptions Policies
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.user_subscriptions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions 
    FOR UPDATE USING (auth.uid() = user_id);

-- Billing History Policies
CREATE POLICY "Users can view own billing history" ON public.billing_history 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own billing history" ON public.billing_history 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Login Activity Policies
CREATE POLICY "Users can view own login activity" ON public.login_activity 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own login activity" ON public.login_activity 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Data Export Requests Policies
CREATE POLICY "Users can view own export requests" ON public.data_export_requests 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own export requests" ON public.data_export_requests 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own export requests" ON public.data_export_requests 
    FOR UPDATE USING (auth.uid() = user_id);

-- 5. Grant comprehensive permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.subscription_plans TO authenticated;
GRANT ALL ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.billing_history TO authenticated;
GRANT ALL ON public.login_activity TO authenticated;
GRANT ALL ON public.data_export_requests TO authenticated;

-- 6. Grant usage on sequences (for auto-incrementing IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. Verify the fix
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'user_settings', 
    'user_subscriptions', 
    'billing_history', 
    'login_activity', 
    'data_export_requests'
)
ORDER BY tablename;

-- 8. Check policies
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
AND tablename IN (
    'user_settings', 
    'user_subscriptions', 
    'billing_history', 
    'login_activity', 
    'data_export_requests'
)
ORDER BY tablename, policyname;
