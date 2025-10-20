/**
 * TypeScript type definitions for the messages table
 * Used for landlord-tenant communication with rich text support
 */

export interface Message {
  id: string;
  property_id: string;
  sender_id: string;
  recipient_id: string | null;
  tenant_id: string | null;
  message_body: string; // HTML content
  status: 'sent' | 'failed' | 'pending';
  sent_at: string; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface MessageInsert {
  property_id: string;
  sender_id: string;
  recipient_id?: string | null;
  tenant_id?: string | null;
  message_body: string;
  status?: 'sent' | 'failed' | 'pending';
  sent_at?: string;
}

export interface MessageUpdate {
  status?: 'sent' | 'failed' | 'pending';
  message_body?: string;
  updated_at?: string;
}

// Webhook payload for n8n integration (future use)
export interface MessageWebhookPayload {
  messageId: string;
  propertyId: string;
  propertyName: string;
  tenantName?: string;
  tenantEmail?: string;
  messageBody: string; // HTML content
  senderName: string;
  senderEmail: string;
  sentAt: string;
}

