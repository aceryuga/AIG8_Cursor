# Supabase Storage Setup for Property Images

## 1. Create Storage Bucket

In your Supabase dashboard, go to **Storage** and create a new bucket:

- **Bucket Name**: `property-images`
- **Public**: ✅ Yes (so images can be accessed via public URLs)
- **File Size Limit**: 50MB (or your preferred limit)
- **Allowed MIME Types**: `image/*` (or specific types like `image/jpeg,image/png,image/webp`)

## 2. Set Up Storage Policies

Go to **Storage** → **Policies** and create the following policies for the `property-images` bucket:

### Policy 1: Allow authenticated users to upload images
```sql
CREATE POLICY "Users can upload images to their property folders" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'property-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 2: Allow users to view their own property images
```sql
CREATE POLICY "Users can view their own property images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'property-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 3: Allow users to update their own property images
```sql
CREATE POLICY "Users can update their own property images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'property-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 4: Allow users to delete their own property images
```sql
CREATE POLICY "Users can delete their own property images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'property-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## 3. Alternative: Simpler Public Access (Less Secure)

If you want simpler setup with public access to all images:

### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'property-images' AND
  auth.role() = 'authenticated'
);
```

### Policy 2: Allow public access to view images
```sql
CREATE POLICY "Public can view images" ON storage.objects
FOR SELECT USING (bucket_id = 'property-images');
```

### Policy 3: Allow authenticated users to update
```sql
CREATE POLICY "Authenticated users can update images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'property-images' AND
  auth.role() = 'authenticated'
);
```

### Policy 4: Allow authenticated users to delete
```sql
CREATE POLICY "Authenticated users can delete images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'property-images' AND
  auth.role() = 'authenticated'
);
```

## 4. File Structure

The storage will be organized as follows:
```
property-images/
├── {property-id-1}/
│   ├── 1234567890-abc123.jpg
│   ├── 1234567891-def456.png
│   └── ...
├── {property-id-2}/
│   ├── 1234567892-ghi789.jpg
│   └── ...
└── ...
```

## 5. Environment Variables

Make sure your Supabase configuration is properly set up in your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 6. Testing the Setup

1. Run the SQL script to create the `property_images` table
2. Create the storage bucket with the policies above
3. Test uploading an image through the Gallery tab
4. Verify the image appears in the Supabase Storage dashboard
5. Check that the image record is created in the `property_images` table

## 7. Troubleshooting

### Common Issues:

1. **403 Forbidden Error**: Check that the storage policies are correctly set up
2. **File not found**: Verify the file path structure matches the expected format
3. **Upload fails**: Check file size limits and MIME type restrictions
4. **Images not displaying**: Verify the bucket is set to public and URLs are correct

### Debug Steps:

1. Check browser console for errors
2. Verify Supabase client configuration
3. Test with a simple file upload first
4. Check network tab for failed requests
5. Verify RLS policies are not blocking access
