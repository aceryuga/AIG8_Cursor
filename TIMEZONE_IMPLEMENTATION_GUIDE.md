# Timezone Implementation Guide

## Overview
This guide explains how to implement proper timezone handling in the property management application to ensure all timestamps are stored in UTC and displayed in the user's local timezone.

## Key Principles

1. **Store in UTC**: All timestamps in Supabase should be stored in UTC format
2. **Display in Local**: All timestamps should be displayed in the user's local timezone
3. **Consistent Conversion**: Use utility functions for all date/time operations

## Implementation Steps

### 1. Timezone Utilities (`src/utils/timezoneUtils.ts`)

The utility functions handle all timezone conversions:

- `toUTC(localDate)` - Convert local date to UTC for Supabase storage
- `fromUTC(utcDateString)` - Convert UTC date from Supabase to local timezone
- `getCurrentUTC()` - Get current date/time in UTC format
- `getRelativeTime(utcDateString)` - Get relative time display (e.g., "2 hours ago")
- `fromDateInput(dateInputValue)` - Convert HTML date input to UTC
- `toDateInputValue(utcDateString)` - Convert UTC date to HTML date input format

### 2. Database Schema Updates

Ensure all timestamp columns in Supabase use `timestamptz` (timestamp with timezone):

```sql
-- Example for payments table
ALTER TABLE payments 
ALTER COLUMN payment_date TYPE timestamptz;

-- Example for leases table
ALTER TABLE leases 
ALTER COLUMN start_date TYPE timestamptz,
ALTER COLUMN end_date TYPE timestamptz,
ALTER COLUMN created_at TYPE timestamptz,
ALTER COLUMN updated_at TYPE timestamptz;
```

### 3. Component Updates

#### Payment Recording
```typescript
import { fromDateInput } from '../../utils/timezoneUtils';

// When submitting payment
const { error } = await supabase
  .from('payments')
  .insert({
    payment_date: fromDateInput(form.date), // Convert to UTC
    // ... other fields
  });
```

#### Date Display
```typescript
import { getRelativeTime, fromUTC } from '../../utils/timezoneUtils';

// For relative time display
const timeAgo = getRelativeTime(payment.payment_date);

// For formatted date display
const localDate = fromUTC(payment.payment_date);
const formattedDate = localDate.toLocaleDateString();
```

#### Form Inputs
```typescript
import { toDateInputValue } from '../../utils/timezoneUtils';

// For HTML date inputs
<input 
  type="date" 
  value={toDateInputValue(property.leaseStart)} 
/>
```

### 4. Migration Strategy

#### Phase 1: Update New Records
- All new payments, leases, and other records use UTC timestamps
- Update all form submissions to use `fromDateInput()` or `getCurrentUTC()`

#### Phase 2: Update Display Logic
- Replace all manual date formatting with utility functions
- Update all components to use `getRelativeTime()` and `fromUTC()`

#### Phase 3: Migrate Existing Data
- Create migration script to convert existing timestamps to UTC
- Update any hardcoded date logic

### 5. Files to Update

#### High Priority
- `src/components/payments/RecordPayment.tsx` ✅
- `src/components/dashboard/Dashboard.tsx` ✅
- `src/components/properties/PropertyDetails.tsx` ✅
- `src/components/payments/PaymentHistory.tsx`
- `src/components/properties/PropertiesList.tsx`

#### Medium Priority
- `src/components/properties/AddProperty.tsx`
- `src/components/leases/LeaseManagement.tsx`
- `src/components/maintenance/MaintenanceRequests.tsx`

### 6. Testing Checklist

- [ ] New payments are stored with UTC timestamps
- [ ] Payment dates display correctly in local timezone
- [ ] Relative time shows accurate "X hours ago"
- [ ] Date inputs work correctly across timezones
- [ ] Existing data displays correctly after migration

### 7. Common Patterns

#### Storing Current Time
```typescript
import { getCurrentUTC } from '../../utils/timezoneUtils';

// Instead of: new Date().toISOString()
const now = getCurrentUTC();
```

#### Displaying Dates
```typescript
import { fromUTC, getRelativeTime } from '../../utils/timezoneUtils';

// Instead of: new Date(payment.payment_date)
const localDate = fromUTC(payment.payment_date);
const timeAgo = getRelativeTime(payment.payment_date);
```

#### Form Handling
```typescript
import { fromDateInput, toDateInputValue } from '../../utils/timezoneUtils';

// Converting form input to UTC
const utcDate = fromDateInput(form.date);

// Converting UTC to form input
const inputValue = toDateInputValue(property.leaseStart);
```

## Benefits

1. **Consistency**: All timestamps handled uniformly
2. **Accuracy**: No timezone conversion errors
3. **Maintainability**: Centralized timezone logic
4. **User Experience**: Dates always display in user's local timezone
5. **Scalability**: Works correctly across different timezones

## Notes

- Always use the utility functions instead of manual date operations
- Test across different timezones to ensure accuracy
- Consider user's timezone preferences for future enhancements
- Monitor for any timezone-related bugs after implementation
