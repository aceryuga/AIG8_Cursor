import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  Building2, 
  LogOut, 
  Bell, 
  HelpCircle, 
  User, 
  Upload, 
  X, 
  MapPin, 
  IndianRupee, 
  Home, 
  Phone, 
  Mail, 
  Calendar,
  Check
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { Input } from '../webapp-ui/Input';
import { NotificationBell } from '../ui/NotificationBell';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { getCurrentUTC } from '../../utils/timezoneUtils';
import { sanitizeText, validateFileType, validateFileSize, SECURITY_CONSTANTS } from '../../utils/security';
import { updatePropertyCountInSettings } from '../../utils/settingsUtils';
import { checkPropertyLimit } from '../../utils/usageLimits';
import { UpgradePrompt } from '../ui/UpgradePrompt';

interface PropertyForm {
  // Basic Details
  name: string;
  address: string;
  propertyType: 'apartment' | 'villa' | 'office' | 'shop' | '';
  bedrooms: number;
  bathrooms: number;
  area: number;
  description: string;
  amenities: string[];
  images: File[];
  
  // Financial Details
  rent: number;
  securityDeposit: number;
  maintenanceCharges: number;
  
  // Tenant Details (optional)
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  leaseStart: string;
  leaseEnd: string;
}

const initialForm: PropertyForm = {
  name: '',
  address: '',
  propertyType: '',
  bedrooms: 1,
  bathrooms: 1,
  area: 0,
  description: '',
  amenities: [],
  images: [],
  rent: 0,
  securityDeposit: 0,
  maintenanceCharges: 0,
  tenantName: '',
  tenantPhone: '',
  tenantEmail: '',
  leaseStart: '',
  leaseEnd: ''
};

const availableAmenities = [
  'Parking', 'Security', 'Gym', 'Swimming Pool', 'Garden', 'Power Backup',
  'Elevator', 'Balcony', 'Air Conditioning', 'Furnished', 'Internet', 'Clubhouse'
];

