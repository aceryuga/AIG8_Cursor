import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  LogOut, 
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
  Check,
  AlertTriangle,
  Star
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { Input } from '../webapp-ui/Input';
import { NotificationBell } from '../ui/NotificationBell';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { getCurrentUTC } from '../../utils/timezoneUtils';
import { sanitizeText } from '../../utils/security';
import { updatePropertyCountInSettings } from '../../utils/settingsUtils';
import { checkPropertyLimit } from '../../utils/usageLimits';
import { UpgradePrompt } from '../ui/UpgradePrompt';
import { 
  calculateEndDate, 
  validateLeaseDates, 
  LeaseDuration, 
  formatDuration,
  calculateDurationMonths
} from '../../utils/leaseDuration';
import { 
  uploadPropertyImage, 
  validateImageFile, 
  formatFileSize 
} from '../../utils/propertyImages';

interface PropertyForm {
  // Basic Details
  name: string;
  address: string;
  propertyType: 'apartment' | 'co-working-space' | 'duplex' | 'independent-house' | 'office' | 'penthouse' | 'retail-space' | 'serviced-apartment' | 'shop' | 'studio-apartment' | 'villa' | '';
  bedrooms: number;
  bathrooms: number;
  area: number;
  description: string;
  amenities: string[];
  images: Array<{ file: File; isPrimary: boolean }>;
  
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
  leaseDuration: LeaseDuration;
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
  leaseEnd: '',
  leaseDuration: { value: 1, unit: 'years' }
};

