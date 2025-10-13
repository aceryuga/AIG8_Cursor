import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { calculateRentStatus, PropertyWithLease, Payment as RentPayment } from '../../utils/rentCalculations';
import { getRecentActivityTime } from '../../utils/timezoneUtils';
import { calculateLeaseStatus, getLeaseStatusColor, getLeaseStatusIcon } from '../../utils/leaseStatus';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { NotificationBell } from '../ui/NotificationBell';
import { Link } from 'react-router-dom';
import { PaymentService } from '../../services/paymentService';
import { 
  Building2, 
  LogOut, 
  User, 
  HelpCircle, 
  Plus, 
  IndianRupee, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Upload,
  CreditCard,
  Home,
  FileText,
  TrendingUp,
  Clock,
  MapPin,
  Phone,
  Mail,
  Brain,
  ExternalLink,
  X,
  Image,
  Wrench,
  MessageSquare,
  DollarSign,
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';

// Property interface removed as it's not used in this component

interface SupabaseProperty {
  id: string;
  name: string;
  address: string;
  status: string;
  images: string;
  leases?: {
    monthly_rent: number;
    security_deposit: number;
    maintenance_charges: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    tenants?: {
      name: string;
      phone: string;
      email: string;
    };
  }[];
}

interface Activity {
  id: string;
  type: 'payment' | 'lease' | 'maintenance' | 'document';
  message: string;
  time: string;
  timestamp: number; // Add timestamp for proper sorting
  status: 'success' | 'warning' | 'info';
}





export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showVideoTutorials, setShowVideoTutorials] = useState(false);
  
  // Supabase data states
  const [supabaseProperties, setSupabaseProperties] = useState<SupabaseProperty[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Close help dropdown if clicking outside
      if (showHelp && !target.closest('.help-dropdown')) {
        setShowHelp(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHelp]);

  // Fetch data from Supabase
  useEffect(() => {
    if (!user?.id) {
      setDataLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setDataLoading(true);
        setDataError(null);

        // Fetch properties with their leases and tenants (only active properties)
        const { data: properties, error: propError } = await supabase
          .from('properties')
          .select(`
            *,
            leases(
              id,
              monthly_rent,
              security_deposit,
              maintenance_charges,
              start_date,
              end_date,
              is_active,
              created_at,
              updated_at,
              tenants(
                name,
                phone,
                email
              )
            ),
            property_images!left(
              id,
              image_url,
              is_primary
            )
          `)
          .eq('owner_id', user.id)
          .eq('active', 'Y');

        if (propError) {
          throw propError;
        }

        setSupabaseProperties(properties || []);

        // Fetch recent payments for payment status calculation using centralized service
        const paymentsData = await PaymentService.getPaymentsForProperties(properties?.map(p => p.id) || []);

        // Fetch recently deleted properties for audit trail
        const { data: deletedProperties, error: deletedError } = await supabase
          .from('properties')
          .select(`
            id,
            name,
            updated_at
          `)
          .eq('owner_id', user.id)
          .eq('active', 'N')
          .order('updated_at', { ascending: false })
          .limit(5);

        if (deletedError) {
          console.warn('Error fetching deleted properties:', deletedError);
        }

        setPayments(paymentsData);

        // Fetch recent documents for document upload activities
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select(`
            id,
            name,
            doc_type,
            uploaded_at,
            property_id,
            properties!inner(
              id,
              name,
              owner_id
            )
          `)
          .eq('properties.owner_id', user.id)
          .order('uploaded_at', { ascending: false })
          .limit(10);

        if (documentsError) {
          console.warn('Error fetching documents:', documentsError);
        }

        // Fetch recent property images for gallery upload activities
        const { data: propertyImagesData, error: propertyImagesError } = await supabase
          .from('property_images')
          .select(`
            id,
            image_name,
            created_at,
            properties!inner(
              id,
              name,
              owner_id
            )
          `)
          .eq('properties.owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (propertyImagesError) {
          console.warn('Error fetching property images:', propertyImagesError);
        }

        // Fetch recent maintenance requests
        const { data: maintenanceData, error: maintenanceError } = await supabase
          .from('maintenance_requests')
          .select(`
            id,
            description,
            status,
            created_at,
            properties!inner(
              id,
              name,
              owner_id
            ),
            tenants(
              name
            )
          `)
          .eq('properties.owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (maintenanceError) {
          console.warn('Error fetching maintenance requests:', maintenanceError);
        }

        // Fetch recent communication logs
        let communicationData = null;
        try {
          const { data, error: communicationError } = await supabase
            .from('communication_log')
            .select(`
              id,
              mode,
              message,
              sent_at,
              properties!inner(
                id,
                name,
                owner_id
              ),
              tenants(
                name
              )
            `)
            .eq('properties.owner_id', user.id)
            .order('sent_at', { ascending: false })
            .limit(10);

          if (communicationError) {
            console.warn('Error fetching communication logs:', communicationError);
          } else {
            communicationData = data;
          }
        } catch (error) {
          console.warn('Communication logs table may not exist or have permission issues:', error);
        }

        // Fetch recent rental increases
        const { data: rentalIncreasesData, error: rentalIncreasesError } = await supabase
          .from('rental_increases')
          .select(`
            id,
            old_rent,
            new_rent,
            effective_date,
            created_at,
            leases!inner(
              id,
              properties!inner(
                id,
                name,
                owner_id
              ),
              tenants(
                name
              )
            )
          `)
          .eq('leases.properties.owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (rentalIncreasesError) {
          console.warn('Error fetching rental increases:', rentalIncreasesError);
        }

        // Generate activities from recent payments and properties
        const recentActivities: Activity[] = [];
        
        // Add recent payments as activities
        if (paymentsData && paymentsData.length > 0) {
          paymentsData.slice(0, 5).forEach((payment) => {
            const tenant = (payment.leases as any)?.tenants?.name || 'Unknown Tenant';
            
            // Use created_at timestamp for accurate activity time
            const activityTime = payment.created_at || payment.updated_at || payment.payment_date;
            
            // Debug logging (can be removed in production)
            // console.log('Payment activity data:', {
            //   paymentId: payment.id,
            //   created_at: payment.created_at,
            //   activityTime,
            //   timeAgo: getRelativeTime(activityTime),
            //   tenantName: tenant
            // });
            
            const paymentType = payment.payment_type || 'Rent';
            const paymentTypeText = paymentType === 'Other' && payment.payment_type_details 
              ? `${paymentType} (${payment.payment_type_details})`
              : paymentType;
            
            recentActivities.push({
              id: `payment-${payment.id}`,
              type: 'payment',
              message: `${paymentTypeText} payment received from ${tenant} - ₹${payment.payment_amount.toLocaleString()}`,
              time: getRecentActivityTime(activityTime),
              timestamp: new Date(activityTime).getTime(),
              status: payment.status === 'completed' ? 'success' : 'warning'
            });
          });
        }

        // Add property creation activities (show all recent properties, not just first 3)
        if (properties && properties.length > 0) {
          properties.forEach(prop => {
            if (prop.created_at) {
              recentActivities.push({
                id: `property-${prop.id}`,
                type: 'document',
                message: `Property "${prop.name}" was added`,
                time: getRecentActivityTime(prop.created_at),
                timestamp: new Date(prop.created_at).getTime(),
                status: 'info'
              });
            }
          });
        }

        // Add property deletion activities
        if (deletedProperties && deletedProperties.length > 0) {
          deletedProperties.forEach(prop => {
            if (prop.updated_at) {
              // Debug logging (can be removed in production)
              // console.log('Property deletion debug:', {
              //   propertyName: prop.name,
              //   updated_at: prop.updated_at,
              //   timeAgo: getRelativeTime(prop.updated_at)
              // });
              
              recentActivities.push({
                id: `property-deleted-${prop.id}`,
                type: 'document',
                message: `Property "${prop.name}" was deleted`,
                time: getRecentActivityTime(prop.updated_at),
                timestamp: new Date(prop.updated_at).getTime(),
                status: 'warning'
              });
            }
          });
        }

        // Add lease activities
        if (properties && properties.length > 0) {
          properties.forEach(prop => {
            const activeLease = prop.leases?.find((lease: any) => lease.is_active);
            if (activeLease) {
              // Add lease creation activity
              if (activeLease.created_at) {
                const tenant = activeLease.tenants?.name || 'Unknown Tenant';
                recentActivities.push({
                  id: `lease-created-${activeLease.id}`,
                  type: 'lease',
                  message: `Lease started for ${tenant} at "${prop.name}"`,
                  time: getRecentActivityTime(activeLease.created_at),
                  timestamp: new Date(activeLease.created_at).getTime(),
                  status: 'success'
                });
              }

              // Add lease expiry reminders
              if (activeLease.end_date) {
                const endDate = new Date(activeLease.end_date);
                const daysUntilExpiry = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
                  const tenant = activeLease.tenants?.name || 'Unknown Tenant';
                  recentActivities.push({
                    id: `lease-expiry-${prop.id}`,
                    type: 'lease',
                    message: `Lease expiry reminder: ${tenant} (${daysUntilExpiry} days)`,
                    time: 'Today',
                    timestamp: new Date().getTime(),
                    status: daysUntilExpiry <= 7 ? 'warning' : 'info'
                  });
                }
              }
            }

            // Add lease termination activities (for recently ended leases)
            const endedLeases = prop.leases?.filter((lease: any) => !lease.is_active && lease.updated_at);
            if (endedLeases && endedLeases.length > 0) {
              endedLeases.forEach((lease: any) => {
                const tenant = lease.tenants?.name || 'Unknown Tenant';
                recentActivities.push({
                  id: `lease-ended-${lease.id}`,
                  type: 'lease',
                  message: `Lease ended for ${tenant} at "${prop.name}"`,
                  time: getRecentActivityTime(lease.updated_at),
                  timestamp: new Date(lease.updated_at).getTime(),
                  status: 'warning'
                });
              });
            }
          });
        }

        // Add document upload activities
        if (documentsData && documentsData.length > 0) {
          documentsData.forEach((document) => {
            if (document.uploaded_at) {
              recentActivities.push({
                id: `document-${document.id}`,
                type: 'document',
                message: `Document "${document.name}" uploaded to "${document.properties.name}"`,
                time: getRecentActivityTime(document.uploaded_at),
                timestamp: new Date(document.uploaded_at).getTime(),
                status: 'info'
              });
            }
          });
        }

        // Add gallery upload activities
        if (propertyImagesData && propertyImagesData.length > 0) {
          propertyImagesData.forEach((image) => {
            if (image.created_at) {
              recentActivities.push({
                id: `gallery-${image.id}`,
                type: 'gallery',
                message: `Image "${image.image_name}" uploaded to "${image.properties.name}"`,
                time: getRecentActivityTime(image.created_at),
                timestamp: new Date(image.created_at).getTime(),
                status: 'info'
              });
            }
          });
        }

        // Add maintenance request activities
        if (maintenanceData && maintenanceData.length > 0) {
          maintenanceData.forEach((request) => {
            if (request.created_at) {
              const tenant = request.tenants?.name || 'Unknown Tenant';
              recentActivities.push({
                id: `maintenance-${request.id}`,
                type: 'maintenance',
                message: `Maintenance request from ${tenant} at "${request.properties.name}"`,
                time: getRecentActivityTime(request.created_at),
                timestamp: new Date(request.created_at).getTime(),
                status: request.status === 'open' ? 'warning' : 'info'
              });
            }
          });
        }

        // Add communication log activities
        if (communicationData && communicationData.length > 0) {
          communicationData.forEach((comm) => {
            if (comm.sent_at) {
              const tenant = comm.tenants?.name || 'Unknown Tenant';
              const modeText = comm.mode === 'call' ? 'call' : 
                              comm.mode === 'sms' ? 'SMS' : 
                              comm.mode === 'email' ? 'email' : 
                              comm.mode === 'app' ? 'app message' : comm.mode;
              recentActivities.push({
                id: `communication-${comm.id}`,
                type: 'communication',
                message: `${modeText.charAt(0).toUpperCase() + modeText.slice(1)} sent to ${tenant} at "${comm.properties.name}"`,
                time: getRecentActivityTime(comm.sent_at),
                timestamp: new Date(comm.sent_at).getTime(),
                status: 'info'
              });
            }
          });
        }

        // Add rental increase activities
        if (rentalIncreasesData && rentalIncreasesData.length > 0) {
          rentalIncreasesData.forEach((increase) => {
            if (increase.created_at) {
              const tenant = increase.leases?.tenants?.name || 'Unknown Tenant';
              const propertyName = increase.leases?.properties?.name || 'Unknown Property';
              recentActivities.push({
                id: `rental-increase-${increase.id}`,
                type: 'rental',
                message: `Rent increased for ${tenant} at "${propertyName}" from ₹${increase.old_rent.toLocaleString()} to ₹${increase.new_rent.toLocaleString()}`,
                time: getRecentActivityTime(increase.created_at),
                timestamp: new Date(increase.created_at).getTime(),
                status: 'warning'
              });
            }
          });
        }

        // Sort activities by timestamp (most recent first) and limit to 10
        recentActivities.sort((a, b) => {
          return b.timestamp - a.timestamp;
        });

        setActivities(recentActivities.slice(0, 10));
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setDataError(error.message || 'Failed to load dashboard data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/auth/login';
  };

  // Helper function to determine payment status using new rent calculation system
  const getPaymentStatus = (propertyId: string, activeLease: any) => {
    if (!activeLease) return 'pending';
    
    // Convert to the format expected by calculateRentStatus
    const propertyWithLease: PropertyWithLease = {
      id: propertyId,
      lease_id: (activeLease as any).id,
      monthly_rent: activeLease.monthly_rent,
      start_date: activeLease.start_date,
      is_active: activeLease.is_active
    };
    
    // Convert payments to the format expected by calculateRentStatus
    const rentPayments: RentPayment[] = payments.map(payment => ({
      id: payment.id,
      lease_id: (payment.leases as any)?.id || '',
      payment_date: payment.payment_date,
      payment_amount: payment.payment_amount,
      status: payment.status as 'completed' | 'pending' | 'failed',
      payment_type: payment.payment_type
    }));
    
    // Calculate rent status
    const rentStatus = calculateRentStatus(propertyWithLease, rentPayments);
    
    return rentStatus.status;
  };

  // Use real data from Supabase only (no mock fallback)
  const properties = supabaseProperties.map(prop => {
    const activeLease = prop.leases && prop.leases.length > 0 ?
      (prop.leases.find(lease => lease.is_active) || null) : null;
    const tenant = activeLease?.tenants || null;
    
    // Calculate lease status
    const leaseStatus = activeLease?.end_date ? 
      calculateLeaseStatus(activeLease.end_date) : 
      { status: 'active', message: 'No Lease', daysRemaining: 0, priority: 1 };

    return {
      id: prop.id,
      name: prop.name || 'Unnamed Property',
      address: prop.address || 'Address not available',
      rent: activeLease?.monthly_rent || 0,
      tenant: tenant?.name || 'Vacant',
      status: (prop.status as 'occupied' | 'vacant' | 'maintenance') || 'vacant',
      paymentStatus: getPaymentStatus(prop.id, activeLease) as 'paid' | 'pending' | 'overdue',
      leaseStatus: leaseStatus,
      image: prop.property_images && prop.property_images.length > 0 ? 
        prop.property_images.find((img: any) => img.is_primary)?.image_url || 
        prop.property_images[0]?.image_url || 
        '/placeholder-property.jpg' : '/placeholder-property.jpg',
      dueDate: activeLease?.end_date || 'No lease',
      leases: prop.leases // Keep leases data for overdue calculation
    };
  });


  const totalProperties = properties.length;
  const monthlyRent = supabaseProperties.reduce((sum, prop) => {
    const activeLease = prop.leases?.find(lease => lease.is_active);
    return sum + (activeLease?.monthly_rent || 0);
  }, 0);
  
  // Calculate overdue and pending amounts using new rent calculation system
  const propertiesWithLeases: PropertyWithLease[] = supabaseProperties.map(prop => {
    const activeLease = prop.leases?.find(lease => lease.is_active);
    if (!activeLease) return null;
    
    return {
      id: prop.id,
      lease_id: (activeLease as any).id,
      monthly_rent: activeLease.monthly_rent,
      start_date: activeLease.start_date,
      is_active: activeLease.is_active
    };
  }).filter(Boolean) as PropertyWithLease[];

  const rentPayments: RentPayment[] = payments.map(payment => ({
    id: payment.id,
    lease_id: (payment.leases as any)?.id || '',
    payment_date: payment.payment_date,
    payment_amount: payment.payment_amount,
    status: payment.status as 'completed' | 'pending' | 'failed',
    payment_type: payment.payment_type
  }));


  // Calculate amounts for overdue and pending properties
  const overdueProperties = propertiesWithLeases.filter(prop => {
    const rentStatus = calculateRentStatus(prop, rentPayments);
    return rentStatus.status === 'overdue';
  });

  const pendingProperties = propertiesWithLeases.filter(prop => {
    const rentStatus = calculateRentStatus(prop, rentPayments);
    return rentStatus.status === 'pending';
  });

  const pendingAmount = pendingProperties.reduce((sum, prop) => {
    const rentStatus = calculateRentStatus(prop, rentPayments);
    return sum + rentStatus.amount;
  }, 0);

  const overdueAmount = overdueProperties.reduce((sum, prop) => {
    const rentStatus = calculateRentStatus(prop, rentPayments);
    return sum + rentStatus.amount;
  }, 0);
  
  const paidProperties = properties.filter(p => p.paymentStatus === 'paid').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'text-green-700 bg-green-100';
      case 'vacant': return 'text-orange-600 bg-orange-100';
      case 'maintenance': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-700 bg-green-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-glass-muted bg-gray-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment': return <IndianRupee size={16} />;
      case 'lease': return <Calendar size={16} />;
      case 'maintenance': return <Wrench size={16} />;
      case 'document': return <FileText size={16} />;
      case 'gallery': return <Image size={16} />;
      case 'communication': return <MessageSquare size={16} />;
      case 'rental': return <DollarSign size={16} />;
      default: return <MessageSquare size={16} />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden floating-orbs">
      {/* Top Navigation */}
      <header className="glass-card border-b border-white border-opacity-20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 glass rounded-lg flex items-center justify-center glow">
                  <Building2 className="w-5 h-5 text-green-800" />
                </div>
                <h1 className="text-xl font-bold text-glass">PropertyPro</h1>
              </Link>
              
              <nav className="hidden md:flex items-center gap-6">
                {[
                  { name: 'Home', path: '/' },
                  { name: 'Dashboard', path: '/dashboard' },
                  { name: 'Properties', path: '/properties' },
                  { name: 'Payments', path: '/payments' },
                  { name: 'Documents', path: '/documents' },
                  { name: 'Gallery', path: '/gallery' },
                  { name: 'Settings', path: '/settings' }
                ].map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.path === '/dashboard'
                        ? 'glass text-glass'
                        : 'text-glass-muted hover:text-glass hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <NotificationBell />

              {/* User Menu */}
              <div className="flex items-center gap-2">
                <span className="text-glass hidden sm:block whitespace-nowrap">{user?.name}</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="p-2">
                    <User size={16} />
                  </Button>
                  <div className="relative help-dropdown">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-2"
                      onClick={() => setShowHelp(!showHelp)}
                    >
                      <HelpCircle size={16} />
                    </Button>
                    
                    {showHelp && (
                      <div className="absolute right-0 top-12 w-64 glass-card rounded-xl p-4 z-50 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-glass">Help & Support</h3>
                          <button
                            onClick={() => setShowHelp(false)}
                            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                          >
                            <X size={16} className="text-glass-muted" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <button 
                            onClick={() => {
                              setShowHelp(false);
                              setShowUserGuide(true);
                            }}
                            className="w-full text-left p-3 glass rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors flex items-center gap-3"
                          >
                            <div className="flex items-center gap-2">
                              <FileText size={16} className="text-glass-muted" />
                              <span className="text-sm font-medium text-glass">User Guide</span>
                            </div>
                          </button>
                          <button 
                            onClick={() => {
                              setShowHelp(false);
                              setShowContactSupport(true);
                            }}
                            className="w-full text-left p-3 glass rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors flex items-center gap-3"
                          >
                            <div className="flex items-center gap-2">
                              <Mail size={16} className="text-glass-muted" />
                              <span className="text-sm font-medium text-glass">Contact Support</span>
                            </div>
                          </button>
                          <button 
                            onClick={() => {
                              setShowHelp(false);
                              setShowFAQ(true);
                            }}
                            className="w-full text-left p-3 glass rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors flex items-center gap-3"
                          >
                            <div className="flex items-center gap-2">
                              <HelpCircle size={16} className="text-glass-muted" />
                              <span className="text-sm font-medium text-glass">FAQ</span>
                            </div>
                          </button>
                          <button 
                            onClick={() => {
                              setShowHelp(false);
                              setShowVideoTutorials(true);
                            }}
                            className="w-full text-left p-3 glass rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors flex items-center gap-3"
                          >
                            <div className="flex items-center gap-2">
                              <ExternalLink size={16} className="text-glass-muted" />
                              <span className="text-sm font-medium text-glass">Video Tutorials</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="p-2"
                  >
                    <LogOut size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-glass mb-2">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-xl text-glass-muted">
            Here's what's happening with your property portfolio today.
          </p>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-green-800" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Total Properties</h3>
            <p className="text-2xl font-bold text-glass">{totalProperties}</p>
            <p className="text-sm text-green-700 mt-2">+1 this month</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-green-800" />
              </div>
              <TrendingUp size={16} className="text-green-700" />
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Monthly Rent</h3>
            <p className="text-2xl font-bold text-glass">₹{monthlyRent.toLocaleString()}</p>
            <p className="text-sm text-green-700 mt-2">Expected</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-800" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Collection Status</h3>
            <p className="text-2xl font-bold text-glass">{paidProperties}/{totalProperties}</p>
            <p className="text-sm text-green-700 mt-2">Properties paid</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Pending Amount</h3>
            <p className="text-2xl font-bold text-orange-600">₹{pendingAmount.toLocaleString()}</p>
            <p className="text-sm text-orange-600 mt-2">Pending Payment</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Overdue Amount</h3>
            <p className="text-2xl font-bold text-red-600">₹{overdueAmount.toLocaleString()}</p>
            <p className="text-sm text-red-600 mt-2">Past Due</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-glass">Properties</h2>
              <Link to="/properties/add">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Plus size={16} />
                  Add Property
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dataLoading ? (
                <div className="col-span-full text-center py-10">
                  <p className="text-lg text-glass-muted">Loading properties...</p>
                </div>
              ) : dataError ? (
                <div className="col-span-full text-center py-10 text-red-600">
                  <p>{dataError}</p>
                  <p>Please try again later.</p>
                </div>
              ) : properties.length === 0 ? (
                <div className="col-span-full text-center py-10 text-glass-muted">
                  <p>No active properties found. Add a new one!</p>
                </div>
              ) : (
                properties.map((property) => (
                  <div key={property.id} className="glass-card rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 glow">
                    <div className="relative h-48">
                      <ImageWithFallback
                        src={property.image}
                        alt={property.name}
                        className="w-full h-full"
                        fallbackText="No Image"
                      />
                      <div className="absolute top-3 right-3 flex flex-col gap-2">
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                            {property.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(property.paymentStatus)}`}>
                            {property.paymentStatus}
                          </span>
                        </div>
                        {property.leaseStatus && property.leaseStatus.status !== 'active' && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLeaseStatusColor(property.leaseStatus.status)}`}>
                            {getLeaseStatusIcon(property.leaseStatus.status)} {property.leaseStatus.message}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-glass mb-1">{property.name}</h3>
                      <p className="text-sm text-glass-muted mb-3 flex items-center gap-1">
                        <MapPin size={14} />
                        {property.address}
                      </p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-lg font-bold text-glass">₹{property.rent.toLocaleString()}</p>
                          <p className="text-xs text-glass-muted">per month</p>
                        </div>
                      </div>

                      {property.tenant && (
                        <div className="mb-3">
                          <p className="text-sm text-glass-muted">Tenant</p>
                          <p className="text-sm font-medium text-glass">{property.tenant}</p>
                        </div>
                      )}

                      <Link to={`/properties/${property.id}`}>
                        <Button variant="outline" className="w-full">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-glass mb-4">Quick Actions</h3>
              <div className="space-y-4">
                <Link to="/payments/record">
                  <Button className="w-full justify-start h-10 gap-2" variant="outline">
                    <CreditCard size={16} className="shrink-0" />
                    Record Payment
                  </Button>
                </Link>
                
                <Link to="/payments/reconciliation">
                  <Button className="w-full justify-start h-10 gap-2" variant="outline">
                    <Brain size={16} className="shrink-0" />
                    AI Reconciliation
                  </Button>
                </Link>
                
                <Link to="/properties/add">
                  <Button className="w-full justify-start h-10 gap-2" variant="outline">
                    <Plus size={16} className="shrink-0" />
                    Add Property
                  </Button>
                </Link>
                
                <Link to="/documents">
                  <Button 
                    className="w-full justify-start h-10 gap-2" 
                    variant="outline"
                    onClick={() => console.log('Dashboard: Upload Document button clicked')}
                  >
                    <Upload size={16} className="shrink-0" />
                    Upload Document
                  </Button>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-glass mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 glass rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.status === 'success' ? 'bg-green-100 text-green-700' :
                      activity.status === 'warning' ? 'bg-orange-100 text-orange-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-glass">{activity.message}</p>
                      <p className="text-xs text-glass-muted flex items-center gap-1 mt-1">
                        <Clock size={12} />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* User Guide Modal */}
      {showUserGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-800" />
                  </div>
                  <h2 className="text-2xl font-bold text-glass">User Guide</h2>
                </div>
                <button
                  onClick={() => setShowUserGuide(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-glass-muted" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="glass rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-glass mb-3">Getting Started</h3>
                  <ul className="space-y-2 text-glass-muted">
                    <li>• Complete your profile setup in Settings</li>
                    <li>• Add your first property using the "Add Property" button</li>
                    <li>• Upload important documents to the Document Vault</li>
                    <li>• Set up payment reminders and notifications</li>
                  </ul>
                </div>

                <div className="glass rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-glass mb-3">Managing Properties</h3>
                  <ul className="space-y-2 text-glass-muted">
                    <li>• View all properties from the Properties page</li>
                    <li>• Click on any property to see detailed information</li>
                    <li>• Update property details, tenant information, and rent amounts</li>
                    <li>• Track occupancy status and lease expiry dates</li>
                  </ul>
                </div>

                <div className="glass rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-glass mb-3">Payment Management</h3>
                  <ul className="space-y-2 text-glass-muted">
                    <li>• Record rent payments manually or use AI reconciliation</li>
                    <li>• View payment history and generate reports</li>
                    <li>• Set up automatic payment reminders</li>
                    <li>• Track overdue payments and collection rates</li>
                  </ul>
                </div>

                <div className="glass rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-glass mb-3">Document Management</h3>
                  <ul className="space-y-2 text-glass-muted">
                    <li>• Upload and organize property documents</li>
                    <li>• Use AI-powered categorization and OCR text extraction</li>
                    <li>• Set expiry dates for important documents</li>
                    <li>• Share documents securely with tenants or partners</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Support Modal */}
      {showContactSupport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-green-800" />
                  </div>
                  <h2 className="text-2xl font-bold text-glass">Contact Support</h2>
                </div>
                <button
                  onClick={() => setShowContactSupport(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-glass-muted" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass rounded-lg p-4 text-center">
                    <Mail className="w-8 h-8 text-green-800 mx-auto mb-3" />
                    <h3 className="font-semibold text-glass mb-2">Email Support</h3>
                    <p className="text-glass-muted text-sm mb-3">Get help via email</p>
                    <p className="text-green-800 font-medium">support@propertypro.com</p>
                    <p className="text-xs text-glass-muted mt-1">Response within 24 hours</p>
                  </div>

                  <div className="glass rounded-lg p-4 text-center">
                    <Phone className="w-8 h-8 text-green-800 mx-auto mb-3" />
                    <h3 className="font-semibold text-glass mb-2">Phone Support</h3>
                    <p className="text-glass-muted text-sm mb-3">Speak with our team</p>
                    <p className="text-green-800 font-medium">+91 1800-123-4567</p>
                    <p className="text-xs text-glass-muted mt-1">Mon-Fri, 9 AM - 6 PM IST</p>
                  </div>
                </div>

                <div className="glass rounded-lg p-4">
                  <h3 className="font-semibold text-glass mb-3">Send us a Message</h3>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Your Name"
                        className="glass-input rounded-lg px-3 py-2 text-glass"
                      />
                      <input
                        type="email"
                        placeholder="Your Email"
                        className="glass-input rounded-lg px-3 py-2 text-glass"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Subject"
                      className="w-full glass-input rounded-lg px-3 py-2 text-glass"
                    />
                    <textarea
                      rows={4}
                      placeholder="Describe your issue or question..."
                      className="w-full glass-input rounded-lg px-3 py-2 text-glass resize-none"
                    />
                    <Button className="w-full">Send Message</Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Modal */}
      {showFAQ && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-green-800" />
                  </div>
                  <h2 className="text-2xl font-bold text-glass">Frequently Asked Questions</h2>
                </div>
                <button
                  onClick={() => setShowFAQ(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-glass-muted" />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  {
                    question: "How do I add a new property?",
                    answer: "Click the 'Add Property' button from the dashboard or properties page. Fill in the property details, financial information, and tenant details if applicable."
                  },
                  {
                    question: "How does AI reconciliation work?",
                    answer: "Upload your bank statement and our AI will automatically match transactions to your properties and tenants. It provides confidence scores and flags items that need review."
                  },
                  {
                    question: "Can I set up automatic payment reminders?",
                    answer: "Yes, go to Settings > Notifications to configure payment reminders. You can set timing preferences and enable SMS or email notifications."
                  },
                  {
                    question: "How much storage do I get for documents?",
                    answer: "Starter plan includes 100MB, Professional plan includes 1GB, and Enterprise plan includes unlimited storage for your property documents."
                  },
                  {
                    question: "Is my data secure?",
                    answer: "Yes, we use bank-level encryption and security measures. Your data is stored securely and we comply with all data protection regulations."
                  },
                  {
                    question: "Can I export my data?",
                    answer: "Yes, you can export all your data from Settings > Data & Privacy. The export includes properties, payments, documents, and account information."
                  },
                  {
                    question: "How do I upgrade my plan?",
                    answer: "Go to Settings > Subscription Plan to view available plans and upgrade. Changes take effect immediately and you'll be billed pro-rata."
                  },
                  {
                    question: "Can I manage multiple properties?",
                    answer: "Yes, PropertyPro is designed for managing multiple properties. The number of properties depends on your subscription plan."
                  }
                ].map((faq, index) => (
                  <div key={index} className="glass rounded-lg p-4">
                    <h3 className="font-semibold text-glass mb-2">{faq.question}</h3>
                    <p className="text-glass-muted">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Tutorials Modal */}
      {showVideoTutorials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 glass rounded-lg flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-green-800" />
                  </div>
                  <h2 className="text-2xl font-bold text-glass">Video Tutorials</h2>
                </div>
                <button
                  onClick={() => setShowVideoTutorials(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-glass-muted" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Getting Started with PropertyPro",
                    duration: "5:30",
                    description: "Learn the basics of setting up your account and adding your first property.",
                    thumbnail: "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=400"
                  },
                  {
                    title: "Managing Properties & Tenants",
                    duration: "8:15",
                    description: "Complete guide to adding properties, managing tenant information, and tracking leases.",
                    thumbnail: "https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=400"
                  },
                  {
                    title: "Payment Tracking & AI Reconciliation",
                    duration: "6:45",
                    description: "How to record payments and use AI to automatically reconcile bank statements.",
                    thumbnail: "https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?auto=compress&cs=tinysrgb&w=400"
                  },
                  {
                    title: "Document Management",
                    duration: "4:20",
                    description: "Upload, organize, and manage all your property documents with AI categorization.",
                    thumbnail: "https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=400"
                  },
                  {
                    title: "Reports & Analytics",
                    duration: "7:10",
                    description: "Generate reports, track performance, and analyze your property portfolio.",
                    thumbnail: "https://images.pexels.com/photos/1396196/pexels-photo-1396196.jpeg?auto=compress&cs=tinysrgb&w=400"
                  },
                  {
                    title: "Settings & Customization",
                    duration: "3:55",
                    description: "Customize notifications, manage your subscription, and configure preferences.",
                    thumbnail: "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=400"
                  }
                ].map((video, index) => (
                  <div key={index} className="glass rounded-lg overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="relative">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                          <div className="w-0 h-0 border-l-4 border-l-green-800 border-t-2 border-t-transparent border-b-2 border-b-transparent ml-1"></div>
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-glass mb-2">{video.title}</h3>
                      <p className="text-sm text-glass-muted">{video.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};