import { supabase } from '../lib/supabase';
import { getCurrentPropertyCount, calculateStorageUsed } from './usageLimits';

// Types for Settings Page
export interface UserSettings {
  id?: string;
  user_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  payment_reminders: boolean;
  lease_expiry_alerts: boolean;
  reminder_timing: 'immediate' | '1day' | '3days' | '1week';
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  language: string;
  property_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  properties_limit: number;
  storage_limit_mb: number;
  features: string[];
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  started_at: string;
  expires_at?: string;
  cancelled_at?: string;
  properties_used: number;
  storage_used_mb: number;
  api_calls_used: number;
  last_billed_at?: string;
  next_billing_at?: string;
  plan?: SubscriptionPlan;
}

export interface BillingHistory {
  id: string;
  user_id: string;
  subscription_id?: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  billing_period_start: string;
  billing_period_end: string;
  payment_method?: string;
  payment_reference?: string;
  paid_at?: string;
  invoice_url?: string;
  created_at: string;
}

export interface LoginActivity {
  id: string;
  user_id: string;
  session_id?: string;
  device_info?: string;
  browser?: string;
  os?: string;
  ip_address?: string;
  country?: string;
  city?: string;
  user_agent?: string;
  login_type: 'password' | 'oauth' | 'magic_link' | 'sso';
  status: 'success' | 'failed' | 'blocked';
  failure_reason?: string;
  login_at: string;
  logout_at?: string;
  expires_at?: string;
}

export interface DataExportRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  export_type: 'full' | 'profile' | 'properties' | 'payments' | 'documents';
  file_url?: string;
  file_size_bytes?: number;
  expires_at?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
}

// User Settings Functions
export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.warn('Error fetching user settings:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }
};

export const createUserSettings = async (settings: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>): Promise<UserSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .insert([settings])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating user settings:', error);
    return null;
  }
};

export const updateUserSettings = async (userId: string, updates: Partial<UserSettings>): Promise<UserSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user settings:', error);
    return null;
  }
};

// Subscription Functions
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return [];
  }
};

export const getUserSubscription = async (userId: string): Promise<UserSubscription | null> => {
  try {
    // First, get the user subscription (include both active and trial)
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trial'])
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.warn('Error fetching user subscription:', subscriptionError.message);
      return null;
    }

    if (!subscription) {
      // No subscription found - this is normal for new users
      return null;
    }

    // Then, get the plan details separately
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .single();

    if (planError && planError.code !== 'PGRST116') {
      console.warn('Error fetching subscription plan:', planError);
    }

    // Get real-time usage stats
    const [actualPropertyCount, actualStorageUsed] = await Promise.all([
      getCurrentPropertyCount(userId),
      calculateStorageUsed(userId)
    ]);

    // Return the subscription with plan data and real-time usage
    return {
      ...subscription,
      plan: plan || null,
      properties_used: actualPropertyCount,
      storage_used_mb: actualStorageUsed
    };
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
};

export const getBillingHistory = async (userId: string, limit: number = 10): Promise<BillingHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('billing_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching billing history:', error);
    return [];
  }
};

// Login Activity Functions
export const getLoginActivity = async (userId: string, limit: number = 10): Promise<LoginActivity[]> => {
  try {
    const { data, error } = await supabase
      .from('login_activity')
      .select('*')
      .eq('user_id', userId)
      .order('login_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching login activity:', error);
    return [];
  }
};

export const logLoginActivity = async (activity: Omit<LoginActivity, 'id' | 'login_at'>): Promise<LoginActivity | null> => {
  try {
    const { data, error } = await supabase
      .from('login_activity')
      .insert([activity])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging login activity:', error);
    return null;
  }
};

// Data Export Functions
export const createDataExportRequest = async (userId: string, exportType: DataExportRequest['export_type']): Promise<DataExportRequest | null> => {
  try {
    const { data, error } = await supabase
      .from('data_export_requests')
      .insert([{
        user_id: userId,
        export_type: exportType,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating data export request:', error);
    return null;
  }
};

export const getDataExportRequests = async (userId: string): Promise<DataExportRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching data export requests:', error);
    return [];
  }
};

// User Profile Functions
export const updateUserProfile = async (userId: string, updates: {
  name?: string;
  email?: string;
  phone?: string;
  profile_image_url?: string;
}): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
};

export const getUserProfile = async (userId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Utility Functions
export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount); // Amount is already in rupees
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getDeviceInfo = (userAgent: string): { browser: string; os: string } => {
  const browser = /Chrome/.test(userAgent) ? 'Chrome' :
                  /Firefox/.test(userAgent) ? 'Firefox' :
                  /Safari/.test(userAgent) ? 'Safari' :
                  /Edge/.test(userAgent) ? 'Edge' : 'Unknown';
  
  const os = /Windows/.test(userAgent) ? 'Windows' :
             /Mac/.test(userAgent) ? 'macOS' :
             /Linux/.test(userAgent) ? 'Linux' :
             /Android/.test(userAgent) ? 'Android' :
             /iOS/.test(userAgent) ? 'iOS' : 'Unknown';
  
  return { browser, os };
};

// Property Count Functions
export const getActivePropertyCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('active', 'Y');

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching active property count:', error);
    return 0;
  }
};

