// Test script to verify settings tables access
// Run this in browser console on the application

console.log('🧪 Testing Settings Tables Access...');

async function testSettingsTables() {
  try {
    // Check if Supabase client is available
    if (typeof window.supabase === 'undefined') {
      console.log('❌ Supabase client not found');
      return;
    }

    console.log('✅ Supabase client found');

    // Get current user
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    if (userError || !user) {
      console.log('❌ User not authenticated:', userError?.message);
      return;
    }

    console.log('✅ User authenticated:', user.email, 'ID:', user.id);

    // Test user_settings table
    console.log('🧪 Testing user_settings table...');
    const { data: userSettings, error: userSettingsError } = await window.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (userSettingsError) {
      console.log('❌ Error accessing user_settings table:', userSettingsError.message);
      console.log('Error details:', userSettingsError);
    } else {
      console.log('✅ user_settings table accessible');
      console.log('User settings:', userSettings);
    }

    // Test user_subscriptions table
    console.log('🧪 Testing user_subscriptions table...');
    const { data: userSubscriptions, error: userSubscriptionsError } = await window.supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (userSubscriptionsError) {
      console.log('❌ Error accessing user_subscriptions table:', userSubscriptionsError.message);
      console.log('Error details:', userSubscriptionsError);
    } else {
      console.log('✅ user_subscriptions table accessible');
      console.log('User subscription:', userSubscriptions);
    }

    // Test subscription_plans table (should be accessible to all authenticated users)
    console.log('🧪 Testing subscription_plans table...');
    const { data: subscriptionPlans, error: subscriptionPlansError } = await window.supabase
      .from('subscription_plans')
      .select('*')
      .limit(3);

    if (subscriptionPlansError) {
      console.log('❌ Error accessing subscription_plans table:', subscriptionPlansError.message);
      console.log('Error details:', subscriptionPlansError);
    } else {
      console.log('✅ subscription_plans table accessible');
      console.log('Available plans:', subscriptionPlans);
    }

    // Test billing_history table
    console.log('🧪 Testing billing_history table...');
    const { data: billingHistory, error: billingHistoryError } = await window.supabase
      .from('billing_history')
      .select('*')
      .eq('user_id', user.id)
      .limit(5);

    if (billingHistoryError) {
      console.log('❌ Error accessing billing_history table:', billingHistoryError.message);
      console.log('Error details:', billingHistoryError);
    } else {
      console.log('✅ billing_history table accessible');
      console.log('Billing history:', billingHistory);
    }

    // Test login_activity table
    console.log('🧪 Testing login_activity table...');
    const { data: loginActivity, error: loginActivityError } = await window.supabase
      .from('login_activity')
      .select('*')
      .eq('user_id', user.id)
      .limit(5);

    if (loginActivityError) {
      console.log('❌ Error accessing login_activity table:', loginActivityError.message);
      console.log('Error details:', loginActivityError);
    } else {
      console.log('✅ login_activity table accessible');
      console.log('Login activity:', loginActivity);
    }

    console.log('\n🎯 Test Summary:');
    console.log('- If you see 406 errors, the RLS policies need to be fixed');
    console.log('- If you see 404 errors, the tables might not exist');
    console.log('- If you see permission errors, check the GRANT statements');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSettingsTables();
