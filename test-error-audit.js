// Test script to verify error handling and audit trail functionality
// This script will be run in the browser console to test the systems

console.log('🧪 Starting Error Handling and Audit Trail Test...');

// Test 1: Check if error handlers are initialized
console.log('✅ Test 1: Checking error handler initialization...');
if (window.onerror) {
  console.log('✅ Global error handler is set up');
} else {
  console.log('❌ Global error handler is NOT set up');
}

if (window.onunhandledrejection) {
  console.log('✅ Unhandled promise rejection handler is set up');
} else {
  console.log('❌ Unhandled promise rejection handler is NOT set up');
}

// Test 2: Trigger a JavaScript error to test error logging
console.log('✅ Test 2: Triggering JavaScript error...');
setTimeout(() => {
  try {
    // This will trigger an error
    const obj = null;
    obj.someProperty.nestedProperty;
  } catch (error) {
    console.log('✅ JavaScript error caught and should be logged to database');
  }
}, 1000);

// Test 3: Trigger an unhandled promise rejection
console.log('✅ Test 3: Triggering unhandled promise rejection...');
setTimeout(() => {
  Promise.reject(new Error('Test unhandled promise rejection'));
}, 2000);

// Test 4: Test audit trail by creating a test property (if user is logged in)
console.log('✅ Test 4: Testing audit trail...');
setTimeout(async () => {
  try {
    // Check if user is logged in
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    const supabase = createClient(
      'https://your-project.supabase.co', // Replace with actual URL
      'your-anon-key' // Replace with actual key
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log('✅ User is logged in, testing audit trail...');
      
      // Test property creation audit
      const testProperty = {
        name: 'Test Property for Audit',
        address: '123 Test Street',
        rent_amount: 50000,
        property_type: 'apartment'
      };
      
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .insert(testProperty)
        .select()
        .single();
      
      if (propertyData && !propertyError) {
        console.log('✅ Test property created, audit event should be logged');
        
        // Check if audit event was created
        const { data: auditData } = await supabase
          .from('audit_events')
          .select('*')
          .eq('entity_id', propertyData.id)
          .eq('type', 'property_created');
        
        if (auditData && auditData.length > 0) {
          console.log('✅ Audit event found in database:', auditData[0]);
        } else {
          console.log('❌ No audit event found in database');
        }
        
        // Clean up test property
        await supabase.from('properties').delete().eq('id', propertyData.id);
        console.log('✅ Test property cleaned up');
      } else {
        console.log('❌ Failed to create test property:', propertyError);
      }
    } else {
      console.log('⚠️ User not logged in, skipping audit trail test');
    }
  } catch (error) {
    console.log('❌ Error testing audit trail:', error);
  }
}, 3000);

// Test 5: Check error logs in database
console.log('✅ Test 5: Checking error logs in database...');
setTimeout(async () => {
  try {
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    const supabase = createClient(
      'https://your-project.supabase.co', // Replace with actual URL
      'your-anon-key' // Replace with actual key
    );
    
    const { data: errorLogs } = await supabase
      .from('error_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5);
    
    if (errorLogs && errorLogs.length > 0) {
      console.log('✅ Recent error logs found:', errorLogs);
    } else {
      console.log('⚠️ No error logs found in database');
    }
  } catch (error) {
    console.log('❌ Error checking error logs:', error);
  }
}, 4000);

// Test 6: Check audit events in database
console.log('✅ Test 6: Checking audit events in database...');
setTimeout(async () => {
  try {
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    const supabase = createClient(
      'https://your-project.supabase.co', // Replace with actual URL
      'your-anon-key' // Replace with actual key
    );
    
    const { data: auditEvents } = await supabase
      .from('audit_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5);
    
    if (auditEvents && auditEvents.length > 0) {
      console.log('✅ Recent audit events found:', auditEvents);
    } else {
      console.log('⚠️ No audit events found in database');
    }
  } catch (error) {
    console.log('❌ Error checking audit events:', error);
  }
}, 5000);

console.log('🧪 Test script completed. Check console for results...');
