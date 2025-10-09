import { supabase } from '../lib/supabase';

export interface Payment {
  id: string;
  lease_id: string;
  payment_date: string;
  payment_amount: number;
  payment_method: string;
  reference: string;
  notes: string;
  payment_type: string;
  payment_type_details: string;
  status: 'completed' | 'pending' | 'failed';
  original_payment_id?: string;
  created_at: string;
  updated_at: string;
  leases?: {
    id: string;
    property_id: string;
    is_active: boolean;
    properties?: {
      id: string;
      name: string;
    };
    tenants?: {
      name: string;
    };
  };
}

export interface FilteredPayment {
  id: string;
  lease_id: string;
  payment_date: string;
  payment_amount: number;
  payment_method: string;
  reference: string;
  notes: string;
  payment_type: string;
  payment_type_details: string;
  status: 'completed' | 'pending' | 'failed';
  original_payment_id?: string;
  created_at: string;
  updated_at: string;
  leases?: {
    id: string;
    property_id: string;
    is_active: boolean;
    properties?: {
      id: string;
      name: string;
    };
    tenants?: {
      name: string;
    };
  };
}

/**
 * Centralized payment service that handles all payment-related operations
 * with consistent filtering logic for reversed payments
 */
export class PaymentService {
  /**
   * Filter out reversed payments and reversals from payment data
   */
  private static filterValidPayments(payments: Payment[]): FilteredPayment[] {
    return payments.filter(payment => {
      // Exclude payments that have been reversed
      const isReversed = payments.some(p => p.original_payment_id === payment.id);
      // Exclude reversal payments themselves
      const isReversal = payment.original_payment_id !== null;
      return !isReversed && !isReversal;
    });
  }

  /**
   * Fetch payments for a specific property with filtering applied
   */
  static async getPaymentsForProperty(propertyId: string): Promise<FilteredPayment[]> {
    try {
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select(`
          *,
          leases!inner(
            id,
            property_id,
            is_active
          )
        `)
        .eq('leases.property_id', propertyId)
        .eq('leases.is_active', true)
        .order('payment_date', { ascending: false });

      if (error) {
        console.warn('Error fetching payments for property:', error);
        return [];
      }

      return this.filterValidPayments(paymentsData || []);
    } catch (error) {
      console.error('Error in getPaymentsForProperty:', error);
      return [];
    }
  }

  /**
   * Fetch payments for multiple properties with filtering applied
   */
  static async getPaymentsForProperties(propertyIds: string[]): Promise<FilteredPayment[]> {
    try {
      if (propertyIds.length === 0) return [];

      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select(`
          *,
          leases!inner(
            id,
            property_id,
            is_active,
            properties(
              id,
              name
            ),
            tenants(
              name
            )
          )
        `)
        .in('leases.property_id', propertyIds)
        .eq('leases.is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching payments for properties:', error);
        return [];
      }

      return this.filterValidPayments(paymentsData || []);
    } catch (error) {
      console.error('Error in getPaymentsForProperties:', error);
      return [];
    }
  }

  /**
   * Fetch payments for user's properties with filtering applied
   */
  static async getUserPayments(userId: string): Promise<FilteredPayment[]> {
    try {
      // First get user's properties
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select(`
          id,
          leases(
            id,
            monthly_rent,
            start_date,
            is_active
          )
        `)
        .eq('owner_id', userId)
        .eq('active', 'Y');

      if (propError) {
        console.warn('Error fetching user properties:', propError);
        return [];
      }

      if (!properties || properties.length === 0) {
        return [];
      }

      // Get all lease IDs from properties
      const allLeaseIds = properties.flatMap(prop => 
        prop.leases ? prop.leases.map(lease => lease.id) : []
      );

      if (allLeaseIds.length === 0) {
        return [];
      }

      // Fetch payments with related data
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          leases!inner(
            id,
            property_id,
            is_active,
            properties(
              id,
              name
            ),
            tenants(
              name
            )
          )
        `)
        .in('lease_id', allLeaseIds)
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        console.warn('Error fetching user payments:', paymentsError);
        return [];
      }

      return this.filterValidPayments(paymentsData || []);
    } catch (error) {
      console.error('Error in getUserPayments:', error);
      return [];
    }
  }

  /**
   * Reverse a payment by creating a negative payment record
   */
  static async reversePayment(paymentId: string): Promise<boolean> {
    try {
      // Get the original payment details
      const { data: originalPayment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError || !originalPayment) {
        throw new Error('Could not find original payment details');
      }

      // Create a negative payment record that references the original
      const { error } = await supabase
        .from('payments')
        .insert({
          lease_id: originalPayment.lease_id,
          payment_amount: -originalPayment.payment_amount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: originalPayment.payment_method,
          reference: `REV-${originalPayment.reference || originalPayment.id.slice(-8)}`,
          notes: `Reversal of payment ${originalPayment.id}`,
          payment_type: originalPayment.payment_type,
          payment_type_details: originalPayment.payment_type === 'Other' ? originalPayment.payment_type_details : null,
          status: 'completed',
          original_payment_id: paymentId
        });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error reversing payment:', error);
      return false;
    }
  }
}
