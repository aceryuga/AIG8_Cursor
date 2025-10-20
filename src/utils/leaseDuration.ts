/**
 * Utility functions for lease duration calculations and validation
 */

export interface LeaseDuration {
  value: number;
  unit: 'months' | 'years' | 'custom';
}

/**
 * Calculate end date based on start date and duration
 * @param startDate - ISO date string (YYYY-MM-DD)
 * @param duration - Duration object with value and unit
 * @returns ISO date string (YYYY-MM-DD) for end date
 */
export function calculateEndDate(startDate: string, duration: LeaseDuration): string {
  if (!startDate || duration.unit === 'custom') {
    return '';
  }

  const start = new Date(startDate);
  if (isNaN(start.getTime())) {
    return '';
  }

  const end = new Date(start);

  if (duration.unit === 'months') {
    end.setMonth(end.getMonth() + duration.value);
  } else if (duration.unit === 'years') {
    end.setFullYear(end.getFullYear() + duration.value);
  }

  // Subtract one day to get the last day of the lease period
  // e.g., lease from 01-Nov-2025 for 12 months ends on 31-Oct-2026
  end.setDate(end.getDate() - 1);

  // Format as YYYY-MM-DD for input[type="date"]
  const year = end.getFullYear();
  const month = String(end.getMonth() + 1).padStart(2, '0');
  const day = String(end.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Calculate duration in months between two dates
 * @param startDate - ISO date string (YYYY-MM-DD)
 * @param endDate - ISO date string (YYYY-MM-DD)
 * @returns Number of months between dates (rounded)
 */
export function calculateDurationMonths(startDate: string, endDate: string): number {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  const yearsDiff = end.getFullYear() - start.getFullYear();
  const monthsDiff = end.getMonth() - start.getMonth();
  const daysDiff = end.getDate() - start.getDate();

  let totalMonths = yearsDiff * 12 + monthsDiff;

  // If the end day is less than start day, we haven't completed a full month
  if (daysDiff < 0) {
    totalMonths -= 1;
  }

  // Add 1 to include both start and end dates in the lease period
  totalMonths += 1;

  return Math.max(0, totalMonths);
}

/**
 * Validate lease dates
 * @param startDate - ISO date string (YYYY-MM-DD)
 * @param endDate - ISO date string (YYYY-MM-DD)
 * @returns Error message if invalid, empty string if valid
 */
export function validateLeaseDates(startDate: string, endDate: string): string {
  if (!startDate || !endDate) {
    return '';
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    return 'Invalid start date';
  }

  if (isNaN(end.getTime())) {
    return 'Invalid end date';
  }

  if (end < start) {
    return 'End date cannot be before start date';
  }

  // Check if dates are the same
  if (start.getTime() === end.getTime()) {
    return 'Lease must be at least 1 day long';
  }

  return '';
}

/**
 * Format duration for display
 * @param duration - Duration object
 * @returns Formatted string like "12 months" or "2 years" or "Custom"
 */
export function formatDuration(duration: LeaseDuration): string {
  if (duration.unit === 'custom') {
    return 'Custom';
  }

  const unit = duration.value === 1 ? duration.unit.slice(0, -1) : duration.unit;
  return `${duration.value} ${unit}`;
}

/**
 * Get common lease duration options
 * @returns Array of duration options
 */
export function getCommonDurationOptions(): LeaseDuration[] {
  return [
    { value: 6, unit: 'months' },
    { value: 11, unit: 'months' },
    { value: 1, unit: 'years' },
    { value: 2, unit: 'years' },
    { value: 3, unit: 'years' },
    { value: 5, unit: 'years' },
  ];
}

/**
 * Check if a duration matches a common option
 * @param months - Number of months
 * @returns Matching duration or custom duration
 */
export function getDurationFromMonths(months: number): LeaseDuration {
  const commonOptions = getCommonDurationOptions();

  for (const option of commonOptions) {
    const optionMonths = option.unit === 'months' ? option.value : option.value * 12;
    if (optionMonths === months) {
      return option;
    }
  }

  return { value: months, unit: 'custom' };
}

