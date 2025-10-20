import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { supabase } from '../../lib/supabase';
import { Bell, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const NotificationDebug: React.FC = () => {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications
  } = useNotifications();

  const [testResults, setTestResults] = useState<{
    test: string;
    status: 'pass' | 'fail' | 'info';
    message: string;
  }[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test: string, status: 'pass' | 'fail' | 'info', message: string) => {
    setTestResults(prev => [...prev, { test, status, message }]);
  };

  const runFullTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Check user authentication
    addResult('Authentication', user ? 'pass' : 'fail', 
      user ? `Authenticated as ${user.email} (ID: ${user.id})` : 'No user authenticated');

    if (!user) {
      setIsRunning(false);
      return;
    }

    // Test 2: Check database connection
    try {
      const { error: connError } = await supabase.from('notifications').select('id').limit(1);
      addResult('Database Connection', connError ? 'fail' : 'pass',
        connError ? `Connection failed: ${connError.message}` : 'Connected successfully');
    } catch (err: any) {
      addResult('Database Connection', 'fail', `Error: ${err.message}`);
    }

    // Test 3: Fetch notifications directly
    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_cleared', false)
        .order('created_at', { ascending: false });

      addResult('Direct Fetch', fetchError ? 'fail' : 'pass',
        fetchError 
          ? `Fetch failed: ${fetchError.message}` 
          : `Found ${data?.length || 0} notifications in database`);

      if (data && data.length > 0) {
        data.forEach((notif, index) => {
          addResult(`Notification ${index + 1}`, 'info',
            `${notif.type}: ${notif.title} - Read: ${notif.is_read}, Cleared: ${notif.is_cleared}`);
        });
      }
    } catch (err: any) {
      addResult('Direct Fetch', 'fail', `Error: ${err.message}`);
    }

    // Test 4: Check hook state
    addResult('useNotifications Hook', 'info',
      `Hook state - Count: ${notifications.length}, Unread: ${unreadCount}, Loading: ${loading}, Error: ${error || 'none'}`);

    // Test 5: Check RLS policies
    try {
      const { data: rlsData, error: rlsError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id);

      addResult('RLS Policies', rlsError ? 'fail' : 'pass',
        rlsError 
          ? `RLS blocked access: ${rlsError.message}` 
          : `RLS allows access to ${rlsData?.length || 0} notifications`);
    } catch (err: any) {
      addResult('RLS Policies', 'fail', `Error: ${err.message}`);
    }

    // Test 6: Test real-time subscription
    try {
      const testChannel = supabase
        .channel('test-notif-debug')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          addResult('Real-time Event', 'info', `Received: ${JSON.stringify(payload)}`);
        })
        .subscribe((status) => {
          addResult('Real-time Subscription', status === 'SUBSCRIBED' ? 'pass' : 'fail',
            `Status: ${status}`);
        });

      // Cleanup after 3 seconds
      setTimeout(() => {
        testChannel.unsubscribe();
      }, 3000);
    } catch (err: any) {
      addResult('Real-time Subscription', 'fail', `Error: ${err.message}`);
    }

    // Test 7: Check notification functions
    try {
      const { data, error: funcError } = await supabase.rpc('get_unread_notification_count', {
        user_uuid: user.id
      });
      
      addResult('Database Functions', funcError ? 'fail' : 'pass',
        funcError 
          ? `Function error: ${funcError.message}` 
          : `get_unread_notification_count returned: ${data}`);
    } catch (err: any) {
      addResult('Database Functions', 'fail', `Error: ${err.message}`);
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'info') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'info':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: 'pass' | 'fail' | 'info') => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h3 className="font-semibold">Notification Debug</h3>
          </div>
          <button
            onClick={runFullTest}
            disabled={isRunning}
            className="flex items-center gap-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run Tests'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">User</div>
            <div className="text-sm font-medium truncate">{user?.email || 'Not logged in'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Hook State</div>
            <div className="text-sm font-medium">
              {notifications.length} notifications ({unreadCount} unread)
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            Hook Error: {error}
          </div>
        )}
      </div>

      {/* Test Results */}
      <div className="overflow-y-auto max-h-[400px] p-4">
        {testResults.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Click "Run Tests" to start debugging</p>
          </div>
        ) : (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start gap-2">
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{result.test}</div>
                    <div className="text-xs text-gray-600 mt-1 break-words">
                      {result.message}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Debug tool for notification system • Check console for more details
      </div>
    </div>
  );
};

