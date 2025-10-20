-- Notification System Setup Check
-- Run this in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if notifications table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        RAISE NOTICE '✅ notifications table exists';
    ELSE
        RAISE NOTICE '❌ notifications table does NOT exist - Run notifications_table.sql';
    END IF;
END $$;

-- 2. Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'notifications'
ORDER BY ordinal_position;

-- 3. Check if functions exist
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN (
    'generate_daily_notifications',
    'cleanup_old_notifications',
    'get_unread_notification_count',
    'mark_notification_read',
    'clear_notification',
    'clear_all_notifications'
)
ORDER BY proname;

-- 4. Check RLS policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'notifications';

-- 5. Count total notifications
SELECT COUNT(*) as total_notifications FROM public.notifications;

-- 6. Count notifications by type
SELECT 
    type,
    COUNT(*) as count,
    SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread_count
FROM public.notifications
GROUP BY type;

-- 7. Get recent notifications (last 10)
SELECT 
    id,
    user_id,
    type,
    title,
    LEFT(message, 50) || '...' as message_preview,
    is_read,
    is_cleared,
    created_at
FROM public.notifications
ORDER BY created_at DESC
LIMIT 10;

-- 8. Check if any user has notifications
SELECT 
    u.email,
    COUNT(n.id) as notification_count,
    SUM(CASE WHEN n.is_read = false THEN 1 ELSE 0 END) as unread_count
FROM auth.users u
LEFT JOIN public.notifications n ON u.id = n.user_id
GROUP BY u.email
HAVING COUNT(n.id) > 0;

-- 9. Test notification generation (comment out if you don't want to generate)
-- SELECT generate_daily_notifications();

-- 10. Get current user's notifications (if logged in)
-- Replace 'YOUR_USER_ID' with actual user ID
-- SELECT * FROM public.notifications 
-- WHERE user_id = 'YOUR_USER_ID'::uuid 
-- ORDER BY created_at DESC;

