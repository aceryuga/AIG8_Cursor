import { supabase } from '../lib/supabase';

/**
 * Utility class for generating daily notifications
 * This should be called by a cron job or scheduled task
 */
export class NotificationGenerator {
  /**
   * Generate daily notifications for all users
   * This function should be called once per day
   */
  static async generateDailyNotifications(): Promise<void> {
    try {
      console.log('Starting daily notification generation...');
      
      const { error } = await supabase
        .rpc('generate_daily_notifications');

      if (error) {
        throw error;
      }

      console.log('Daily notification generation completed successfully');
    } catch (error) {
      console.error('Error generating daily notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications (older than 30 days)
   * This function should be called periodically
   */
  static async cleanupOldNotifications(): Promise<void> {
    try {
      console.log('Starting notification cleanup...');
      
      const { error } = await supabase
        .rpc('cleanup_old_notifications');

      if (error) {
        throw error;
      }

      console.log('Notification cleanup completed successfully');
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  /**
   * Generate notifications for a specific user (for testing)
   */
  static async generateNotificationsForUser(userId: string): Promise<void> {
    try {
      console.log(`Generating notifications for user: ${userId}`);
      
      // Get user's properties and leases
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          leases (
            id,
            end_date,
            monthly_rent,
            is_active,
            tenants (
              id,
              name
            )
          )
        `)
        .eq('owner_id', userId)
        .eq('active', 'Y');

      if (propertiesError) {
        throw propertiesError;
      }

      if (!properties || properties.length === 0) {
        console.log('No properties found for user');
        return;
      }

      const currentDate = new Date();
      const today = currentDate.toISOString().split('T')[0];

      // Check each lease for notifications
      for (const property of properties) {
        if (!property.leases || property.leases.length === 0) continue;

        for (const lease of property.leases) {
          if (!lease.is_active || !lease.end_date) continue;

          const endDate = new Date(lease.end_date);
          const daysUntilExpiry = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

          // Generate lease expiry notification (15 days before)
          if (daysUntilExpiry <= 15 && daysUntilExpiry >= 0) {
            await this.createNotification({
              user_id: userId,
              type: 'lease_expiry',
              title: 'Lease Expiry Reminder',
              message: `Lease for ${property.name} expires in ${daysUntilExpiry} days`,
              property_id: property.id,
              lease_id: lease.id,
              tenant_id: lease.tenants?.id,
              notification_data: {
                days_until_expiry: daysUntilExpiry,
                property_name: property.name,
                tenant_name: lease.tenants?.name,
                expiry_date: lease.end_date
              },
              priority: daysUntilExpiry <= 3 ? 5 : daysUntilExpiry <= 7 ? 4 : 3
            });
          }

          // Generate expired lease notification
          if (daysUntilExpiry < 0) {
            await this.createNotification({
              user_id: userId,
              type: 'lease_expired',
              title: 'Lease Expired',
              message: `Lease for ${property.name} has expired ${Math.abs(daysUntilExpiry)} days ago`,
              property_id: property.id,
              lease_id: lease.id,
              tenant_id: lease.tenants?.id,
              notification_data: {
                days_overdue: Math.abs(daysUntilExpiry),
                property_name: property.name,
                tenant_name: lease.tenants?.name,
                expiry_date: lease.end_date
              },
              priority: 5
            });
          }
        }
      }

      // Check for rent pending and overdue notifications
      for (const property of properties) {
        if (!property.leases || property.leases.length === 0) continue;

        for (const lease of property.leases) {
          if (!lease.is_active) continue;

          // Get the last payment for this lease
          const { data: lastPayment, error: paymentError } = await supabase
            .from('payments')
            .select('payment_date')
            .eq('lease_id', lease.id)
            .eq('status', 'completed')
            .order('payment_date', { ascending: false })
            .limit(1);

          if (paymentError) {
            console.error('Error fetching last payment:', paymentError);
            continue;
          }

          let lastPaymentDate: Date;
          if (lastPayment && lastPayment.length > 0) {
            lastPaymentDate = new Date(lastPayment[0].payment_date);
          } else {
            // If no payment found, use lease start date
            const { data: leaseData } = await supabase
              .from('leases')
              .select('start_date')
              .eq('id', lease.id)
              .single();
            
            if (leaseData?.start_date) {
              lastPaymentDate = new Date(leaseData.start_date);
            } else {
              continue;
            }
          }

          const daysSinceLastPayment = Math.floor((currentDate.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24));

          // Generate rent pending notification (after 30 days)
          if (daysSinceLastPayment >= 30 && daysSinceLastPayment < 60) {
            await this.createNotification({
              user_id: userId,
              type: 'rent_pending',
              title: 'Rent Payment Pending',
              message: `Rent payment for ${property.name} is pending for ${daysSinceLastPayment} days`,
              property_id: property.id,
              lease_id: lease.id,
              tenant_id: lease.tenants?.id,
              notification_data: {
                days_pending: daysSinceLastPayment,
                property_name: property.name,
                tenant_name: lease.tenants?.name,
                amount: lease.monthly_rent
              },
              priority: 3
            });
          }

          // Generate overdue notification (after 60 days)
          if (daysSinceLastPayment >= 60) {
            await this.createNotification({
              user_id: userId,
              type: 'overdue_reminder',
              title: 'Rent Overdue',
              message: `Rent payment for ${property.name} is overdue by ${daysSinceLastPayment} days`,
              property_id: property.id,
              lease_id: lease.id,
              tenant_id: lease.tenants?.id,
              notification_data: {
                days_overdue: daysSinceLastPayment,
                property_name: property.name,
                tenant_name: lease.tenants?.name,
                amount: lease.monthly_rent
              },
              priority: 5
            });
          }
        }
      }

      console.log(`Notification generation completed for user: ${userId}`);
    } catch (error) {
      console.error(`Error generating notifications for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create a notification in the database
   */
  private static async createNotification(notification: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    property_id?: string;
    lease_id?: string;
    tenant_id?: string;
    notification_data: Record<string, any>;
    priority: number;
  }): Promise<void> {
    try {
      // Check if notification already exists for today
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', notification.user_id)
        .eq('type', notification.type)
        .eq('lease_id', notification.lease_id)
        .eq('generation_date', new Date().toISOString().split('T')[0])
        .eq('is_cleared', false)
        .single();

      if (existingNotification) {
        console.log(`Notification already exists for ${notification.type} - ${notification.lease_id}`);
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.user_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          property_id: notification.property_id,
          lease_id: notification.lease_id,
          tenant_id: notification.tenant_id,
          notification_data: notification.notification_data,
          priority: notification.priority,
          generation_date: new Date().toISOString().split('T')[0]
        });

      if (error) {
        throw error;
      }

      console.log(`Created ${notification.type} notification for user ${notification.user_id}`);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
}
