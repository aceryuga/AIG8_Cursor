-- =====================================================
-- PropertyPro Production Monitoring Scripts
-- =====================================================
-- This file contains all SQL scripts for monitoring
-- errors and audit trails in production
-- =====================================================

-- =====================================================
-- ERROR MONITORING SCRIPTS
-- =====================================================

-- 1. Current Error Status (Last 24 Hours)
-- Use this to see what errors are happening right now
SELECT 
    id,
    error_type,
    error_message,
    component_name,
    url,
    timestamp,
    user_id,
    resolved
FROM error_logs 
WHERE resolved = false 
    AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- 2. Error Trends (Last 7 Days)
-- Use this to see error patterns over time
SELECT 
    error_type,
    DATE(timestamp) as error_date,
    COUNT(*) as error_count
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY error_type, DATE(timestamp)
ORDER BY error_date DESC, error_count DESC;

-- 3. Most Problematic Components
-- Use this to identify which components need attention
SELECT 
    component_name,
    COUNT(*) as error_count,
    COUNT(DISTINCT user_id) as affected_users,
    MAX(timestamp) as last_error
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '7 days'
    AND component_name != 'Global JavaScript Error'
GROUP BY component_name
ORDER BY error_count DESC
LIMIT 10;

-- 4. User Error Impact
-- Use this to see which users are experiencing most errors
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

-- 5. Critical Errors (React Errors)
-- Use this to find the most serious errors
SELECT 
    error_message,
    error_stack,
    component_name,
    url,
    user_id,
    timestamp
FROM error_logs 
WHERE error_type = 'react_error'
    AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- 6. API Error Analysis
-- Use this to monitor API failures
SELECT 
    error_message,
    component_name,
    url,
    user_id,
    timestamp
FROM error_logs 
WHERE error_type = 'api_error'
    AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- 7. JavaScript Runtime Errors
-- Use this to find JavaScript errors
SELECT 
    error_message,
    error_stack,
    url,
    user_id,
    timestamp
FROM error_logs 
WHERE error_type = 'javascript_error'
    AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- 8. Error Resolution Status
