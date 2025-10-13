-- Populate default notification settings for all existing users
-- Execute this in Supabase SQL Editor

-- 1. Insert default user settings for all existing users who don't have settings
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

-- 2. Update existing user settings to ensure all notification fields have proper defaults
-- This handles cases where user_settings exist but some fields might be NULL
UPDATE public.user_settings 
SET 
    email_notifications = COALESCE(email_notifications, true),
    sms_notifications = COALESCE(sms_notifications, true),
    payment_reminders = COALESCE(payment_reminders, true),
    lease_expiry_alerts = COALESCE(lease_expiry_alerts, true),
    maintenance_alerts = COALESCE(maintenance_alerts, true),
    marketing_emails = COALESCE(marketing_emails, true),
    reminder_timing = COALESCE(reminder_timing, '3days'),
    quiet_hours_enabled = COALESCE(quiet_hours_enabled, true),
    quiet_hours_start = COALESCE(quiet_hours_start, '22:00'),
    quiet_hours_end = COALESCE(quiet_hours_end, '08:00'),
    timezone = COALESCE(timezone, 'Asia/Kolkata'),
    language = COALESCE(language, 'en'),
    property_count = COALESCE(property_count, 0)
WHERE 
    email_notifications IS NULL OR
    sms_notifications IS NULL OR
    payment_reminders IS NULL OR
    lease_expiry_alerts IS NULL OR
    maintenance_alerts IS NULL OR
    marketing_emails IS NULL OR
    reminder_timing IS NULL OR
    quiet_hours_enabled IS NULL OR
    quiet_hours_start IS NULL OR
    quiet_hours_end IS NULL OR
    timezone IS NULL OR
    language IS NULL OR
    property_count IS NULL;

-- 3. Verify the data was inserted/updated
SELECT 'User Settings Count' as info, COUNT(*) as count FROM public.user_settings;

-- 4. Show sample notification settings
SELECT 'Sample Notification Settings:' as info;
SELECT 
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
    quiet_hours_end
FROM public.user_settings 
LIMIT 3;

-- 5. Check for any NULL values (should be none after the update)
SELECT 'NULL Value Check:' as info;
SELECT 
    COUNT(*) as total_records,
    COUNT(email_notifications) as email_notifications_count,
    COUNT(sms_notifications) as sms_notifications_count,
    COUNT(payment_reminders) as payment_reminders_count,
    COUNT(lease_expiry_alerts) as lease_expiry_alerts_count,
    COUNT(maintenance_alerts) as maintenance_alerts_count,
    COUNT(marketing_emails) as marketing_emails_count,
    COUNT(reminder_timing) as reminder_timing_count,
    COUNT(quiet_hours_enabled) as quiet_hours_enabled_count,
    COUNT(quiet_hours_start) as quiet_hours_start_count,
    COUNT(quiet_hours_end) as quiet_hours_end_count
FROM public.user_settings;
