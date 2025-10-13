import React, { useState } from 'react';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';
import { createPropertyAuditEvent, createPaymentAuditEvent, createLeaseAuditEvent } from '../../utils/auditTrail';
import { useErrorLogger } from '../ui/ErrorBoundary';

export const ErrorAuditTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { logError } = useErrorLogger();

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testJavaScriptError = () => {
    addResult('🧪 Testing JavaScript error logging...');
    try {
      // Trigger a JavaScript error
      const obj: any = null;
      obj.someProperty.nestedProperty;
    } catch (error) {
      addResult('✅ JavaScript error caught and logged');
      logError(error as Error, 'javascript_error');
    }
  };

  const testUnhandledPromise = () => {
    addResult('🧪 Testing unhandled promise rejection...');
    Promise.reject(new Error('Test unhandled promise rejection'));
    addResult('✅ Unhandled promise rejection triggered');
  };

  const testPropertyAudit = async () => {
    addResult('🧪 Testing property audit trail...');
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        addResult('❌ User not logged in, cannot test audit trail');
        return;
      }

      // Create a test property
      const testProperty = {
        name: 'Test Property for Audit Trail',
        address: '123 Test Street, Test City',
        property_type: 'apartment',
        area: 1200,
        bedrooms: 2,
        bathrooms: 2,
        description: 'Test property for audit trail testing',
        owner_id: user.id
      };

      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .insert(testProperty)
        .select()
        .single();

      if (propertyError) {
        addResult(`❌ Failed to create test property: ${propertyError.message}`);
        return;
      }

      addResult('✅ Test property created successfully');

      // Test audit trail
      await createPropertyAuditEvent(
        propertyData.id,
        propertyData.name,
        'created',
        testProperty
      );

      addResult('✅ Property audit event created');

      // Verify audit event was stored
      const { data: auditData } = await supabase
        .from('audit_events')
        .select('*')
        .eq('entity_id', propertyData.id)
        .eq('type', 'property_created')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (auditData && auditData.length > 0) {
        addResult('✅ Audit event verified in database');
      } else {
        addResult('❌ Audit event not found in database');
      }

      // Clean up test property
      await supabase.from('properties').delete().eq('id', propertyData.id);
      addResult('✅ Test property cleaned up');

    } catch (error) {
      addResult(`❌ Error testing property audit: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPaymentAudit = async () => {
    addResult('🧪 Testing payment audit trail...');
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        addResult('❌ User not logged in, cannot test audit trail');
        return;
      }

      // First create a test property
      const testProperty = {
        name: 'Test Property for Payment Audit',
        address: '456 Payment Test Street',
        property_type: 'apartment',
        area: 1000,
        bedrooms: 2,
        bathrooms: 1,
        description: 'Test property for payment audit',
        owner_id: user.id
      };

      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .insert(testProperty)
        .select()
        .single();

      if (propertyError) {
        addResult(`❌ Failed to create test property: ${propertyError.message}`);
        return;
      }

      addResult('✅ Test property created for payment test');

      // Create a test tenant
      const testTenant = {
        name: 'Test Tenant for Payment',
        phone: '+91 9876543210',
        email: 'test.tenant@example.com',
        current_property_id: propertyData.id,
        is_active: true
      };

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert(testTenant)
        .select()
        .single();

      if (tenantError) {
        addResult(`❌ Failed to create test tenant: ${tenantError.message}`);
        // Clean up property
        await supabase.from('properties').delete().eq('id', propertyData.id);
        return;
      }

      addResult('✅ Test tenant created');

      // Create a test lease
      const testLease = {
        property_id: propertyData.id,
        tenant_id: tenantData.id,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
        monthly_rent: 50000,
        security_deposit: 100000,
        is_active: true
      };

      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .insert(testLease)
        .select()
        .single();

      if (leaseError) {
        addResult(`❌ Failed to create test lease: ${leaseError.message}`);
        // Clean up
        await supabase.from('tenants').delete().eq('id', tenantData.id);
        await supabase.from('properties').delete().eq('id', propertyData.id);
        return;
      }

      addResult('✅ Test lease created');

      // Now create a test payment linked to the lease
      const testPayment = {
        lease_id: leaseData.id,
        payment_amount: 50000,
        payment_type: 'Rent', // Use default value from schema
        payment_method: 'bank_transfer',
        reference: 'TEST-PAYMENT-001',
        notes: 'Test payment for audit trail',
        payment_date: new Date().toISOString().split('T')[0],
        status: 'completed'
      };

      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert(testPayment)
        .select()
        .single();

      if (paymentError) {
        addResult(`❌ Failed to create test payment: ${paymentError.message}`);
        // Clean up
        await supabase.from('leases').delete().eq('id', leaseData.id);
        await supabase.from('tenants').delete().eq('id', tenantData.id);
        await supabase.from('properties').delete().eq('id', propertyData.id);
        return;
      }

      addResult('✅ Test payment created successfully');

      // Test audit trail
      await createPaymentAuditEvent(
        paymentData.id,
        propertyData.name,
        tenantData.name,
        paymentData.payment_amount,
        'received',
        testPayment
      );

      addResult('✅ Payment audit event created');

      // Verify audit event was stored
      const { data: auditData } = await supabase
        .from('audit_events')
        .select('*')
        .eq('entity_id', paymentData.id)
        .eq('type', 'payment_received')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (auditData && auditData.length > 0) {
        addResult('✅ Payment audit event verified in database');
      } else {
        addResult('❌ Payment audit event not found in database');
      }

      // Clean up all test data
      await supabase.from('payments').delete().eq('id', paymentData.id);
      await supabase.from('leases').delete().eq('id', leaseData.id);
      await supabase.from('tenants').delete().eq('id', tenantData.id);
      await supabase.from('properties').delete().eq('id', propertyData.id);
      addResult('✅ All test data cleaned up');

    } catch (error) {
      addResult(`❌ Error testing payment audit: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testLeaseAudit = async () => {
    addResult('🧪 Testing lease audit trail...');
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        addResult('❌ User not logged in, cannot test audit trail');
        return;
      }

      // First create a test property
      const testProperty = {
        name: 'Test Property for Lease Audit',
        address: '789 Lease Test Street',
        property_type: 'apartment',
        area: 1500,
        bedrooms: 3,
        bathrooms: 2,
        description: 'Test property for lease audit',
        owner_id: user.id
      };

      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .insert(testProperty)
        .select()
        .single();

      if (propertyError) {
        addResult(`❌ Failed to create test property: ${propertyError.message}`);
        return;
      }

      addResult('✅ Test property created for lease test');

      // Create a test tenant
      const testTenant = {
        name: 'Test Tenant for Lease',
        phone: '+91 9876543211',
        email: 'test.tenant.lease@example.com',
        current_property_id: propertyData.id,
        is_active: true
      };

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert(testTenant)
        .select()
        .single();

      if (tenantError) {
        addResult(`❌ Failed to create test tenant: ${tenantError.message}`);
        // Clean up property
        await supabase.from('properties').delete().eq('id', propertyData.id);
        return;
      }

      addResult('✅ Test tenant created');

      // Create a test lease
      const testLease = {
        property_id: propertyData.id,
        tenant_id: tenantData.id,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
        monthly_rent: 75000,
        security_deposit: 150000,
        maintenance_charges: 5000,
        is_active: true
      };

      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .insert(testLease)
        .select()
        .single();

      if (leaseError) {
        addResult(`❌ Failed to create test lease: ${leaseError.message}`);
        // Clean up
        await supabase.from('tenants').delete().eq('id', tenantData.id);
        await supabase.from('properties').delete().eq('id', propertyData.id);
        return;
      }

      addResult('✅ Test lease created successfully');

      // Test audit trail
      await createLeaseAuditEvent(
        leaseData.id,
        propertyData.name,
        tenantData.name,
        'created',
        testLease
      );

      addResult('✅ Lease audit event created');

      // Verify audit event was stored
      const { data: auditData } = await supabase
        .from('audit_events')
        .select('*')
        .eq('entity_id', leaseData.id)
        .eq('type', 'lease_created')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (auditData && auditData.length > 0) {
        addResult('✅ Lease audit event verified in database');
      } else {
        addResult('❌ Lease audit event not found in database');
      }

      // Clean up all test data
      await supabase.from('leases').delete().eq('id', leaseData.id);
      await supabase.from('tenants').delete().eq('id', tenantData.id);
      await supabase.from('properties').delete().eq('id', propertyData.id);
      addResult('✅ All test data cleaned up');

    } catch (error) {
      addResult(`❌ Error testing lease audit: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkErrorLogs = async () => {
    addResult('🧪 Checking recent error logs...');
    
    try {
      const { data: errorLogs } = await supabase
        .from('error_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

      if (errorLogs && errorLogs.length > 0) {
        addResult(`✅ Found ${errorLogs.length} recent error logs`);
        errorLogs.forEach((log, index) => {
          addResult(`  ${index + 1}. ${log.error_type}: ${log.error_message}`);
        });
      } else {
        addResult('⚠️ No error logs found in database');
      }
    } catch (error) {
      addResult(`❌ Error checking error logs: ${error}`);
    }
  };

  const checkAuditEvents = async () => {
    addResult('🧪 Checking recent audit events...');
    
    try {
      const { data: auditEvents } = await supabase
        .from('audit_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

      if (auditEvents && auditEvents.length > 0) {
        addResult(`✅ Found ${auditEvents.length} recent audit events`);
        auditEvents.forEach((event, index) => {
          addResult(`  ${index + 1}. ${event.type}: ${event.description}`);
        });
      } else {
        addResult('⚠️ No audit events found in database');
      }
    } catch (error) {
      addResult(`❌ Error checking audit events: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🧪 Error Handling & Audit Trail Test
      </h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Button 
          onClick={testJavaScriptError}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700"
        >
          Test JavaScript Error
        </Button>
        
        <Button 
          onClick={testUnhandledPromise}
          disabled={isLoading}
          className="bg-orange-600 hover:bg-orange-700"
        >
          Test Promise Rejection
        </Button>
        
        <Button 
          onClick={testPropertyAudit}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Test Property Audit
        </Button>
        
        <Button 
          onClick={testPaymentAudit}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          Test Payment Audit
        </Button>
        
        <Button 
          onClick={testLeaseAudit}
          disabled={isLoading}
          className="bg-teal-600 hover:bg-teal-700"
        >
          Test Lease Audit
        </Button>
        
        <Button 
          onClick={checkErrorLogs}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Check Error Logs
        </Button>
        
        <Button 
          onClick={checkAuditEvents}
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Check Audit Events
        </Button>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Test Results:</h3>
        <Button 
          onClick={clearResults}
          variant="outline"
          size="sm"
        >
          Clear Results
        </Button>
      </div>
      
      <div className="bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
        {testResults.length === 0 ? (
          <p className="text-gray-500 italic">No test results yet. Click a test button above to start testing.</p>
        ) : (
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono">
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {isLoading && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800 mr-2"></div>
            Running test...
          </div>
        </div>
      )}
    </div>
  );
};
