-- TELEGRAM BOT TOKEN VALIDATION QUERIES
-- Use these in your Telegram bot to properly validate tokens
-- =====================================================

-- 1. VALIDATE TOKEN (Use this in your bot when user sends a token)
-- This checks if token exists, is not expired, and not already linked
SELECT 
    id,
    user_id,
    telegram_username,
    link_token,
    link_token_expires_at,
    is_active,
    -- Check if token is still valid (compare with current UTC time)
    CASE 
        WHEN link_token_expires_at > NOW() THEN true
        ELSE false
    END as is_token_valid,
    -- Show time remaining
    EXTRACT(EPOCH FROM (link_token_expires_at - NOW()))/60 as minutes_remaining
FROM telegram_users
WHERE link_token = 'YOUR_TOKEN_HERE'  -- Replace with actual token from user
    AND link_token_expires_at > NOW()  -- Must not be expired
    AND (is_active = false OR telegram_id IS NULL);  -- Must not already be linked

-- 2. LINK TELEGRAM ACCOUNT (Use this after validating token)
-- When user provides valid token, update with their Telegram info
UPDATE telegram_users
SET 
    telegram_id = 123456789,  -- Replace with actual telegram user ID
    telegram_username = 'username',  -- Replace with actual username (can be NULL)
    telegram_first_name = 'FirstName',  -- Replace with actual first name
    telegram_last_name = 'LastName',  -- Replace with actual last name (can be NULL)
    is_active = true,
    linked_at = NOW(),  -- This will be in UTC automatically
    link_token = NULL,  -- Clear the token after successful link
    link_token_expires_at = NULL,
    updated_at = NOW()
WHERE link_token = 'YOUR_TOKEN_HERE'
    AND link_token_expires_at > NOW()
RETURNING id, user_id, telegram_username, telegram_first_name;

-- 3. CHECK IF TELEGRAM USER ALREADY LINKED (Prevent duplicate links)
SELECT 
    id,
    user_id,
    telegram_username,
    is_active
FROM telegram_users
WHERE telegram_id = 123456789  -- Replace with actual telegram user ID
    AND is_active = true;

-- 4. GET USER INFO BY TELEGRAM ID (For bot commands)
SELECT 
    tu.id,
    tu.user_id,
    tu.telegram_username,
    tu.telegram_first_name,
    tu.is_active,
    u.name as user_name,
    u.email as user_email
FROM telegram_users tu
JOIN users u ON u.id = tu.user_id
WHERE tu.telegram_id = 123456789  -- Replace with actual telegram user ID
    AND tu.is_active = true;

-- 5. CLEANUP EXPIRED TOKENS (Optional maintenance query)
-- Run this periodically to clean up expired tokens
UPDATE telegram_users
SET 
    link_token = NULL,
    link_token_expires_at = NULL
WHERE link_token_expires_at < NOW()
    AND is_active = false;

-- 6. DEBUG: View all tokens with status
SELECT 
    user_id,
    link_token,
    link_token_expires_at,
    link_token_expires_at AT TIME ZONE 'Asia/Kolkata' as expires_ist,
    NOW() as current_utc,
    NOW() AT TIME ZONE 'Asia/Kolkata' as current_ist,
    CASE 
        WHEN link_token_expires_at > NOW() THEN 'VALID'
        WHEN link_token_expires_at <= NOW() THEN 'EXPIRED'
        ELSE 'NO_TOKEN'
    END as status,
    ROUND(EXTRACT(EPOCH FROM (link_token_expires_at - NOW()))/60, 2) as minutes_remaining,
    is_active,
    telegram_username
FROM telegram_users
WHERE link_token IS NOT NULL
ORDER BY link_token_expires_at DESC;

-- =====================================================
-- IMPORTANT NOTES FOR TELEGRAM BOT DEVELOPERS:
-- =====================================================
-- 
-- 1. ALWAYS use NOW() function in PostgreSQL for current time
--    - NOW() automatically uses UTC in Supabase
--    - Never send timestamps from your bot's local time
--
-- 2. When comparing timestamps:
--    - link_token_expires_at > NOW()  ✅ Correct
--    - Don't convert to IST before comparison  ❌ Wrong
--
-- 3. Token validation flow:
--    a. User generates token in webapp (valid 10 minutes)
--    b. User opens bot and sends /start
--    c. User sends token to bot
--    d. Bot queries: SELECT ... WHERE link_token = ? AND link_token_expires_at > NOW()
--    e. If found, update record with Telegram info
--    f. Clear link_token and set is_active = true
--
-- 4. Example validation in Python (for bot):
--    ```python
--    from supabase import create_client
--    
--    # Validate token
--    result = supabase.table('telegram_users') \
--        .select('*') \
--        .eq('link_token', user_token) \
--        .gt('link_token_expires_at', 'now()') \  # PostgreSQL function
--        .eq('is_active', False) \
--        .single() \
--        .execute()
--    
--    if result.data:
--        # Token is valid, link account
--        supabase.table('telegram_users') \
--            .update({
--                'telegram_id': telegram_user.id,
--                'telegram_username': telegram_user.username,
--                'telegram_first_name': telegram_user.first_name,
--                'telegram_last_name': telegram_user.last_name,
--                'is_active': True,
--                'linked_at': 'now()',
--                'link_token': None,
--                'link_token_expires_at': None
--            }) \
--            .eq('link_token', user_token) \
--            .execute()
--    ```

