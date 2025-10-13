-- Subscription Pricing Update Template
-- Copy this template and modify the values as needed
-- Execute in Supabase SQL Editor

-- ============================================
-- STARTER PLAN UPDATE
-- ============================================
UPDATE public.subscription_plans 
SET 
    price = 799,  -- UPDATE: Monthly price in rupees
    properties_limit = 3,  -- UPDATE: Max properties
    storage_limit_mb = 100,  -- UPDATE: Storage limit
    features = '[
        "Capacity 1-3 properties",
        "Multi‑property dashboard", 
        "AI rent matching",
        "Per‑tenant UPI QR",
        "Payment recording & overdue alerts",
        "Digital document vault with renewals",
        "Telegram/WhatsApp notifications",
        "Custom matching rules",
        "Data export",
        "Email support"
    ]'::jsonb,
    updated_at = now()
WHERE name = 'Starter';

-- ============================================
-- PROFESSIONAL PLAN UPDATE  
-- ============================================
UPDATE public.subscription_plans 
SET 
    price = 1499,  -- UPDATE: Monthly price in rupees
    properties_limit = 8,  -- UPDATE: Max properties
    storage_limit_mb = 1024,  -- UPDATE: Storage limit
    features = '[
        "Capacity 4–8 properties",
        "Multi‑property dashboard",
        "AI rent matching", 
        "Per‑tenant UPI QR",
        "Payment recording & overdue alerts",
        "Digital document vault with renewals",
        "Telegram/WhatsApp notifications",
        "Custom matching rules",
        "Data export",
        "Email support"
    ]'::jsonb,
    updated_at = now()
WHERE name = 'Professional';

-- ============================================
-- PORTFOLIO PLAN UPDATE
-- ============================================
UPDATE public.subscription_plans 
SET 
    price = 2499,  -- UPDATE: Monthly price in rupees
    properties_limit = 15,  -- UPDATE: Max properties
    storage_limit_mb = 2048,  -- UPDATE: Storage limit
    features = '[
        "Capacity 9–15 properties",
        "Multi‑property dashboard",
        "AI rent matching",
        "Per‑tenant UPI QR", 
        "Payment recording & overdue alerts",
        "Digital document vault with renewals",
        "Telegram/WhatsApp notifications",
        "Custom matching rules",
        "Data export",
        "Priority support"
    ]'::jsonb,
    updated_at = now()
WHERE name = 'Portfolio';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check updated plans
SELECT 'Updated Plans:' as info;
SELECT 
    name,
    price,
    properties_limit,
    storage_limit_mb,
    features
FROM public.subscription_plans 
ORDER BY price;

-- Check pricing in rupees
SELECT 'Pricing Verification:' as info;
SELECT 
    name,
    price as price_rupees,
    properties_limit,
    storage_limit_mb
FROM public.subscription_plans 
ORDER BY price;

-- Check if all plans are active
SELECT 'Active Plans Check:' as info;
SELECT 
    name,
    is_active,
    created_at,
    updated_at
FROM public.subscription_plans 
ORDER BY price;
