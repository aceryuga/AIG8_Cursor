import { supabase } from '../lib/supabase';

/**
 * Test function to verify generate_daily_notifications() works
 * Call this from the browser console or a component
 */
export async function testGenerateNotifications() {
  console.log('🔍 Testing generate_daily_notifications() function...\n');
  
  try {
    // Get current notification count
    console.log('Step 1: Checking current notifications...');
    const { data: beforeNotifs, error: beforeError } = await supabase
      .from('notifications')
      .select('id, type, title, is_cleared, created_at')
      .eq('is_cleared', false)
      .order('created_at', { ascending: false });
    
    if (beforeError) {
      console.error('❌ Error fetching notifications:', beforeError.message);
      return { success: false, error: beforeError };
    }
    
    console.log(`✅ Found ${beforeNotifs?.length || 0} active notifications before generation\n`);
    
    // Call generate_daily_notifications function
    console.log('Step 2: Calling generate_daily_notifications()...');
    const startTime = Date.now();
    const { data: generateResult, error: generateError } = await supabase
      .rpc('generate_daily_notifications');
    
    const duration = Date.now() - startTime;
    
    if (generateError) {
      console.error('❌ Error calling function:', generateError.message);
      console.error('Full error:', generateError);
      return { success: false, error: generateError };
    }
    
    console.log(`✅ Function executed successfully! (${duration}ms)\n`);
    
    // Check notifications after generation
    console.log('Step 3: Checking notifications after generation...');
    const { data: afterNotifs, error: afterError } = await supabase
      .from('notifications')
      .select('id, type, title, message, is_cleared, is_read, created_at, generation_date')
      .eq('is_cleared', false)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (afterError) {
      console.error('❌ Error fetching notifications:', afterError.message);
      return { success: false, error: afterError };
    }
    
    const newNotifications = afterNotifs?.filter(n => 
      new Date(n.created_at).getTime() > startTime - 5000
    ) || [];
    
    console.log(`✅ Total active notifications: ${afterNotifs?.length || 0}`);
    console.log(`✅ New notifications generated: ${newNotifications.length}\n`);
    
    // Display recent notifications
    if (afterNotifs && afterNotifs.length > 0) {
      console.log('📋 Recent notifications (showing top 5):');
      afterNotifs.slice(0, 5).forEach((notif, index) => {
        const isNew = newNotifications.some(n => n.id === notif.id);
        console.log(`\n${index + 1}. ${notif.title} ${isNew ? '🆕' : ''}`);
        console.log(`   Type: ${notif.type}`);
        console.log(`   Message: ${notif.message}`);
        console.log(`   Created: ${new Date(notif.created_at).toLocaleString()}`);
        console.log(`   Generation Date: ${notif.generation_date}`);
        console.log(`   Status: ${notif.is_read ? 'Read' : 'Unread'}`);
      });
    } else {
      console.log('⚠️  No active notifications found.');
      console.log('\nPossible reasons:');
      console.log('  1. No properties/leases need notifications');
      console.log('  2. All notifications were cleared');
      console.log('  3. No conditions met for notification generation');
    }
    
    // Check properties and leases
    console.log('\n\nStep 4: Checking properties and leases...');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('⚠️  No user logged in');
      return { success: true, message: 'Function works but no user logged in to check data' };
    }
    
    console.log(`User: ${user.email}`);
    
    // Check properties
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, owner_id, active')
      .eq('owner_id', user.id)
      .eq('active', 'Y');
    
    if (!propError && properties) {
      console.log(`✅ Found ${properties.length} active properties for this user`);
    }
    
    // Check active leases
    const { data: leases, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        start_date,
        end_date,
        is_active,
        monthly_rent,
        properties!inner(id, name, owner_id)
      `)
      .eq('properties.owner_id', user.id)
      .eq('is_active', true);
    
    if (!leaseError && leases) {
      console.log(`✅ Found ${leases.length} active leases for this user`);
      
      if (leases.length > 0) {
        console.log('\nLease expiry analysis:');
        leases.forEach((lease, index) => {
          const endDate = new Date(lease.end_date);
          const daysUntilExpiry = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const propertyData = Array.isArray(lease.properties) ? lease.properties[0] : lease.properties;
          
          let status = '';
          if (daysUntilExpiry < 0) {
            status = '🚨 EXPIRED';
          } else if (daysUntilExpiry <= 15) {
            status = '⚠️  EXPIRING SOON';
          } else if (daysUntilExpiry <= 30) {
            status = '📅 Expiring within 30 days';
          } else {
            status = '✅ Active';
          }
          
          console.log(`${index + 1}. ${propertyData?.name || 'Unknown'} - ${status} (${daysUntilExpiry} days)`);
        });
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n💡 Tip: If you\'re not seeing notifications, check:');
    console.log('   1. Do you have properties with active leases?');
    console.log('   2. Are any leases expiring soon (within 15 days)?');
    console.log('   3. Is any rent overdue (>30 days since last payment)?');
    
    return {
      success: true,
      beforeCount: beforeNotifs?.length || 0,
      afterCount: afterNotifs?.length || 0,
      newCount: newNotifications.length,
      notifications: afterNotifs?.slice(0, 5) || []
    };
    
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).testGenerateNotifications = testGenerateNotifications;
  console.log('✅ testGenerateNotifications() is now available globally');
  console.log('   Run: window.testGenerateNotifications() or testGenerateNotifications()');
}

