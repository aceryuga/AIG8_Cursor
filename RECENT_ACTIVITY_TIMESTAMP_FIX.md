# Recent Activity Timestamp Fix

## Problem
Recent Activity in the Dashboard was showing incorrect timestamps for most activities (properties, payments, leases, tenants, etc.) with a 5h30m offset, while image uploads displayed correctly.

### Example:
- Image uploaded: "2 mins ago" ✅ (correct)
- Property added: "5h 30m ago" ❌ (should be "2 mins ago")

## Root Cause
**Database schema inconsistency in timestamp column types:**

- ✅ `property_images.created_at` used `timestamp WITH time zone` → returned `"2025-10-20 18:24:46.960776+00"`
- ❌ `properties.created_at` used `timestamp WITHOUT time zone` → returned `"2025-10-20 18:24:43.167"` (no timezone info)
- ❌ Same issue for `payments`, `leases`, `documents`, and other tables

When JavaScript's `new Date()` parsed timestamps without timezone info, it interpreted them as local time instead of UTC, causing the IST offset (UTC+5:30) to be incorrectly applied.

## Solution Applied

### 1. Database Migration (✅ Completed)
Applied migration: `fix_timestamp_columns_for_recent_activity`

Converted all timestamp columns to `timestamp with time zone` (timestamptz):
- `properties.created_at` and `updated_at`
- `payments.created_at` and `updated_at`
- `leases.created_at` and `updated_at`
- `documents.uploaded_at`
- `maintenance_requests.created_at`
- `communication_log.sent_at`
- `rental_increases.created_at`

### 2. Code Update (✅ Completed)
Updated `getRecentActivityTime()` in `src/utils/timezoneUtils.ts`:
- Simplified timestamp parsing since all timestamps now include timezone info
- Added debug logging (commented out) for future troubleshooting
- Added 1-minute buffer for clock skew when handling future dates

## Testing
Verified with user "mastermayankshah1698@gmail.com":
- All Recent Activity timestamps now display correctly
- Consistent behavior across all activity types (images, properties, payments, leases, etc.)

## Technical Details
- PostgreSQL `timestamptz` stores all timestamps in UTC internally
- When queried, it returns timestamps with timezone info: `"YYYY-MM-DD HH:MM:SS.ssssss+00"`
- JavaScript's `new Date()` correctly interprets these as UTC timestamps
- The relative time calculation now works consistently across all activity types

## Files Modified
1. Database: Migration applied via Supabase MCP
2. `src/utils/timezoneUtils.ts` - Updated `getRecentActivityTime()` function

## Status
✅ **FIXED** - All Recent Activity timestamps now display correctly with consistent timezone handling.

