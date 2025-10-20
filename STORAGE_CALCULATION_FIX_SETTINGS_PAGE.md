# Storage Calculation Fix - Settings Page

## 🐛 **Issue Found**

The Settings page under the Subscription section was showing **incorrect storage usage** (showing 6 MB when actual usage was ~13.5 MB).

### Root Cause
The `calculateStorageUsed()` function in `src/utils/usageLimits.ts` was using the same problematic relationship query syntax that didn't work:

```typescript
// ❌ BEFORE - This wasn't working
const { data: propertyImages } = await supabase
  .from('property_images')
  .select(`
    image_size,
    properties!inner(owner_id)
  `)
  .eq('properties.owner_id', userId);
```

This query was failing silently, causing property images storage to be **completely ignored** in the calculation.

---

## ✅ **Fix Applied**

### Updated Function: `calculateStorageUsed()`
**File:** `src/utils/usageLimits.ts` (lines 139-194)

Changed to a **two-step approach**:

1. **First, get user's property IDs**:
```typescript
const { data: userProperties } = await supabase
  .from('properties')
  .select('id')
  .eq('owner_id', userId)
  .eq('active', 'Y');

const propertyIds = userProperties?.map(p => p.id) || [];
```

2. **Then, fetch images for those properties**:
```typescript
if (propertyIds.length > 0) {
  const { data: propertyImages } = await supabase
    .from('property_images')
    .select('image_size')
    .in('property_id', propertyIds);  // ✅ Works reliably
  
  const propertyImageStorageMB = propertyImages.reduce((acc, img) => {
    return acc + (img.image_size || 0) / (1024 * 1024);
  }, 0);
  totalStorageMB += propertyImageStorageMB;
}
```

3. **Calculate documents storage** (also added deleted filter):
```typescript
const { data: documents } = await supabase
  .from('documents')
  .select('file_size')
  .eq('uploaded_by', userId)
  .not('name', 'like', '[DELETED]%');  // ✅ Exclude deleted documents

const documentStorageMB = documents.reduce((acc, doc) => {
  return acc + (doc.file_size || 0) / (1024 * 1024);
}, 0);
totalStorageMB += documentStorageMB;
```

4. **Return rounded value**:
```typescript
return Math.round(totalStorageMB * 100) / 100; // Round to 2 decimal places
```

---

## 📊 **Expected Results**

### For Main User (deepagvwork@gmail.com):

| Category | Count | Storage |
|----------|-------|---------|
| **Documents** | 7 files | 7.86 MB |
| **Property Images** | 40 files | 5.63 MB |
| **TOTAL** | 47 files | **13.49 MB** |

### Before vs After:

| Location | Before | After |
|----------|--------|-------|
| **Settings Page** | 6 MB (❌ wrong) | **13.49 MB** (✅ correct) |
| **DocumentVault Page** | 0 MB (❌ wrong) | **13.49 MB** (✅ correct) |

---

## 🔄 **Where This Function Is Used**

The `calculateStorageUsed()` function is called from multiple places:

1. **Settings Page** - via `getUserSubscription()` → displays in subscription card
2. **Usage Stats** - via `getUserUsageStats()` → storage limits validation
3. **Storage Limit Check** - via `checkStorageLimit()` → before file uploads
4. **Plan Change** - via `changeSubscriptionPlan()` → validates downgrade feasibility

This fix ensures **consistent and accurate storage calculation** across the entire application.

---

## ✅ **Additional Improvements Made**

1. **Excluded deleted documents** from storage calculation
2. **Only counts active properties** (where `active = 'Y'`)
3. **Better error handling** with console logging
4. **More precise rounding** to 2 decimal places instead of ceiling

---

## 🧪 **Verification**

Verified calculation with SQL query:
```sql
-- Documents: 7 files, 7.86 MB
-- Images: 40 files, 5.63 MB
-- Total: 13.49 MB ✅
```

This matches the expected behavior and will now display correctly in the Settings page!

---

## 📝 **Files Modified**

1. ✅ `src/utils/usageLimits.ts` - Fixed `calculateStorageUsed()` function
2. ✅ `src/components/documents/DocumentVault.tsx` - Fixed storage calculation in summary tile
3. ✅ `src/utils/documentUpload.ts` - Added file_size to metadata
4. ✅ Database - Backfilled file_size for existing documents

---

**Generated:** October 20, 2025  
**Status:** ✅ Complete - All storage calculations now accurate across the application

