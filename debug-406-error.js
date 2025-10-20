// Comprehensive debugging script for 406 errors
// Run this in browser console on the application

console.log('🔍 Debugging 406 Error - Comprehensive Analysis...');

async function debug406Error() {
  try {
    // Check if Supabase client is available
    if (typeof window.supabase === 'undefined') {
      console.log('❌ Supabase client not found');
      return;
    }

    console.log('✅ Supabase client found');

    // Get current user and session
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
    
    if (userError || !user) {
      console.log('❌ User not authenticated:', userError?.message);
      return;
    }

    console.log('✅ User authenticated:', user.email);
    console.log('✅ User ID:', user.id);
    console.log('✅ Session exists:', !!session);
    console.log('✅ Access token exists:', !!session?.access_token);

    // Test 1: Check if user_subscriptions table exists and is accessible
    console.log('\n🧪 Test 1: Basic table access');
    const { data: basicTest, error: basicError } = await window.supabase
      .from('user_subscriptions')
      .select('count')
      .limit(1);

    if (basicError) {
      console.log('❌ Basic table access failed:', basicError.message);
      console.log('Error code:', basicError.code);
      console.log('Error details:', basicError);
    } else {
      console.log('✅ Basic table access works');
    }

    // Test 2: Check RLS policies
    console.log('\n🧪 Test 2: RLS Policy Test');
    const { data: rlsTest, error: rlsError } = await window.supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    if (rlsError) {
      console.log('❌ RLS policy test failed:', rlsError.message);
      console.log('Error code:', rlsError.code);
      console.log('Error details:', rlsError);
    } else {
      console.log('✅ RLS policy test works');
      console.log('Found records:', rlsTest?.length || 0);
    }

    // Test 3: Check the exact query that's failing
    console.log('\n🧪 Test 3: Exact failing query');
    const { data: exactTest, error: exactError } = await window.supabase
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (exactError) {
      console.log('❌ Exact query failed:', exactError.message);
      console.log('Error code:', exactError.code);
      console.log('Error details:', exactError);
      
      // Check if it's a "no rows" error (which is expected if user has no active subscription)
      if (exactError.code === 'PGRST116') {
        console.log('ℹ️ This is expected - user has no active subscription');
      }
    } else {
      console.log('✅ Exact query works');
      console.log('User subscription:', exactTest);
    }

    // Test 4: Check subscription_plans table
    console.log('\n🧪 Test 4: Subscription plans table');
    const { data: plansTest, error: plansError } = await window.supabase
      .from('subscription_plans')
      .select('*')
      .limit(3);

    if (plansError) {
      console.log('❌ Subscription plans access failed:', plansError.message);
      console.log('Error code:', plansError.code);
      console.log('Error details:', plansError);
    } else {
      console.log('✅ Subscription plans access works');
      console.log('Available plans:', plansTest?.length || 0);
    }

    // Test 5: Check user_settings table
    console.log('\n🧪 Test 5: User settings table');
    const { data: settingsTest, error: settingsError } = await window.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settingsError) {
      console.log('❌ User settings access failed:', settingsError.message);
      console.log('Error code:', settingsError.code);
      console.log('Error details:', settingsError);
    } else {
      console.log('✅ User settings access works');
      console.log('User settings:', settingsTest);
    }

    // Test 6: Check if user has any data in user_subscriptions
    console.log('\n🧪 Test 6: Check user subscription data');
    const { data: allSubs, error: allSubsError } = await window.supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    if (allSubsError) {
      console.log('❌ Failed to check user subscriptions:', allSubsError.message);
    } else {
      console.log('✅ User has', allSubs?.length || 0, 'subscription records');
      if (allSubs && allSubs.length > 0) {
        console.log('Subscription statuses:', allSubs.map(s => s.status));
      }
    }

    // Summary
    console.log('\n📊 Debug Summary:');
    console.log('- User authenticated:', !!user);
    console.log('- Session valid:', !!session);
    console.log('- Basic table access:', !basicError);
    console.log('- RLS policies working:', !rlsError);
    console.log('- Exact query working:', !exactError || exactError.code === 'PGRST116');
    console.log('- Subscription plans accessible:', !plansError);
    console.log('- User settings accessible:', !settingsError);

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (basicError) {
      console.log('❌ Table access issue - check if tables exist and RLS is enabled');
    }
    if (rlsError) {
      console.log('❌ RLS policy issue - check policies are correctly set up');
    }
    if (exactError && exactError.code !== 'PGRST116') {
      console.log('❌ Query issue - check the specific query syntax');
    }
    if (exactError && exactError.code === 'PGRST116') {
      console.log('ℹ️ User has no active subscription - this is normal for new users');
    }
    if (!plansError && !settingsError && !rlsError) {
      console.log('✅ All tests passed - the 406 error might be intermittent or resolved');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debug406Error();
