# ⚡ Quick Deploy - Edge Function

## 🚀 Deploy in 3 Steps

### **Step 1: Install Supabase CLI (if needed)**
```bash
brew install supabase/tap/supabase
```

### **Step 2: Run Deploy Script**
```bash
cd "/Users/mayankshah/Desktop/AIG8/Cursor/AIG8_Cursor copy 3"
./deploy-edge-function.sh
```

### **Step 3: Test**
1. Create test account
2. Delete account (Settings > Profile)
3. Check logs for "Auth user deleted successfully"
4. Sign up again with same email ✅

---

## 🎯 That's It!

**Expected Result:**
- ✅ Edge Function deployed
- ✅ Account deletion works completely
- ✅ Users can re-register

---

## 📝 Manual Commands (if script fails)

```bash
# Login
supabase login

# Link project
supabase link --project-ref rgehlcjvbuxsefkebaof

# Deploy
supabase functions deploy delete-user
```

---

## ✅ Success Check

After deleting test account, you should see:
```
✅ Deleted rent_cycles
✅ Deleted payments
✅ Deleted leases
✅ Deleted properties
✅ Calling delete-user Edge Function...
✅ Auth user deleted successfully via Edge Function
✅ User data purge completed successfully
```

Then try signing up with same email - **it should work!**

---

## 📚 Full Documentation

See `EDGE_FUNCTION_DEPLOYMENT_GUIDE.md` for complete details.

