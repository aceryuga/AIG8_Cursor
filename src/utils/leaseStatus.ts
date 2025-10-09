export interface LeaseStatus {
  status: 'active' | 'expiring_today' | 'expiring_soon' | 'expired';
  message: string;
  daysRemaining: number;
  priority: number;
}

/**
 * Calculate lease status based on lease end date
 * 
 * Rules:
 * 1. Lease end date = system date → "Lease Expiring today"
 * 2. Lease end date < system date → "Lease Expired"
 * 3. Lease end date > system date + 15 days → no status (active)
 * 4. Lease end date <= system date + 15 days → "Lease expiring in X days"
 */
export const calculateLeaseStatus = (
  leaseEndDate: string,
  currentDate: Date = new Date()
): LeaseStatus => {
  const endDate = new Date(leaseEndDate);
  const today = new Date(currentDate);
  
  // Set time to start of day for accurate comparison
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  const daysDifference = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Case 1: Lease expiring today
  if (daysDifference === 0) {
    return {
      status: 'expiring_today',
      message: 'Lease Expiring today',
      daysRemaining: 0,
      priority: 5
    };
  }
  
  // Case 2: Lease expired
  if (daysDifference < 0) {
    return {
      status: 'expired',
      message: 'Lease Expired',
      daysRemaining: Math.abs(daysDifference),
      priority: 5
    };
  }
  
  // Case 3: Lease expiring within 15 days
  if (daysDifference <= 15) {
    return {
      status: 'expiring_soon',
      message: `Lease expiring in ${daysDifference} day${daysDifference === 1 ? '' : 's'}`,
      daysRemaining: daysDifference,
      priority: daysDifference <= 3 ? 5 : daysDifference <= 7 ? 4 : 3
    };
  }
  
  // Case 4: Lease is active (more than 15 days remaining)
  return {
    status: 'active',
    message: 'Active',
    daysRemaining: daysDifference,
    priority: 1
  };
};

/**
 * Get color classes for lease status badge
 */
export const getLeaseStatusColor = (status: string): string => {
  switch (status) {
    case 'expiring_today':
      return 'text-red-700 bg-red-100 border-red-200';
    case 'expired':
      return 'text-red-800 bg-red-200 border-red-300';
    case 'expiring_soon':
      return 'text-orange-700 bg-orange-100 border-orange-200';
    case 'active':
      return 'text-green-700 bg-green-100 border-green-200';
    default:
      return 'text-gray-600 bg-gray-100 border-gray-200';
  }
};

/**
 * Get icon for lease status
 */
export const getLeaseStatusIcon = (status: string): string => {
  switch (status) {
    case 'expiring_today':
      return '⚠️';
    case 'expired':
      return '❌';
    case 'expiring_soon':
      return '⏰';
    case 'active':
      return '✅';
    default:
      return '📅';
  }
};
