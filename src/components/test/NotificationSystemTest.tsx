import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { supabase } from '../../lib/supabase';

export const NotificationSystemTest: React.FC = () => {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    clearNotification,
    clearAllNotifications
  } = useNotifications();

  const [testResults, setTestResults] = useState<string[]>([]);
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  // Test 1: Check user authentication
  useEffect(() => {
    if (user) {
      addTestResult(`✅ User authenticated: ${user.email} (ID: ${user.id})`);
    } else {
      addTestResult('❌ No user authenticated');
    }
  }, [user]);

  // Test 2: Check database connection
  const testDatabaseConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .limit(5);
      
      if (error) {
        addTestResult(`❌ Database error: ${error.message}`);
      } else {
        addTestResult(`✅ Database connected. Found ${data?.length || 0} notifications`);
        setDbNotifications(data || []);
      }
    } catch (err: any) {
      addTestResult(`❌ Database connection failed: ${err.message}`);
    }
  };

  // Test 3: Check user-specific notifications
  const testUserNotifications = async () => {
    if (!user?.id) {
      addTestResult('❌ No user ID available for notification test');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        addTestResult(`❌ User notification query failed: ${error.message}`);
      } else {
        addTestResult(`✅ Found ${data?.length || 0} notifications for user ${user.id}`);
        if (data && data.length > 0) {
          addTestResult(`📋 Latest notification: ${data[0].title} - ${data[0].message}`);
        }
      }
    } catch (err: any) {
      addTestResult(`❌ User notification test failed: ${err.message}`);
    }
  };

  // Test 4: Manual notification generation
  const generateTestNotifications = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_daily_notifications');
      
      if (error) {
        addTestResult(`❌ Notification generation failed: ${error.message}`);
      } else {
        addTestResult('✅ Notification generation triggered successfully');
        // Refresh notifications
        setTimeout(() => {
          fetchNotifications();
          testUserNotifications();
        }, 1000);
      }
    } catch (err: any) {
      addTestResult(`❌ Notification generation error: ${err.message}`);
    }
  };

  // Test 5: Check hook functionality
  useEffect(() => {
    addTestResult(`🔔 Hook state - Notifications: ${notifications.length}, Unread: ${unreadCount}, Loading: ${loading}`);
    if (error) {
      addTestResult(`❌ Hook error: ${error}`);
    }
  }, [notifications, unreadCount, loading, error]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Notification System Test</h1>
        
        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={testDatabaseConnection}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test DB Connection
            </button>
            <button
              onClick={testUserNotifications}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Test User Notifications
            </button>
            <button
              onClick={generateTestNotifications}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              Generate Notifications
            </button>
            <button
              onClick={fetchNotifications}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >
              Refresh Hook
            </button>
          </div>
        </div>

        {/* Current State */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Current State</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Authentication</h3>
              <p><strong>User:</strong> {user?.email || 'Not authenticated'}</p>
              <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Notifications Hook</h3>
              <p><strong>Count:</strong> {notifications.length}</p>
              <p><strong>Unread:</strong> {unreadCount}</p>
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {error || 'None'}</p>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="bg-gray-100 p-4 rounded max-h-64 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No tests run yet. Click the test buttons above.</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Database Notifications */}
        {dbNotifications.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Database Notifications</h2>
            <div className="space-y-2">
              {dbNotifications.map((notification, index) => (
                <div key={index} className="border p-3 rounded">
                  <div className="font-semibold">{notification.title}</div>
                  <div className="text-sm text-gray-600">{notification.message}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
