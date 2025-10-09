import { useState, useEffect, useCallback } from 'react';
import { NotificationService, Notification, NotificationCount } from '../services/notificationService';
import { useAuth } from './useAuth';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const [notificationsData, countData] = await Promise.all([
        NotificationService.getNotifications(user.id, 50),
        NotificationService.getNotificationCount(user.id)
      ]);

      setNotifications(notificationsData);
      setUnreadCount(countData.unread);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const success = await NotificationService.markAsRead(notificationId, user.id);
      
      if (success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true, read_at: new Date().toISOString() }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      setError(err.message || 'Failed to mark notification as read');
    }
  }, [user?.id]);

  // Clear a specific notification
  const clearNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const success = await NotificationService.clearNotification(notificationId, user.id);
      
      if (success) {
        setNotifications(prev => 
          prev.filter(notification => notification.id !== notificationId)
        );
        setUnreadCount(prev => {
          const clearedNotification = notifications.find(n => n.id === notificationId);
          return clearedNotification && !clearedNotification.is_read ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch (err: any) {
      console.error('Error clearing notification:', err);
      setError(err.message || 'Failed to clear notification');
    }
  }, [user?.id, notifications]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const clearedCount = await NotificationService.clearAllNotifications(user.id);
      
      if (clearedCount > 0) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err: any) {
      console.error('Error clearing all notifications:', err);
      setError(err.message || 'Failed to clear all notifications');
    }
  }, [user?.id]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      // Mark all unread notifications as read
      await Promise.all(
        unreadNotifications.map(notification => 
          NotificationService.markAsRead(notification.id, user.id)
        )
      );

      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      setError(err.message || 'Failed to mark all notifications as read');
    }
  }, [user?.id, notifications]);

  // Load notifications on mount and when user changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user?.id) return;

    // Import supabase here to avoid circular dependency
    import('../lib/supabase').then(({ supabase }) => {
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Refetch notifications when there are changes
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        channel?.unsubscribe();
      };
    });
  }, [user?.id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    clearNotification,
    clearAllNotifications,
    markAllAsRead
  };
};
