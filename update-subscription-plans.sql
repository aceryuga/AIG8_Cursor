-- Update Subscription Plans for Settings Page
-- This script ensures the database has the correct subscription plans with proper IDs and pricing

-- First, let's check what plans currently exist
SELECT id, name, price, properties_limit, storage_limit_mb, is_active FROM public.subscription_plans ORDER BY price;

-- Update or insert the correct subscription plans
-- We'll use the plan names as IDs for consistency

-- Update Starter plan (free tier)
UPDATE public.subscription_plans 
SET 
    price = 79900, -- ₹799 in paise
    properties_limit = 3,
    storage_limit_mb = 100,
    features = '["Capacity 1-3 properties", "Multi‑property dashboard", "AI rent matching", "Per‑tenant UPI QR", "Payment recording & overdue alerts", "Digital document vault with renewals", "Telegram/WhatsApp notifications", "Custom matching rules", "Data export", "Email support"]'::jsonb,
    is_active = true,
    updated_at = now()
WHERE name = 'Starter';

-- If Starter doesn't exist, insert it
INSERT INTO public.subscription_plans (name, price, properties_limit, storage_limit_mb, features, is_active)
VALUES (
    'Starter', 
    79900, 
    3, 
    100, 
    '["Capacity 1-3 properties", "Multi‑property dashboard", "AI rent matching", "Per‑tenant UPI QR", "Payment recording & overdue alerts", "Digital document vault with renewals", "Telegram/WhatsApp notifications", "Custom matching rules", "Data export", "Email support"]'::jsonb,
    true
)
ON CONFLICT (name) DO NOTHING;

-- Update Professional plan
UPDATE public.subscription_plans 
SET 
    price = 149900, -- ₹1499 in paise
    properties_limit = 8,
    storage_limit_mb = 1024,
    features = '["Capacity 4–8 properties", "Multi‑property dashboard", "AI rent matching", "Per‑tenant UPI QR", "Payment recording & overdue alerts", "Digital document vault with renewals", "Telegram/WhatsApp notifications", "Custom matching rules", "Data export", "Email support"]'::jsonb,
    is_active = true,
    updated_at = now()
WHERE name = 'Professional';

-- If Professional doesn't exist, insert it
INSERT INTO public.subscription_plans (name, price, properties_limit, storage_limit_mb, features, is_active)
VALUES (
    'Professional', 
    149900, 
    8, 
    1024, 
    '["Capacity 4–8 properties", "Multi‑property dashboard", "AI rent matching", "Per‑tenant UPI QR", "Payment recording & overdue alerts", "Digital document vault with renewals", "Telegram/WhatsApp notifications", "Custom matching rules", "Data export", "Email support"]'::jsonb,
    true
)
ON CONFLICT (name) DO NOTHING;

-- Update Portfolio plan (rename from Enterprise if it exists)
UPDATE public.subscription_plans 
SET 
    name = 'Portfolio',
    price = 249900, -- ₹2499 in paise
    properties_limit = 15,
    storage_limit_mb = 2048,
    features = '["Capacity 9–15 properties", "Multi‑property dashboard", "AI rent matching", "Per‑tenant UPI QR", "Payment recording & overdue alerts", "Digital document vault with renewals", "Telegram/WhatsApp notifications", "Custom matching rules", "Data export", "Priority support"]'::jsonb,
    is_active = true,
    updated_at = now()
WHERE name = 'Enterprise' OR name = 'Portfolio';

-- If Portfolio doesn't exist, insert it
INSERT INTO public.subscription_plans (name, price, properties_limit, storage_limit_mb, features, is_active)
VALUES (
    'Portfolio', 
    249900, 
    15, 
    2048, 
    '["Capacity 9–15 properties", "Multi‑property dashboard", "AI rent matching", "Per‑tenant UPI QR", "Payment recording & overdue alerts", "Digital document vault with renewals", "Telegram/WhatsApp notifications", "Custom matching rules", "Data export", "Priority support"]'::jsonb,
    true
)
ON CONFLICT (name) DO NOTHING;

-- Deactivate any other plans that shouldn't be active
UPDATE public.subscription_plans 
SET is_active = false, updated_at = now()
WHERE name NOT IN ('Starter', 'Professional', 'Portfolio');

-- Verify the final state
SELECT id, name, price, properties_limit, storage_limit_mb, is_active, created_at, updated_at 
FROM public.subscription_plans 
ORDER BY price;

-- Create a function to get plan by name (for the frontend)
CREATE OR REPLACE FUNCTION get_plan_by_name(plan_name TEXT)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    price INTEGER,
    properties_limit INTEGER,
    storage_limit_mb INTEGER,
    features JSONB,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.name,
        sp.price,
        sp.properties_limit,
        sp.storage_limit_mb,
        sp.features,
        sp.is_active
    FROM public.subscription_plans sp
    WHERE sp.name = plan_name AND sp.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to change user subscription plan
CREATE OR REPLACE FUNCTION change_user_subscription_plan(
    p_user_id UUID,
    p_new_plan_name TEXT
)
RETURNS JSON AS $$
DECLARE
    v_new_plan_id UUID;
    v_current_subscription RECORD;
    v_result JSON;
BEGIN
    -- Get the new plan ID
    SELECT id INTO v_new_plan_id
    FROM public.subscription_plans
    WHERE name = p_new_plan_name AND is_active = true;
    
    IF v_new_plan_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Plan not found');
    END IF;
    
    -- Get current subscription
    SELECT * INTO v_current_subscription
    FROM public.user_subscriptions
    WHERE user_id = p_user_id AND status IN ('active', 'trial');
    
    -- Check if already on this plan
    IF v_current_subscription.plan_id = v_new_plan_id THEN
        RETURN json_build_object('success', false, 'message', 'Already on this plan');
    END IF;
    
    -- Update or insert subscription
    INSERT INTO public.user_subscriptions (
        user_id,
        plan_id,
        status,
        started_at,
        properties_used,
        storage_used_mb,
        api_calls_used,
        last_billed_at,
        next_billing_at
    ) VALUES (
        p_user_id,
        v_new_plan_id,
        'active',
        now(),
        0, -- Will be updated by the application
        0, -- Will be updated by the application
        0,
        now(),
        now() + interval '30 days'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        plan_id = v_new_plan_id,
        status = 'active',
        started_at = now(),
        last_billed_at = now(),
        next_billing_at = now() + interval '30 days',
        updated_at = now();
    
    RETURN json_build_object('success', true, 'message', 'Plan changed successfully');
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error changing plan: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;
