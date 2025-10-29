/**
 * Webhook Configuration
 * 
 * This file contains all webhook URLs used in the application.
 * Update these URLs as needed when webhook endpoints change.
 */

export const WEBHOOKS = {
  /**
   * N8N Webhook for landlord-tenant messaging
   * Triggered when a landlord sends a message to a tenant
   * 
   * To update: Change the URL below and redeploy the application
   */
  MESSAGING_WEBHOOK: 'https://n8n.usatinc.com/webhook-test/887b233d-6cd6-40a2-af7e-2d9edd58d570',
    
  /**
   * N8N Webhook for sending messages (Compose Message modal)
   * Triggered when landlord sends a message via the Compose Message button
   */
  MESSAGE_SEND_WEBHOOK: 'https://primary-production-e3df.up.railway.app/webhook/sendmessage',
  // Add more webhooks here as needed
  // PAYMENT_WEBHOOK: 'https://...',
  // NOTIFICATION_WEBHOOK: 'https://...',
} as const;

/**
 * Helper function to check if webhooks are configured
 */
export const isWebhookConfigured = (webhookKey: keyof typeof WEBHOOKS): boolean => {
  return !!WEBHOOKS[webhookKey];
};

