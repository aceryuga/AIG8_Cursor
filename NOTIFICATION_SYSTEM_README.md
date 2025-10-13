# 🔔 Notification System Implementation

## Overview

This notification system provides automated reminders for lease expiry, rent pending, and overdue payments. Users receive daily notifications and can manage them through an interactive bell icon in the dashboard.

## Features

### ✅ Core Functionality
- **Notification Bell Icon**: Shows unread count with real-time updates
- **Notification Types**: Lease expiry, rent pending, overdue reminders, expired leases
- **User Actions**: Mark as read, clear individual, clear all notifications
- **Daily Generation**: Automatic daily notification creation (once per day)
- **Real-time Updates**: Live notification updates using Supabase real-time

### ✅ Notification Types

1. **Lease Expiry** (15 days before expiry)
   - Icon: 📅 (Orange)
   - Priority: 3-5 (based on days remaining)
   - Shows countdown to lease end date

2. **Lease Expired** (after expiry date)
   - Icon: ⚠️ (Red)
   - Priority: 5
   - Shows days overdue

3. **Rent Pending** (30+ days without payment)
   - Icon: 💰 (Yellow)
   - Priority: 3
   - Shows days pending

4. **Overdue Reminder** (60+ days without payment)
   - Icon: 🚨 (Red)
   - Priority: 5
   - Shows days overdue

## Database Schema

### Notifications Table
```sql
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('lease_expiry', 'rent_pending', 'overdue_reminder', 'lease_expired')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    is_cleared BOOLEAN DEFAULT false,
    notification_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    read_at TIMESTAMP WITHOUT TIME ZONE,
    cleared_at TIMESTAMP WITHOUT TIME ZONE,
    generation_date DATE DEFAULT CURRENT_DATE,
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5)
);
```

### Key Functions
- `generate_daily_notifications()` - Creates daily notifications
- `cleanup_old_notifications()` - Removes notifications older than 30 days
- `get_unread_notification_count(user_uuid)` - Gets unread count for user
- `mark_notification_read(notification_uuid, user_uuid)` - Marks notification as read
- `clear_notification(notification_uuid, user_uuid)` - Clears specific notification
- `clear_all_notifications(user_uuid)` - Clears all user notifications

## File Structure

```
src/
├── services/
│   └── notificationService.ts          # Core notification service
├── hooks/
│   └── useNotifications.ts              # React hook for notifications
├── components/
│   ├── ui/
│   │   └── NotificationBell.tsx         # Notification bell component
│   └── test/
│       └── NotificationTest.tsx         # Test component
├── utils/
│   └── notificationGenerator.ts         # Daily notification generation
└── notifications_table.sql              # Database schema and functions
```

## Setup Instructions

### 1. Database Setup
```bash
# Run the SQL script to create tables and functions
psql -d your_database -f notifications_table.sql
```

### 2. Environment Setup
Ensure your Supabase configuration is properly set up in `src/lib/supabase.ts`.

### 3. Component Integration
The `NotificationBell` component is already integrated into the Dashboard component.

### 4. Cron Job Setup
Set up daily notification generation:

```bash
# Add to crontab (run at 9:00 AM daily)
0 9 * * * cd /path/to/your/project && node setup-notification-cron.js generate

# Add cleanup job (run at 2:00 AM every Sunday)
0 2 * * 0 cd /path/to/your/project && node setup-notification-cron.js cleanup
```

## Usage

### For Users
1. **View Notifications**: Click the bell icon in the dashboard
2. **Mark as Read**: Click on any notification to mark it as read
3. **Clear Individual**: Click the X button on any notification
4. **Clear All**: Click the "Clear All" button in the notification dropdown
5. **Mark All Read**: Click the checkmark button to mark all as read

### For Developers

#### Using the Notification Service
```typescript
import { NotificationService } from '../services/notificationService';

// Get notifications for a user
const notifications = await NotificationService.getNotifications(userId);

// Get unread count
const count = await NotificationService.getNotificationCount(userId);

// Mark notification as read
await NotificationService.markAsRead(notificationId, userId);

// Clear notification
await NotificationService.clearNotification(notificationId, userId);
```

#### Using the Hook
```typescript
import { useNotifications } from '../hooks/useNotifications';

const { notifications, unreadCount, markAsRead, clearNotification } = useNotifications();
```

#### Manual Notification Generation
```typescript
import { NotificationGenerator } from '../utils/notificationGenerator';

// Generate notifications for specific user
await NotificationGenerator.generateNotificationsForUser(userId);

// Generate daily notifications for all users
await NotificationGenerator.generateDailyNotifications();

// Clean up old notifications
await NotificationGenerator.cleanupOldNotifications();
```

## Testing

### Test Component
Use the `NotificationTest` component to test the notification system:

1. Navigate to the test component
2. Click "Generate Test Notifications" to create sample notifications
3. Test all notification management features
4. Verify the notification bell shows correct counts

### Manual Testing
```bash
# Generate test notifications
node setup-notification-cron.js generate

# Clean up old notifications
node setup-notification-cron.js cleanup

# Run both operations
node setup-notification-cron.js both
```

## User Scenarios

### Scenario 1: User gets reminder notification
1. ✅ User receives notification → Count increases
2. ✅ User marks as read → Count decreases, notification still shows
3. ✅ User clicks clear → Notification removed from table
4. ✅ User clicks clear all → All notifications removed

### Scenario 2: Daily notification generation
1. ✅ System runs daily at 9:00 AM
2. ✅ Checks all active leases for expiry (15 days before)
3. ✅ Checks all leases for rent status (30+ days without payment)
4. ✅ Creates notifications only once per day per lease
5. ✅ Prevents duplicate notifications

### Scenario 3: Notification priority
1. ✅ Expired leases: Priority 5 (highest)
2. ✅ Overdue rent: Priority 5 (highest)
3. ✅ Lease expiring in 3 days: Priority 5
4. ✅ Lease expiring in 7 days: Priority 4
5. ✅ Lease expiring in 15 days: Priority 3
6. ✅ Rent pending: Priority 3

## Security

- ✅ Row Level Security (RLS) enabled on notifications table
- ✅ Users can only access their own notifications
- ✅ All database operations are secured with user authentication
- ✅ Real-time subscriptions are filtered by user ID

## Performance

- ✅ Indexed columns for fast queries
- ✅ Efficient notification generation (prevents duplicates)
- ✅ Automatic cleanup of old notifications
- ✅ Real-time updates without polling

## Troubleshooting

### Common Issues

1. **Notifications not showing**
   - Check if user has properties and leases
   - Verify database connection
   - Check RLS policies

2. **Count not updating**
   - Verify real-time subscription is working
   - Check if notifications are being marked as read correctly

3. **Daily generation not working**
   - Check cron job is running
   - Verify database functions are created
   - Check server logs for errors

### Debug Commands
```bash
# Check notification count for user
SELECT COUNT(*) FROM notifications WHERE user_id = 'user-id';

# Check unread notifications
SELECT * FROM notifications WHERE user_id = 'user-id' AND is_read = false;

# Check daily generation
SELECT * FROM notifications WHERE generation_date = CURRENT_DATE;
```

## Future Enhancements

- [ ] Email notifications
- [ ] SMS notifications
- [ ] Push notifications
- [ ] Notification preferences per user
- [ ] Custom notification templates
- [ ] Notification analytics
- [ ] Bulk notification actions
