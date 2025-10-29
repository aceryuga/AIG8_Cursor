# Generate Notifications Edge Function

This Edge Function automatically generates daily notifications for all users based on:
- Lease expiry (15 days before expiration)
- Lease expired (after expiration date)
- Rent pending (when rent is due in current month)
- Rent overdue (when rent is past grace period)

## Deployment

Deploy this function with:
```bash
npx supabase functions deploy generate-notifications
```

## Cron Schedule

This function is configured to run automatically every day at 9:00 AM IST (3:30 AM UTC).

The cron schedule is configured in the `supabase/config.toml` file:
```toml
[functions.generate-notifications]
verify_jwt = false

[functions.generate-notifications.cron]
schedule = "30 3 * * *"  # Daily at 3:30 AM UTC (9:00 AM IST)
```

## Manual Trigger

You can manually trigger this function using:
```bash
curl -X POST https://xsoyzbanlgxoijrweemz.supabase.co/functions/v1/generate-notifications \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## How It Works

1. **Connects to Database**: Uses service role key for admin access
2. **Calls RPC Function**: Executes `generate_daily_notifications()` database function
3. **Generates Notifications**: Creates notifications for all users based on their leases and payments
4. **Weekly Cleanup**: On Sundays, also runs `cleanup_old_notifications()` to remove old cleared notifications

## Features

- ✅ Runs automatically via cron trigger
- ✅ No authentication required (cron jobs bypass auth)
- ✅ Generates notifications for all users
- ✅ Prevents duplicate notifications (checks generation_date)
- ✅ Weekly cleanup of old notifications
- ✅ Comprehensive logging
- ✅ Error handling

## Monitoring

Check Edge Function logs in Supabase Dashboard:
1. Go to Edge Functions
2. Click on `generate-notifications`
3. View Logs tab to see execution history

