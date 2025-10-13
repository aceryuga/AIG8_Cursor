# Production Error Handling & Audit Trail Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Error Handling System](#error-handling-system)
3. [Audit Trail System](#audit-trail-system)
4. [Database Monitoring Scripts](#database-monitoring-scripts)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Emergency Response Procedures](#emergency-response-procedures)
7. [Maintenance & Cleanup](#maintenance--cleanup)

---

## 🎯 Overview

This guide provides comprehensive instructions for managing errors and audit trails in the PropertyPro application. The system automatically captures errors and user actions to help with debugging, compliance, and system monitoring.

### Key Features:
- **Automatic Error Capture**: React component errors, JavaScript errors, API failures
- **Audit Trail**: Complete history of user actions and system changes
- **Real-time Monitoring**: Database queries to track system health
- **Emergency Response**: Procedures for handling critical issues

---

## 🚨 Error Handling System

### How It Works

The application has multiple layers of error handling:

1. **React Error Boundaries**: Catch component crashes
2. **Global JavaScript Error Handler**: Catch unhandled errors
3. **API Error Handler**: Catch network and server errors
4. **Database Logging**: All errors stored in `error_logs` table

### Error Types Captured

| Error Type | Description | When It Occurs |
|------------|-------------|----------------|
| `react_error` | React component crashes | Component throws error during render |
| `javascript_error` | Unhandled JavaScript errors | Runtime errors, null references |
| `api_error` | API call failures | Network errors, server responses |

### Error Data Captured

Each error log contains:
- **User ID**: Who experienced the error
- **Error Message**: What went wrong
- **Stack Trace**: Where the error occurred
- **Component Name**: Which component failed
- **URL**: What page the user was on
- **User Agent**: Browser and device info
- **Timestamp**: When the error occurred

---

## 📊 Audit Trail System

### What Gets Audited

| Action Type | Description | Examples |
|-------------|-------------|----------|
| `property_created` | New property added | Property registration |
| `property_updated` | Property details changed | Rent increase, address change |
| `property_deleted` | Property removed | Property deactivation |
| `lease_created` | New lease agreement | Tenant onboarding |
| `lease_updated` | Lease terms modified | Rent adjustment, extension |
| `lease_ended` | Lease terminated | Tenant move-out |
| `payment_received` | Payment recorded | Rent payment, deposit |
| `payment_updated` | Payment modified | Payment correction |

### Audit Data Structure

Each audit event contains:
- **Entity ID**: ID of the affected record
- **Entity Name**: Human-readable name
- **Description**: What happened
- **User ID**: Who performed the action
- **Changes**: Before/after values (JSON)
- **Timestamp**: When it happened

---

## 🔍 Database Monitoring Scripts

### Error Monitoring Queries

#### 1. Current Error Status
```sql
-- Get unresolved errors from last 24 hours
SELECT 
    error_type,
    error_message,
    component_name,
    url,
    timestamp,
    user_id
FROM error_logs 
WHERE resolved = false 
    AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

#### 2. Error Trends (Last 7 Days)
```sql
-- Error count by type and date
SELECT 
    error_type,
    DATE(timestamp) as error_date,
    COUNT(*) as error_count
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY error_type, DATE(timestamp)
ORDER BY error_date DESC, error_count DESC;
```

#### 3. Most Problematic Components
```sql
-- Components with most errors
SELECT 
    component_name,
    COUNT(*) as error_count,
    COUNT(DISTINCT user_id) as affected_users
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '7 days'
    AND component_name != 'Global JavaScript Error'
GROUP BY component_name
ORDER BY error_count DESC
LIMIT 10;
```

#### 4. User Error Impact
```sql
-- Users experiencing most errors
SELECT 
    user_id,
    COUNT(*) as error_count,
    COUNT(DISTINCT error_type) as error_types,
    MAX(timestamp) as last_error
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY error_count DESC
LIMIT 20;
```

### Audit Trail Queries

#### 1. Recent User Activity
```sql
-- Last 100 user actions
SELECT 
    type,
    entity_name,
    description,
    user_id,
    timestamp
FROM audit_events 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 100;
```

#### 2. Property Management Activity
```sql
-- Property-related actions
SELECT 
    type,
    entity_name,
    description,
    user_id,
    timestamp,
    changes
FROM audit_events 
WHERE type LIKE 'property_%'
    AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

#### 3. Payment Audit Trail
```sql
-- Payment-related actions
SELECT 
    type,
    entity_name,
    description,
    user_id,
    timestamp
FROM audit_events 
WHERE type LIKE 'payment_%'
    AND timestamp >= NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;
```

#### 4. User Activity Summary
```sql
-- User activity by type
SELECT 
    user_id,
    type,
    COUNT(*) as action_count,
    MAX(timestamp) as last_action
FROM audit_events 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY user_id, type
ORDER BY user_id, action_count DESC;
```

---

## 🛠 Troubleshooting Guide

### Common Error Scenarios

#### 1. React Component Crashes

**Symptoms:**
- White screen of death
- "Something went wrong" error page
- Component not rendering

**Investigation Steps:**
```sql
-- Check for recent React errors
SELECT 
    error_message,
    error_stack,
    component_name,
    url,
    timestamp
FROM error_logs 
WHERE error_type = 'react_error'
    AND timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

**Resolution:**
1. Check the error stack trace for the failing component
2. Look for null reference errors or missing props
3. Test the component in isolation
4. Check for recent code changes

#### 2. API Failures

**Symptoms:**
- Network errors in console
- Failed data loading
- "Connection failed" messages

**Investigation Steps:**
```sql
-- Check for API errors
SELECT 
    error_message,
    component_name,
    url,
    user_id,
    timestamp
FROM error_logs 
WHERE error_type = 'api_error'
    AND timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

**Resolution:**
1. Check Supabase service status
2. Verify API endpoints are accessible
3. Check authentication tokens
4. Review network connectivity

#### 3. JavaScript Runtime Errors

**Symptoms:**
- Console errors
- Unexpected behavior
- Features not working

**Investigation Steps:**
```sql
-- Check for JavaScript errors
SELECT 
    error_message,
    error_stack,
    url,
    user_id,
    timestamp
FROM error_logs 
WHERE error_type = 'javascript_error'
    AND timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

**Resolution:**
1. Review error stack trace
2. Check for undefined variables
3. Verify data types and null checks
4. Test in different browsers

### Error Resolution Workflow

#### Step 1: Identify the Issue
```sql
-- Get error details
SELECT * FROM error_logs 
WHERE id = 'your-error-id';
```

#### Step 2: Check User Impact
```sql
-- Count affected users
SELECT COUNT(DISTINCT user_id) as affected_users
FROM error_logs 
WHERE error_message LIKE '%your-error-pattern%'
    AND timestamp >= NOW() - INTERVAL '24 hours';
```

#### Step 3: Mark as Resolved
```sql
-- Mark error as resolved
UPDATE error_logs 
SET resolved = true 
WHERE id = 'your-error-id';
```

#### Step 4: Monitor Resolution
```sql
-- Check if error is still occurring
SELECT COUNT(*) as new_occurrences
FROM error_logs 
WHERE error_message LIKE '%your-error-pattern%'
    AND timestamp >= NOW() - INTERVAL '1 hour'
    AND resolved = false;
```

---

## 🚨 Emergency Response Procedures

### Critical Error Response (High User Impact)

#### Immediate Actions (0-15 minutes):
1. **Assess Impact:**
   ```sql
   -- Check error frequency
   SELECT COUNT(*) as error_count
   FROM error_logs 
   WHERE timestamp >= NOW() - INTERVAL '15 minutes'
   AND resolved = false;
   ```

2. **Identify Affected Users:**
   ```sql
   -- Count affected users
   SELECT COUNT(DISTINCT user_id) as affected_users
   FROM error_logs 
   WHERE timestamp >= NOW() - INTERVAL '15 minutes'
   AND resolved = false;
   ```

3. **Check Error Patterns:**
   ```sql
   -- Most common errors
   SELECT 
       error_message,
       COUNT(*) as frequency
   FROM error_logs 
   WHERE timestamp >= NOW() - INTERVAL '15 minutes'
   GROUP BY error_message
   ORDER BY frequency DESC;
   ```

#### Short-term Actions (15-60 minutes):
1. **Implement Quick Fix** (if possible)
2. **Deploy Hotfix** (if needed)
3. **Monitor Resolution:**
   ```sql
   -- Monitor error reduction
   SELECT 
       DATE_TRUNC('minute', timestamp) as minute,
       COUNT(*) as error_count
   FROM error_logs 
   WHERE timestamp >= NOW() - INTERVAL '1 hour'
   GROUP BY minute
   ORDER BY minute DESC;
   ```

#### Long-term Actions (1-24 hours):
1. **Root Cause Analysis**
2. **Implement Permanent Fix**
3. **Update Monitoring**
4. **Document Incident**

### Data Integrity Issues

#### Check Audit Trail:
```sql
-- Recent data changes
SELECT 
    type,
    entity_name,
    description,
    user_id,
    timestamp,
    changes
FROM audit_events 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

#### Verify Data Consistency:
```sql
-- Check for orphaned records
SELECT COUNT(*) as orphaned_payments
FROM payments p
LEFT JOIN leases l ON p.lease_id = l.id
WHERE l.id IS NULL;
```

---

## 🧹 Maintenance & Cleanup

### Regular Maintenance Tasks

#### Daily (Automated):
```sql
-- Clean up resolved errors older than 30 days
DELETE FROM error_logs 
WHERE resolved = true 
    AND timestamp < NOW() - INTERVAL '30 days';
```

#### Weekly (Manual Review):
```sql
-- Review unresolved errors
SELECT 
    error_type,
    COUNT(*) as unresolved_count
FROM error_logs 
WHERE resolved = false
GROUP BY error_type
ORDER BY unresolved_count DESC;
```

#### Monthly (Data Archival):
```sql
-- Archive old audit events (optional)
-- Create backup before running
CREATE TABLE audit_events_archive AS 
SELECT * FROM audit_events 
WHERE timestamp < NOW() - INTERVAL '1 year';

-- Delete archived records
DELETE FROM audit_events 
WHERE timestamp < NOW() - INTERVAL '1 year';
```

### Performance Optimization

#### Index Maintenance:
```sql
-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('error_logs', 'audit_events')
ORDER BY idx_scan DESC;
```

#### Query Performance:
```sql
-- Monitor slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time
FROM pg_stat_statements 
WHERE query LIKE '%error_logs%' 
    OR query LIKE '%audit_events%'
ORDER BY mean_time DESC;
```

---

## 📞 Support Contacts

### Internal Team:
- **Development Team**: [dev-team@company.com]
- **DevOps Team**: [devops@company.com]
- **Product Team**: [product@company.com]

### External Services:
- **Supabase Support**: [support@supabase.io]
- **Hosting Provider**: [support@hosting-provider.com]

### Emergency Escalation:
1. **Level 1**: Development Team (0-2 hours)
2. **Level 2**: DevOps Team (2-8 hours)
3. **Level 3**: External Support (8+ hours)

---

## 📚 Additional Resources

### Documentation:
- [Supabase Documentation](https://supabase.com/docs)
- [React Error Boundaries](https://reactjs.org/docs/error-boundaries.html)
- [PostgreSQL Monitoring](https://www.postgresql.org/docs/current/monitoring.html)

### Tools:
- **Database Client**: pgAdmin, DBeaver, or Supabase Dashboard
- **Monitoring**: Supabase Dashboard, Custom Dashboards
- **Alerting**: Email, Slack, PagerDuty

### Best Practices:
1. **Regular Monitoring**: Check error logs daily
2. **Proactive Maintenance**: Address patterns before they become critical
3. **User Communication**: Inform users of known issues
4. **Documentation**: Keep runbooks updated
5. **Testing**: Test error scenarios in staging

---

*Last Updated: [Current Date]*
*Version: 1.0*
*Maintained by: Development Team*
