import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
   
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Home, 
  IndianRupee, 
  User, 
  Camera, 
  Upload, 
  X, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Sparkles,
  CheckCircle,
  Star,
  Shield,
  Zap
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { Input } from '../webapp-ui/Input';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../hooks/useAuth';
import { formatDateDDMMYYYY } from '../../utils/timezoneUtils';

interface OnboardingData {
  // Property Basics
  propertyName: string;
  address: string;
  propertyType: 'apartment' | 'co-working-space' | 'duplex' | 'independent-house' | 'office' | 'penthouse' | 'retail-space' | 'serviced-apartment' | 'shop' | 'studio-apartment' | 'villa' | '';
  bedrooms: number;
  bathrooms: number;
  area: number;
  
  // Financial Details
  monthlyRent: number;
  securityDeposit: number;
  maintenanceCharges: number;
  moveInDate: string;
  
  // Tenant Information
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  leaseStartDate: string;
  leaseEndDate: string;
  
  // Finishing Touches
  propertyPhoto: File | null;
  enableNotifications: boolean;
  enableReminders: boolean;
}

const initialData: OnboardingData = {
  propertyName: '',
  address: '',
  propertyType: '',
  bedrooms: 1,
  bathrooms: 1,
  area: 0,
  monthlyRent: 0,
  securityDeposit: 0,
  maintenanceCharges: 0,
  moveInDate: '',
  tenantName: '',
  tenantPhone: '',
  tenantEmail: '',
  leaseStartDate: '',
  leaseEndDate: '',
  propertyPhoto: null,
  enableNotifications: true,
  enableReminders: true
};

