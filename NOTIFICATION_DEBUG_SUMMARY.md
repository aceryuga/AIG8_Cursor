# Notification System Debug Summary

## Issue
User reports not seeing any notifications in the bell icon.

## Files Compared (Git Stash vs Current)

### Files in Git Stash:
1. `src/App.tsx` - Added ErrorBoundary, GlobalLayout, ProtectedRoute
2. `src/components/auth/LoginPage.tsx` - Added sanitization
3. `src/components/auth/SignupPage.tsx` - Added sanitization
4. `src/components/properties/PropertyGallery.tsx` - Added onPrimaryImageChange callback
5. `src/main.tsx` - Added error handlers initialization
6. `src/utils/auditTrail.ts` - Changed from console.log to actual database inserts
7. `src/utils/rentCalculations.ts` - Fixed payment calculation logic

### Key Finding:
**NotificationBell.tsx was NOT modified in the stash**, which means the component itself is intact.

## Potential Issues

### 1. Database Functions Not Created
The notification system relies on these PostgreSQL functions:
- `generate_daily_notifications()` - Creates notifications
- `mark_notification_read()` - Marks notifications as read
- `clear_notification()` - Clears individual notification
- `clear_all_notifications()` - Clears all user notifications
- `cleanup_old_notifications()` - Removes old notifications

**Action Required**: Verify these functions exist in Supabase database.

### 2. Notifications Table May Not Exist or Have Wrong Schema
The `notifications` table must have:
- `id`, `user_id`, `type`, `title`, `message`
- `property_id`, `lease_id`, `tenant_id` (nullable references)
- `is_read`, `is_cleared`, `notification_data`
- `created_at`, `read_at`, `cleared_at`, `generation_date`, `priority`

**Action Required**: Verify table schema in Supabase.

### 3. RLS (Row Level Security) Policies
The notification system requires RLS policies to allow users to:
- View their own notifications
- Insert notifications
- Update their own notifications (mark as read)
- Delete their own notifications

**Action Required**: Check if RLS policies are enabled and properly configured.

### 4. No Notifications Generated Yet
The `generate_daily_notifications()` function needs to be called to create notifications. This is typically done via:
- Manual trigger
- Cron job (setup-notification-cron.js)
- Edge function scheduled task

**Action Required**: Manually trigger notification generation or set up cron job.

### 5. Real-time Subscription Issues
The `useNotifications` hook sets up a real-time subscription to listen for notification changes. This requires:
- Supabase real-time enabled on the notifications table
- Proper channel subscription

**Action Required**: Verify real-time is enabled on notifications table.

## Recommended Debug Steps

### Step 1: Run Database Debug Script
Open browser console and run:
```javascript
// Copy contents of debug-notifications.js
```

### Step 2: Check if Notifications Table Exists
Run SQL in Supabase:
```sql
SELECT * FROM public.notifications LIMIT 5;
```

### Step 3: Check if Functions Exist
Run SQL in Supabase:
```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%notification%';
```

### Step 4: Manually Generate Notifications
Run in Supabase SQL Editor:
```sql
SELECT generate_daily_notifications();
```

### Step 5: Check User's Notifications
Run SQL in Supabase (replace USER_ID):
```sql
SELECT * FROM public.notifications 
WHERE user_id = 'YOUR_USER_ID' 
AND is_cleared = false 
ORDER BY created_at DESC;
```

## Quick Fix Steps

1. **Execute notifications_table.sql** in Supabase SQL Editor
   - This creates the table, indexes, RLS policies, and functions

2. **Generate notifications manually**:
   ```sql
   SELECT generate_daily_notifications();
   ```

3. **Enable Real-time** on notifications table in Supabase Dashboard:
   - Database → Replication → Enable for notifications table

4. **Verify User Has Active Leases/Properties**:
   - Notifications are only generated for properties with active leases
   - Check if user has properties with tenants and payment records

## Files Involved

- `notifications_table.sql` - Database schema and functions
- `src/hooks/useNotifications.ts` - React hook for notifications
- `src/services/notificationService.ts` - Service layer
- `src/components/ui/NotificationBell.tsx` - UI component
- `src/utils/notificationGenerator.ts` - Generation logic
- `setup-notification-cron.js` - Cron job setup
- `debug-notifications.js` - Debug script (just created)

## Next Steps

1. Run debug script in browser console
2. Check Supabase database for table and functions
3. Manually generate notifications
4. Verify RLS policies
5. Enable real-time replication if not enabled

