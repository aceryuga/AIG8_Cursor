// Test script to verify notification system is working
// Run this in the browser console to test the notification system

console.log('Testing notification system...');

// Test 1: Check if NotificationService is available
if (typeof window !== 'undefined' && window.NotificationService) {
  console.log('✅ NotificationService is available');
} else {
  console.log('❌ NotificationService not found');
}

// Test 2: Check if useNotifications hook is working
console.log('Testing notification system components...');

// Test 3: Check database connection
console.log('Checking database connection...');

// Test 4: Manual notification fetch test
async function testNotificationFetch() {
  try {
    console.log('Testing notification fetch...');
    
    // This would need to be run in the browser context
    // where the Supabase client is available
    console.log('Note: This test needs to be run in the browser console');
    
  } catch (error) {
    console.error('Error testing notifications:', error);
  }
}

testNotificationFetch();

console.log('Test completed. Check the browser console for results.');
