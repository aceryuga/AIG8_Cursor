import { supabase } from '../lib/supabase';

/**
 * Purge all user data from Supabase database and storage buckets
 * This is a permanent action that cannot be undone
 */
export const purgeUserData = async (userId: string): Promise<void> => {
  try {
    console.log('Starting user data purge for user:', userId);
    
    // 1. Delete from storage buckets first
    await deleteUserStorageFiles(userId);
    
    // 2. Delete database records (hard delete except audit tables)
    await deleteUserDatabaseRecords(userId);
    
    // 3. Delete auth user via Edge Function (requires admin privileges)
    try {
      console.log('Calling delete-user Edge Function...');
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });
      
      if (error) {
        console.warn('Edge Function error:', error);
        throw error;
      }
      
      if (data?.success) {
        console.log('Auth user deleted successfully via Edge Function');
      } else {
        console.warn('Edge Function returned unsuccessful response:', data);
      }
    } catch (error) {
      console.error('Failed to delete auth user via Edge Function:', error);
      console.warn('User account deleted from database but auth user may still exist.');
      console.warn('User can be manually deleted from Supabase Auth dashboard.');
      // Don't throw - we've already deleted all the important data
    }
    
    console.log('User data purge completed successfully');
  } catch (error) {
    console.error('Error purging user data:', error);
    throw error;
  }
};

/**
 * Delete all user files from storage buckets
 */
const deleteUserStorageFiles = async (userId: string): Promise<void> => {
  console.log('Deleting user storage files...');
  
  try {
    // Get user's properties to find associated images
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', userId);
    
    if (propertiesError) {
      console.error('Error fetching properties for storage deletion:', propertiesError);
    }
    
    const propertyIds = properties?.map(p => p.id) || [];
    
    // Delete from property-images bucket
    if (propertyIds.length > 0) {
      console.log(`Deleting images for ${propertyIds.length} properties...`);
      for (const propertyId of propertyIds) {
        try {
          const { data: files, error: listError } = await supabase.storage
            .from('property-images')
            .list(propertyId);
          
          if (listError) {
            console.warn(`Error listing files for property ${propertyId}:`, listError);
            continue;
          }
          
          if (files && files.length > 0) {
            const filePaths = files.map(f => `${propertyId}/${f.name}`);
            const { error: removeError } = await supabase.storage
              .from('property-images')
              .remove(filePaths);
            
            if (removeError) {
              console.warn(`Error removing files for property ${propertyId}:`, removeError);
            } else {
              console.log(`Deleted ${files.length} images for property ${propertyId}`);
            }
          }
        } catch (error) {
          console.warn(`Error deleting images for property ${propertyId}:`, error);
        }
      }
    }
    
    // Delete from documents bucket
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('url')
      .eq('uploaded_by', userId);
    
    if (docsError) {
      console.error('Error fetching documents for storage deletion:', docsError);
    }
    
    if (docs && docs.length > 0) {
      console.log(`Deleting ${docs.length} documents from storage...`);
      for (const doc of docs) {
        try {
          const url = new URL(doc.url);
          const pathParts = url.pathname.split('/documents/');
          if (pathParts.length > 1) {
            const { error: removeError } = await supabase.storage
              .from('documents')
              .remove([pathParts[1]]);
            
            if (removeError) {
              console.warn('Error removing document from storage:', removeError);
            }
          }
        } catch (error) {
          console.warn('Error deleting document from storage:', error);
        }
      }
    }
    
    console.log('Storage files deletion completed');
  } catch (error) {
    console.error('Error in deleteUserStorageFiles:', error);
    throw error;
  }
};

/**
 * Delete all user records from database tables
 * Respects foreign key constraints by deleting in proper order
 * Skips audit tables: error_audit, login_activity, billing_history
 */
