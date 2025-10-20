// Simple test to verify error handling and audit trail
// Run this in browser console on the application

console.log('🧪 Simple Error and Audit Test');

// Test 1: Check if error handlers are set up
console.log('✅ Checking error handlers...');
console.log('Global error handler:', typeof window.onerror);
console.log('Unhandled rejection handler:', typeof window.onunhandledrejection);

// Test 2: Trigger a simple error
console.log('✅ Triggering test error...');
setTimeout(() => {
  try {
    throw new Error('Test error for error logging');
  } catch (e) {
    console.log('Error caught:', e.message);
  }
}, 1000);

// Test 3: Check if we can access Supabase
console.log('✅ Checking Supabase access...');
setTimeout(() => {
  if (window.supabase) {
    console.log('✅ Supabase client found');
  } else {
    console.log('❌ Supabase client not found');
  }
}, 2000);

console.log('🧪 Test completed. Check console for results.');
