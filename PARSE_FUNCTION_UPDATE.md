# Parse Function Update Required

## Issue
The `parse-bank-statement` Edge Function is only extracting 3 out of 5 valid credit transactions from the ICICI dummy CSV.

## Root Cause
The OpenAI prompt was:
1. Skipping transactions with 2025 dates (thinking they were "future")
2. Not being explicit enough about extracting ALL credit transactions

## Fix Applied
Updated the prompt in `supabase/functions/parse-bank-statement/index.ts`:

### Changes:
1. **Date handling**: Changed from "Do NOT include any future dates" to "Include ALL dates from the statement (past, present, or near-future)"
2. **2-digit year support**: Added explicit handling for DD/MM/YY format
3. **More explicit instructions**: Changed from "SKIP:" list to "INCLUDE:" and "SKIP ONLY:" lists
4. **Added emphasis**: "IMPORTANT: Extract EVERY credit transaction you find, even if amounts or dates seem unusual."

## How to Deploy

### Option 1: Via Supabase Dashboard
1. Go to [Edge Functions](https://supabase.com/dashboard/project/xsoyzbanlgxoijrweemz/functions)
2. Click on `parse-bank-statement`
3. Click "Deploy New Version"
4. Upload the file: `supabase/functions/parse-bank-statement/index.ts`
5. Deploy

### Option 2: Copy-paste the file content
The updated file is at: `/Users/mayankshah/Desktop/AIG8/Cursor/AIG8_Cursor copy 3/supabase/functions/parse-bank-statement/index.ts`

## Expected Result
After redeployment, uploading the ICICI dummy CSV should extract **5 transactions** instead of 3:
1. ✅ 26/10/25, 10000 (mayankshah0793@) - Currently missing
2. ✅ 14/11/24, 5000 (mayankshah0793) - Currently working
3. ✅ 22/12/24, 5200 (alokag28@kotak) - Currently working
4. ✅ 03/10/25, 350 (GARIMAGUPTA1137@OKHDFCBANK) - Currently missing
5. ✅ 22/12/24, 350 (solarflare@ibl) - Currently working

(Bank interest transactions on rows 15 & 16 should still be skipped correctly)

