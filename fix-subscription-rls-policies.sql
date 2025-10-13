-- Fix RLS Policies for Subscription Plan Changes
-- This script ensures users can manage their own subscription data

-- Enable RLS on user_subscriptions table if not already enabled
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.user_subscriptions;

-- Create comprehensive RLS policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON public.user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" ON public.user_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Also ensure RLS is enabled on subscription_plans table
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on subscription_plans
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;

-- Create policy to allow viewing subscription plans
CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

-- Ensure RLS is enabled on billing_history table
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on billing_history
DROP POLICY IF EXISTS "Users can view their own billing history" ON public.billing_history;
DROP POLICY IF EXISTS "Users can insert their own billing history" ON public.billing_history;

-- Create policies for billing_history
CREATE POLICY "Users can view their own billing history" ON public.billing_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own billing history" ON public.billing_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT, INSERT ON public.billing_history TO authenticated;

-- Verify the policies are working
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename IN ('user_subscriptions', 'subscription_plans', 'billing_history')
ORDER BY tablename, policyname;