-- Use this to track which errors are still unresolved
SELECT 
    error_type,
    COUNT(*) as total_errors,
    COUNT(CASE WHEN resolved = true THEN 1 END) as resolved_errors,
    COUNT(CASE WHEN resolved = false THEN 1 END) as unresolved_errors,
    ROUND(
        COUNT(CASE WHEN resolved = true THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as resolution_rate
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY error_type
ORDER BY unresolved_errors DESC;

-- 9. Recent Error Spike Detection
-- Use this to detect sudden increases in errors
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as error_count
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- 10. Error by URL/Page
-- Use this to see which pages have most errors
SELECT 
    url,
    COUNT(*) as error_count,
    COUNT(DISTINCT user_id) as affected_users
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY url
ORDER BY error_count DESC
LIMIT 15;

-- =====================================================
-- AUDIT TRAIL MONITORING SCRIPTS
-- =====================================================

-- 1. Recent User Activity (Last 24 Hours)
-- Use this to see what users are doing
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

-- 2. Property Management Activity
-- Use this to monitor property-related actions
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

-- 3. Payment Audit Trail
-- Use this to track payment activities
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

-- 4. Lease Management Activity
-- Use this to monitor lease-related actions
SELECT 
    type,
    entity_name,
    description,
    user_id,
    timestamp,
    changes
FROM audit_events 
WHERE type LIKE 'lease_%'
    AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- 5. User Activity Summary
-- Use this to see user activity patterns
SELECT 
    user_id,
    type,
    COUNT(*) as action_count,
    MAX(timestamp) as last_action
FROM audit_events 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY user_id, type
ORDER BY user_id, action_count DESC;

-- 6. Most Active Users
-- Use this to see which users are most active
SELECT 
    user_id,
    COUNT(*) as total_actions,
    COUNT(DISTINCT type) as action_types,
    MAX(timestamp) as last_activity
FROM audit_events 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY total_actions DESC
LIMIT 20;

-- 7. Action Type Distribution
-- Use this to see what types of actions are most common
SELECT 
    type,
    COUNT(*) as action_count,
    COUNT(DISTINCT user_id) as unique_users
FROM audit_events 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY type
ORDER BY action_count DESC;

-- 8. Recent Property Changes
-- Use this to track property modifications
SELECT 
    entity_name,
    type,
    description,
    user_id,
    timestamp,
    changes
FROM audit_events 
WHERE type IN ('property_created', 'property_updated', 'property_deleted')
    AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- 9. Recent Payment Activities
-- Use this to track payment processing
SELECT 
    entity_name,
    type,
    description,
    user_id,
    timestamp
FROM audit_events 
WHERE type IN ('payment_received', 'payment_updated')
    AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- 10. Data Integrity Check
-- Use this to verify data consistency
SELECT 
    'Orphaned Payments' as issue_type,
    COUNT(*) as count
FROM payments p
LEFT JOIN leases l ON p.lease_id = l.id
WHERE l.id IS NULL

UNION ALL

SELECT 
    'Orphaned Leases' as issue_type,
    COUNT(*) as count
FROM leases l
LEFT JOIN properties p ON l.property_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 
    'Orphaned Property Images' as issue_type,
    COUNT(*) as count
FROM property_images pi
LEFT JOIN properties p ON pi.property_id = p.id
WHERE p.id IS NULL;

-- =====================================================
-- EMERGENCY RESPONSE SCRIPTS
-- =====================================================

-- 1. Critical Error Assessment (Last 15 Minutes)
-- Use this during emergency response
SELECT 
    error_type,
    COUNT(*) as error_count,
    COUNT(DISTINCT user_id) as affected_users
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '15 minutes'
    AND resolved = false
GROUP BY error_type
ORDER BY error_count DESC;

-- 2. Error Frequency by Minute (Last Hour)
-- Use this to monitor error trends during incident
SELECT 
    DATE_TRUNC('minute', timestamp) as minute,
    COUNT(*) as error_count
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY minute
ORDER BY minute DESC;

-- 3. Most Common Error Messages (Last Hour)
-- Use this to identify the main issue
SELECT 
    error_message,
    COUNT(*) as frequency
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY error_message
ORDER BY frequency DESC
LIMIT 10;

-- 4. User Impact Assessment
-- Use this to understand how many users are affected
SELECT 
    COUNT(DISTINCT user_id) as total_affected_users,
    COUNT(*) as total_errors
FROM error_logs 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
    AND resolved = false;

-- 5. Recent System Changes (Last Hour)
-- Use this to see what changed before the incident
SELECT 
    type,
    entity_name,
    description,
    user_id,
    timestamp
FROM audit_events 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- =====================================================
-- MAINTENANCE SCRIPTS
-- =====================================================

-- 1. Clean Up Resolved Errors (30+ days old)
-- Run this daily to clean up old resolved errors
DELETE FROM error_logs 
WHERE resolved = true 
    AND timestamp < NOW() - INTERVAL '30 days';

-- 2. Archive Old Audit Events (1+ year old)
-- Run this monthly to archive old audit data
-- First create backup table
CREATE TABLE IF NOT EXISTS audit_events_archive AS 
SELECT * FROM audit_events 
WHERE timestamp < NOW() - INTERVAL '1 year';

-- Then delete archived records
DELETE FROM audit_events 
WHERE timestamp < NOW() - INTERVAL '1 year';

-- 3. Mark Old Errors as Resolved (7+ days old)
-- Use this to clean up very old unresolved errors
UPDATE error_logs 
SET resolved = true 
WHERE resolved = false 
    AND timestamp < NOW() - INTERVAL '7 days';

-- 4. Index Usage Analysis
-- Use this to check if indexes are being used
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

-- 5. Table Size Analysis
-- Use this to monitor table growth
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables 
WHERE tablename IN ('error_logs', 'audit_events')
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- =====================================================
-- PERFORMANCE MONITORING SCRIPTS
-- =====================================================

-- 1. Slow Query Analysis
-- Use this to find slow queries (requires pg_stat_statements)
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%error_logs%' 
    OR query LIKE '%audit_events%'
ORDER BY mean_time DESC
LIMIT 10;

-- 2. Connection Monitoring
-- Use this to monitor database connections
SELECT 
    state,
    COUNT(*) as connection_count
FROM pg_stat_activity 
WHERE datname = current_database()
GROUP BY state
ORDER BY connection_count DESC;

-- 3. Lock Analysis
-- Use this to check for blocking queries
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- =====================================================
-- USAGE NOTES
-- =====================================================

/*
QUICK REFERENCE:

Daily Monitoring:
- Run scripts 1, 2, 3 from Error Monitoring
- Run scripts 1, 2 from Audit Trail Monitoring

Weekly Review:
- Run scripts 4, 5, 6 from Error Monitoring
- Run scripts 5, 6, 7 from Audit Trail Monitoring

Emergency Response:
- Run all Emergency Response scripts
- Monitor script 2 every 5 minutes during incident

Monthly Maintenance:
- Run all Maintenance scripts
- Review Performance Monitoring scripts

PERFORMANCE TIPS:
- Add LIMIT clauses to large result sets
- Use specific time ranges to avoid full table scans
- Consider creating indexes on frequently queried columns
- Monitor query execution times

SECURITY NOTES:
- These scripts contain sensitive data
- Restrict access to authorized personnel only
- Consider masking user IDs in reports
- Log all monitoring activities
*/
