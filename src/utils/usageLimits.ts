// Usage Limits Validation Utilities
// Handles property limits, storage limits, and trial period validation

import { supabase } from '../lib/supabase';
import { SUBSCRIPTION_PLANS, TRIAL_CONFIG, getPlanById } from '../config/subscriptionPlans';

export interface UsageStats {
  propertiesUsed: number;
  storageUsedMB: number;
  propertiesLimit: number;
  storageLimitMB: number;
  isTrialUser: boolean;
  trialDaysRemaining?: number;
  isTrialExpired: boolean;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentPlan?: string;
  suggestedPlan?: string;
}

// ============================================
// PROPERTY LIMITS VALIDATION
// ============================================

/**
 * Check if user can add more properties
 */
export const checkPropertyLimit = async (userId: string): Promise<LimitCheckResult> => {
  try {
    const usageStats = await getUserUsageStats(userId);
    
    if (usageStats.isTrialExpired) {
      return {
        allowed: false,
        reason: 'Your trial period has expired. Please upgrade to continue using the application.',
        upgradeRequired: true,
        currentPlan: 'Trial (Expired)'
      };
    }
    
    if (usageStats.propertiesUsed >= usageStats.propertiesLimit) {
      const currentPlan = await getCurrentUserPlan(userId);
      const nextUpgrade = currentPlan ? getNextUpgradePlan(currentPlan) : null;
      
      return {
        allowed: false,
        reason: `Maximum active properties limit reached (${usageStats.propertiesLimit}). Upgrade your plan to add more properties.`,
        upgradeRequired: true,
        currentPlan: currentPlan?.name || 'Unknown',
        suggestedPlan: nextUpgrade?.name
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Error checking property limit:', error);
    return {
      allowed: false,
      reason: 'Unable to verify property limits. Please try again.'
    };
  }
};

/**
 * Get current property count for user
 */
export const getCurrentPropertyCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('active', 'Y');
    
    if (error) {
      console.error('Error fetching property count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error getting property count:', error);
    return 0;
  }
};

// ============================================
// STORAGE LIMITS VALIDATION
// ============================================

/**
 * Check if user can upload more files (storage limit)
 */
export const checkStorageLimit = async (userId: string, additionalSizeMB: number = 0): Promise<LimitCheckResult> => {
  try {
    const usageStats = await getUserUsageStats(userId);
    
    if (usageStats.isTrialExpired) {
      return {
        allowed: false,
        reason: 'Your trial period has expired. Please upgrade to continue using the application.',
        upgradeRequired: true,
        currentPlan: 'Trial (Expired)'
      };
    }
    
    const totalUsage = usageStats.storageUsedMB + additionalSizeMB;
    
    if (totalUsage > usageStats.storageLimitMB) {
      const currentPlan = await getCurrentUserPlan(userId);
      const nextUpgrade = currentPlan ? getNextUpgradePlan(currentPlan) : null;
      
      return {
        allowed: false,
        reason: `Storage limit exceeded. You have ${usageStats.storageUsedMB}MB used of ${usageStats.storageLimitMB}MB limit. Upgrade your plan for more storage.`,
        upgradeRequired: true,
        currentPlan: currentPlan?.name || 'Unknown',
        suggestedPlan: nextUpgrade?.name
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Error checking storage limit:', error);
    return {
      allowed: false,
      reason: 'Unable to verify storage limits. Please try again.'
    };
  }
};

/**
 * Calculate total storage used by user across all file types
 */
export const calculateStorageUsed = async (userId: string): Promise<number> => {
  try {
    let totalStorageMB = 0;
    
    // Calculate storage from property images using actual file sizes
    const { data: propertyImages, error: propertyImagesError } = await supabase
      .from('property_images')
      .select(`
        image_size,
        properties!inner(owner_id)
      `)
      .eq('properties.owner_id', userId);
    
    if (propertyImagesError) {
      console.error('Error fetching property images for storage calculation:', propertyImagesError);
    } else if (propertyImages) {
      const propertyImageStorageMB = propertyImages.reduce((acc, img) => {
        return acc + (img.image_size || 0) / (1024 * 1024); // Convert bytes to MB
      }, 0);
      totalStorageMB += propertyImageStorageMB;
    }
    
    // Calculate storage from document uploads
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('file_size')
      .eq('uploaded_by', userId);
    
    if (documentsError) {
      console.error('Error fetching documents for storage calculation:', documentsError);
    } else if (documents) {
      const documentStorageMB = documents.reduce((acc, doc) => {
        return acc + (doc.file_size || 0) / (1024 * 1024); // Convert bytes to MB
      }, 0);
      totalStorageMB += documentStorageMB;
    }
    
    return Math.ceil(totalStorageMB); // Round up to nearest MB
  } catch (error) {
    console.error('Error calculating storage used:', error);
    return 0;
  }
};

// ============================================
// TRIAL PERIOD VALIDATION
// ============================================

/**
 * Check if user is on trial and if trial has expired
 */
export const checkTrialStatus = async (userId: string): Promise<{
  isTrialUser: boolean;
  isExpired: boolean;
  daysRemaining?: number;
  trialStartDate?: string;
}> => {
  try {
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('status, started_at')
      .eq('user_id', userId)
      .eq('status', 'trial')
      .single();
    
    if (error || !subscription) {
      return { isTrialUser: false, isExpired: false };
    }
    
    const trialStartDate = new Date(subscription.started_at);
    const currentDate = new Date();
    const daysSinceStart = Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = TRIAL_CONFIG.durationDays - daysSinceStart;
    const isExpired = daysRemaining <= 0;
    
    return {
      isTrialUser: true,
      isExpired,
      daysRemaining: Math.max(0, daysRemaining),
      trialStartDate: subscription.started_at
    };
  } catch (error) {
    console.error('Error checking trial status:', error);
    return { isTrialUser: false, isExpired: false };
  }
};

// ============================================
// COMPREHENSIVE USAGE STATS
// ============================================

/**
 * Get comprehensive usage statistics for a user
 */
export const getUserUsageStats = async (userId: string): Promise<UsageStats> => {
  try {
    const [propertyCount, storageUsed, trialStatus, currentPlan] = await Promise.all([
      getCurrentPropertyCount(userId),
      calculateStorageUsed(userId),
      checkTrialStatus(userId),
      getCurrentUserPlan(userId)
    ]);
    
    const plan = currentPlan || getPlanById('starter'); // Default to starter if no plan found
    const isTrialUser = trialStatus.isTrialUser;
    const isTrialExpired = trialStatus.isExpired;
    
    return {
      propertiesUsed: propertyCount,
      storageUsedMB: storageUsed,
      propertiesLimit: plan?.propertiesLimit || 3,
      storageLimitMB: plan?.storageLimitMB || 100,
      isTrialUser,
      trialDaysRemaining: trialStatus.daysRemaining,
      isTrialExpired
    };
  } catch (error) {
    console.error('Error getting user usage stats:', error);
    // Return default stats on error
    return {
      propertiesUsed: 0,
      storageUsedMB: 0,
      propertiesLimit: 3,
      storageLimitMB: 100,
      isTrialUser: false,
      isTrialExpired: false
    };
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current user's subscription plan (handles both active and trial statuses)
 */
const getCurrentUserPlan = async (userId: string) => {
  try {
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        status,
        subscription_plans (
          id,
          name,
          price,
          properties_limit,
          storage_limit_mb
        )
      `)
      .eq('user_id', userId)
      .in('status', ['active', 'trial'])
      .single();
    
    if (error || !subscription) {
      return null;
    }
    
    const planData = subscription.subscription_plans;
    if (!planData) return null;
    
    return {
      id: planData.id,
      name: planData.name,
      price: planData.price,
      propertiesLimit: planData.properties_limit,
      storageLimitMB: planData.storage_limit_mb
    };
  } catch (error) {
    console.error('Error getting current user plan:', error);
    return null;
  }
};

/**
 * Get next upgrade plan for current plan
 */
const getNextUpgradePlan = (currentPlan: any) => {
  const planIndex = SUBSCRIPTION_PLANS.findIndex(plan => plan.name === currentPlan.name);
  if (planIndex === -1 || planIndex >= SUBSCRIPTION_PLANS.length - 1) return null;
  
  return SUBSCRIPTION_PLANS[planIndex + 1];
};

// ============================================
// UPGRADE UTILITIES
// ============================================

/**
 * Approve upgrade (dummy function until payment integration)
 */
export const approveUpgrade = async (userId: string, newPlanName: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    // This is a dummy implementation - auto-approve upgrades
    // TODO: Replace with actual payment processing
    
    // Get the plan UUID from database using plan name
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, name')
      .eq('name', newPlanName)
      .single();
    
    if (planError || !planData) {
      return {
        success: false,
        message: 'Invalid plan selected'
      };
    }
    
    // Update user subscription in database
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        plan_id: planData.id,
        status: 'active',
        expires_at: null, // Remove expiry for paid plans
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error updating subscription:', error);
      return {
        success: false,
        message: 'Failed to upgrade subscription. Please try again.'
      };
    }
    
    return {
      success: true,
      message: `Successfully upgraded to ${planData.name} plan!`
    };
  } catch (error) {
    console.error('Error approving upgrade:', error);
    return {
      success: false,
      message: 'An error occurred during upgrade. Please try again.'
    };
  }
};
