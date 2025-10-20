// Test script to verify database connection and table access
// Run this in browser console on the application

console.log('🧪 Testing Database Connection and Tables...');

async function testDatabaseConnection() {
  try {
    // Check if Supabase client is available
    if (typeof window.supabase === 'undefined') {
      console.log('❌ Supabase client not found');
      return;
    }

    console.log('✅ Supabase client found');

    // Test error_logs table
    console.log('🧪 Testing error_logs table...');
    const { data: errorLogs, error: errorLogsError } = await window.supabase
      .from('error_logs')
      .select('*')
      .limit(1);

    if (errorLogsError) {
      console.log('❌ Error accessing error_logs table:', errorLogsError.message);
    } else {
      console.log('✅ error_logs table accessible');
    }

    // Test audit_events table
    console.log('🧪 Testing audit_events table...');
    const { data: auditEvents, error: auditEventsError } = await window.supabase
      .from('audit_events')
      .select('*')
      .limit(1);

    if (auditEventsError) {
      console.log('❌ Error accessing audit_events table:', auditEventsError.message);
    } else {
      console.log('✅ audit_events table accessible');
    }

    // Test properties table
    console.log('🧪 Testing properties table...');
    const { data: properties, error: propertiesError } = await window.supabase
      .from('properties')
      .select('*')
      .limit(1);

    if (propertiesError) {
      console.log('❌ Error accessing properties table:', propertiesError.message);
    } else {
      console.log('✅ properties table accessible');
    }

    // Test payments table
    console.log('🧪 Testing payments table...');
    const { data: payments, error: paymentsError } = await window.supabase
      .from('payments')
      .select('*')
      .limit(1);

    if (paymentsError) {
      console.log('❌ Error accessing payments table:', paymentsError.message);
    } else {
      console.log('✅ payments table accessible');
    }

    // Check current user
    const { data: { user } } = await window.supabase.auth.getUser();
    if (user) {
      console.log('✅ User authenticated:', user.email);
    } else {
      console.log('⚠️ No user authenticated');
    }

    console.log('🧪 Database connection test completed');

  } catch (error) {
    console.log('❌ Error testing database connection:', error);
  }
}

// Run the test
testDatabaseConnection();
