// Centralized Subscription Plans Configuration
// Update this file to change plans across the entire application

export interface SubscriptionPlanConfig {
  id: string;
  name: string;
  price: number; // Monthly price in rupees
  yearlyPrice: number; // Yearly price in rupees (monthly × 12 × 0.8)
  propertiesLimit: number; // Maximum active properties
  storageLimitMB: number; // Storage limit in MB (-1 for unlimited)
  features: string[]; // List of features
  isPopular: boolean; // Highlight this plan as recommended
  isActive: boolean; // Whether this plan is available for subscription
}

export interface FeaturesNotImplemented {
  category: string;
  features: string[];
}

// ============================================
// SUBSCRIPTION PLANS CONFIGURATION
// ============================================

export const SUBSCRIPTION_PLANS: SubscriptionPlanConfig[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 799,
    yearlyPrice: 7668, // 799 × 12 × 0.8
    propertiesLimit: 3,
    storageLimitMB: 100,
    features: [
      'Capacity 1-3 properties',
      'Multi‑property dashboard',
      'AI rent matching',
      'Per‑tenant UPI QR',
      'Payment recording & overdue alerts',
      'Digital document vault with renewals',
      'Telegram/WhatsApp notifications',
      'Custom matching rules',
      'Data export',
      'Email support'
    ],
    isPopular: false,
    isActive: true
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 1499,
    yearlyPrice: 14390, // 1499 × 12 × 0.8
    propertiesLimit: 8,
    storageLimitMB: 1024,
    features: [
      'Capacity 4–8 properties',
      'Multi‑property dashboard',
      'AI rent matching',
      'Per‑tenant UPI QR',
      'Payment recording & overdue alerts',
      'Digital document vault with renewals',
      'Telegram/WhatsApp notifications',
      'Custom matching rules',
      'Data export',
      'Email support'
    ],
    isPopular: true,
    isActive: true
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    price: 2499,
    yearlyPrice: 23990, // 2499 × 12 × 0.8
    propertiesLimit: 15,
    storageLimitMB: 2048,
    features: [
      'Capacity 9–15 properties',
      'Multi‑property dashboard',
      'AI rent matching',
      'Per‑tenant UPI QR',
      'Payment recording & overdue alerts',
      'Digital document vault with renewals',
      'Telegram/WhatsApp notifications',
      'Custom matching rules',
      'Data export',
      'Priority support'
    ],
    isPopular: false,
    isActive: true
  }
];

// ============================================
// TRIAL CONFIGURATION
// ============================================

export const TRIAL_CONFIG = {
  durationDays: 14, // Configurable trial duration
  defaultPlan: 'starter' as const, // Trial users get starter plan features
  hardBlockOnExpiry: true, // Block access completely when trial expires
  showCountdown: false // Don't show countdown timer
};

// ============================================
// FEATURES NOT YET IMPLEMENTED
// ============================================

export const FEATURES_NOT_IMPLEMENTED: FeaturesNotImplemented[] = [
  {
    category: 'Payment Integration',
    features: [
      'Stripe/PayPal payment gateway integration',
      'Automatic subscription billing',
      'Payment failure handling',
      'Refund processing',
      'Invoice generation and email delivery'
    ]
  },
  {
    category: 'Advanced Analytics',
    features: [
      'Revenue analytics dashboard',
      'Occupancy rate tracking',
      'ROI calculations',
      'Market comparison reports',
      'Predictive analytics for rent optimization'
    ]
  },
  {
    category: 'Communication Features',
    features: [
      'In-app messaging system',
      'Bulk SMS/WhatsApp messaging',
      'Automated reminder campaigns',
      'Tenant communication portal',
      'Maintenance request chat system'
    ]
  },
  {
    category: 'Advanced Property Management',
    features: [
      'Property maintenance scheduling',
      'Vendor management system',
      'Expense tracking and categorization',
      'Property valuation tools',
      'Market listing integration'
    ]
  },
  {
    category: 'API & Integrations',
    features: [
      'REST API for third-party integrations',
      'Webhook system for real-time updates',
      'Zapier integration',
      'Accounting software integration (QuickBooks, Tally)',
      'Bank statement auto-import'
    ]
  },
  {
    category: 'Advanced Security',
    features: [
      'Two-factor authentication (2FA)',
      'Advanced audit logging',
      'IP whitelisting',
      'Session management',
      'Data encryption at rest'
    ]
  }
];

