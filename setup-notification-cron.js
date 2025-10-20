#!/usr/bin/env node

/**
 * Setup script for notification cron job
 * This script should be run on your server to set up daily notification generation
 */

const { NotificationGenerator } = require('./src/utils/notificationGenerator');

// Function to run daily notification generation
async function runDailyNotifications() {
  try {
    console.log('🔄 Starting daily notification generation...');
    console.log('⏰ Time:', new Date().toISOString());
    
    await NotificationGenerator.generateDailyNotifications();
    
    console.log('✅ Daily notification generation completed successfully');
  } catch (error) {
    console.error('❌ Error in daily notification generation:', error);
  }
}

// Function to run notification cleanup
async function runNotificationCleanup() {
  try {
    console.log('🧹 Starting notification cleanup...');
    console.log('⏰ Time:', new Date().toISOString());
    
    await NotificationGenerator.cleanupOldNotifications();
    
    console.log('✅ Notification cleanup completed successfully');
  } catch (error) {
    console.error('❌ Error in notification cleanup:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'generate':
      await runDailyNotifications();
      break;
    case 'cleanup':
      await runNotificationCleanup();
      break;
    case 'both':
      await runDailyNotifications();
      await runNotificationCleanup();
      break;
    default:
      console.log(`
📋 Notification Cron Job Setup

Usage:
  node setup-notification-cron.js <command>

Commands:
  generate  - Generate daily notifications
  cleanup   - Clean up old notifications
  both      - Run both generate and cleanup

Examples:
  node setup-notification-cron.js generate
  node setup-notification-cron.js cleanup
  node setup-notification-cron.js both

For cron job setup, add these lines to your crontab:
  # Generate daily notifications at 9:00 AM every day
  0 9 * * * cd /path/to/your/project && node setup-notification-cron.js generate

  # Clean up old notifications at 2:00 AM every Sunday
  0 2 * * 0 cd /path/to/your/project && node setup-notification-cron.js cleanup
      `);
      break;
  }
}

// Run the script
main().catch(console.error);