export const updatePropertyCountInSettings = async (userId: string): Promise<boolean> => {
  try {
    const activeCount = await getActivePropertyCount(userId);
    
    // Update or create user settings with the current property count
    const existingSettings = await getUserSettings(userId);
    
    if (existingSettings) {
      await updateUserSettings(userId, { property_count: activeCount });
    } else {
      await createUserSettings({
        user_id: userId,
        property_count: activeCount,
        email_notifications: true,
        sms_notifications: true,
        payment_reminders: true,
        lease_expiry_alerts: true,
        reminder_timing: '3days',
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        timezone: 'Asia/Kolkata',
        language: 'en'
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating property count in settings:', error);
    return false;
  }
};

// Subscription Plan Change Functions
export const changeSubscriptionPlan = async (userId: string, newPlanId: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Get the new plan details
    const { data: newPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', newPlanId)
      .single();

    if (planError || !newPlan) {
      return { success: false, message: 'Plan not found' };
    }

    // Get current subscription
    const { data: currentSubscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trial'])
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      return { success: false, message: 'Error fetching current subscription' };
    }

    // Check if user is trying to change to the same plan
    if (currentSubscription && currentSubscription.plan_id === newPlanId) {
      return { success: false, message: 'You are already on this plan' };
    }

    // Get current usage to validate the new plan can accommodate it
    const [currentPropertyCount, currentStorageUsed] = await Promise.all([
      getCurrentPropertyCount(userId),
      calculateStorageUsed(userId)
    ]);

    
    // Validate that the new plan can accommodate current usage
    if (currentPropertyCount > newPlan.properties_limit) {
      return { 
        success: false, 
        message: `Cannot downgrade: You have ${currentPropertyCount} properties but the ${newPlan.name} plan only allows ${newPlan.properties_limit} properties. Please remove some properties first.` 
      };
    }

    if (newPlan.storage_limit_mb !== -1 && currentStorageUsed > newPlan.storage_limit_mb) {
      return { 
        success: false, 
        message: `Cannot downgrade: You are using ${Math.round(currentStorageUsed)}MB of storage but the ${newPlan.name} plan only allows ${newPlan.storage_limit_mb}MB. Please delete some files first.` 
      };
    }

    // Delete existing subscription and create new one
    if (currentSubscription) {
      const { error: deleteError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting existing subscription:', deleteError);
        return { success: false, message: 'Failed to update subscription plan' };
      }
    }

    // Create new subscription
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: newPlanId,
        status: 'active',
        started_at: new Date().toISOString(),
        properties_used: currentPropertyCount,
        storage_used_mb: currentStorageUsed,
        api_calls_used: currentSubscription?.api_calls_used || 0,
        last_billed_at: new Date().toISOString(),
        next_billing_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return { success: false, message: 'Failed to update subscription plan' };
    }

    // Create a billing history entry for the plan change
    const { error: billingError } = await supabase
      .from('billing_history')
      .insert({
        user_id: userId,
        subscription_id: updatedSubscription.id,
        invoice_number: `INV-${Date.now()}`,
        amount: newPlan.price,
        currency: 'INR',
        status: 'paid', // Auto-approved for now
        billing_period_start: new Date().toISOString().split('T')[0],
        billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_method: 'Auto-approved',
        payment_reference: `AUTO-${Date.now()}`,
        paid_at: new Date().toISOString()
      });

    if (billingError) {
      console.warn('Error creating billing history entry:', billingError);
      // Don't fail the whole operation for billing history
    }

    return { 
      success: true, 
      message: `Successfully changed to ${newPlan.name} plan! Your new plan is now active.` 
    };

  } catch (error) {
    console.error('Error changing subscription plan:', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
};

export const getPlanComparison = async (currentPlanId: string, targetPlanId: string): Promise<{
  isUpgrade: boolean;
  isDowngrade: boolean;
  isSamePlan: boolean;
  actionText: string;
}> => {
  if (currentPlanId === targetPlanId) {
    return {
      isUpgrade: false,
      isDowngrade: false,
      isSamePlan: true,
      actionText: 'Current Plan'
    };
  }

  try {
    // Get both plans from database to compare prices
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('id, name, price')
      .in('id', [currentPlanId, targetPlanId]);

    if (error || !plans || plans.length !== 2) {
      return {
        isUpgrade: false,
        isDowngrade: false,
        isSamePlan: false,
        actionText: 'Change Plan'
      };
    }

    const currentPlan = plans.find(p => p.id === currentPlanId);
    const targetPlan = plans.find(p => p.id === targetPlanId);

    if (!currentPlan || !targetPlan) {
      return {
        isUpgrade: false,
        isDowngrade: false,
        isSamePlan: false,
        actionText: 'Change Plan'
      };
    }

    const isUpgrade = targetPlan.price > currentPlan.price;
    const isDowngrade = targetPlan.price < currentPlan.price;

    return {
      isUpgrade,
      isDowngrade,
      isSamePlan: false,
      actionText: isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Change Plan'
    };
  } catch (error) {
    console.error('Error comparing plans:', error);
    return {
      isUpgrade: false,
      isDowngrade: false,
      isSamePlan: false,
      actionText: 'Change Plan'
    };
  }
};