const availableAmenities = [
  'Parking', 'Security', 'Gym', 'Swimming Pool', 'Garden', 'Power Backup',
  'Elevator', 'Balcony', 'Air Conditioning', 'Furnished', 'Internet', 'Clubhouse'
];

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
      if (!form.area || form.area <= 0) newErrors.area = 'Area must be greater than 0';
      if (form.area > 100000) newErrors.area = 'Area cannot exceed 100,000 sq ft';
      if (!form.description.trim()) newErrors.description = 'Description is required';
      if (form.bedrooms < 0 || form.bedrooms > 50) newErrors.bedrooms = 'Bedrooms must be between 0 and 50';
      if (form.bathrooms < 0 || form.bathrooms > 50) newErrors.bathrooms = 'Bathrooms must be between 0 and 50';
    }

    if (step === 2) {
      if (!form.rent || form.rent <= 0) newErrors.rent = 'Rent must be greater than 0';
      if (form.rent > 10000000) newErrors.rent = 'Rent cannot exceed ₹10,000,000';
      if (form.securityDeposit < 0) newErrors.securityDeposit = 'Security deposit cannot be negative';
      if (form.securityDeposit > 100000000) newErrors.securityDeposit = 'Security deposit cannot exceed ₹100,000,000';
      if (form.maintenanceCharges < 0) newErrors.maintenanceCharges = 'Maintenance charges cannot be negative';
      if (form.maintenanceCharges > 100000000) newErrors.maintenanceCharges = 'Maintenance charges cannot exceed ₹100,000,000';
    }

    if (step === 3 && form.tenantName.trim()) {
      if (!form.tenantPhone.trim()) newErrors.tenantPhone = 'Tenant phone is required when tenant name is provided';
      if (!form.tenantEmail.trim()) newErrors.tenantEmail = 'Tenant email is required when tenant name is provided';
      if (!form.leaseStart) newErrors.leaseStart = 'Lease start date is required when tenant name is provided';
      if (!form.leaseEnd) newErrors.leaseEnd = 'Lease end date is required when tenant name is provided';
      
      // Validate lease dates
      const dateValidationError = validateLeaseDates(form.leaseStart, form.leaseEnd);
      if (dateValidationError) {
        newErrors.leaseEnd = dateValidationError;
      }
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

      // 3. Upload images to property_images table
      if (form.images.length > 0) {
        try {
          console.log('Uploading property images to property_images table...');
          
          // Find which file should be primary before uploading
          const primaryFile = form.images.find(img => img.isPrimary);
          const primaryFileName = primaryFile?.file.name;
          
          console.log(`Primary image selected: ${primaryFileName}`);
          
          // Upload all images in parallel (faster performance)
          const uploadPromises = form.images.map(async (imageItem, index) => {
            try {
              await uploadPropertyImage(imageItem.file, propertyId, undefined, index);
            } catch (error) {
              console.error(`Error uploading image ${imageItem.file.name}:`, error);
              throw error;
            }
          });

          await Promise.all(uploadPromises);
          console.log('All images uploaded successfully');
          
          // After all uploads complete, set the correct primary image
          // Match by image_name (which stores the original file.name)
          if (primaryFileName) {
            console.log(`Setting primary image: ${primaryFileName}`);
            
            // First, unset all primary flags for this property
            await supabase
              .from('property_images')
              .update({ is_primary: false })
              .eq('property_id', propertyId);
            
            // Then set the selected image as primary by matching the file name
            const { error: setPrimaryError } = await supabase
              .from('property_images')
              .update({ is_primary: true })
              .eq('property_id', propertyId)
              .eq('image_name', primaryFileName);
            
            if (setPrimaryError) {
              console.error('Error setting primary image:', setPrimaryError);
            } else {
              console.log(`Primary image set successfully: ${primaryFileName}`);
            }
          }
          
          console.log('Image upload and primary selection complete');
        } catch (imgErr: any) {
          console.error('Image upload failed:', imgErr);
          setErrors({ submit: 'Property created but image upload failed: ' + (imgErr.message || 'Unknown error') });
          setLoading(false);
          return;
        }
      }

      // 4. Optionally insert tenant and lease
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
    
    // For numeric fields, use the enhanced validation from the Input component
    // The Input component now handles sanitization and validation internally
    const finalValue = e.target.type === 'number' ? parseFloat(value) || 0 : value;
    setForm(prev => ({ ...prev, [field]: finalValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle lease start date change and auto-calculate end date
  const handleLeaseStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startDate = e.target.value;
    setForm(prev => {
      const newForm = { ...prev, leaseStart: startDate };
      
      // Auto-calculate end date if duration is not custom
      if (startDate && prev.leaseDuration.unit !== 'custom') {
        newForm.leaseEnd = calculateEndDate(startDate, prev.leaseDuration);
      }
      
      return newForm;
    });
    
    // Clear any existing errors
    if (errors.leaseStart) {
      setErrors(prev => ({ ...prev, leaseStart: '', leaseEnd: '' }));
    }
  };

  // Handle lease duration change and auto-calculate end date
  const handleLeaseDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [value, unit] = e.target.value.split('-');
    const duration: LeaseDuration = {
      value: parseInt(value),
      unit: unit as 'months' | 'years' | 'custom'
    };
    
    setForm(prev => {
      const newForm = { ...prev, leaseDuration: duration };
      
      // Auto-calculate end date if duration is not custom and start date is set
      if (prev.leaseStart && duration.unit !== 'custom') {
        newForm.leaseEnd = calculateEndDate(prev.leaseStart, duration);
      }
      
      return newForm;
    });
    
    // Clear any existing errors
    if (errors.leaseEnd) {
      setErrors(prev => ({ ...prev, leaseEnd: '' }));
    }
  };

  // Handle manual lease end date change - set duration to custom
  const handleLeaseEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const endDate = e.target.value;
    setForm(prev => {
      const newForm = { ...prev, leaseEnd: endDate };
      
      // When user manually changes end date, always set to custom
      // Use value: 0 to match the dropdown option "0-custom"
      newForm.leaseDuration = { value: 0, unit: 'custom' };
      
      return newForm;
    });
    
    // Clear any existing errors
    if (errors.leaseEnd) {
      setErrors(prev => ({ ...prev, leaseEnd: '' }));
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

  // Handle file selection from input
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: Array<{ file: File; isPrimary: boolean }> = [];
    const errorMessages: string[] = [];
    
    files.forEach(file => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        errorMessages.push(`${file.name}: ${validation.error}`);
        return;
      }
      
      validFiles.push({ file, isPrimary: false });
    });
    
    if (errorMessages.length > 0) {
      alert(errorMessages.join('\n'));
    }
    
    if (validFiles.length > 0) {
      setForm(prev => {
        const newImages = [...prev.images, ...validFiles];
        // If this is the first image, set it as primary
        if (prev.images.length === 0 && newImages.length > 0) {
          newImages[0].isPrimary = true;
        }
        return { ...prev, images: newImages };
      });
    }
    
    // Clear the input
    e.target.value = '';
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles: Array<{ file: File; isPrimary: boolean }> = [];
    const errorMessages: string[] = [];
    
    files.forEach(file => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        errorMessages.push(`${file.name}: ${validation.error}`);
        return;
      }
      
      validFiles.push({ file, isPrimary: false });
    });
    
    if (errorMessages.length > 0) {
      alert(errorMessages.join('\n'));
    }
    
    if (validFiles.length > 0) {
      setForm(prev => {
        const newImages = [...prev.images, ...validFiles];
        // If this is the first image, set it as primary
        if (prev.images.length === 0 && newImages.length > 0) {
          newImages[0].isPrimary = true;
        }
        return { ...prev, images: newImages };
      });
    }
  };

  // Remove image from selection
  const removeImage = (index: number) => {
    setForm(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      // If we removed the primary image and there are still images left,
      // make the first one primary
      if (prev.images[index].isPrimary && newImages.length > 0) {
        newImages[0].isPrimary = true;
      }
      return { ...prev, images: newImages };
    });
  };

  // Set an image as primary
  const handleSetPrimaryImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.map((img, i) => ({
        ...img,
        isPrimary: i === index
      }))
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
                  <Logo size="sm" className="text-green-800" />
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
                  numericType="integer"
                  min={1}
                  max={100000}
                  required
                />

                <Input
                  label="Bedrooms"
                  type="number"
                  value={form.bedrooms}
                  onChange={handleChange('bedrooms')}
                  placeholder="2"
                  numericType="integer"
                  min={0}
                  max={50}
                />

                <Input
                  label="Bathrooms"
                  type="number"
                  value={form.bathrooms}
                  onChange={handleChange('bathrooms')}
                  placeholder="2"
                  numericType="integer"
                  min={0}
                  max={50}
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
                <div 
                  className="border-2 border-dashed border-white border-opacity-30 rounded-lg p-6 text-center hover:border-green-800 transition-colors cursor-pointer"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={handleChooseFilesClick}
                >
                  <Upload size={32} className="mx-auto text-glass-muted mb-4" />
                  <p className="text-glass-muted mb-4">
                    Drag and drop images here, or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                  />
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleChooseFilesClick();
                    }}
                  >
                    Choose Images
                  </Button>
                  <p className="text-xs text-glass-muted mt-2">
                    Supported formats: JPEG, PNG, WebP, GIF (Max 10MB each)
                  </p>
                </div>
                
                {form.images.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-glass">Selected Images ({form.images.length})</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {form.images.map((imageItem, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square relative rounded-lg overflow-hidden">
                            <img
                              src={URL.createObjectURL(imageItem.file)}
                              alt={`Property ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Primary badge */}
                            {imageItem.isPrimary && (
                              <div className="absolute top-2 left-2">
                                <div className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                  <Star size={12} fill="currentColor" />
                                  Primary
                                </div>
                              </div>
                            )}
                            
                            {/* Action buttons overlay */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex gap-2">
                                {!imageItem.isPrimary && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSetPrimaryImage(index);
                                    }}
                                    className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
                                    title="Set as primary"
                                  >
                                    <Star size={16} className="text-white" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removeImage(index);
                                  }}
                                  className="p-2 bg-red-600 bg-opacity-80 hover:bg-opacity-100 rounded-full transition-colors"
                                  title="Remove image"
                                >
                                  <X size={16} className="text-white" />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Image info */}
                          <div className="mt-2">
                            <p className="text-xs text-glass truncate" title={imageItem.file.name}>
                              {imageItem.file.name}
                            </p>
                            <p className="text-xs text-glass-muted">
                              {formatFileSize(imageItem.file.size)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
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
                  numericType="monetary"
                  min={0}
                  max={10000000}
                  required
                />

                <Input
                  label="Security Deposit (₹)"
                  type="number"
                  value={form.securityDeposit || ''}
                  onChange={handleChange('securityDeposit')}
                  error={errors.securityDeposit}
                  icon={<IndianRupee size={18} />}
                  placeholder="30000"
                  numericType="monetary"
                  min={0}
                  max={100000000}
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
                numericType="monetary"
                min={0}
                max={100000000}
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
                      <span className="text-glass">₹{(Number(form.rent) + Number(form.maintenanceCharges)).toLocaleString()}</span>
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

                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-glass">Lease Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Lease Start Date"
                        type="date"
                        value={form.leaseStart}
                        onChange={handleLeaseStartChange}
                        error={errors.leaseStart}
                        icon={<Calendar size={18} />}
                      />

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-glass">Lease Duration</label>
                        <select
                          value={`${form.leaseDuration.value}-${form.leaseDuration.unit}`}
                          onChange={handleLeaseDurationChange}
                          className="w-full h-11 px-3 rounded-lg glass-input text-glass transition-all duration-200"
                        >
                          <option value="6-months">6 Months</option>
                          <option value="11-months">11 Months</option>
                          <option value="1-years">1 Year</option>
                          <option value="2-years">2 Years</option>
                          <option value="3-years">3 Years</option>
                          <option value="5-years">5 Years</option>
                          <option value="0-custom">Custom</option>
                        </select>
                        <p className="text-xs text-glass-muted">
                          {form.leaseDuration.unit === 'custom' 
                            ? 'Manually adjust end date below' 
                            : 'End date will be calculated automatically'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Lease End Date"
                        type="date"
                        value={form.leaseEnd}
                        onChange={handleLeaseEndChange}
                        error={errors.leaseEnd}
                        icon={<Calendar size={18} />}
                      />

                      {form.leaseStart && form.leaseEnd && (
                        <div className="flex items-end">
                          <div className="glass rounded-lg p-3 w-full">
                            <p className="text-sm text-glass-muted mb-1">Calculated Duration</p>
                            <p className="text-lg font-semibold text-glass">
                              {form.leaseDuration.unit === 'custom' 
                                ? (() => {
                                    const months = calculateDurationMonths(form.leaseStart, form.leaseEnd);
                                    return `Custom (${months} ${months === 1 ? 'month' : 'months'})`;
                                  })()
                                : formatDuration(form.leaseDuration)
                              }
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {errors.leaseEnd && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-600">{errors.leaseEnd}</p>
                      </div>
                    )}

                    {form.leaseStart && form.leaseEnd && !errors.leaseEnd && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-600">
                          Lease period: {new Date(form.leaseStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to {new Date(form.leaseEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    )}
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
