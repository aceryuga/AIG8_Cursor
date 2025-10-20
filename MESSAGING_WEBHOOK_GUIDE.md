# Messaging Webhook Integration Guide

## Overview
The landlord messaging feature integrates with n8n webhooks to deliver notifications when messages are sent to tenants.

## Current Configuration
**Webhook URL:** `https://n8n.usatinc.com/webhook-test/887b233d-6cd6-40a2-af7e-2d9edd58d570`

## How to Update the Webhook URL

### Option 1: Update Configuration File (Recommended)
1. Open `src/config/webhooks.ts`
2. Locate the `MESSAGING_WEBHOOK` constant
3. Replace the URL with your new webhook endpoint
4. Save the file
5. Rebuild and redeploy the application

```typescript
// Example:
export const WEBHOOKS = {
  MESSAGING_WEBHOOK: 'https://your-new-n8n-url.com/webhook/your-id',
} as const;
```

### Option 2: Environment Variable (Production Best Practice)
For production deployments, you can use environment variables:

1. Create/update `.env` file:
```bash
VITE_MESSAGING_WEBHOOK_URL=https://your-n8n-url.com/webhook/your-id
```

2. Update `src/config/webhooks.ts`:
```typescript
export const WEBHOOKS = {
  MESSAGING_WEBHOOK: import.meta.env.VITE_MESSAGING_WEBHOOK_URL || 
    'https://n8n.usatinc.com/webhook-test/887b233d-6cd6-40a2-af7e-2d9edd58d570',
} as const;
```

3. Rebuild the application

## Rich Text Editor Features

The message composer includes:
- **Bold** formatting (Ctrl+B)
- **Italic** formatting (Ctrl+I)
- **Underline** formatting (Ctrl+U)

## Webhook Payload Structure

When a message is sent, the following JSON payload is posted to the webhook:

```json
{
  "messageId": "uuid-of-message",
  "propertyId": "uuid-of-property",
  "propertyName": "Property Name",
  "tenantName": "Tenant Name",
  "tenantEmail": "tenant@example.com",
  "messageBody": "<p><b>Bold</b> <i>Italic</i> <u>Underline</u> HTML formatted message</p>",
  "senderName": "Landlord Name",
  "senderEmail": "landlord@example.com",
  "sentAt": "2025-10-18T12:34:56.789Z"
}
```

## Webhook Behavior

- **Success**: Message is saved to Supabase database first, then webhook is called
- **Webhook Failure**: If webhook fails, the message still remains saved in the database
- **Error Handling**: Webhook errors are logged but don't prevent message sending
- **Timeout**: Default fetch timeout applies (browser default)

## Testing the Webhook

1. Navigate to Properties page
2. Click "Message" button on a property with an active tenant
3. Compose and send a message
4. Check your n8n workflow logs for incoming webhook data

## N8N Workflow Setup

Your n8n workflow should:
1. Listen for POST requests on the webhook URL
2. Parse the incoming JSON payload
3. Process the message (send email, SMS, or app notification)
4. Optionally return a success response

## Troubleshooting

### Webhook Not Receiving Data
- Verify the webhook URL is correct in `src/config/webhooks.ts`
- Check browser console for network errors
- Ensure n8n workflow is active and listening
- Check CORS settings on your n8n instance

### Messages Not Saving
- Check Supabase RLS policies for the `messages` table
- Verify user authentication state
- Check browser console for Supabase errors

## Related Files
- `/src/config/webhooks.ts` - Webhook URL configuration
- `/src/components/ui/MessageComposer.tsx` - Message sending logic
- `/src/types/messages.ts` - TypeScript type definitions
- Database: `public.messages` table in Supabase

## Support
For webhook configuration issues, contact your n8n administrator or check the n8n documentation at https://docs.n8n.io/

