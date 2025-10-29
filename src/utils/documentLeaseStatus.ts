import { supabase } from '../lib/supabase';
import { calculateLeaseStatus, LeaseStatus } from './leaseStatus';

export interface DocumentWithLeaseStatus {
  id: string;
  name: string;
  doc_type?: string;
  propertyName: string;
  type: string;
  size: string;
  uploadDate: string;
  url: string;
  thumbnail: string;
  leaseStatus?: LeaseStatus;
  propertyId: string;
}

/**
 * Get lease status for a property by property ID
 */
export const getPropertyLeaseStatus = async (propertyId: string): Promise<LeaseStatus | null> => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        leases(
          id,
          end_date,
          is_active
        )
      `)
      .eq('id', propertyId)
      .single();

    if (error) {
      console.error('Error fetching property lease:', error);
      return null;
    }

    if (!data?.leases || data.leases.length === 0) {
      return null;
    }

    // Find the active lease
    const activeLease = data.leases.find((lease: any) => lease.is_active);
    
    if (!activeLease?.end_date) {
      return null;
    }

    return calculateLeaseStatus(activeLease.end_date);
  } catch (error) {
    console.error('Error getting property lease status:', error);
    return null;
  }
};

/**
 * Enhance documents with lease status information
 */
export const enhanceDocumentsWithLeaseStatus = async (
  documents: any[],
  propertyId?: string
): Promise<DocumentWithLeaseStatus[]> => {
  try {
    // If propertyId is provided, get lease status for that specific property
    if (propertyId) {
      const leaseStatus = await getPropertyLeaseStatus(propertyId);
      return documents.map(doc => ({
        ...doc,
        propertyId,
        leaseStatus
      }));
    }

    // If no propertyId, we need to get lease status for each document's property
    const enhancedDocuments: DocumentWithLeaseStatus[] = [];
    
    for (const doc of documents) {
      // Get property ID from document (assuming it's stored in the document)
      const docPropertyId = doc.property_id || doc.propertyId;
      
      if (docPropertyId) {
        const leaseStatus = await getPropertyLeaseStatus(docPropertyId);
        enhancedDocuments.push({
          ...doc,
          propertyId: docPropertyId,
          leaseStatus
        });
      } else {
        enhancedDocuments.push({
          ...doc,
          propertyId: '',
          leaseStatus: null
        });
      }
    }

    return enhancedDocuments;
  } catch (error) {
    console.error('Error enhancing documents with lease status:', error);
    return documents.map(doc => ({
      ...doc,
      propertyId: doc.property_id || doc.propertyId || '',
      leaseStatus: null
    }));
  }
};

/**
 * Get lease status for multiple properties at once (more efficient)
 */
export const getMultiplePropertiesLeaseStatus = async (propertyIds: string[]): Promise<Record<string, LeaseStatus | null>> => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        id,
        leases(
          id,
          end_date,
          is_active
        )
      `)
      .in('id', propertyIds);

    if (error) {
      console.error('Error fetching multiple properties lease status:', error);
      return {};
    }

    const result: Record<string, LeaseStatus | null> = {};

    for (const property of data || []) {
      const activeLease = property.leases?.find((lease: any) => lease.is_active);
      
      if (activeLease?.end_date) {
        result[property.id] = calculateLeaseStatus(activeLease.end_date);
      } else {
        result[property.id] = null;
      }
    }

    return result;
  } catch (error) {
    console.error('Error getting multiple properties lease status:', error);
    return {};
  }
};
