# Supabase Security Lints Fix Guide

## Overview
This guide addresses the security issues identified in the Supabase Performance Security Lints file. The main issues are related to Row Level Security (RLS) being disabled on public tables.

## Issues Identified

### 1. RLS Disabled on Public Tables
The following tables have RLS disabled but are exposed to PostgREST:
- `public.users`
- `public.tenants`
- `public.leases`
- `public.payments`
- `public.documents`
- `public.maintenance_requests`
- `public.email_tokens`
- `public.rental_increases`
- `public.communication_log`
- `public.property_images`
- `public.properties`
- `public.subscription_plans`

### 2. Policy Exists but RLS Disabled
The `public.property_images` table has RLS policies created but RLS is not enabled on the table.

## Solution

### Step 1: Enable RLS on All Tables
Run the `fix_supabase_security_lints.sql` script to enable RLS on all affected tables:

```sql
-- This will enable RLS on all the tables mentioned above
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
-- ... and so on for all tables
```

### Step 2: Create Comprehensive RLS Policies
Run the `create_rls_policies.sql` script to create appropriate security policies for each table.

## Security Model

The RLS policies follow this security model:

### User Data Isolation
- Users can only access their own data
- Users can only access data related to their own properties
- All operations are scoped to the authenticated user's ownership

### Property-Based Access Control
- Properties are owned by users (`user_id` field)
- All related data (tenants, leases, payments, documents, etc.) is accessible only through property ownership
- This ensures complete data isolation between different property owners

### Policy Types Created

#### 1. Direct User Data
- **Users table**: Users can only access their own profile
- **Email tokens**: Users can only access their own tokens

#### 2. Property-Owned Data
- **Properties**: Users can only access their own properties
- **Tenants**: Accessible only for properties owned by the user
- **Leases**: Accessible only for properties owned by the user
- **Payments**: Accessible only for leases of properties owned by the user
- **Documents**: Accessible only for properties owned by the user
- **Maintenance requests**: Accessible only for properties owned by the user
- **Rental increases**: Accessible only for leases of properties owned by the user
- **Communication log**: Accessible only for properties owned by the user
- **Property images**: Accessible only for properties owned by the user

#### 3. System Data
- **Subscription plans**: Read-only access for authenticated users, full access for service role

## Implementation Steps

### 1. Backup Your Database
Before making any changes, ensure you have a backup of your database.

### 2. Apply the Fixes
Execute the SQL scripts in this order:

```bash
# 1. Enable RLS on all tables
psql -h your-host -U your-user -d your-database -f fix_supabase_security_lints.sql

# 2. Create comprehensive RLS policies
psql -h your-host -U your-user -d your-database -f create_rls_policies.sql
```

### 3. Verify the Changes
After applying the fixes, run the verification queries at the end of each script to ensure:
- RLS is enabled on all tables
- All policies are created correctly

### 4. Test Your Application
After applying the security fixes:
1. Test user authentication and authorization
2. Verify that users can only access their own data
3. Test all CRUD operations for each table
4. Ensure the application still functions correctly

## Important Notes

### Existing Policies
The `property_images` table already had some policies created. The new script ensures comprehensive coverage and consistency.

### Service Role Access
The `subscription_plans` table allows full access to the service role, which is necessary for system operations.

### Performance Considerations
- RLS policies add overhead to queries
- Ensure proper indexing on foreign key relationships
- Monitor query performance after implementation

### Testing Recommendations
1. Test with different user accounts
2. Verify data isolation between users
3. Test edge cases and error scenarios
4. Monitor application logs for any authorization errors

## Troubleshooting

### Common Issues

#### 1. "Permission denied" errors
- Ensure the user is properly authenticated
- Check that RLS policies are correctly defined
- Verify the user has the necessary permissions

#### 2. Queries returning no data
- Check that the RLS policies match your data access patterns
- Verify foreign key relationships are correct
- Ensure the authenticated user has the expected data ownership

#### 3. Performance issues
- Add appropriate indexes on columns used in RLS policies
- Consider query optimization
- Monitor slow query logs

### Verification Queries

Use these queries to verify the security setup:

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check existing policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Security Best Practices

1. **Regular Audits**: Periodically review RLS policies and access patterns
2. **Principle of Least Privilege**: Only grant necessary permissions
3. **Monitor Access**: Log and monitor data access patterns
4. **Test Security**: Regularly test security boundaries
5. **Keep Updated**: Stay informed about Supabase security updates

## Support

If you encounter issues with these security fixes:
1. Check the Supabase documentation for RLS best practices
2. Review the error logs for specific permission issues
3. Test policies individually to isolate problems
4. Consider consulting with a database security expert for complex scenarios
