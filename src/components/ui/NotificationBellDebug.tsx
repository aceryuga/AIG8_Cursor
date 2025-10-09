import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2, MoreHorizontal } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';

interface NotificationBellDebugProps {
  className?: string;
}

export const NotificationBellDebug: React.FC<NotificationBellDebugProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    clearNotification,
    clearAllNotifications,
    markAllAsRead
  } = useNotifications();

  // Debug logging
  useEffect(() => {
    console.log('🔔 NotificationBell Debug Info:');
    console.log('User:', user);
    console.log('Notifications:', notifications);
    console.log('Unread Count:', unreadCount);
    console.log('Loading:', loading);
    console.log('Error:', error);
  }, [user, notifications, unreadCount, loading, error]);

  const handleNotificationClick = async (notification: any) => {
    console.log('🔔 Clicking notification:', notification);
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  };

  const handleClearNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    console.log('🔔 Clearing notification:', notificationId);
    await clearNotification(notificationId);
  };

  const handleClearAll = async () => {
    console.log('🔔 Clearing all notifications');
    await clearAllNotifications();
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    console.log('🔔 Marking all as read');
    await markAllAsRead();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Debug Info */}
      <div className="absolute -top-20 left-0 bg-black text-white text-xs p-2 rounded z-50">
        <div>User: {user?.id || 'No user'}</div>
        <div>Notifications: {notifications.length}</div>
        <div>Unread: {unreadCount}</div>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Error: {error || 'None'}</div>
      </div>

      {/* Bell Icon with Badge */}
      <button
        onClick={() => {
          console.log('🔔 Bell clicked, opening:', !isOpen);
          setIsOpen(!isOpen);
        }}
        className="relative p-2 glass rounded-lg hover:bg-white hover:bg-opacity-10 transition-all duration-200"
        disabled={loading}
      >
        <Bell size={20} className="text-glass" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 glass-card rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-glass-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-glass">Notifications</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-500 hover:text-blue-700"
                >
                  Mark All Read
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-glass-muted">
                Loading notifications...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">
                Error: {error}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-glass-muted">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 border-b border-glass-border hover:bg-white hover:bg-opacity-5 cursor-pointer ${
                    !notification.is_read ? 'bg-blue-500 bg-opacity-10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-glass text-sm">
                        {notification.title}
                      </div>
                      <div className="text-xs text-glass-muted mt-1">
                        {notification.message}
                      </div>
                      <div className="text-xs text-glass-muted mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                      )}
                      <button
                        onClick={(e) => handleClearNotification(e, notification.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
