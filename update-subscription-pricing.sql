-- Update subscription plans to match landing page pricing
-- Execute this in Supabase SQL Editor

-- 1. Update existing plans to match landing page pricing
-- Note: Prices are stored in rupees

-- Update Starter plan (₹799/month)
UPDATE public.subscription_plans 
SET 
    price = 799,
    properties_limit = 3,
    storage_limit_mb = 100,
    features = '["Capacity 1-3 properties", "Multi‑property dashboard", "AI rent matching", "Per‑tenant UPI QR", "Payment recording & overdue alerts", "Digital document vault with renewals", "Telegram/WhatsApp notifications", "Custom matching rules", "Data export", "Email support"]'
WHERE name = 'Starter';

-- Update Professional plan (₹1,499/month)
UPDATE public.subscription_plans 
SET 
    price = 1499,
    properties_limit = 8,
    storage_limit_mb = 1024,
    features = '["Capacity 4–8 properties", "Multi‑property dashboard", "AI rent matching", "Per‑tenant UPI QR", "Payment recording & overdue alerts", "Digital document vault with renewals", "Telegram/WhatsApp notifications", "Custom matching rules", "Data export", "Email support"]'
WHERE name = 'Professional';

-- Update Enterprise to Portfolio (₹2,499/month)
UPDATE public.subscription_plans 
SET 
    name = 'Portfolio',
    price = 2499,
    properties_limit = 15,
    storage_limit_mb = 2048,
    features = '["Capacity 9–15 properties", "Multi‑property dashboard", "AI rent matching", "Per‑tenant UPI QR", "Payment recording & overdue alerts", "Digital document vault with renewals", "Telegram/WhatsApp notifications", "Custom matching rules", "Data export", "Priority support"]'
WHERE name = 'Enterprise';

-- 2. Verify the updates
SELECT 'Updated Subscription Plans:' as info;
SELECT 
    name,
    price,
    properties_limit,
    storage_limit_mb,
    features
FROM public.subscription_plans 
ORDER BY price;

-- 3. Show pricing verification
SELECT 'Pricing Verification:' as info;
SELECT 
    name,
    price as price_rupees,
    properties_limit,
    storage_limit_mb
FROM public.subscription_plans 
ORDER BY price;
