import React, { useState } from 'react';
import { NotificationGenerator } from '../../utils/notificationGenerator';
import { NotificationService } from '../../services/notificationService';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../webapp-ui/Button';

export const NotificationTest: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, fetchNotifications } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const generateTestNotifications = async () => {
    if (!user?.id) {
      setMessage('No user logged in');
      return;
    }

    try {
      setLoading(true);
      setMessage('Generating test notifications...');
      
      await NotificationGenerator.generateNotificationsForUser(user.id);
      
      setMessage('Test notifications generated successfully!');
      await fetchNotifications();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyNotifications = async () => {
    try {
      setLoading(true);
      setMessage('Generating daily notifications...');
      
      await NotificationGenerator.generateDailyNotifications();
      
      setMessage('Daily notifications generated successfully!');
      await fetchNotifications();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearAllNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setMessage('Clearing all notifications...');
      
      await NotificationService.clearAllNotifications(user.id);
      
      setMessage('All notifications cleared!');
      await fetchNotifications();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldNotifications = async () => {
    try {
      setLoading(true);
      setMessage('Cleaning up old notifications...');
      
      await NotificationGenerator.cleanupOldNotifications();
      
      setMessage('Old notifications cleaned up!');
      await fetchNotifications();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notification System Test</h1>
      
      {/* Current Status */}
      <div className="mb-6 p-4 glass rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Current Status</h2>
        <p>Total Notifications: {notifications.length}</p>
        <p>Unread Count: {unreadCount}</p>
        <p>User ID: {user?.id || 'Not logged in'}</p>
      </div>

      {/* Test Actions */}
      <div className="mb-6 space-y-4">
        <h2 className="text-lg font-semibold">Test Actions</h2>
        
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={generateTestNotifications}
            disabled={loading || !user?.id}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Generate Test Notifications
          </Button>
          
          <Button
            onClick={generateDailyNotifications}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            Generate Daily Notifications
          </Button>
          
          <Button
            onClick={clearAllNotifications}
            disabled={loading || !user?.id}
            className="bg-red-600 hover:bg-red-700"
          >
            Clear All Notifications
          </Button>
          
          <Button
            onClick={cleanupOldNotifications}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Cleanup Old Notifications
          </Button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className="mb-6 p-4 glass rounded-lg">
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Notifications List */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Current Notifications</h2>
        
        {notifications.length === 0 ? (
          <p className="text-gray-500">No notifications found</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const iconData = NotificationService.getNotificationIcon(notification.type);
              const timeAgo = NotificationService.formatNotificationTime(notification.created_at);
              
              return (
                <div
                  key={notification.id}
                  className={`p-4 glass rounded-lg ${
                    !notification.is_read ? 'border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconData.bgColor}`}>
                      <span className="text-sm">{iconData.icon}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{notification.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Type: {notification.type}</span>
                            <span>Priority: {notification.priority}</span>
                            <span>Status: {notification.is_read ? 'Read' : 'Unread'}</span>
                            <span>Time: {timeAgo}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 glass rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Test Instructions</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Generate Test Notifications" to create sample notifications for your user</li>
          <li>Check the notification bell in the dashboard to see the count and notifications</li>
          <li>Test marking notifications as read by clicking on them</li>
          <li>Test clearing individual notifications using the X button</li>
          <li>Test clearing all notifications using the "Clear All" button</li>
          <li>Use "Generate Daily Notifications" to test the full daily generation logic</li>
          <li>Use "Cleanup Old Notifications" to test the cleanup functionality</li>
        </ol>
      </div>
    </div>
  );
};
