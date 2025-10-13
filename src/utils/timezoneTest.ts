/**
 * Timezone conversion test utility
 */

import { getRelativeTime, fromUTC, toUTC } from './timezoneUtils';

export const testTimezoneConversion = () => {
  console.log('=== TIMEZONE CONVERSION TEST ===');
  
  // Test current time
  const now = new Date();
  const nowUTC = toUTC(now);
  const nowLocal = fromUTC(nowUTC);
  
  console.log('Current time test:');
  console.log('  Local time:', now.toISOString());
  console.log('  UTC time:', nowUTC);
  console.log('  Converted back to local:', nowLocal.toISOString());
  console.log('  Timezone offset (minutes):', now.getTimezoneOffset());
  console.log('  Expected offset for IST: -330 (UTC+5:30)');
  
  // Test with a specific UTC time
  const testUTC = '2025-01-04T10:30:00.000Z'; // 10:30 AM UTC
  const testLocal = fromUTC(testUTC);
  const relativeTime = getRelativeTime(testUTC);
  
  console.log('\nSpecific time test:');
  console.log('  UTC time:', testUTC);
  console.log('  Local time (IST):', testLocal.toISOString());
  console.log('  Local time (IST):', testLocal.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  console.log('  Relative time:', relativeTime);
  
  // Test with payment date format
  const paymentDate = '2025-01-04'; // Date only format
  const paymentRelative = getRelativeTime(paymentDate);
  
  console.log('\nPayment date test:');
  console.log('  Payment date:', paymentDate);
  console.log('  Relative time:', paymentRelative);
  
  console.log('\n=== END TEST ===');
};

// Run test if this file is imported
if (typeof window !== 'undefined') {
  testTimezoneConversion();
}
