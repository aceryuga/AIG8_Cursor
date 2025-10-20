#!/usr/bin/env node

// Script to fix RLS policies for settings tables
// This script will provide SQL to enable RLS and create policies

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing RLS Policies for Settings Tables...');

// RLS Fix SQL
const rlsFixSQL = `
-- Fix RLS Policies for Settings Tables
-- Execute this in Supabase SQL Editor

-- 1. Enable RLS on all settings tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view own billing history" ON public.billing_history;
DROP POLICY IF EXISTS "Users can view own login activity" ON public.login_activity;
DROP POLICY IF EXISTS "Users can view own export requests" ON public.data_export_requests;
DROP POLICY IF EXISTS "Users can create own export requests" ON public.data_export_requests;

-- 3. Create new RLS policies
CREATE POLICY "Users can view own settings" ON public.user_settings 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own billing history" ON public.billing_history 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own login activity" ON public.login_activity 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own export requests" ON public.data_export_requests 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own export requests" ON public.data_export_requests 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Grant permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.subscription_plans TO authenticated;
GRANT ALL ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.billing_history TO authenticated;
GRANT ALL ON public.login_activity TO authenticated;
GRANT ALL ON public.data_export_requests TO authenticated;

-- 5. Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'user_settings', 
    'user_subscriptions', 
    'billing_history', 
    'login_activity', 
    'data_export_requests'
)
ORDER BY tablename;
`;

console.log('\n📋 INSTRUCTIONS:');
console.log('1. Go to your Supabase Dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the following SQL content:');
console.log('4. Execute the SQL script');

console.log('\n' + '='.repeat(80));
console.log('SQL CONTENT TO EXECUTE:');
console.log('='.repeat(80));
console.log(rlsFixSQL);
console.log('='.repeat(80));

console.log('\n🔍 After executing, verify with this query:');
console.log(`
-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'user_settings', 
    'user_subscriptions', 
    'billing_history', 
    'login_activity', 
    'data_export_requests'
)
ORDER BY tablename;
`);

console.log('\n🎯 Expected Results:');
console.log('- All tables should show rls_enabled = true');
console.log('- No more 406 errors in the settings page');
console.log('- Settings page should load user data properly');

console.log('\n🚨 If you still get 406 errors after this:');
console.log('1. Check if the user is properly authenticated');
console.log('2. Verify the user_id matches auth.uid()');
console.log('3. Check browser console for more detailed error messages');