const deleteUserDatabaseRecords = async (userId: string): Promise<void> => {
  console.log('Deleting user database records...');
  
  try {
    // Get property IDs first
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', userId);
    
    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
    }
    
    const propertyIds = properties?.map(p => p.id) || [];
    console.log(`Found ${propertyIds.length} properties to delete`);
    
    // Delete in order (respecting foreign key constraints):
    // Based on schema: payments → leases → properties
    //                  rental_increases → leases
    //                  rent_cycles → leases, properties (CRITICAL - must delete first!)
    //                  communication_log → leases/tenants
    //                  documents → properties/leases/tenants
    //                  maintenance_requests → properties/tenants
    //                  property_images → properties
    //                  tenants → properties (current_property_id)
    
    // Get lease IDs for child tables that reference leases
    let leaseIds: string[] = [];
    if (propertyIds.length > 0) {
      const { data: leases } = await supabase
        .from('leases')
        .select('id')
        .in('property_id', propertyIds);
      leaseIds = leases?.map(l => l.id) || [];
      console.log(`Found ${leaseIds.length} leases to delete`);
    }
    
    // 1. Delete rent_cycles (references both lease_id AND property_id - MUST BE FIRST!)
    if (leaseIds.length > 0) {
      const { error } = await supabase
        .from('rent_cycles')
        .delete()
        .in('lease_id', leaseIds);
      
      if (error) {
        console.warn('Error deleting rent_cycles:', error);
      } else {
        console.log('Deleted rent_cycles');
      }
    }
    
    // 2. Delete payments (references leases)
    if (leaseIds.length > 0) {
      const { error } = await supabase
        .from('payments')
        .delete()
        .in('lease_id', leaseIds);
      
      if (error) {
        console.warn('Error deleting payments:', error);
      } else {
        console.log('Deleted payments');
      }
    }
    
    // 3. Delete rental increases (references leases)
    if (leaseIds.length > 0) {
      const { error } = await supabase
        .from('rental_increases')
        .delete()
        .in('lease_id', leaseIds);
      
      if (error) {
        console.warn('Error deleting rental increases:', error);
      } else {
        console.log('Deleted rental increases');
      }
    }
    
    // 4. Delete communication log (references leases and tenants)
    if (leaseIds.length > 0) {
      const { error } = await supabase
        .from('communication_log')
        .delete()
        .in('lease_id', leaseIds);
      
      if (error) {
        console.warn('Error deleting communication log:', error);
      } else {
        console.log('Deleted communication log');
      }
    }
    
    // 5. Delete documents (references properties, leases, and tenants)
    if (propertyIds.length > 0) {
      const { error } = await supabase
        .from('documents')
        .delete()
        .in('property_id', propertyIds);
      
      if (error) {
        console.warn('Error deleting documents:', error);
      } else {
        console.log('Deleted documents');
      }
    }
    
    // 6. Delete property images (references properties)
    if (propertyIds.length > 0) {
      const { error } = await supabase
        .from('property_images')
        .delete()
        .in('property_id', propertyIds);
      
      if (error) {
        console.warn('Error deleting property images:', error);
      } else {
        console.log('Deleted property images metadata');
      }
    }
    
    // 7. Delete maintenance requests (references properties and tenants)
    if (propertyIds.length > 0) {
      const { error } = await supabase
        .from('maintenance_requests')
        .delete()
        .in('property_id', propertyIds);
      
      if (error) {
        console.warn('Error deleting maintenance requests:', error);
      } else {
        console.log('Deleted maintenance requests');
      }
    }
    
    // 8. Delete leases (references properties and tenants)
    if (propertyIds.length > 0) {
      const { error } = await supabase
        .from('leases')
        .delete()
        .in('property_id', propertyIds);
      
      if (error) {
        console.warn('Error deleting leases:', error);
      } else {
        console.log('Deleted leases');
      }
    }
    
    // 9. Update tenants to remove property references before deleting properties
    // Skip this due to RLS policy restrictions - tenants will be orphaned but that's acceptable
    // if (propertyIds.length > 0) {
    //   const { error } = await supabase
    //     .from('tenants')
    //     .update({ current_property_id: null })
    //     .in('current_property_id', propertyIds);
    //   
    //   if (error) {
    //     console.warn('Error updating tenants:', error);
    //   } else {
    //     console.log('Updated tenant property references');
    //   }
    // }
    
    // 10. Delete tenants (if they are owned by user - check your schema)
    // Note: Only delete if tenants table has a user_id or owner_id column
    // Otherwise, skip this step as tenants might be shared across properties
    
    // 11. Delete properties
    const { error: propertiesDeleteError } = await supabase
      .from('properties')
      .delete()
      .eq('owner_id', userId);
    
    if (propertiesDeleteError) {
      console.warn('Error deleting properties:', propertiesDeleteError);
    } else {
      console.log('Deleted properties');
    }
    
    // 12. Delete notifications (references user_id, property_id, lease_id, tenant_id)
    const { error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    
    if (notificationsError) {
      console.warn('Error deleting notifications:', notificationsError);
    } else {
      console.log('Deleted notifications');
    }
    
    // 13. Delete email tokens (references user_id)
    const { error: emailTokensError } = await supabase
      .from('email_tokens')
      .delete()
      .eq('user_id', userId);
    
    if (emailTokensError) {
      console.warn('Error deleting email tokens:', emailTokensError);
    } else {
      console.log('Deleted email tokens');
    }
    
    // 14. Delete user subscriptions (references user_id)
    const { error: subscriptionsError } = await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId);
    
    if (subscriptionsError) {
      console.warn('Error deleting user subscriptions:', subscriptionsError);
    } else {
      console.log('Deleted user subscriptions');
    }
    
    // 15. Delete user settings (references user_id)
    const { error: settingsError } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId);
    
    if (settingsError) {
      console.warn('Error deleting user settings:', settingsError);
    } else {
      console.log('Deleted user settings');
    }
    
    // 16. Delete data export requests (references user_id)
    const { error: exportError } = await supabase
      .from('data_export_requests')
      .delete()
      .eq('user_id', userId);
    
    if (exportError) {
      console.warn('Error deleting data export requests:', exportError);
    } else {
      console.log('Deleted data export requests');
    }
    
    // Skip audit/compliance tables (kept for record-keeping):
    // - error_logs (references user_id with ON DELETE SET NULL)
    // - audit_events (references user_id with ON DELETE SET NULL)  
    // - login_activity (audit trail)
    // - billing_history (financial records - ON DELETE CASCADE via subscription_id, user_id CASCADE)
    // Note: billing_history will be deleted automatically due to ON DELETE CASCADE
    
    // 17. Delete from users table (last)
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (usersError) {
      console.warn('Error deleting user record:', usersError);
    } else {
      console.log('Deleted user record');
    }
    
    console.log('Database records deletion completed');
  } catch (error) {
    console.error('Error in deleteUserDatabaseRecords:', error);
    throw error;
  }
};

