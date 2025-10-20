import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Grid3x3 as Grid3X3, List, Plus, MapPin, User, Phone, Mail, Building2, LogOut, HelpCircle, SlidersHorizontal, ArrowUpDown, Trash2, AlertCircle, X } from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { Input } from '../webapp-ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { calculateRentStatus, PropertyWithLease, Payment as RentPayment } from '../../utils/rentCalculations';
import { calculateLeaseStatus, getLeaseStatusColor, getLeaseStatusIcon } from '../../utils/leaseStatus';
import { createPropertyAuditEvent, createLeaseAuditEvent } from '../../utils/auditTrail';
import { updatePropertyCountInSettings } from '../../utils/settingsUtils';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { NotificationBell } from '../ui/NotificationBell';
import { PaymentService } from '../../services/paymentService';
import { MessageComposer } from '../ui/MessageComposer';

interface Property {
  id: string;
  name: string;
  address: string;
  rent: number;
  tenant: string;
  tenantPhone: string;
  tenantEmail: string;
  status: 'occupied' | 'vacant' | 'maintenance';
  paymentStatus: 'paid' | 'pending' | 'overdue' | null;
  leaseStatus?: any;
  image: string;
  dueDate: string;
  propertyType: 'apartment' | 'co-working-space' | 'duplex' | 'independent-house' | 'office' | 'penthouse' | 'retail-space' | 'serviced-apartment' | 'shop' | 'studio-apartment' | 'villa';
  bedrooms?: number;
  area: number;
}

interface SupabaseProperty {
  id: string;
  name: string;
  address: string;
  status: string;
  property_type: string;
  bedrooms: number;
  area: number;
  images: string;
  description: string;
  amenities: string;
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


export const PropertiesList: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [supabaseProperties, setSupabaseProperties] = useState<SupabaseProperty[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch properties from Supabase
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
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

        if (fetchError) {
          throw fetchError;
        }

        setSupabaseProperties(data || []);

        // Fetch payments for rent status calculation using centralized service
        const validPayments = await PaymentService.getPaymentsForProperties((data || []).map(p => p.id));

        const rentPayments: RentPayment[] = validPayments.map(payment => ({
          id: payment.id,
          lease_id: (payment.leases as any)?.id || '',
          payment_date: payment.payment_date,
          payment_amount: payment.payment_amount,
          status: payment.status as 'completed' | 'pending' | 'failed'
        }));
        setPayments(rentPayments);
      } catch (err: any) {
        console.error('Error fetching properties:', err);
        setError(err.message || 'Failed to load properties');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [user?.id]);