// ============================================
// USAGE LIMITS CONFIGURATION
// ============================================

export const USAGE_LIMITS = {
  // Storage calculation includes all file types
  includePropertyImages: true,
  includeDocuments: true,
  includeOtherFiles: true,
  
  // Grace period settings
  gracePeriodDays: 0, // No grace period - immediate blocking
  
  // Grandfathered users behavior
  grandfatheredUsers: {
    keepCurrentUsageUntilBilling: true,
    allowManualOverride: true
  }
};

// ============================================
// UPGRADE FLOW CONFIGURATION
// ============================================

export const UPGRADE_FLOW = {
  showCurrentPlanDetails: true,
  showAvailableUpgrades: true,
  showDirectUpgradeLink: true,
  showComparisonTable: true,
  dummyApprovalMode: true, // Auto-approve upgrades until payment integration
  upgradeButtonText: 'Upgrade Now (Auto-Approved)'
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get plan by ID
 */
export const getPlanById = (planId: string): SubscriptionPlanConfig | undefined => {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
};

/**
 * Get plan by name
 */
export const getPlanByName = (planName: string): SubscriptionPlanConfig | undefined => {
  return SUBSCRIPTION_PLANS.find(plan => plan.name.toLowerCase() === planName.toLowerCase());
};

/**
 * Get all active plans
 */
export const getActivePlans = (): SubscriptionPlanConfig[] => {
  return SUBSCRIPTION_PLANS.filter(plan => plan.isActive);
};

/**
 * Get recommended plan (isPopular: true)
 */
export const getRecommendedPlan = (): SubscriptionPlanConfig | undefined => {
  return SUBSCRIPTION_PLANS.find(plan => plan.isPopular && plan.isActive);
};

/**
 * Get next upgrade plan for a given plan
 */
export const getNextUpgradePlan = (currentPlanId: string): SubscriptionPlanConfig | undefined => {
  const currentPlan = getPlanById(currentPlanId);
  if (!currentPlan) return undefined;
  
  const currentIndex = SUBSCRIPTION_PLANS.findIndex(plan => plan.id === currentPlanId);
  if (currentIndex === -1 || currentIndex >= SUBSCRIPTION_PLANS.length - 1) return undefined;
  
  return SUBSCRIPTION_PLANS[currentIndex + 1];
};

/**
 * Get all upgrade options for a given plan
 */
export const getUpgradeOptions = (currentPlanId: string): SubscriptionPlanConfig[] => {
  const currentPlan = getPlanById(currentPlanId);
  if (!currentPlan) return [];
  
  const currentIndex = SUBSCRIPTION_PLANS.findIndex(plan => plan.id === currentPlanId);
  if (currentIndex === -1) return [];
  
  return SUBSCRIPTION_PLANS.slice(currentIndex + 1).filter(plan => plan.isActive);
};

/**
 * Generate SQL script for database updates
 */
export const generateDatabaseUpdateSQL = (): string => {
  let sql = '-- Auto-generated SQL script from subscriptionPlans.ts\n';
  sql += '-- Execute this in Supabase SQL Editor\n\n';
  
  SUBSCRIPTION_PLANS.forEach(plan => {
    sql += `-- Update ${plan.name} plan\n`;
    sql += `UPDATE public.subscription_plans \n`;
    sql += `SET \n`;
    sql += `    price = ${plan.price},\n`;
    sql += `    properties_limit = ${plan.propertiesLimit},\n`;
    sql += `    storage_limit_mb = ${plan.storageLimitMB},\n`;
    sql += `    features = '${JSON.stringify(plan.features)}'::jsonb,\n`;
    sql += `    is_active = ${plan.isActive},\n`;
    sql += `    updated_at = now()\n`;
    sql += `WHERE name = '${plan.name}';\n\n`;
  });
  
  sql += '-- Verify updates\n';
  sql += 'SELECT name, price, properties_limit, storage_limit_mb, features FROM public.subscription_plans ORDER BY price;\n';
  
  return sql;
};

/**
 * Generate landing page plans array
 */
export const generateLandingPagePlans = () => {
  return SUBSCRIPTION_PLANS
    .filter(plan => plan.isActive)
    .map(plan => ({
      name: plan.name,
      price: plan.price.toString(),
      yearlyPrice: plan.yearlyPrice.toString(),
      features: plan.features,
      buttonText: 'Start Free Trial',
      href: '#/auth/signup',
      isPopular: plan.isPopular
    }));
};
