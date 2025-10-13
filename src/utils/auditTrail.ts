/**
 * Audit Trail utilities for tracking property and lease changes
 */

import { supabase } from '../lib/supabase';
// import { getCurrentUTC } from './timezoneUtils';

export interface AuditEvent {
  id: string;
  type: 'property_created' | 'property_updated' | 'property_deleted' | 
        'lease_created' | 'lease_updated' | 'lease_ended' | 
        'payment_received' | 'payment_updated';
  entity_id: string;
  entity_name: string;
  description: string;
  timestamp: string;
  user_id: string;
  changes?: Record<string, any>;
}

/**
 * Create an audit event for property changes
 */
export const createPropertyAuditEvent = async (
  propertyId: string,
  propertyName: string,
  eventType: 'created' | 'updated' | 'deleted',
  changes?: Record<string, any>
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const auditEvent: Omit<AuditEvent, 'id'> = {
      type: `property_${eventType}` as any,
      entity_id: propertyId,
      entity_name: propertyName,
      description: `Property "${propertyName}" was ${eventType}`,
      timestamp: (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
      })(), // Local timezone format
      user_id: user.id,
      changes
    };

    // Store in audit_events table (if it exists) or log to console
    console.log('Audit Event:', auditEvent);
    
    // TODO: Implement audit_events table in Supabase
    // await supabase.from('audit_events').insert(auditEvent);
  } catch (error) {
    console.error('Error creating audit event:', error);
  }
};

/**
 * Create an audit event for lease changes
 */
export const createLeaseAuditEvent = async (
  leaseId: string,
  propertyName: string,
  tenantName: string,
  eventType: 'created' | 'updated' | 'ended',
  changes?: Record<string, any>
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const auditEvent: Omit<AuditEvent, 'id'> = {
      type: `lease_${eventType}` as any,
      entity_id: leaseId,
      entity_name: `${tenantName} at ${propertyName}`,
      description: `Lease for ${tenantName} at "${propertyName}" was ${eventType}`,
      timestamp: (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
      })(), // Local timezone format
      user_id: user.id,
      changes
    };

    console.log('Audit Event:', auditEvent);
    
    // TODO: Implement audit_events table in Supabase
    // await supabase.from('audit_events').insert(auditEvent);
  } catch (error) {
    console.error('Error creating audit event:', error);
  }
};

/**
 * Create an audit event for payment changes
 */
export const createPaymentAuditEvent = async (
  paymentId: string,
  propertyName: string,
  tenantName: string,
  amount: number,
  eventType: 'received' | 'updated',
  changes?: Record<string, any>
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const auditEvent: Omit<AuditEvent, 'id'> = {
      type: `payment_${eventType}` as any,
      entity_id: paymentId,
      entity_name: `${tenantName} - ${propertyName}`,
      description: `Payment of ₹${amount.toLocaleString()} from ${tenantName} for "${propertyName}" was ${eventType}`,
      timestamp: (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
      })(), // Local timezone format
      user_id: user.id,
      changes
    };

    console.log('Audit Event:', auditEvent);
    
    // TODO: Implement audit_events table in Supabase
    // await supabase.from('audit_events').insert(auditEvent);
  } catch (error) {
    console.error('Error creating audit event:', error);
  }
};

/**
 * Get audit trail for a specific entity
 */
export const getAuditTrail = async (entityId: string, entityType: 'property' | 'lease' | 'payment'): Promise<AuditEvent[]> => {
  try {
    // TODO: Implement when audit_events table is created
    // const { data, error } = await supabase
    //   .from('audit_events')
    //   .select('*')
    //   .eq('entity_id', entityId)
    //   .order('timestamp', { ascending: false });
    
    // return data || [];
    return [];
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return [];
  }
};

/**
 * Ensure updated_at timestamp is set when updating records
 */
export const updateWithTimestamp = async (
  table: string,
  updates: Record<string, any>,
  filter: Record<string, any>
): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from(table)
      .update({
        ...updates,
        updated_at: (() => {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
        })() // Local timezone format
      })
      .match(filter);

    return { error };
  } catch (error) {
    return { error };
  }
};
