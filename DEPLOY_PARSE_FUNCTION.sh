#!/bin/bash

# Deploy parse-bank-statement Edge Function
# This script deploys the updated function with the refined prompt

echo "🚀 Deploying parse-bank-statement Edge Function..."
echo ""

cd "/Users/mayankshah/Desktop/AIG8/Cursor/AIG8_Cursor copy 3"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Deploy the function
echo "📦 Deploying to Supabase..."
supabase functions deploy parse-bank-statement --project-ref xsoyzbanlgxoijrweemz

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 What changed:"
    echo "   - Refined OpenAI prompt for better accuracy"
    echo "   - Explicitly allows 2025 dates (no longer filtered as 'future')"
    echo "   - Better reference number handling (preserves leading zeros)"
    echo "   - More explicit about skipping interest credits"
    echo "   - Improved validation (warns instead of errors for future dates)"
    echo ""
    echo "🧪 Next steps:"
    echo "   1. Upload the ICICI dummy CSV again"
    echo "   2. Should now extract 5 transactions (not 3)"
    echo "   3. Check reconciliation results"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "🔧 Manual deployment option:"
    echo "   1. Go to: https://supabase.com/dashboard/project/xsoyzbanlgxoijrweemz/functions"
    echo "   2. Click on 'parse-bank-statement'"
    echo "   3. Click 'Deploy New Version'"
    echo "   4. Upload: supabase/functions/parse-bank-statement/index.ts"
    exit 1
fi

