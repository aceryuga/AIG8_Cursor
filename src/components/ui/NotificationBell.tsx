import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Trash2, MoreHorizontal } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationService } from '../../services/notificationService';

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  };

  const handleClearNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await clearNotification(notificationId);
  };

  const handleClearAll = async () => {
    await clearAllNotifications();
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 glass rounded-lg hover:bg-white hover:bg-opacity-10 transition-all duration-200"
        disabled={loading}
      >
        <Bell size={18} className="text-glass" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 glass-card rounded-xl p-4 z-[9999] max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-glass">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  title="Mark all as read"
                >
                  <Check size={14} className="text-glass-muted" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  title="Clear all"
                >
                  <Trash2 size={14} className="text-glass-muted" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <X size={16} className="text-glass-muted" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-glass"></div>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4">
                <Bell size={24} className="text-glass-muted mx-auto mb-2" />
                <p className="text-sm text-glass-muted">No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => {
                const iconData = NotificationService.getNotificationIcon(notification.type);
                const timeAgo = NotificationService.formatNotificationTime(notification.created_at);
                
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 glass rounded-lg cursor-pointer transition-all duration-200 hover:bg-white hover:bg-opacity-10 ${
                      !notification.is_read ? 'border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconData.bgColor} flex-shrink-0`}>
                        <span className="text-sm">{iconData.icon}</span>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-glass truncate">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-glass-muted mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={(e) => handleClearNotification(e, notification.id)}
                              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors opacity-0 group-hover:opacity-100"
                              title="Clear notification"
                            >
                              <X size={12} className="text-glass-muted" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Time and Status */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-glass-muted">{timeAgo}</span>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="mt-3 pt-3 border-t border-glass-muted border-opacity-20">
              <p className="text-xs text-glass-muted text-center">
                Showing 10 of {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
