# 🔔 Notification System - Why Notifications Are Not Showing

## Summary of Investigation

After comparing the git stash with current code, I found that **the notification system code is intact and has no syntax errors**. The issue is likely that:

1. **Database functions haven't been created** in Supabase
2. **Notifications haven't been generated yet**
3. **RLS policies may not be set up correctly**
4. **Real-time replication may not be enabled**

## What Changed in Git Stash

The git stash contained changes to these files (none related to notifications):
- `src/App.tsx` - Added ErrorBoundary and GlobalLayout
- `src/components/auth/LoginPage.tsx` - Added input sanitization
- `src/components/auth/SignupPage.tsx` - Added input sanitization
- `src/components/properties/PropertyGallery.tsx` - Added callback for primary image changes
- `src/main.tsx` - Added error handler initialization
- `src/utils/auditTrail.ts` - Changed from console.log to actual database inserts
- `src/utils/rentCalculations.ts` - Fixed payment calculation logic

**Important**: `NotificationBell.tsx` and notification system files were NOT modified, so the code is working correctly.

## Root Cause Analysis

The notification system requires:

### ✅ Frontend Code (Already Working)
- ✅ `NotificationBell.tsx` component - EXISTS and CORRECT
- ✅ `useNotifications` hook - EXISTS and CORRECT
- ✅ `NotificationService` - EXISTS and CORRECT
- ✅ Real-time subscription setup - EXISTS and CORRECT

### ❓ Database Setup (Needs Verification)
- ❓ `notifications` table - May not exist
- ❓ Database functions - May not be created
- ❓ RLS policies - May not be enabled
- ❓ Real-time replication - May not be enabled
- ❓ Notifications generated - Likely NONE exist

## Quick Fix Steps (Do These in Order)

### Step 1: Check Database Setup in Supabase SQL Editor

Run this SQL to check if everything exists:
```sql
-- Check if notifications table exists
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'notifications'
);

-- If false, the table doesn't exist - proceed to Step 2
```

### Step 2: Create Notifications Table and Functions

In Supabase SQL Editor, run the **entire** `notifications_table.sql` file:

1. Go to Supabase Dashboard
2. Click "SQL Editor"
3. Copy and paste the contents of `notifications_table.sql`
4. Click "Run"

This will create:
- ✅ notifications table
- ✅ All required indexes
- ✅ RLS policies
- ✅ All database functions

### Step 3: Verify Functions Were Created

Run this in SQL Editor:
```sql
SELECT proname FROM pg_proc 
WHERE proname IN (
  'generate_daily_notifications',
  'mark_notification_read',
  'clear_notification',
  'clear_all_notifications'
);
```

You should see 4 functions listed.

### Step 4: Enable Real-time Replication

1. Go to Supabase Dashboard
2. Navigate to **Database** → **Replication**
3. Find the `notifications` table
4. Toggle **Enable** for real-time replication
5. Save changes

### Step 5: Generate Notifications Manually

Run this in SQL Editor:
```sql
SELECT generate_daily_notifications();
```

This will create notifications for:
- Leases expiring within 15 days
- Leases that have expired
- Rent pending (30+ days without payment)
- Overdue rent (60+ days without payment)

### Step 6: Verify Notifications Were Created

Run this in SQL Editor:
```sql
-- Check total notifications
SELECT COUNT(*) FROM public.notifications;

-- Check your user's notifications (replace with your user ID)
SELECT * FROM public.notifications 
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
```

### Step 7: Test in Browser

1. Open your app at http://localhost:5174/
2. Log in
3. Click the bell icon in the dashboard
4. You should now see notifications!

## Debug Tools Created

I've created 3 debug tools to help you:

### 1. `debug-notifications.js`
Run this in your browser console (F12) when logged into the app:
```javascript
// Copy and paste the entire contents of debug-notifications.js
```

This will test:
- Supabase connection
- User authentication
- Notifications table access
- Database functions
- RLS policies

### 2. `check-notification-setup.sql`
Run this in Supabase SQL Editor to get a comprehensive report of:
- Table existence
- Table structure
- Functions available
- RLS policies
- Notification counts
- Recent notifications

### 3. `NOTIFICATION_DEBUG_SUMMARY.md`
A detailed document explaining all possible issues and solutions.

## Common Issues and Solutions

### Issue 1: "Function generate_daily_notifications does not exist"
**Solution**: Run `notifications_table.sql` in Supabase SQL Editor

### Issue 2: "No notifications appearing"
**Possible causes**:
- No notifications generated yet → Run `SELECT generate_daily_notifications();`
- No active leases/properties → Add test properties with active leases
- RLS policies blocking access → Check RLS policies in Supabase

### Issue 3: "Permission denied for table notifications"
**Solution**: Enable RLS policies by running relevant sections of `notifications_table.sql`

### Issue 4: "Real-time updates not working"
**Solution**: Enable real-time replication on notifications table in Supabase Dashboard

## Test Notification Generation

To test if notifications are being generated correctly, ensure you have:

1. **At least one property** with an active lease
2. **Lease expiring within 15 days** (to trigger lease expiry notification)
3. **No payment in last 30 days** (to trigger rent pending notification)

If you don't have test data, create a property with a lease that:
- Starts today
- Ends in 10 days
- Has monthly rent
- Has no payment records

Then run `generate_daily_notifications()` and you should see notifications.

## Setup Cron Job (Optional)

To automatically generate notifications daily, set up a cron job:

### Option 1: Using setup-notification-cron.js
```bash
node setup-notification-cron.js generate
```

### Option 2: Using Supabase Edge Functions
Deploy an edge function that runs daily to call `generate_daily_notifications()`

### Option 3: Manual Trigger
Run this SQL daily at 9:00 AM:
```sql
SELECT generate_daily_notifications();
```

## Verification Checklist

After following all steps, verify:

- [ ] notifications table exists in Supabase
- [ ] All 6 database functions exist
- [ ] RLS policies are enabled on notifications table
- [ ] Real-time replication is enabled
- [ ] At least one notification exists in the database
- [ ] Bell icon shows notification count when logged in
- [ ] Clicking bell icon shows notification dropdown
- [ ] Can mark notifications as read
- [ ] Can clear individual notifications
- [ ] Can clear all notifications

## Need More Help?

If notifications still don't show after following these steps:

1. Open browser console (F12)
2. Run `debug-notifications.js` script
3. Check for any error messages
4. Look at the Network tab for failed API calls
5. Check Supabase logs for any errors

Share the console output and I can help debug further!

## Files to Reference

- `notifications_table.sql` - Complete database setup
- `src/hooks/useNotifications.ts` - Hook implementation
- `src/services/notificationService.ts` - Service layer
- `src/components/ui/NotificationBell.tsx` - UI component
- `NOTIFICATION_SYSTEM_README.md` - Full documentation

