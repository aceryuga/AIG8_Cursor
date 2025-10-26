import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('🔄 Starting daily notification generation...');
    console.log('⏰ Time:', new Date().toISOString());

    // Call the generate_daily_notifications database function
    const { data, error } = await supabase.rpc('generate_daily_notifications');

    if (error) {
      console.error('❌ Error generating notifications:', error);
      throw error;
    }

    console.log('✅ Daily notification generation completed successfully');

    // Optional: Also run cleanup for old notifications (once per week)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0) { // Sunday
      console.log('🧹 Running weekly notification cleanup...');
      const { error: cleanupError } = await supabase.rpc('cleanup_old_notifications');
      
      if (cleanupError) {
        console.error('❌ Error cleaning up notifications:', cleanupError);
      } else {
        console.log('✅ Notification cleanup completed');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily notifications generated successfully',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in notification generation:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

