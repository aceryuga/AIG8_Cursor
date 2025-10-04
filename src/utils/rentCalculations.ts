export interface RentStatus {
  status: 'paid' | 'pending' | 'overdue';
  amount: number;
  daysOccupied: number;
  effectiveStartDate: Date;
  dueDate: Date;
  overdueDate: Date;
}

export interface PropertyWithLease {
  id: string;
  lease_id: string;
  monthly_rent: number;
  start_date: string;
  is_active: boolean;
}

export interface Payment {
  id: string;
  lease_id: string;
  payment_date: string;
  payment_amount: number;
  status: 'completed' | 'pending' | 'failed';
}

/**
 * Calculate rent status for a property based on current date and payment history
 * 
 * Rules:
 * - Rent is due on 1st of current month (for previous month's rent)
 * - Grace period: 1st to 5th of current month = "pending"
 * - Overdue: 6th of current month onwards = "overdue"
 * - Days occupied: from max(first day of previous month, lease start date) to end of previous month
 */
export const calculateRentStatus = (
  property: PropertyWithLease,
  payments: Payment[],
  currentDate: Date = new Date()
): RentStatus => {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const currentDay = currentDate.getDate();
  
  
  // Get previous month
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  // Key dates
  const firstDayOfPreviousMonth = new Date(previousYear, previousMonth, 1);
  const lastDayOfPreviousMonth = new Date(previousYear, previousMonth + 1, 0);
  const dueDate = new Date(currentYear, currentMonth, 1); // 1st of current month
  const overdueDate = new Date(currentYear, currentMonth, 6); // 6th of current month
  
  // Check if property has received payment for previous month
  // Since we collect rent in arrears, we look for payments made in the current month for the previous month's rent
  const hasPaymentForPreviousMonth = payments.some(payment => {
    const paymentDate = new Date(payment.payment_date);
    const isCorrectMonth = paymentDate.getMonth() === currentMonth && 
                          paymentDate.getFullYear() === currentYear;
    const isCorrectLease = payment.lease_id === property.lease_id;
    const isCompleted = payment.status === 'completed';
    
    
    return isCorrectMonth && isCorrectLease && isCompleted;
  });
  
  // If payment received, status is paid
  if (hasPaymentForPreviousMonth) {
    return {
      status: 'paid',
      amount: 0,
      daysOccupied: 0,
      effectiveStartDate: firstDayOfPreviousMonth,
      dueDate,
      overdueDate
    };
  }
  
  // Calculate days occupied using the later of: first day of previous month OR lease start date
  const leaseStartDate = new Date(property.start_date);
  const effectiveStartDate = leaseStartDate > firstDayOfPreviousMonth ? leaseStartDate : firstDayOfPreviousMonth;
  
  // Check if effective start date is after the end of previous month (no rent due)
  if (effectiveStartDate > lastDayOfPreviousMonth) {
    return {
      status: 'paid',
      amount: 0,
      daysOccupied: 0,
      effectiveStartDate,
      dueDate,
      overdueDate
    };
  }
  
  // Calculate days occupied from effective start date to end of previous month
  const daysOccupied = Math.max(0, Math.ceil((lastDayOfPreviousMonth.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  
  // Calculate prorated rent amount
  const daysInPreviousMonth = lastDayOfPreviousMonth.getDate();
  const dailyRate = property.monthly_rent / daysInPreviousMonth;
  const proratedAmount = Math.round(dailyRate * daysOccupied);
  
  // Determine status based on current date
  let status: 'pending' | 'overdue';
  if (currentDay <= 5) {
    status = 'pending';
  } else {
    status = 'overdue';
  }
  
  
  return {
    status,
    amount: proratedAmount,
    daysOccupied,
    effectiveStartDate,
    dueDate,
    overdueDate
  };
};

/**
 * Calculate summary totals for multiple properties
 */
export const calculateRentSummary = (
  properties: PropertyWithLease[],
  payments: Payment[],
  currentDate: Date = new Date()
) => {
  const statuses = properties.map(property => 
    calculateRentStatus(property, payments, currentDate)
  );
  
  // Calculate total collected from actual payments received
  const totalCollected = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.payment_amount, 0);
    
  const totalPending = statuses
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + s.amount, 0);
    
  const totalOverdue = statuses
    .filter(s => s.status === 'overdue')
    .reduce((sum, s) => sum + s.amount, 0);
  
  return {
    totalCollected,
    totalPending,
    totalOverdue,
    totalProperties: properties.length,
    paidProperties: statuses.filter(s => s.status === 'paid').length,
    pendingProperties: statuses.filter(s => s.status === 'pending').length,
    overdueProperties: statuses.filter(s => s.status === 'overdue').length
  };
};
