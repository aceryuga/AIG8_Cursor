# Instant Refresh - Manual Testing Guide

## Quick Test (30 seconds)

### 1. Login and Refresh Dashboard
```bash
1. Open http://localhost:5173
2. Login with demo credentials
3. Wait for dashboard to load
4. Press F5 (or Cmd+R on Mac)
5. ✅ PASS: Dashboard reloads in < 1 second
6. ❌ FAIL: If you see loading spinner for > 1 second
```

### 2. Test Multiple Pages
```bash
Navigate to each page and refresh:
- Dashboard (http://localhost:5173/#/dashboard) → F5
- Properties (http://localhost:5173/#/properties) → F5
- Documents (http://localhost:5173/#/documents) → F5
- Settings (http://localhost:5173/#/settings) → F5

✅ PASS: All pages reload instantly
❌ FAIL: Any page shows loading spinner or logs out
```

### 3. Test Rapid Refreshes
```bash
1. Go to Dashboard
2. Press F5 five times rapidly (or Cmd+R)
3. ✅ PASS: All refreshes are instant, no timeouts
4. ❌ FAIL: User gets logged out or sees timeout warnings
```

## Detailed Test (5 minutes)

### Test 1: Normal Network Conditions
**Steps:**
1. Clear browser cache (Cmd+Shift+Delete)
2. Open http://localhost:5173
3. Login with demo credentials
4. Navigate to Dashboard
5. Open DevTools Console (F12)
6. Press F5 to refresh

**Expected Results:**
- ✅ Dashboard reloads in < 100ms
- ✅ No loading spinner visible
- ✅ Console shows no timeout warnings
- ✅ Console shows no errors (406/400 are OK, they're background)

**Console Output Should Look Like:**
```
Global error handlers initialized
(No timeout warnings)
(No auth errors)
```

### Test 2: Slow Network Simulation
**Steps:**
1. Open DevTools (F12)
2. Go to Network tab
3. Set throttling to "Slow 3G"
4. Refresh the page (F5)
5. Observe loading time

**Expected Results:**
- ✅ Page content appears instantly (from localStorage)
- ✅ Background data loads slower (expected)
- ✅ User stays logged in
- ✅ No timeout warnings

### Test 3: Offline Mode
**Steps:**
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Refresh the page (F5)

**Expected Results:**
- ✅ Dashboard still loads (from localStorage)
- ✅ User stays logged in
- ✅ Console may show network errors (expected)
- ✅ No forced logout

### Test 4: Session Persistence
**Steps:**
1. Login to the app
2. Navigate to http://localhost:5173/#/properties
3. Copy the URL
4. Close the browser tab (don't logout)
5. Open a new tab
6. Paste the URL and press Enter

**Expected Results:**
- ✅ Page loads instantly
- ✅ User is still logged in
- ✅ Properties page displays correctly
- ❌ FAIL: If redirected to login

### Test 5: Deep Link Refresh
**Steps:**
1. Login to the app
2. Navigate to a specific property detail page
3. Note the URL (e.g., http://localhost:5173/#/properties/abc-123)
4. Refresh the page (F5)

**Expected Results:**
- ✅ Property detail page reloads instantly
- ✅ User stays logged in
- ✅ Property data displays correctly

### Test 6: Multiple Tabs
**Steps:**
1. Login to the app
2. Open Dashboard in Tab 1
3. Open Properties in Tab 2
4. Open Documents in Tab 3
5. Refresh each tab one by one

**Expected Results:**
- ✅ All tabs reload instantly
- ✅ User stays logged in across all tabs
- ✅ Each page shows correct content

## Console Check

### Good Console Output (After Refresh)
```
Global error handlers initialized
Failed to fetch user profile from database: ... (OK - non-blocking)
```

### Bad Console Output (Should NOT See)
```
❌ Auth initialization timeout after 10s - forcing loading to false
❌ Session error: ...
❌ Failed to initialize auth: ...
❌ Clearing user state
```

## Performance Metrics

### Expected Timings (Check in DevTools Network Tab)
- **getSession()**: < 10ms
- **React render**: < 50ms
- **Total page load**: < 100ms
- **Background DB fetch**: 100-500ms (non-blocking)

### How to Measure
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Refresh page (F5)
5. Stop recording
6. Check "Main" thread for timing

## Common Issues and Solutions

### Issue: "Loading..." spinner visible for > 1 second
**Diagnosis**: Auth initialization blocking
**Fix**: Check that `setLoading(false)` is called immediately after `setUser()`

### Issue: User gets logged out on refresh
**Diagnosis**: Session error or timeout
**Fix**: Check console for error messages, ensure localStorage is not cleared

### Issue: Console shows timeout warnings
**Diagnosis**: Timeout mechanism still active
**Fix**: Ensure timeout was removed from useAuth.ts

### Issue: 406/400 errors in console
**Diagnosis**: Background API calls (notifications, trial check)
**Status**: EXPECTED - These are non-blocking and don't affect functionality

## Success Criteria

✅ All tests pass  
✅ Page refresh is instant (< 100ms)  
✅ No timeout warnings in console  
✅ User never gets logged out unexpectedly  
✅ Works on slow network (background data loads later)  
✅ Works offline (shows cached data)  

## Report Results

After testing, report:
1. ✅ or ❌ for each test
2. Any console errors
3. Measured load times (if possible)
4. Any unexpected behavior

---

**Testing Date**: ___________  
**Tester**: ___________  
**Browser**: ___________  
**Overall Result**: PASS / FAIL  

