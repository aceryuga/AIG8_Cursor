import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'lease_expiry' | 'rent_pending' | 'overdue_reminder' | 'lease_expired';
  title: string;
  message: string;
  property_id?: string;
  lease_id?: string;
  tenant_id?: string;
  is_read: boolean;
  is_cleared: boolean;
  notification_data: Record<string, any>;
  created_at: string;
  read_at?: string;
  cleared_at?: string;
  generation_date: string;
  priority: number;
}

export interface NotificationCount {
  total: number;
  unread: number;
  by_type: {
    lease_expiry: number;
    rent_pending: number;
    overdue_reminder: number;
    lease_expired: number;
  };
}

export class NotificationService {
  /**
   * Get all notifications for a user
   */
  static async getNotifications(userId: string, limit?: number): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_cleared', false)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notifications for a user
   */
  static async getUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_cleared', false)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification count for a user
   */
  static async getNotificationCount(userId: string): Promise<NotificationCount> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('type, is_read')
        .eq('user_id', userId)
        .eq('is_cleared', false);

      if (error) {
        throw error;
      }

      const notifications = data || [];
      const total = notifications.length;
      const unread = notifications.filter(n => !n.is_read).length;
      
      const by_type = {
        lease_expiry: notifications.filter(n => n.type === 'lease_expiry').length,
        rent_pending: notifications.filter(n => n.type === 'rent_pending').length,
        overdue_reminder: notifications.filter(n => n.type === 'overdue_reminder').length,
        lease_expired: notifications.filter(n => n.type === 'lease_expired').length,
      };

      return {
        total,
        unread,
        by_type
      };
    } catch (error) {
      console.error('Error fetching notification count:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('mark_notification_read', {
          notification_uuid: notificationId,
          user_uuid: userId
        });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Clear a specific notification
   */
  static async clearNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('clear_notification', {
          notification_uuid: notificationId,
          user_uuid: userId
        });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error clearing notification:', error);
      throw error;
    }
  }

  /**
   * Clear all notifications for a user
   */
  static async clearAllNotifications(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('clear_all_notifications', {
          user_uuid: userId
        });

      if (error) {
        throw error;
      }

      return data || 0;
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  }

  /**
   * Generate daily notifications (to be called by a cron job or scheduled task)
   */
  static async generateDailyNotifications(): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('generate_daily_notifications');

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error generating daily notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications
   */
  static async cleanupOldNotifications(): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('cleanup_old_notifications');

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification icon and color based on type
   */
  static getNotificationIcon(type: string): { icon: string; color: string; bgColor: string } {
    switch (type) {
      case 'lease_expiry':
        return {
          icon: '📅',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100'
        };
      case 'lease_expired':
        return {
          icon: '⚠️',
          color: 'text-red-600',
          bgColor: 'bg-red-100'
        };
      case 'rent_pending':
        return {
          icon: '💰',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100'
        };
      case 'overdue_reminder':
        return {
          icon: '🚨',
          color: 'text-red-600',
          bgColor: 'bg-red-100'
        };
      default:
        return {
          icon: '🔔',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        };
    }
  }

  /**
   * Format notification time
   */
  static formatNotificationTime(createdAt: string): string {
    const now = new Date();
    const notificationTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  }
}
