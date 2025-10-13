-- Clear all files from storage buckets
-- Execute this script in Supabase SQL Editor

-- Start transaction for safety
BEGIN;

-- Delete all files from property-images bucket
DELETE FROM storage.objects 
WHERE bucket_id = 'property-images';

-- Delete all files from documents bucket
DELETE FROM storage.objects 
WHERE bucket_id = 'documents';

-- Commit the transaction
COMMIT;

-- Verification queries
SELECT 'Files in property-images bucket after cleanup:' as info, COUNT(*) as count 
FROM storage.objects 
WHERE bucket_id = 'property-images';

SELECT 'Files in documents bucket after cleanup:' as info, COUNT(*) as count 
FROM storage.objects 
WHERE bucket_id = 'documents';

-- Show remaining files (should be 0)
SELECT 'Remaining files in all buckets:' as info, COUNT(*) as count 
FROM storage.objects;
