#!/bin/bash

# Edge Function Deployment Script
# This script deploys the delete-user Edge Function to Supabase

echo "🚀 Deploying delete-user Edge Function to Supabase..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI is not installed."
    echo ""
    echo "Install it using:"
    echo "  macOS:   brew install supabase/tap/supabase"
    echo "  Windows: scoop install supabase"
    echo "  Linux:   brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null
then
    echo "❌ Not logged in to Supabase"
    echo ""
    echo "Please run: supabase login"
    echo ""
    exit 1
fi

echo "✅ Authenticated"
echo ""

# Check if project is linked
echo "🔗 Checking project link..."
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Project not linked"
    echo ""
    read -p "Would you like to link the project now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        echo "Linking project..."
        supabase link --project-ref rgehlcjvbuxsefkebaof
    else
        echo "❌ Cannot deploy without project link"
        echo "Run: supabase link --project-ref rgehlcjvbuxsefkebaof"
        exit 1
    fi
fi

echo "✅ Project linked"
echo ""

# Deploy the function
echo "📦 Deploying delete-user function..."
echo ""

if supabase functions deploy delete-user; then
    echo ""
    echo "✅ Edge Function deployed successfully!"
    echo ""
    echo "📊 Function Details:"
    echo "   Name: delete-user"
    echo "   URL:  https://rgehlcjvbuxsefkebaof.supabase.co/functions/v1/delete-user"
    echo ""
    echo "🎉 Next Steps:"
    echo "   1. Test account deletion with a test user"
    echo "   2. Check console logs for 'Auth user deleted successfully'"
    echo "   3. Try signing up again with the same email"
    echo ""
    echo "📝 View logs:"
    echo "   supabase functions logs delete-user"
    echo ""
else
    echo ""
    echo "❌ Deployment failed"
    echo ""
    echo "Troubleshooting:"
    echo "   - Check your internet connection"
    echo "   - Verify project ID is correct"
    echo "   - Ensure you have permissions"
    echo ""
    exit 1
fi

