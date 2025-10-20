# 🚀 Edge Function Deployment Guide

## Complete Auth User Deletion via Supabase Edge Function

This guide explains how to deploy the `delete-user` Edge Function to enable complete account deletion, including auth users.

---

## 📋 **What This Solves**

### **Problem:**
When users delete their account, the client-side code can delete all data from the database and storage, but **cannot delete the auth user** because it requires admin privileges.

**Result:** User is stuck - cannot login (data deleted) and cannot signup again (auth user exists).

### **Solution:**
Deploy a Supabase Edge Function that:
1. Verifies user authentication
2. Uses service role key to delete auth user
3. Allows users to sign up again with the same email

---

## 🛠️ **Prerequisites**

### **1. Install Supabase CLI**

```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase
```

### **2. Verify Installation**

```bash
supabase --version
```

---

## 📦 **Deployment Steps**

### **Step 1: Login to Supabase**

```bash
supabase login
```

This will open your browser to authenticate with your Supabase account.

### **Step 2: Link Your Project**

```bash
cd "/Users/mayankshah/Desktop/AIG8/Cursor/AIG8_Cursor copy 3"
supabase link --project-ref rgehlcjvbuxsefkebaof
```

You'll be prompted to enter your database password.

### **Step 3: Deploy the Edge Function**

```bash
supabase functions deploy delete-user
```

**Expected Output:**
```
Deploying Function delete-user...
Function delete-user deployed successfully
Function URL: https://rgehlcjvbuxsefkebaof.supabase.co/functions/v1/delete-user
```

### **Step 4: Verify Deployment**

Go to your Supabase Dashboard:
1. Navigate to **Edge Functions** section
2. You should see `delete-user` listed
3. Status should be "Active"

---

## 🧪 **Testing the Edge Function**

### **Test 1: Local Testing (Optional)**

Start the function locally:

```bash
supabase functions serve delete-user
```

Test with curl:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/delete-user' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN_HERE' \
  --header 'Content-Type: application/json' \
  --data '{"userId":"USER_ID_HERE"}'
```

### **Test 2: Production Testing**

1. **Create a test account** in your app
2. **Login with the test account**
3. **Go to Settings > Profile Information**
4. **Click "Delete My Account"**
5. **Confirm deletion**

**Check console logs:**
```
Calling delete-user Edge Function...
Auth user deleted successfully via Edge Function
User data purge completed successfully
```

6. **Try to sign up again** with the same email
   - ✅ Should work! (Creates new account)
   - ❌ Before: Would show "User already registered" error

---

## 🔍 **Verification**

### **Check Supabase Dashboard:**

1. **Auth Users:**
   - Go to Authentication > Users
   - The deleted user should NOT appear

2. **Database:**
   - Go to Table Editor > `public.users`
   - No record for deleted user

3. **Storage:**
   - Go to Storage
   - No files for deleted user

### **Check Application Logs:**

After deletion, you should see:
```
Starting user data purge for user: [USER_ID]
Deleting user storage files...
Storage files deletion completed
Deleting user database records...
Found X properties to delete
Deleted rent_cycles
Deleted payments
...
Deleted user record
Database records deletion completed
Calling delete-user Edge Function...
Auth user deleted successfully via Edge Function
User data purge completed successfully
```

---

## 🔒 **Security Features**

The Edge Function includes multiple security layers:

1. **Authentication Required:**
   - Must have valid JWT token
   - Token verified via `getUser()`

2. **Authorization Check:**
   - Users can only delete their own account
   - `user.id` must match `userId` in request

3. **Service Role Key:**
   - Only used server-side in Edge Function
   - Never exposed to client

4. **CORS Headers:**
   - Properly configured for web requests
   - Handles preflight OPTIONS requests

---

## 📊 **Flow Diagram**

```
User clicks "Delete Account"
         ↓
SettingsPage.handleDeleteAccount()
         ↓
purgeUserData(userId)
         ↓
1. deleteUserStorageFiles()
   → Removes all files from buckets
         ↓
2. deleteUserDatabaseRecords()
   → Deletes from all tables (17 steps)
         ↓
3. supabase.functions.invoke('delete-user')
   → Calls Edge Function
         ↓
Edge Function:
   - Verify JWT token ✓
   - Check user.id === userId ✓
   - Use service role key ✓
   - Delete from auth.users ✓
         ↓
User logged out & redirected to login
         ↓
✅ User can sign up again with same email!
```

---

## 🐛 **Troubleshooting**

### **Error: "Function not found"**

**Problem:** Edge Function not deployed  
**Solution:** Run `supabase functions deploy delete-user`

### **Error: "Missing authorization header"**

**Problem:** User not authenticated  
**Solution:** Ensure user is logged in before calling function

### **Error: "Unauthorized: You can only delete your own account"**

**Problem:** userId mismatch  
**Solution:** Check that `userId` parameter matches authenticated user's ID

### **Error: "Invalid or expired token"**

**Problem:** JWT token expired  
**Solution:** User needs to re-login

### **Edge Function times out**

**Problem:** Database deletion taking too long  
**Solution:** This is expected for users with lots of data. The function will retry.

---

## 📝 **Environment Variables**

The Edge Function automatically has access to:

- `SUPABASE_URL` - Your project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (automatically injected)

**No manual configuration needed!**

---

## 🔄 **Update/Redeploy**

If you make changes to the Edge Function:

```bash
# Redeploy
supabase functions deploy delete-user

# Or deploy with custom region
supabase functions deploy delete-user --region us-west-1
```

---

## 📦 **Files Created**

```
supabase/
├── config.toml
└── functions/
    └── delete-user/
        ├── index.ts          # Main function code
        └── README.md         # Function documentation
```

**Updated:**
```
src/utils/accountDeletion.ts  # Now calls Edge Function
```

---

## ✅ **Success Criteria**

After deployment, users should be able to:

1. ✅ Delete their account completely
2. ✅ Have all data removed (database + storage)
3. ✅ Have auth user deleted from `auth.users`
4. ✅ Sign up again with the same email
5. ✅ Start fresh with no previous data

---

## 🎯 **Next Steps**

1. **Deploy the Edge Function** using steps above
2. **Test with a test account**
3. **Verify complete deletion** in Supabase dashboard
4. **Try signing up again** with same email
5. **Monitor logs** for any errors

---

## 📞 **Support**

If you encounter issues:

1. Check Supabase Edge Function logs in dashboard
2. Check browser console for client-side errors
3. Verify JWT token is valid
4. Ensure project is properly linked

---

## 🎉 **Success!**

Once deployed, your account deletion feature will be **100% complete**:
- ✅ Client-side data deletion
- ✅ Server-side auth deletion
- ✅ Users can re-register
- ✅ Production ready!

**Deploy now and complete the implementation!** 🚀