// Helper to upload images to Supabase Storage and return public URLs
async function uploadPropertyImages(files: File[], propertyId: string) {
  const urls: string[] = [];
  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const filePath = `${propertyId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('property-images').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('property-images').getPublicUrl(filePath);
    urls.push(data.publicUrl);
  }
  return urls;
}

export const AddProperty: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<PropertyForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptData, setUpgradePromptData] = useState<{
    currentPlan: string;
    suggestedPlan?: string;
    reason: string;
  } | null>(null);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const steps = [
    { id: 1, title: 'Basic Details', description: 'Property information and amenities' },
    { id: 2, title: 'Financial Details', description: 'Rent and deposit information' },
    { id: 3, title: 'Tenant Details', description: 'Current tenant information (optional)' }
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!form.name.trim()) newErrors.name = 'Property name is required';
      if (!form.address.trim()) newErrors.address = 'Address is required';
      if (!form.propertyType) newErrors.propertyType = 'Property type is required';
      if (form.area <= 0) newErrors.area = 'Area must be greater than 0';
      if (!form.description.trim()) newErrors.description = 'Description is required';
    }

    if (step === 2) {
      if (form.rent <= 0) newErrors.rent = 'Rent must be greater than 0';
      if (form.securityDeposit < 0) newErrors.securityDeposit = 'Security deposit cannot be negative';
      if (form.maintenanceCharges < 0) newErrors.maintenanceCharges = 'Maintenance charges cannot be negative';
    }

    if (step === 3 && form.tenantName.trim()) {
      if (!form.tenantPhone.trim()) newErrors.tenantPhone = 'Tenant phone is required when tenant name is provided';
      if (!form.tenantEmail.trim()) newErrors.tenantEmail = 'Tenant email is required when tenant name is provided';
      if (!form.leaseStart) newErrors.leaseStart = 'Lease start date is required when tenant name is provided';
      if (!form.leaseEnd) newErrors.leaseEnd = 'Lease end date is required when tenant name is provided';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    // Check property limits before proceeding
    if (user?.id) {
      const limitCheck = await checkPropertyLimit(user.id);
      if (!limitCheck.allowed) {
        setUpgradePromptData({
          currentPlan: limitCheck.currentPlan || 'Unknown',
          suggestedPlan: limitCheck.suggestedPlan,
          reason: limitCheck.reason || 'Property limit reached'
        });
        setShowUpgradePrompt(true);
        return;
      }
    }

    // Sanitize form data before validation and submission
    const sanitizedForm = {
      ...form,
      name: sanitizeText(form.name),
      address: sanitizeText(form.address),
      description: sanitizeText(form.description),
      tenantName: sanitizeText(form.tenantName),
      tenantPhone: sanitizeText(form.tenantPhone),
      tenantEmail: sanitizeText(form.tenantEmail),
      // Numbers and select fields don't need sanitization
      area: form.area,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      rent: form.rent,
      securityDeposit: form.securityDeposit,
      maintenanceCharges: form.maintenanceCharges,
      propertyType: form.propertyType
    };
    
    // Update form with sanitized data
    setForm(sanitizedForm);
    
    if (!validateStep(3)) return;

    setLoading(true);
    setErrors({});

    try {
      // Create timestamp in UTC format for consistent storage
      const currentTime = getCurrentUTC();

      // 1. Generate a UUID for the property (client-side, to use for image path)
      const propertyId = crypto.randomUUID();
      let imageUrls: string[] = [];
      if (form.images.length > 0) {
        try {
          console.log('Uploading property images...');
          imageUrls = await uploadPropertyImages(form.images, propertyId);
          console.log('Image upload success:', imageUrls);
        } catch (imgErr: any) {
          console.error('Image upload failed:', imgErr);
          setErrors({ submit: 'Image upload failed: ' + (imgErr.message || imgErr.error_description || 'Unknown error') });
          setLoading(false);
          return;
        }
      }

      // 2. Insert property (without rent - rent goes in leases table)
      console.log('Inserting property...');
      const { data: property, error: propError } = await supabase
        .from('properties')
        .insert({
          id: propertyId,
          owner_id: user?.id,
          name: form.name,
          address: form.address,
          property_type: form.propertyType,
          bedrooms: form.bedrooms,
          bathrooms: form.bathrooms,
          area: form.area,
          description: form.description,
          amenities: form.amenities.join(','),
          images: JSON.stringify(imageUrls),
          status: form.tenantName.trim() ? 'occupied' : 'vacant',
          created_at: currentTime, // Local timezone timestamp
          updated_at: currentTime  // Local timezone timestamp
        })
        .select()
        .single();

      if (propError) {
        console.error('Property insert failed:', propError);
        setErrors({ submit: propError.message || 'Failed to create property' });
        setLoading(false);
        return;
      }
      console.log('Property insert success:', property);
      console.log('Property creation debug - stored timestamp:', currentTime);

      // Update property count in user settings
      if (user?.id) {
        await updatePropertyCountInSettings(user.id);
      }

      // 3. Optionally insert tenant and lease
      if (form.tenantName.trim()) {
        const tenantId = crypto.randomUUID();
        console.log('Inserting tenant...');
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            id: tenantId,
            name: form.tenantName,
            phone: form.tenantPhone,
            email: form.tenantEmail,
            current_property_id: propertyId,
          })
          .select()
          .single();

        if (tenantError) {
          console.error('Tenant insert failed:', tenantError);
          setErrors({ submit: tenantError.message || 'Failed to create tenant' });
          setLoading(false);
          return;
        }
        console.log('Tenant insert success:', tenant);

        const leaseId = crypto.randomUUID();
        console.log('Inserting lease...');
        const { data: lease, error: leaseError } = await supabase
          .from('leases')
          .insert({
            id: leaseId,
            property_id: propertyId,
            tenant_id: tenantId,
            start_date: form.leaseStart,
            end_date: form.leaseEnd,
            monthly_rent: form.rent,
            security_deposit: form.securityDeposit,
            maintenance_charges: form.maintenanceCharges,
            is_active: true,
            created_at: currentTime, // Local timezone timestamp
            updated_at: currentTime  // Local timezone timestamp
          })
          .select()
          .single();

        if (leaseError) {
          console.error('Lease insert failed:', leaseError);
          setErrors({ submit: leaseError.message || 'Failed to create lease' });
          setLoading(false);
          return;
        }
        console.log('Lease insert success:', lease);
        console.log('Lease creation debug - stored timestamp:', currentTime);
      }

      setLoading(false);
      navigate('/properties');
    } catch (err: any) {
      console.error('Property creation failed:', err);
      setErrors({ submit: err.message || 'Failed to create property' });
      setLoading(false);
    }
  };

  const handleChange = (field: keyof PropertyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let value = e.target.value;
    
    // Don't sanitize during typing - only sanitize on form submission
    // This allows users to type freely without interruption
    
    const finalValue = e.target.type === 'number' ? parseFloat(value) || 0 : value;
    setForm(prev => ({ ...prev, [field]: finalValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChooseFilesClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    files.forEach(file => {
      // Validate file type
      if (!validateFileType(file.name, [...SECURITY_CONSTANTS.ALLOWED_IMAGE_TYPES])) {
        errors.push(`File "${file.name}" is not a supported image type.`);
        return;
      }
      
      // Validate file size
      if (!validateFileSize(file.size, SECURITY_CONSTANTS.MAX_FILE_SIZE)) {
        errors.push(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return;
      }
      
      validFiles.push(file);
    });
    
    if (errors.length > 0) {
      alert(errors.join('\n'));
    }
    
    if (validFiles.length > 0) {
      setForm(prev => ({ ...prev, images: [...prev.images, ...validFiles] }));
    }
    
    // Clear the input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/properties" className="text-glass-muted hover:text-glass flex items-center gap-1">
            <ArrowLeft size={16} />
            Properties
          </Link>
          <span className="text-glass-muted">/</span>
          <span className="text-glass">Add Property</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-glass mb-2">Add New Property</h1>
          <p className="text-glass-muted">Fill in the details to add a new property to your portfolio</p>
        </div>

        {/* Progress Steps */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                    currentStep >= step.id
                      ? 'bg-green-800 text-white'
                      : 'glass text-glass-muted'
                  }`}>
                    {currentStep > step.id ? <Check size={16} /> : step.id}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-glass' : 'text-glass-muted'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-glass-muted">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-green-800' : 'bg-white bg-opacity-20'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="glass-card rounded-xl p-6">
          {errors.submit && (
            <div className="text-red-600 text-center mb-4">{errors.submit}</div>
          )}
          {/* Step 1: Basic Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-glass mb-4">Basic Property Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Property Name"
                  type="text"
                  value={form.name}
                  onChange={handleChange('name')}
                  error={errors.name}
                  icon={<Home size={18} />}
                  placeholder="e.g., Green Valley Apartment"
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-glass">Property Type</label>
                  <select
                    value={form.propertyType}
                    onChange={handleChange('propertyType')}
                    className={`w-full h-11 px-3 rounded-lg glass-input text-glass transition-all duration-200 ${
                      errors.propertyType ? 'border-red-400' : 'focus:border-white'
                    }`}
                  >
                    <option value="">Select property type</option>
                    <option value="apartment">Apartment</option>
                    <option value="villa">Villa</option>
                    <option value="office">Office</option>
                    <option value="shop">Shop</option>
                  </select>
                  {errors.propertyType && (
                    <p className="text-sm text-red-600">{errors.propertyType}</p>
                  )}
                </div>
              </div>

              <Input
                label="Address"
                type="text"
                value={form.address}
                onChange={handleChange('address')}
                error={errors.address}
                icon={<MapPin size={18} />}
                placeholder="Complete address with city and state"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Area (sq ft)"
                  type="number"
                  value={form.area || ''}
                  onChange={handleChange('area')}
                  error={errors.area}
                  placeholder="1200"
                />

                <Input
                  label="Bedrooms"
                  type="number"
                  value={form.bedrooms}
                  onChange={handleChange('bedrooms')}
                  placeholder="2"
                />

                <Input
                  label="Bathrooms"
                  type="number"
                  value={form.bathrooms}
                  onChange={handleChange('bathrooms')}
                  placeholder="2"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-glass">Description</label>
                <textarea
                  value={form.description}
                  onChange={handleChange('description')}
                  rows={4}
                  className={`w-full px-3 py-2 rounded-lg glass-input text-glass placeholder-glass-muted transition-all duration-200 ${
                    errors.description ? 'border-red-400' : 'focus:border-white'
                  }`}
                  placeholder="Describe the property, its features, and location benefits..."
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-glass">Amenities</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableAmenities.map((amenity) => (
                    <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.amenities.includes(amenity)}
                        onChange={() => handleAmenityToggle(amenity)}
                        className="rounded border-white border-opacity-30 bg-white bg-opacity-10 text-green-800 focus:ring-green-800"
                      />
                      <span className="text-sm text-glass">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-glass">Property Images</label>
                <div className="border-2 border-dashed border-white border-opacity-30 rounded-lg p-6 text-center">
                  <Upload size={24} className="mx-auto text-glass-muted mb-2" />
                  <p className="text-glass-muted mb-2">Click to upload or drag and drop</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                  />
                  <Button variant="outline" className="cursor-pointer" onClick={handleChooseFilesClick}>
                    Choose Files
                  </Button>
                </div>
                
                {form.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {form.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Property ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Financial Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-glass mb-4">Financial Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Monthly Rent (₹)"
                  type="number"
                  value={form.rent || ''}
                  onChange={handleChange('rent')}
                  error={errors.rent}
                  icon={<IndianRupee size={18} />}
                  placeholder="15000"
                />

                <Input
                  label="Security Deposit (₹)"
                  type="number"
                  value={form.securityDeposit || ''}
                  onChange={handleChange('securityDeposit')}
                  error={errors.securityDeposit}
                  icon={<IndianRupee size={18} />}
                  placeholder="30000"
                />
              </div>

              <Input
                label="Maintenance Charges (₹)"
                type="number"
                value={form.maintenanceCharges || ''}
                onChange={handleChange('maintenanceCharges')}
                error={errors.maintenanceCharges}
                icon={<IndianRupee size={18} />}
                placeholder="2000"
              />

              <div className="glass rounded-lg p-4">
                <h3 className="font-medium text-glass mb-2">Financial Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-glass-muted">Monthly Rent:</span>
                    <span className="text-glass">₹{form.rent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-muted">Security Deposit:</span>
                    <span className="text-glass">₹{form.securityDeposit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-muted">Maintenance Charges:</span>
                    <span className="text-glass">₹{form.maintenanceCharges.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-white border-opacity-20 pt-2 mt-2">
                    <div className="flex justify-between font-medium">
                      <span className="text-glass">Total Monthly Collection:</span>
                      <span className="text-glass">₹{(form.rent + form.maintenanceCharges).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Tenant Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-glass mb-2">Tenant Details</h2>
                <p className="text-glass-muted">Optional: Add current tenant information if the property is occupied</p>
              </div>
              
              <Input
                label="Tenant Name (Optional)"
                type="text"
                value={form.tenantName}
                onChange={handleChange('tenantName')}
                error={errors.tenantName}
                icon={<User size={18} />}
                placeholder="e.g., Amit Sharma"
              />

              {form.tenantName.trim() && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Tenant Phone"
                      type="tel"
                      value={form.tenantPhone}
                      onChange={handleChange('tenantPhone')}
                      error={errors.tenantPhone}
                      icon={<Phone size={18} />}
                      placeholder="+91 9876543210"
                    />

                    <Input
                      label="Tenant Email"
                      type="email"
                      value={form.tenantEmail}
                      onChange={handleChange('tenantEmail')}
                      error={errors.tenantEmail}
                      icon={<Mail size={18} />}
                      placeholder="tenant@email.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Lease Start Date"
                      type="date"
                      value={form.leaseStart}
                      onChange={handleChange('leaseStart')}
                      error={errors.leaseStart}
                      icon={<Calendar size={18} />}
                    />

                    <Input
                      label="Lease End Date"
                      type="date"
                      value={form.leaseEnd}
                      onChange={handleChange('leaseEnd')}
                      error={errors.leaseEnd}
                      icon={<Calendar size={18} />}
                    />
                  </div>
                </>
              )}

              {!form.tenantName.trim() && (
                <div className="glass rounded-lg p-6 text-center">
                  <User size={24} className="mx-auto text-glass-muted mb-2" />
                  <p className="text-glass-muted">Property will be marked as vacant</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-white border-opacity-20">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={loading}
                className="flex items-center gap-2"
              >
                Add Property
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Upgrade Prompt */}
      {upgradePromptData && (
        <UpgradePrompt
          isOpen={showUpgradePrompt}
          onClose={() => {
            setShowUpgradePrompt(false);
            setUpgradePromptData(null);
          }}
          currentPlan={upgradePromptData.currentPlan}
          suggestedPlan={upgradePromptData.suggestedPlan}
          reason={upgradePromptData.reason}
          userId={user?.id || ''}
          onUpgradeSuccess={() => {
            // After successful upgrade, retry property creation
            handleSubmit();
          }}
        />
      )}
    </div>
  );
};