export const OnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const steps = [
    { id: 0, title: 'Welcome', progress: 0 },
    { id: 1, title: 'Property Basics', progress: 25 },
    { id: 2, title: 'Financial Details', progress: 50 },
    { id: 3, title: 'Tenant Information', progress: 75 },
    { id: 4, title: 'Finishing Touches', progress: 100 }
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!data.propertyName.trim()) newErrors.propertyName = 'Property name is required';
      if (!data.address.trim()) newErrors.address = 'Address is required';
      if (!data.propertyType) newErrors.propertyType = 'Property type is required';
      if (data.area <= 0) newErrors.area = 'Area must be greater than 0';
    }

    if (step === 2) {
      if (data.monthlyRent <= 0) newErrors.monthlyRent = 'Monthly rent is required';
      if (data.securityDeposit < 0) newErrors.securityDeposit = 'Security deposit cannot be negative';
      if (!data.moveInDate) newErrors.moveInDate = 'Move-in date is required';
    }

    if (step === 3) {
      if (!data.tenantName.trim()) newErrors.tenantName = 'Tenant name is required';
      if (!data.tenantPhone.trim()) newErrors.tenantPhone = 'Tenant phone is required';
      if (!data.tenantEmail.trim()) newErrors.tenantEmail = 'Tenant email is required';
      if (!data.leaseStartDate) newErrors.leaseStartDate = 'Lease start date is required';
      if (!data.leaseEndDate) newErrors.leaseEndDate = 'Lease end date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 0 || validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mark user as onboarded
    localStorage.setItem('propertypro_onboarded', 'true');
    
    setIsSubmitting(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      navigate('/dashboard');
    }, 3000);
  };

  const handleChange = (field: keyof OnboardingData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : 
                  e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked :
                  e.target.value;
    setData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setData(prev => ({ ...prev, propertyPhoto: file }));
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen relative overflow-hidden floating-orbs flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-20 h-20 glass rounded-full flex items-center justify-center mx-auto mb-6 glow">
            <CheckCircle className="w-10 h-10 text-green-800" />
          </div>
          <h2 className="text-3xl font-bold text-glass mb-4">🎉 Welcome to PropertyPro!</h2>
          <p className="text-glass-muted mb-6">
            Your property "{data.propertyName}" has been successfully added to your portfolio.
          </p>
          <div className="glass rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-glass-muted">Monthly Rent:</span>
              <span className="text-glass font-medium">₹{data.monthlyRent.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-glass-muted">Tenant:</span>
              <span className="text-glass font-medium">{data.tenantName}</span>
            </div>
          </div>
          <p className="text-sm text-glass-muted">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden floating-orbs">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white border-opacity-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 glass rounded-lg flex items-center justify-center glow">
                <Logo size="sm" className="text-green-800" />
              </div>
              <h1 className="text-xl font-bold text-glass">PropertyPro Setup</h1>
            </div>
            {currentStep > 0 && (
              <div className="text-sm text-glass-muted">
                Step {currentStep} of {steps.length - 1}
              </div>
            )}
          </div>
          
          {currentStep > 0 && (
            <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
              <div
                className="bg-green-800 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${steps[currentStep].progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <main className="pt-32 pb-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Welcome Screen */}
          {currentStep === 0 && (
            <div className="text-center">
              <div className="w-24 h-24 glass rounded-full flex items-center justify-center mx-auto mb-8 glow">
                <Sparkles className="w-12 h-12 text-green-800" />
              </div>
              
              <h1 className="text-4xl font-bold text-glass mb-4">
                Welcome to PropertyPro, {user?.name}! 👋
              </h1>
              
              <p className="text-xl text-glass-muted mb-8">
                Let's get your first property set up in just a few simple steps.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="glass-card rounded-xl p-6 text-center">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-green-800" />
                  </div>
                  <h3 className="font-semibold text-glass mb-2">Secure & Private</h3>
                  <p className="text-sm text-glass-muted">Your data is encrypted and secure</p>
                </div>
                
                <div className="glass-card rounded-xl p-6 text-center">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-green-800" />
                  </div>
                  <h3 className="font-semibold text-glass mb-2">AI-Powered</h3>
                  <p className="text-sm text-glass-muted">Smart automation for property management</p>
                </div>
                
                <div className="glass-card rounded-xl p-6 text-center">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Star className="w-6 h-6 text-green-800" />
                  </div>
                  <h3 className="font-semibold text-glass mb-2">Easy to Use</h3>
                  <p className="text-sm text-glass-muted">Intuitive interface for all users</p>
                </div>
              </div>

              <Button onClick={handleNext} size="lg" className="px-8">
                Get Started
                <ArrowRight size={20} className="ml-2" />
              </Button>
            </div>
          )}

          {/* Step 1: Property Basics */}
          {currentStep === 1 && (
            <div className="glass-card rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
                  <Home className="w-8 h-8 text-green-800" />
                </div>
                <h2 className="text-2xl font-bold text-glass mb-2">Property Basics</h2>
                <p className="text-glass-muted">Tell us about your property</p>
              </div>

              <div className="space-y-6">
                <Input
                  label="Property Name"
                  type="text"
                  value={data.propertyName}
                  onChange={handleChange('propertyName')}
                  error={errors.propertyName}
                  icon={<Logo size="sm" className="text-green-800" />}
                  placeholder="e.g., Green Valley Apartment"
                />

                <Input
                  label="Property Address"
                  type="text"
                  value={data.address}
                  onChange={handleChange('address')}
                  error={errors.address}
                  icon={<MapPin size={18} />}
                  placeholder="Complete address with city and state"
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-glass">Property Type</label>
                  <select
                    value={data.propertyType}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input
                    label="Area (sq ft)"
                    type="number"
                    value={data.area || ''}
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
                    value={data.bedrooms}
                    onChange={handleChange('bedrooms')}
                    placeholder="2"
                    numericType="integer"
                    min={0}
                    max={50}
                  />

                  <Input
                    label="Bathrooms"
                    type="number"
                    value={data.bathrooms}
                    onChange={handleChange('bathrooms')}
                    placeholder="2"
                    numericType="integer"
                    min={0}
                    max={50}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Financial Details */}
          {currentStep === 2 && (
            <div className="glass-card rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
                  <IndianRupee className="w-8 h-8 text-green-800" />
                </div>
                <h2 className="text-2xl font-bold text-glass mb-2">Financial Details</h2>
                <p className="text-glass-muted">Set up your rental pricing</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Monthly Rent (₹)"
                    type="number"
                    value={data.monthlyRent || ''}
                    onChange={handleChange('monthlyRent')}
                    error={errors.monthlyRent}
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
                    value={data.securityDeposit || ''}
                    onChange={handleChange('securityDeposit')}
                    error={errors.securityDeposit}
                    icon={<IndianRupee size={18} />}
                    placeholder="30000"
                    numericType="monetary"
                    min={0}
                    max={100000000}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Maintenance Charges (₹)"
                    type="number"
                    value={data.maintenanceCharges || ''}
                    onChange={handleChange('maintenanceCharges')}
                    icon={<IndianRupee size={18} />}
                    placeholder="2000"
                    numericType="monetary"
                    min={0}
                    max={100000000}
                  />

                  <Input
                    label="Move-in Date"
                    type="date"
                    value={data.moveInDate}
                    onChange={handleChange('moveInDate')}
                    error={errors.moveInDate}
                    icon={<Calendar size={18} />}
                  />
                </div>

                {data.monthlyRent > 0 && (
                  <div className="glass rounded-lg p-4">
                    <h3 className="font-medium text-glass mb-3">Financial Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-glass-muted">Monthly Rent:</span>
                        <span className="text-glass">₹{data.monthlyRent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-glass-muted">Security Deposit:</span>
                        <span className="text-glass">₹{data.securityDeposit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-glass-muted">Maintenance:</span>
                        <span className="text-glass">₹{data.maintenanceCharges.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-white border-opacity-20 pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                          <span className="text-glass">Total Monthly:</span>
                          <span className="text-glass">₹{(Number(data.monthlyRent) + Number(data.maintenanceCharges)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Tenant Information */}
          {currentStep === 3 && (
            <div className="glass-card rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
                  <User className="w-8 h-8 text-green-800" />
                </div>
                <h2 className="text-2xl font-bold text-glass mb-2">Tenant Information</h2>
                <p className="text-glass-muted">Add your tenant details</p>
              </div>

              <div className="space-y-6">
                <Input
                  label="Tenant Name"
                  type="text"
                  value={data.tenantName}
                  onChange={handleChange('tenantName')}
                  error={errors.tenantName}
                  icon={<User size={18} />}
                  placeholder="e.g., Amit Sharma"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Tenant Phone"
                    type="tel"
                    value={data.tenantPhone}
                    onChange={handleChange('tenantPhone')}
                    error={errors.tenantPhone}
                    icon={<Phone size={18} />}
                    placeholder="+91 9876543210"
                  />

                  <Input
                    label="Tenant Email"
                    type="email"
                    value={data.tenantEmail}
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
                    value={data.leaseStartDate}
                    onChange={handleChange('leaseStartDate')}
                    error={errors.leaseStartDate}
                    icon={<Calendar size={18} />}
                  />

                  <Input
                    label="Lease End Date"
                    type="date"
                    value={data.leaseEndDate}
                    onChange={handleChange('leaseEndDate')}
                    error={errors.leaseEndDate}
                    icon={<Calendar size={18} />}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Finishing Touches */}
          {currentStep === 4 && (
            <div className="glass-card rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
                  <Camera className="w-8 h-8 text-green-800" />
                </div>
                <h2 className="text-2xl font-bold text-glass mb-2">Finishing Touches</h2>
                <p className="text-glass-muted">Complete your property setup</p>
              </div>

              <div className="space-y-6">
                {/* Photo Upload */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-glass">Property Photo</label>
                  <div className="border-2 border-dashed border-white border-opacity-30 rounded-lg p-6 text-center">
                    {data.propertyPhoto ? (
                      <div className="flex items-center justify-center gap-3">
                        <img
                          src={URL.createObjectURL(data.propertyPhoto)}
                          alt="Property"
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div>
                          <p className="font-medium text-glass">{data.propertyPhoto.name}</p>
                          <p className="text-sm text-glass-muted">
                            {(data.propertyPhoto.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={() => setData(prev => ({ ...prev, propertyPhoto: null }))}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <X size={16} className="text-red-600" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="mx-auto text-glass-muted mb-2" />
                        <p className="text-glass-muted mb-2">Upload a photo of your property</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="photo-upload"
                        />
                        <label htmlFor="photo-upload">
                          <Button variant="outline" className="cursor-pointer">
                            Choose Photo
                          </Button>
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="glass rounded-lg p-4">
                  <h3 className="font-medium text-glass mb-4">Notification Preferences</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.enableNotifications}
                        onChange={handleChange('enableNotifications')}
                        className="rounded border-white border-opacity-30 bg-white bg-opacity-10 text-green-800 focus:ring-green-800"
                      />
                      <div>
                        <p className="text-sm font-medium text-glass">Enable Notifications</p>
                        <p className="text-xs text-glass-muted">Get notified about rent payments and important updates</p>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.enableReminders}
                        onChange={handleChange('enableReminders')}
                        className="rounded border-white border-opacity-30 bg-white bg-opacity-10 text-green-800 focus:ring-green-800"
                      />
                      <div>
                        <p className="text-sm font-medium text-glass">Payment Reminders</p>
                        <p className="text-xs text-glass-muted">Automatic reminders for upcoming rent payments</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Summary */}
                <div className="glass rounded-lg p-4">
                  <h3 className="font-medium text-glass mb-3">Setup Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-glass-muted">Property:</span>
                      <span className="text-glass">{data.propertyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-glass-muted">Tenant:</span>
                      <span className="text-glass">{data.tenantName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-glass-muted">Monthly Rent:</span>
                      <span className="text-glass">₹{data.monthlyRent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-glass-muted">Lease Period:</span>
                      <span className="text-glass">
                        {formatDateDDMMYYYY(data.leaseStartDate)} - {formatDateDDMMYYYY(data.leaseEndDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          {currentStep > 0 && (
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Previous
              </Button>

              {currentStep < steps.length - 1 ? (
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
                  loading={isSubmitting}
                  className="flex items-center gap-2"
                >
                  <Check size={16} />
                  Complete Setup
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};