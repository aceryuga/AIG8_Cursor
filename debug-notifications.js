// Debug script to test notification system
// Run this in browser console to debug notification issues

console.log('🔍 Debugging Notification System...');

async function debugNotifications() {
  try {
    // Check if Supabase is available
    if (typeof window.supabase === 'undefined') {
      console.log('❌ Supabase client not found');
      return;
    }

    console.log('✅ Supabase client found');

    // Check current user
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    if (userError) {
      console.log('❌ User error:', userError.message);
      return;
    }

    if (!user) {
      console.log('❌ No user authenticated');
      return;
    }

    console.log('✅ User authenticated:', user.email, 'ID:', user.id);

    // Test 1: Check notifications table exists
    console.log('🧪 Testing notifications table...');
    const { data: notifications, error: notificationsError } = await window.supabase
      .from('notifications')
      .select('*')
      .limit(1);

    if (notificationsError) {
      console.log('❌ Notifications table error:', notificationsError.message);
      console.log('Error details:', notificationsError);
    } else {
      console.log('✅ Notifications table accessible');
    }

    // Test 2: Check user-specific notifications
    console.log('🧪 Testing user notifications...');
    const { data: userNotifications, error: userNotificationsError } = await window.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .limit(5);

    if (userNotificationsError) {
      console.log('❌ User notifications error:', userNotificationsError.message);
    } else {
      console.log('✅ User notifications query successful. Found:', userNotifications?.length || 0);
    }

    // Test 3: Check database functions
    console.log('🧪 Testing database functions...');
    
    // Test mark_notification_read function
    try {
      const { data: markReadResult, error: markReadError } = await window.supabase
        .rpc('mark_notification_read', {
          notification_uuid: '00000000-0000-0000-0000-000000000000', // dummy UUID
          user_uuid: user.id
        });
      
      if (markReadError) {
        console.log('❌ mark_notification_read function error:', markReadError.message);
      } else {
        console.log('✅ mark_notification_read function exists');
      }
    } catch (err) {
      console.log('❌ mark_notification_read function test failed:', err.message);
    }

    // Test clear_notification function
    try {
      const { data: clearResult, error: clearError } = await window.supabase
        .rpc('clear_notification', {
          notification_uuid: '00000000-0000-0000-0000-000000000000', // dummy UUID
          user_uuid: user.id
        });
      
      if (clearError) {
        console.log('❌ clear_notification function error:', clearError.message);
      } else {
        console.log('✅ clear_notification function exists');
      }
    } catch (err) {
      console.log('❌ clear_notification function test failed:', err.message);
    }

    // Test generate_daily_notifications function
    try {
      const { data: generateResult, error: generateError } = await window.supabase
        .rpc('generate_daily_notifications');
      
      if (generateError) {
        console.log('❌ generate_daily_notifications function error:', generateError.message);
      } else {
        console.log('✅ generate_daily_notifications function exists');
      }
    } catch (err) {
      console.log('❌ generate_daily_notifications function test failed:', err.message);
    }

    // Test 4: Check RLS policies
    console.log('🧪 Testing RLS policies...');
    const { data: rlsTest, error: rlsError } = await window.supabase
      .from('notifications')
      .select('id, user_id, type, title')
      .eq('user_id', user.id);

    if (rlsError) {
      console.log('❌ RLS policy error:', rlsError.message);
    } else {
      console.log('✅ RLS policies working correctly');
    }

    console.log('🔍 Debug completed. Check results above.');

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug function
debugNotifications();