  // Convert Supabase data to UI format
  useEffect(() => {
    if (supabaseProperties.length > 0) {
      const convertedProperties: Property[] = supabaseProperties.map(prop => {
        // Get active lease and tenant data
        const activeLease = prop.leases && prop.leases.length > 0 ? 
          prop.leases.find(lease => lease.is_active) || prop.leases[0] : null;
        const tenant = activeLease?.tenants || null;
        
        
        // Calculate rent status using new system - only for occupied properties
        let paymentStatus: 'paid' | 'pending' | 'overdue' | null = null;
        if (activeLease && prop.status === 'occupied') {
          const propertyWithLease: PropertyWithLease = {
            id: prop.id,
            lease_id: (activeLease as any).id,
            monthly_rent: activeLease.monthly_rent,
            start_date: activeLease.start_date,
            is_active: activeLease.is_active
          };
          
          const rentStatus = calculateRentStatus(propertyWithLease, payments);
          paymentStatus = rentStatus.status;
          
        }
        
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
          tenantPhone: tenant?.phone || '',
          tenantEmail: tenant?.email || '',
          status: (prop.status as 'occupied' | 'vacant' | 'maintenance') || 'vacant',
          paymentStatus,
          leaseStatus,
          image: prop.property_images && prop.property_images.length > 0 ? 
            prop.property_images.find((img: any) => img.is_primary)?.image_url || 
            prop.property_images[0]?.image_url || 
            '/placeholder-property.jpg' : '/placeholder-property.jpg',
          dueDate: activeLease?.end_date || 'No lease',
          propertyType: (prop.property_type as 'apartment' | 'co-working-space' | 'duplex' | 'independent-house' | 'office' | 'penthouse' | 'retail-space' | 'serviced-apartment' | 'shop' | 'studio-apartment' | 'villa') || 'apartment',
          bedrooms: prop.bedrooms || 1,
          area: prop.area || 0
        };
      });
      setProperties(convertedProperties);
    }
  }, [supabaseProperties, payments]);

  // Delete property function (soft-end active leases and mark property inactive)
  const deleteProperty = async (id: string) => {
    try {
      // Get property name for audit trail
      const property = supabaseProperties.find(p => p.id === id);
      const propertyName = property?.name || 'Unknown Property';
      
      // Store timestamp in local timezone format to match existing data
      const now = new Date();
      // Create timestamp in the same format as existing data (local timezone without Z)
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
      
      const currentTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
      const currentDate = `${year}-${month}-${day}`;
      
      // Debug logging
      console.log('Property deletion debug - storing:', {
        propertyName,
        currentTime,
        currentDate,
        now: now.toISOString(),
        nowLocal: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      });
      
      // 1) End-date active leases for this property with updated_at timestamp
      const { data: activeLeases } = await supabase
        .from('leases')
        .select('id, tenants(name)')
        .eq('property_id', id)
        .eq('is_active', true);

      const { error: endLeaseError } = await supabase
        .from('leases')
        .update({ 
          is_active: false, 
          end_date: currentDate,
          updated_at: currentTime  // Local timezone timestamp
        })
        .eq('property_id', id)
        .eq('is_active', true);

      if (endLeaseError) {
        throw endLeaseError;
      }

      // Create audit events for ended leases
      if (activeLeases) {
        for (const lease of activeLeases) {
          const tenantName = (lease.tenants as any)?.name || 'Unknown Tenant';
          await createLeaseAuditEvent(
            lease.id,
            propertyName,
            tenantName,
            'ended',
            { end_date: currentDate }
          );
        }
      }

      // 2) Mark property inactive (soft delete) and status vacant with updated_at timestamp
      const { error: propUpdateError } = await supabase
        .from('properties')
        .update({ 
          active: 'N', 
          status: 'vacant',
          updated_at: currentTime  // Local timezone timestamp
        })
        .eq('id', id);

      if (propUpdateError) {
        throw propUpdateError;
      }

      // Create audit event for property deletion
      await createPropertyAuditEvent(
        id,
        propertyName,
        'deleted',
        { active: 'N', status: 'vacant' }
      );

      // 3) Remove from UI
      setProperties(prev => prev.filter(p => p.id !== id));
      setSupabaseProperties(prev => prev.filter(p => p.id !== id));
      
      // 4) Update property count in user settings
      if (user?.id) {
        await updatePropertyCountInSettings(user.id);
      }
      
      console.log('Property set inactive and leases ended with updated timestamps and audit trail');
    } catch (err: any) {
      console.error('Error soft-deleting property:', err);
      setError(err.message || 'Failed to delete property');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const handleOpenMessageModal = (property: Property) => {
    setSelectedProperty(property);
    setMessageModalOpen(true);
  };

  const handleCloseMessageModal = () => {
    setMessageModalOpen(false);
    setSelectedProperty(null);
  };

  const handleOpenDeleteConfirm = (property: Property) => {
    setPropertyToDelete(property);
    setShowDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setPropertyToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (propertyToDelete) {
      await deleteProperty(propertyToDelete.id);
      handleCloseDeleteConfirm();
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.tenant.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || property.status === filterStatus;
    const matchesType = filterType === 'all' || property.propertyType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    switch (sortBy) {
      case 'rent':
        return b.rent - a.rent;
      case 'status':
        return a.status.localeCompare(b.status);
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

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
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const PropertyCard: React.FC<{ property: Property }> = ({ property }) => (
    <div className="glass-card rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 glow group">
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
            {property.paymentStatus && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(property.paymentStatus)}`}>
                {property.paymentStatus}
              </span>
            )}
          </div>
          {property.leaseStatus && property.leaseStatus.status !== 'active' && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLeaseStatusColor(property.leaseStatus.status)}`}>
              {getLeaseStatusIcon(property.leaseStatus.status)} {property.leaseStatus.message}
            </span>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenMessageModal(property);
              }}
              disabled={property.status === 'vacant'}
              title={property.status === 'vacant' ? 'No tenant to message' : 'Send message to tenant'}
            >
              <Mail size={12} className="mr-1" />
              Message
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs text-red-600 hover:bg-red-50 hover:border-red-300"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDeleteConfirm(property);
              }}
            >
              <Trash2 size={12} />
            </Button>
          </div>
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
            <p className="text-lg font-bold text-glass">₹{(property.rent || 0).toLocaleString()}</p>
            <p className="text-xs text-glass-muted">per month</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-glass-muted">{property.area || 0} sq ft</p>
            {property.bedrooms && (
              <p className="text-xs text-glass-muted">{property.bedrooms} BHK</p>
            )}
          </div>
        </div>

        {property.tenant && (
          <div className="mb-3 p-2 glass rounded-lg">
            <p className="text-xs text-glass-muted">Tenant</p>
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
  );

  const PropertyListItem: React.FC<{ property: Property }> = ({ property }) => (
    <div className="glass-card rounded-xl p-4 hover:scale-[1.02] transition-all duration-300 glow">
      <div className="flex items-center gap-4">
        <ImageWithFallback
          src={property.image}
          alt={property.name}
          className="w-20 h-20 rounded-lg"
          fallbackText="No Image"
        />
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-glass">{property.name}</h3>
              <p className="text-sm text-glass-muted flex items-center gap-1">
                <MapPin size={12} />
                {property.address}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                  {property.status}
                </span>
                {property.paymentStatus && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(property.paymentStatus)}`}>
                    {property.paymentStatus}
                  </span>
                )}
              </div>
              {property.leaseStatus && property.leaseStatus.status !== 'active' && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLeaseStatusColor(property.leaseStatus.status)}`}>
                  {getLeaseStatusIcon(property.leaseStatus.status)} {property.leaseStatus.message}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-lg font-bold text-glass">₹{(property.rent || 0).toLocaleString()}</p>
                <p className="text-xs text-glass-muted">per month</p>
              </div>
              <div>
                <p className="text-sm text-glass-muted">{property.area || 0} sq ft</p>
                {(property.bedrooms || 0) > 0 && (
                  <p className="text-xs text-glass-muted">{property.bedrooms} BHK</p>
                )}
              </div>
              {property.tenant && (
                <div>
                  <p className="text-sm font-medium text-glass">{property.tenant}</p>
                  <p className="text-xs text-glass-muted">Tenant</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleOpenMessageModal(property)}
                disabled={property.status === 'vacant'}
                title={property.status === 'vacant' ? 'No tenant to message' : 'Send message to tenant'}
              >
                <Mail size={14} />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:border-red-300"
                onClick={() => handleOpenDeleteConfirm(property)}
              >
                <Trash2 size={14} />
              </Button>
              <Link to={`/properties/${property.id}`}>
                <Button size="sm">
                  View Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden floating-orbs">
      {/* Top Navigation */}
      <header className="glass-card border-b border-white border-opacity-20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-3">
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
                      item.path === '/properties'
                        ? 'glass text-glass'
                        : 'text-glass-muted hover:text-glass hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <NotificationBell />

              <div className="flex items-center gap-2">
                <span className="text-glass hidden sm:block whitespace-nowrap">{user?.name}</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="p-2">
                    <User size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2">
                    <HelpCircle size={16} />
                  </Button>
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
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-glass mb-2">Properties</h1>
            <p className="text-glass-muted">Manage your property portfolio</p>
          </div>
          <Link to="/properties/add">
            <Button className="flex items-center gap-2">
              <Plus size={18} />
              Add Property
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            {/* Search */}
            <div className="flex-1">
              <Input
                label=""
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={18} />}
                placeholder="Search properties, tenants, or locations..."
                className="h-12"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 h-12">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="p-3 h-12"
              >
                <Grid3X3 size={16} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="p-3 h-12"
              >
                <List size={16} />
              </Button>
            </div>

            {/* Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 h-12"
            >
              <SlidersHorizontal size={16} />
              Filters
            </Button>

            {/* Sort */}
            <div className="flex items-center gap-2 h-12">
              <ArrowUpDown size={16} className="text-glass-muted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="glass-input rounded-lg px-3 py-2 text-glass h-12"
              >
                <option value="name">Sort by Name</option>
                <option value="rent">Sort by Rent</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-white border-opacity-20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-glass mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-2 text-glass"
                  >
                    <option value="all">All Status</option>
                    <option value="occupied">Occupied</option>
                    <option value="vacant">Vacant</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-glass mb-2">Property Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-2 text-glass"
                  >
                    <option value="all">All Types</option>
                    <option value="apartment">Apartment</option>
                    <option value="co-working-space">Co-working Space</option>
                    <option value="duplex">Duplex</option>
                    <option value="independent-house">Independent House</option>
                    <option value="office">Office</option>
                    <option value="penthouse">Penthouse</option>
                    <option value="retail-space">Retail Space</option>
                    <option value="serviced-apartment">Serviced Apartment</option>
                    <option value="shop">Shop</option>
                    <option value="studio-apartment">Studio Apartment</option>
                    <option value="villa">Villa</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterStatus('all');
                      setFilterType('all');
                      setSearchTerm('');
                    }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-glass-muted">
            Showing {sortedProperties.length} of {properties.length} properties
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-glass-muted">Loading properties...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">Error: {error}</div>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        )}

        {/* Properties Grid/List */}
        {!loading && !error && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedProperties.map((property) => (
                <PropertyListItem key={property.id} property={property} />
              ))}
            </div>
          )
        )}

        {/* Empty State */}
        {sortedProperties.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
              <Building2 className="w-8 h-8 text-glass-muted" />
            </div>
            <h3 className="text-lg font-semibold text-glass mb-2">No properties found</h3>
            <p className="text-glass-muted mb-4">
              {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first property'
              }
            </p>
            <Link to="/properties/add">
              <Button>Add Property</Button>
            </Link>
          </div>
        )}
      </main>

      {/* Message Composer Modal */}
      {selectedProperty && (
        <MessageComposer
          isOpen={messageModalOpen}
          onClose={handleCloseMessageModal}
          propertyId={selectedProperty.id}
          propertyName={selectedProperty.name}
          tenantId={supabaseProperties.find(p => p.id === selectedProperty.id)?.leases?.[0]?.tenants ? 
            (supabaseProperties.find(p => p.id === selectedProperty.id)?.leases?.[0] as any)?.tenant_id : 
            undefined
          }
          tenantName={selectedProperty.tenant}
          tenantEmail={selectedProperty.tenantEmail}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && propertyToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-glass">Delete Property</h3>
                  <p className="text-glass-muted">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-glass-muted">
                  Are you sure you want to delete "{propertyToDelete.name}"? This will permanently remove 
                  the property and all associated data including payment history and documents.
                </p>
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleCloseDeleteConfirm}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmDelete}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Delete Property
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};