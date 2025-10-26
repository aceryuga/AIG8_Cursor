-- =====================================================
-- Storage Bucket Setup for Bank Statements
-- Description: Create private storage bucket with RLS policies
-- =====================================================

-- Note: Run this in Supabase Dashboard > Storage section
-- Or use Supabase CLI: supabase storage create bank-statements

-- Manual Steps (if using Dashboard):
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "Create Bucket"
-- 3. Name: bank-statements
-- 4. Public: false (uncheck)
-- 5. File Size Limit: 10485760 (10MB in bytes)
-- 6. Allowed MIME types: text/csv, application/vnd.ms-excel, text/plain, application/csv

-- =====================================================
-- STORAGE POLICIES
-- These control who can upload/access files in the bucket
-- =====================================================

-- Policy 1: Users can INSERT (upload) files only to their own folder
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Users can upload to own folder',
  'bank-statements',
  'bucket_id = ''bank-statements'' AND ((storage.foldername(name))[1]) = auth.uid()::text'
);

-- Policy 2: Users can SELECT (read) files only from their own folder
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Users can read from own folder',
  'bank-statements',
  'bucket_id = ''bank-statements'' AND ((storage.foldername(name))[1]) = auth.uid()::text'
);

-- Policy 3: Users can DELETE files only from their own folder
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Users can delete from own folder',
  'bank-statements',
  'bucket_id = ''bank-statements'' AND ((storage.foldername(name))[1]) = auth.uid()::text'
);

-- =====================================================
-- FOLDER STRUCTURE
-- {user_id}/{timestamp}_{filename}
-- Example: 123e4567-e89b-12d3-a456-426614174000/1698765432000_hdfc_statement.csv
-- =====================================================

-- Verification Query (run after bucket creation):
-- SELECT * FROM storage.buckets WHERE name = 'bank-statements';
-- SELECT * FROM storage.policies WHERE bucket_id = 'bank-statements';

