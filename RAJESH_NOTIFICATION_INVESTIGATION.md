# Rajesh Notification Investigation

## Current Status

✅ **Rajesh HAS 3 ACTIVE NOTIFICATIONS in the database!**

### Notifications Found:
1. **Lease Expiry Reminder** - "testedit" expires in 11 days (created today)
2. **Rent Overdue** - "Test Property 1" overdue by 19 days (created today)
3. **Rent Overdue** - "r" property overdue by 19 days (created today)

### Database Details:
- User: Rajesh Demo2 (amar134@gmail.com)
- User ID: `274ce749-0771-45dd-b780-467f29d6bd3d`
- Active Notifications: **3**
- All are unread (`is_read = false`)
- None are cleared (`is_cleared = false`)
- Generation Date: Today (2025-10-20)

## Notification Trigger Logic Analysis

### Properties That Should Trigger Notifications:

1. **"testedit" property**
   - Lease expires: 2025-10-31 (11 days from now)
   - ✅ **Triggers: Lease Expiry** (within 15 days)
   - Last payment: 2025-10-16 (4 days ago)
   - No rent overdue notification (less than 30 days)

2. **"r" property**
   - Lease expires: 2222-11-11 (far future)
   - Last payment: NONE (lease started 1111-11-11)
   - Days since last payment: **333,811 days**
   - ✅ **Triggers: Overdue Reminder** (over 60 days)

3. **Other active leases with 19 days since last payment:**
   - "e", "e", "new prop gallery test", "test" - All have 19 days since last payment
   - These don't trigger yet (need 30+ days for rent pending)

## Why Notifications Aren't Showing in UI

Since notifications exist in the database but aren't showing, the issue is likely:

### Possible Issues:

1. **Frontend Not Fetching Properly**
   - useNotifications hook may have errors
   - Supabase client not authenticated correctly
   - RLS policies blocking access

2. **Real-time Subscription Not Working**
   - Real-time not enabled on notifications table
   - Subscription channel not connecting
   - User session not properly authenticated

3. **Component Rendering Issue**
   - NotificationBell component not mounted
   - Component state not updating
   - UI cache issue

4. **Auth Session Issue**
   - User ID mismatch between auth and database
   - Session not properly initialized
   - Token expired

## Debugging Steps to Try

### Step 1: Check Browser Console
Open browser console (F12) and look for:
- Any error messages from Supabase
- Any error messages from useNotifications hook
- Network requests to Supabase API
- Check if user is authenticated

### Step 2: Verify User Authentication
Run in browser console:
```javascript
// Check if user is authenticated
const { data: { user } } = await window.supabase.auth.getUser();
console.log('Current user:', user);
console.log('Expected user ID:', '274ce749-0771-45dd-b780-467f29d6bd3d');
```

### Step 3: Manually Fetch Notifications
Run in browser console:
```javascript
// Manually fetch notifications
const { data, error } = await window.supabase
  .from('notifications')
  .select('*')
  .eq('user_id', '274ce749-0771-45dd-b780-467f29d6bd3d')
  .eq('is_cleared', false)
  .order('created_at', { ascending: false });

console.log('Notifications:', data);
console.log('Error:', error);
```

### Step 4: Check RLS Policies
Run in browser console:
```javascript
// Test RLS policies
const { data: { user } } = await window.supabase.auth.getUser();
const { data, error } = await window.supabase
  .from('notifications')
  .select('*')
  .eq('is_cleared', false);

console.log('Current user ID:', user?.id);
console.log('Notifications accessible:', data?.length || 0);
console.log('RLS Error:', error);
```

### Step 5: Check Real-time Subscription
Run in browser console:
```javascript
// Test real-time subscription
const channel = window.supabase
  .channel('test-notifications')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.274ce749-0771-45dd-b780-467f29d6bd3d`
  }, (payload) => {
    console.log('Real-time update:', payload);
  })
  .subscribe((status) => {
    console.log('Subscription status:', status);
  });

// Wait 5 seconds, then check
setTimeout(() => {
  console.log('Channel state:', channel.state);
}, 5000);
```

## Next Actions Required

To fix this, we need to:

1. **Verify the issue is in the frontend** by checking browser console
2. **Check if user session is valid** and matches database user
3. **Ensure RLS policies allow access** for authenticated user
4. **Verify real-time is enabled** on notifications table
5. **Check if NotificationBell component is rendered** in the Dashboard

## Quick Test Script

Copy and run this in browser console when logged in as Rajesh:

```javascript
// Complete notification system test
async function testNotificationSystem() {
  console.log('🔍 Testing Notification System...');
  
  // 1. Check auth
  const { data: { user }, error: authError } = await window.supabase.auth.getUser();
  console.log('1. User:', user?.email, 'ID:', user?.id);
  
  // 2. Fetch notifications
  const { data: notifications, error: notifError } = await window.supabase
    .from('notifications')
    .select('*')
    .eq('is_cleared', false)
    .order('created_at', { ascending: false });
  
  console.log('2. Notifications found:', notifications?.length || 0);
  console.log('   Error:', notifError?.message || 'None');
  
  // 3. Check if user IDs match
  const expectedUserId = '274ce749-0771-45dd-b780-467f29d6bd3d';
  const idsMatch = user?.id === expectedUserId;
  console.log('3. User ID Match:', idsMatch ? '✅ Yes' : '❌ No');
  
  // 4. Get unread count
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
  console.log('4. Unread count:', unreadCount);
  
  // 5. Check RLS
  console.log('5. RLS Test:', notifError ? '❌ Failed - ' + notifError.message : '✅ Passed');
  
  // 6. List notifications
  if (notifications && notifications.length > 0) {
    console.log('6. Notification Details:');
    notifications.forEach((n, i) => {
      console.log(`   ${i+1}. ${n.type}: ${n.title}`);
      console.log(`      Message: ${n.message}`);
      console.log(`      Read: ${n.is_read}, Cleared: ${n.is_cleared}`);
    });
  }
  
  console.log('✅ Test complete!');
  return { user, notifications, unreadCount, error: notifError };
}

// Run the test
testNotificationSystem();
```

## Database Confirmation

✅ Database is working correctly
✅ Notifications are being generated
✅ RLS policies are enabled
✅ Functions are all created
✅ Rajesh has 3 active, unread notifications

**The issue is in the frontend, not the backend.**

