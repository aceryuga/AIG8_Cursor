# Property Gallery Feature

## Overview
The Property Gallery feature allows users to upload, manage, and view images for their properties. Images are stored in Supabase storage and linked to properties through a dedicated database table.

## Features

### ✅ Image Upload
- Drag and drop interface for easy file selection
- Multiple file selection support
- File validation (type and size)
- Progress tracking during upload
- Automatic primary image setting for first upload

### ✅ Image Management
- View all property images in a responsive grid
- Set any image as primary (only one primary per property)
- Delete images with confirmation
- Full-screen image viewer
- Image metadata display (name, size, upload date)

### ✅ Security & Performance
- Row Level Security (RLS) policies
- File type validation (JPEG, PNG, WebP, GIF)
- File size limits (10MB default)
- Organized storage structure by property ID
- Optimized image loading with fallbacks

## Database Structure

### `property_images` Table
```sql
CREATE TABLE property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_name TEXT NOT NULL,
    image_size INTEGER,
    image_type TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
```

### Key Features:
- **Cascade Delete**: Images are automatically deleted when property is deleted
- **Primary Image**: Only one primary image per property (enforced by trigger)
- **Audit Trail**: Tracks who uploaded each image
- **Indexes**: Optimized queries for property_id and primary status

## Storage Structure

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

## Components

### 1. PropertyGallery.tsx
Main gallery component with full functionality:
- Image grid display
- Upload modal with drag & drop
- Image viewer modal
- Primary image management
- Delete functionality

### 2. PropertyDetails.tsx (Updated)
- Added Gallery tab to existing tabs
- Integrated PropertyGallery component
- Maintains existing functionality

## Utility Functions

### propertyImages.ts
Centralized utility functions for image operations:

- `fetchPropertyImages(propertyId)` - Get all images for a property
- `uploadPropertyImage(file, propertyId, onProgress)` - Upload with progress tracking
- `deletePropertyImage(imageId, imageUrl)` - Delete from storage and database
- `setPrimaryImage(imageId)` - Set image as primary
- `validateImageFile(file)` - Validate file type and size
- `formatFileSize(bytes)` - Human-readable file sizes

## Setup Instructions

### 1. Database Setup
Run the SQL script in `property_images_table.sql` to create the table and policies.

### 2. Storage Setup
Follow the instructions in `SUPABASE_STORAGE_SETUP.md` to:
- Create the `property-images` bucket
- Set up storage policies
- Configure public access

### 3. Environment Variables
Ensure your Supabase configuration is set up:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage

### Adding Images
1. Navigate to Property Details
2. Click on the "Gallery" tab
3. Click "Add Images" button
4. Drag & drop or select image files
5. Click "Upload Images"

### Managing Images
- **View Full Size**: Click any image to open in full-screen viewer
- **Set Primary**: Click the star icon on any non-primary image
- **Delete**: Click the trash icon and confirm deletion

### Primary Images
- The first uploaded image is automatically set as primary
- Only one image can be primary per property
- Primary images are displayed first in the grid
- Primary status is indicated by a green "Primary" badge

## Security Features

### Row Level Security (RLS)
- Users can only access images for their own properties
- All CRUD operations are protected by RLS policies
- Storage policies ensure users can only access their own files

### File Validation
- **File Types**: Only image files (JPEG, PNG, WebP, GIF)
- **File Size**: Maximum 10MB per file
- **Client-side validation** before upload
- **Server-side validation** in storage policies

## Performance Optimizations

### Database
- Indexed queries on `property_id` and `is_primary`
- Efficient ordering (primary first, then by date)
- Cascade deletes for cleanup

### Storage
- Organized folder structure by property ID
- Public URLs for direct access
- Cache control headers for better performance

### UI
- Lazy loading of images
- Progress indicators during upload
- Responsive grid layout
- Image fallbacks for failed loads

## Error Handling

### Upload Errors
- File validation errors with user-friendly messages
- Network error handling with retry options
- Storage quota exceeded notifications

### Display Errors
- Fallback images for broken URLs
- Loading states during data fetching
- Error boundaries for component failures

## Future Enhancements

### Potential Features
- **Image Compression**: Automatic resizing for large images
- **Bulk Operations**: Select multiple images for batch actions
- **Image Editing**: Basic crop/rotate functionality
- **Sorting Options**: Sort by date, name, or size
- **Search**: Find images by name or metadata
- **Categories**: Organize images by room/type
- **Watermarking**: Add property watermarks
- **Export**: Download all images as ZIP

### Technical Improvements
- **CDN Integration**: Use Supabase CDN for faster delivery
- **Image Optimization**: WebP conversion for better compression
- **Caching**: Implement client-side caching for better performance
- **Offline Support**: Cache images for offline viewing
- **Progressive Loading**: Show low-res versions first

## Troubleshooting

### Common Issues

1. **Upload Fails**
   - Check file size and type
   - Verify storage bucket exists
   - Check RLS policies

2. **Images Not Displaying**
   - Verify bucket is public
   - Check image URLs in database
   - Test direct URL access

3. **Permission Errors**
   - Verify RLS policies are correct
   - Check user authentication
   - Test with different user accounts

### Debug Steps
1. Check browser console for errors
2. Verify Supabase configuration
3. Test with simple file upload
4. Check network tab for failed requests
5. Verify storage policies in Supabase dashboard

## API Reference

### Database Operations
```typescript
// Fetch images for a property
const images = await fetchPropertyImages(propertyId);

// Upload a new image
const image = await uploadPropertyImage(file, propertyId, onProgress);

// Delete an image
await deletePropertyImage(imageId, imageUrl);

// Set primary image
await setPrimaryImage(imageId);
```

### Component Props
```typescript
interface PropertyGalleryProps {
  propertyId: string; // Required property ID
}
```

## Testing

### Manual Testing Checklist
- [ ] Upload single image
- [ ] Upload multiple images
- [ ] Drag and drop functionality
- [ ] File validation (type and size)
- [ ] Set primary image
- [ ] Delete image with confirmation
- [ ] Full-screen image viewer
- [ ] Responsive grid layout
- [ ] Error handling for failed uploads
- [ ] RLS policy enforcement

### Test Scenarios
1. **New Property**: Upload first image (should become primary)
2. **Existing Property**: Upload additional images
3. **Primary Management**: Change primary image
4. **Bulk Operations**: Upload multiple files at once
5. **Error Cases**: Invalid files, network errors
6. **Security**: Test with different user accounts
