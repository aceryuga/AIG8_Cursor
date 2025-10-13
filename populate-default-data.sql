-- Populate default data for settings tables
-- Execute this in Supabase SQL Editor

-- 1. Insert default subscription plans (if they don't exist)
INSERT INTO public.subscription_plans (name, price, properties_limit, storage_limit_mb, features) VALUES
('Starter', 0, 3, 100, '["Basic property management", "Payment tracking", "Document storage (100MB)", "Email support"]'),
('Professional', 99900, 15, 1024, '["Advanced analytics", "AI reconciliation", "Priority support", "Document storage (1GB)", "Custom reports"]'),
('Enterprise', 249900, 50, -1, '["White-label solution", "API access", "Custom integrations", "Unlimited storage", "Dedicated support"]')
ON CONFLICT (name) DO NOTHING;

-- 2. Check if we have any users to create default settings for
-- This will create default settings for all existing users who don't have settings
INSERT INTO public.user_settings (
    user_id,
    email_notifications,
    sms_notifications,
    payment_reminders,
    lease_expiry_alerts,
    maintenance_alerts,
    marketing_emails,
    reminder_timing,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    timezone,
    language,
    property_count
)
SELECT 
    u.id as user_id,
    true as email_notifications,
    true as sms_notifications,
    true as payment_reminders,
    true as lease_expiry_alerts,
    true as maintenance_alerts,
    false as marketing_emails,
    '3days' as reminder_timing,
    true as quiet_hours_enabled,
    '22:00' as quiet_hours_start,
    '08:00' as quiet_hours_end,
    'Asia/Kolkata' as timezone,
    'en' as language,
    0 as property_count
FROM auth.users u
LEFT JOIN public.user_settings us ON u.id = us.user_id
WHERE us.user_id IS NULL;

-- 3. Create default "Starter" subscriptions for users who don't have any subscription
INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    started_at,
    properties_used,
    storage_used_mb,
    api_calls_used
)
SELECT 
    u.id as user_id,
    sp.id as plan_id,
    'trial' as status,
    now() as started_at,
    0 as properties_used,
    0 as storage_used_mb,
    0 as api_calls_used
FROM auth.users u
CROSS JOIN public.subscription_plans sp
LEFT JOIN public.user_subscriptions us ON u.id = us.user_id
WHERE sp.name = 'Starter'
AND us.user_id IS NULL;

-- 4. Verify the data was inserted
SELECT 'Subscription Plans' as table_name, COUNT(*) as count FROM public.subscription_plans
UNION ALL
SELECT 'User Settings' as table_name, COUNT(*) as count FROM public.user_settings
UNION ALL
SELECT 'User Subscriptions' as table_name, COUNT(*) as count FROM public.user_subscriptions;

-- 5. Show sample data
SELECT 'Sample Subscription Plans:' as info;
SELECT name, price, properties_limit, storage_limit_mb FROM public.subscription_plans ORDER BY price;

SELECT 'Sample User Settings:' as info;
SELECT user_id, email_notifications, property_count FROM public.user_settings LIMIT 3;

SELECT 'Sample User Subscriptions:' as info;
SELECT user_id, status, properties_used FROM public.user_subscriptions LIMIT 3;
