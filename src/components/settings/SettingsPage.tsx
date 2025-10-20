import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  Building2, 
  LogOut, 
  Bell, 
  HelpCircle, 
  User, 
  Mail,
  Phone,
  Lock,
  Shield,
  CreditCard,
  Eye,
  EyeOff,
  Check,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Smartphone,
  Calendar,
  BarChart3,
  FileText,
  Crown,
  Zap
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { Input } from '../webapp-ui/Input';
import { NotificationBell } from '../ui/NotificationBell';
import { PasswordStrength } from '../webapp-ui/PasswordStrength';
import { useAuth } from '../../hooks/useAuth';
// import { formatDateDDMMYYYY } from '../../utils/timezoneUtils';
import { validateEmail, validatePhone, validatePassword } from '../../utils/validation';
import { sanitizeText, sanitizeEmail, sanitizePhone } from '../../utils/security';
import { ErrorAuditTest } from '../test/ErrorAuditTest';
import { canAccessTesting } from '../../utils/adminUtils';
import { purgeUserData } from '../../utils/accountDeletion';
import { 
  getUserSettings, 
  createUserSettings, 
  updateUserSettings,
  getSubscriptionPlans,
  getUserSubscription,
  getBillingHistory,
  updateUserProfile,
  getUserProfile,
  getActivePropertyCount,
  updatePropertyCountInSettings,
  changeSubscriptionPlan,
  formatCurrency,
  formatFileSize,
  type UserSettings,
  type SubscriptionPlan as UtilsSubscriptionPlan,
  type UserSubscription
} from '../../utils/settingsUtils';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  propertyCount: number;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  paymentReminders: boolean;
  leaseExpiry: boolean;
  reminderTiming: 'immediate' | '1day' | '3days' | '1week';
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
}



// Login activity formatting function removed

export const SettingsPage: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  const [activeSection, setActiveSection] = useState('profile');
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: '',
    email: '',
    phone: '',
    propertyCount: 0
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: true,
    paymentReminders: true,
    leaseExpiry: true,
    reminderTiming: '3days',
    quietHours: true,
    quietStart: '22:00',
    quietEnd: '08:00'
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(validatePassword(''));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  
  // Subscription plan change state
  const [planChangeLoading, setPlanChangeLoading] = useState<string | null>(null);
  const [planChangeMessage, setPlanChangeMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Database state
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<UtilsSubscriptionPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  // const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  // Login activity state removed per request
  const [dataLoading, setDataLoading] = useState(true);
  
  const { user, logout, updatePassword } = useAuth();
  const navigate = useNavigate();

  // Handle URL parameter changes
  useEffect(() => {
    if (tab) {
      // Validate that the tab exists in our sections
      const validTabs = ['profile', 'security', 'notifications', 'subscription', 'testing'];
      if (validTabs.includes(tab)) {
        setActiveSection(tab);
      } else {
        // Invalid tab, redirect to default
        navigate('/settings/profile', { replace: true });
      }
    } else {
      // No tab specified, redirect to profile
      navigate('/settings/profile', { replace: true });
    }
  }, [tab, navigate]);

  // Load data on component mount
  useEffect(() => {
    const loadSettingsData = async () => {
      if (!user?.id) return;
      
      setDataLoading(true);
      try {
        // Load all settings data in parallel with individual error handling
        const [
          settings,
          plans,
          subscription,
          billing
        ] = await Promise.allSettled([
          getUserSettings(user.id),
          getSubscriptionPlans(),
          getUserSubscription(user.id),
          getBillingHistory(user.id)
        ]);

        // Handle each result individually
        const settingsData = settings.status === 'fulfilled' ? settings.value : null;
        const plansData = plans.status === 'fulfilled' ? plans.value : [];
        const subscriptionData = subscription.status === 'fulfilled' ? subscription.value : null;
        const billingData = billing.status === 'fulfilled' ? billing.value : [];
        // Login activity removed

        // Log any errors for debugging
        if (settings.status === 'rejected') {
          console.warn('Failed to load user settings:', settings.reason);
        }
        if (plans.status === 'rejected') {
          console.warn('Failed to load subscription plans:', plans.reason);
        }
        if (subscription.status === 'rejected') {
          console.warn('Failed to load user subscription:', subscription.reason);
        }
        if (billing.status === 'rejected') {
          console.warn('Failed to load billing history:', billing.reason);
        }
        // No login activity warnings

        // Set user settings or create default ones
        if (settingsData) {
          setUserSettings(settingsData);
          setNotificationSettings({
            emailNotifications: settingsData.email_notifications,
            smsNotifications: settingsData.sms_notifications,
            paymentReminders: settingsData.payment_reminders,
            leaseExpiry: settingsData.lease_expiry_alerts,
            reminderTiming: settingsData.reminder_timing,
            quietHours: settingsData.quiet_hours_enabled,
            quietStart: settingsData.quiet_hours_start,
            quietEnd: settingsData.quiet_hours_end
          });
          setProfileForm(prev => ({
            ...prev,
            propertyCount: settingsData.property_count
          }));
        } else {
          // Create default user settings if none exist
          console.log('No user settings found, creating default settings...');
          try {
            const defaultSettings = await createUserSettings({
              user_id: user.id,
              email_notifications: true,
              sms_notifications: true,
              payment_reminders: true,
              lease_expiry_alerts: true,
              reminder_timing: '3days',
              quiet_hours_enabled: true,
              quiet_hours_start: '22:00',
              quiet_hours_end: '08:00',
              timezone: 'Asia/Kolkata',
              language: 'en',
              property_count: 0
            });
            
            if (defaultSettings) {
              setUserSettings(defaultSettings);
              setNotificationSettings({
                emailNotifications: true,
                smsNotifications: true,
                paymentReminders: true,
                leaseExpiry: true,
                reminderTiming: '3days',
                quietHours: true,
                quietStart: '22:00',
                quietEnd: '08:00'
              });
            }
          } catch (error) {
            console.error('Failed to create default user settings:', error);
          }
        }

        // Set subscription data
        setSubscriptionPlans(plansData);
        setUserSubscription(subscriptionData);
        
        // Note: All users should now have subscription records created automatically
        // via database trigger or backfill migration. No need for fake subscriptions.
        
        // Billing history UI is disabled in MVP; retain fetch for future but don't store in state

        // Load user profile
        const profile = await getUserProfile(user.id);
        if (profile) {
          setProfileForm(prev => ({
            ...prev,
            name: profile.name || '',
            email: profile.email || '',
            phone: profile.phone || ''
          }));
        }

        // Fetch and update actual property count
        const actualPropertyCount = await getActivePropertyCount(user.id);
        setProfileForm(prev => ({
          ...prev,
          propertyCount: actualPropertyCount
        }));

        // Update property count in settings if it differs from actual count
        if (settingsData && settingsData.property_count !== actualPropertyCount) {
          await updatePropertyCountInSettings(user.id);
        }

      } catch (error) {
        console.error('Error loading settings data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadSettingsData();
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const sections = [
    { id: 'profile', name: 'Profile Information', icon: User },
    { id: 'security', name: 'Password & Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'subscription', name: 'Subscription Plan', icon: CreditCard },
    // Only show testing section in development or for admin users
    ...(canAccessTesting(user?.email) 
      ? [{ id: 'testing', name: 'Error & Audit Testing', icon: AlertTriangle }] 
      : [])
  ];

  const validateProfile = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profileForm.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profileForm.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(profileForm.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!profileForm.phone) {
      newErrors.phone = 'Phone is required';
    } else if (!validatePhone(profileForm.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Property count is auto-fetched and read-only, no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (!passwordStrength.isValid) {
      newErrors.newPassword = 'Password does not meet requirements';
    }

    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;
    
    // Sanitize form data before validation and submission
    const sanitizedForm = {
      ...profileForm,
      name: sanitizeText(profileForm.name),
      email: sanitizeEmail(profileForm.email),
      phone: sanitizePhone(profileForm.phone),
      propertyCount: profileForm.propertyCount // Numbers don't need sanitization
    };
    
    // Update form with sanitized data
    setProfileForm(sanitizedForm);
    
    if (!validateProfile()) return;

    setLoading(true);
    try {
      // Update user profile
      const profileResult = await updateUserProfile(user.id, {
        name: sanitizedForm.name,
        email: sanitizedForm.email,
        phone: sanitizedForm.phone
      });

      if (!profileResult) {
        throw new Error('Failed to update profile');
      }

      // Update or create user settings (property count is auto-managed)
      if (userSettings) {
        // Only update notification settings, not property count
        await updateUserSettings(user.id, {});
      } else {
        // Create settings with current property count
        const currentPropertyCount = await getActivePropertyCount(user.id);
        await createUserSettings({
          user_id: user.id,
          property_count: currentPropertyCount,
          email_notifications: true,
          sms_notifications: true,
          payment_reminders: true,
          lease_expiry_alerts: true,
          reminder_timing: '3days',
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'Asia/Kolkata',
          language: 'en'
        });
      }

      // Reload data to reflect changes
      const updatedSettings = await getUserSettings(user.id);
      if (updatedSettings) {
        setUserSettings(updatedSettings);
      }

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setLoading(true);
    try {
      const success = await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      if (success) {
        // Reset form and show success
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordStrength(validatePassword(''));
        alert('Password changed successfully!');
      } else {
        alert('Failed to change password. Please check your current password and try again.');
      }
    } catch (error) {
      console.error('Password change error:', error);
      alert('An error occurred while changing your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    // Property count is read-only, don't allow changes
    if (field === 'propertyCount') return;
    
    let value = e.target.value;
    
    // Don't sanitize during typing - only sanitize on form submission
    // This allows users to type freely without interruption
    
    setProfileForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePasswordChange = (field: keyof PasswordForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    
    if (field === 'newPassword') {
      setPasswordStrength(validatePassword(value));
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNotificationToggle = async (field: keyof NotificationSettings) => {
    if (!user?.id) return;
    
    const newValue = !notificationSettings[field];
    setNotificationSettings(prev => ({
      ...prev,
      [field]: newValue
    }));

    // Update in database
    try {
      const dbField = field === 'leaseExpiry' ? 'lease_expiry_alerts' : 
                     field === 'quietHours' ? 'quiet_hours_enabled' :
                     field === 'quietStart' ? 'quiet_hours_start' :
                     field === 'quietEnd' ? 'quiet_hours_end' :
                     field === 'reminderTiming' ? 'reminder_timing' :
                     field === 'emailNotifications' ? 'email_notifications' :
                     field === 'smsNotifications' ? 'sms_notifications' :
                     field === 'paymentReminders' ? 'payment_reminders' : field;

      if (userSettings) {
        await updateUserSettings(user.id, { [dbField]: newValue });
      } else {
        // Create settings if they don't exist
        await createUserSettings({
          user_id: user.id,
          email_notifications: field === 'emailNotifications' ? newValue : true,
          sms_notifications: field === 'smsNotifications' ? newValue : true,
          payment_reminders: field === 'paymentReminders' ? newValue : true,
          lease_expiry_alerts: field === 'leaseExpiry' ? newValue : true,
          reminder_timing: '3days',
          quiet_hours_enabled: field === 'quietHours' ? newValue : true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'Asia/Kolkata',
          language: 'en',
          property_count: 0
        });
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      // Revert the change on error
      setNotificationSettings(prev => ({
        ...prev,
        [field]: !newValue
      }));
    }
  };

  

  // Data export functionality removed with Data & Privacy section
  // const exportData = async () => { ... };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      await purgeUserData(user.id);
      
      // Log out and redirect to login
      await logout();
      navigate('/auth/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please contact support.');
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handlePlanChange = async (newPlanId: string) => {
    if (!user?.id) return;
    
    setPlanChangeLoading(newPlanId);
    setPlanChangeMessage(null);
    
    try {
      const result = await changeSubscriptionPlan(user.id, newPlanId);
      
      if (result.success) {
        setPlanChangeMessage({ type: 'success', message: result.message });
        
        // Reload subscription data to reflect changes
        const [updatedSubscription, updatedPlans] = await Promise.all([
          getUserSubscription(user.id),
          getSubscriptionPlans()
        ]);
        
        setUserSubscription(updatedSubscription);
        setSubscriptionPlans(updatedPlans);
        
        // Clear message after 5 seconds
        setTimeout(() => setPlanChangeMessage(null), 5000);
      } else {
        setPlanChangeMessage({ type: 'error', message: result.message });
        // Clear error message after 8 seconds
        setTimeout(() => setPlanChangeMessage(null), 8000);
      }
    } catch (error) {
      console.error('Error changing plan:', error);
      setPlanChangeMessage({ type: 'error', message: 'An unexpected error occurred. Please try again.' });
      setTimeout(() => setPlanChangeMessage(null), 8000);
    } finally {
      setPlanChangeLoading(null);
    }
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
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-glass-muted hover:text-glass hover:bg-white hover:bg-opacity-10 ${
                      item.path === '/settings' ? 'text-glass bg-white bg-opacity-10' : ''
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-glass mb-2">Settings</h1>
          <p className="text-glass-muted">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-xl p-6 sticky top-24">
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => navigate(`/settings/${section.id}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                      activeSection === section.id
                        ? 'glass text-glass'
                        : 'text-glass-muted hover:text-glass hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    <section.icon size={18} />
                    <span className="font-medium">{section.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Information */}
            {activeSection === 'profile' && (
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center glow">
                    <User className="w-6 h-6 text-green-800" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-glass">Profile Information</h2>
                    <p className="text-glass-muted">Update your personal information</p>
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Full Name"
                      type="text"
                      value={profileForm.name}
                      onChange={handleProfileChange('name')}
                      error={errors.name}
                      icon={<User size={18} />}
                      placeholder="Enter your full name"
                    />

                    <Input
                      label="Email Address"
                      type="email"
                      value={profileForm.email}
                      onChange={handleProfileChange('email')}
                      error={errors.email}
                      icon={<Mail size={18} />}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Phone Number"
                      type="tel"
                      value={profileForm.phone}
                      onChange={handleProfileChange('phone')}
                      error={errors.phone}
                      icon={<Phone size={18} />}
                      placeholder="+91 9876543210"
                    />

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-glass">
                        Active Properties
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building2 size={18} className="text-glass-muted" />
                        </div>
                        <input
                          type="number"
                          value={profileForm.propertyCount}
                          readOnly
                          className="w-full pl-10 pr-3 py-2 glass-input rounded-lg text-glass bg-white bg-opacity-5 cursor-not-allowed"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-glass-muted">
                        This count is automatically updated based on your active properties. 
                        It's used for subscription management and cannot be manually edited.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      loading={loading}
                      disabled={loading}
                      className="px-6"
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>

                {/* Delete Account Section */}
                <div className="glass-card rounded-xl p-6 border-l-4 border-red-500 mt-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-glass">Delete Account</h2>
                      <p className="text-glass-muted">Permanently delete your account and all data</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="glass rounded-lg p-4 bg-red-50 bg-opacity-10">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-red-600 mb-1">Warning: This action cannot be undone</h3>
                          <p className="text-sm text-glass-muted">
                            Deleting your account will immediately and permanently remove all your properties, leases, 
                            payments, documents, and personal data from all databases and storage. This action cannot be reversed.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => setShowDeleteDialog(true)}
                      variant="outline"
                      className="text-red-600 hover:text-red-700 border-red-600 hover:border-red-700"
                    >
                      Delete My Account
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Password & Security */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                {/* Change Password */}
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 glass rounded-lg flex items-center justify-center glow">
                      <Lock className="w-6 h-6 text-green-800" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-glass">Change Password</h2>
                      <p className="text-glass-muted">Update your account password</p>
                    </div>
                  </div>

                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Input
                        label="Current Password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange('currentPassword')}
                        error={errors.currentPassword}
                        icon={<Lock size={18} />}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-11 text-glass-muted hover:text-glass transition-colors"
                        style={{ position: 'relative', top: '-40px', right: '12px', float: 'right' }}
                      >
                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <Input
                        label="New Password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange('newPassword')}
                        error={errors.newPassword}
                        icon={<Lock size={18} />}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-11 text-glass-muted hover:text-glass transition-colors"
                        style={{ position: 'relative', top: '-40px', right: '12px', float: 'right' }}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      
                      {passwordForm.newPassword && (
                        <PasswordStrength strength={passwordStrength} />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Input
                        label="Confirm New Password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange('confirmPassword')}
                        error={errors.confirmPassword}
                        icon={<Lock size={18} />}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-11 text-glass-muted hover:text-glass transition-colors"
                        style={{ position: 'relative', top: '-40px', right: '12px', float: 'right' }}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        loading={loading}
                        disabled={loading}
                        className="px-6"
                      >
                        Change Password
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Login Activity removed per request */}
              </div>
            )}

            {/* Notification Preferences */}
            {activeSection === 'notifications' && (
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center glow">
                    <Bell className="w-6 h-6 text-green-800" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-glass">Notification Preferences</h2>
                    <p className="text-glass-muted">Manage how you receive notifications</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Notification Types */}
                  <div>
                    <h3 className="text-lg font-medium text-glass mb-4">Notification Types</h3>
                    <div className="space-y-4">
                      {[
                        { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email', icon: Mail },
                        { key: 'smsNotifications', label: 'SMS Notifications', description: 'Receive notifications via SMS', icon: Smartphone },
                        { key: 'paymentReminders', label: 'Payment Reminders', description: 'Reminders for upcoming rent payments', icon: CreditCard },
                        { key: 'leaseExpiry', label: 'Lease Expiry Alerts', description: 'Alerts when leases are about to expire', icon: Calendar }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 glass rounded-lg">
                          <div className="flex items-center gap-3">
                            <item.icon size={20} className="text-glass-muted" />
                            <div>
                              <p className="font-medium text-glass">{item.label}</p>
                              <p className="text-sm text-glass-muted">{item.description}</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationSettings[item.key as keyof NotificationSettings] as boolean}
                              onChange={() => handleNotificationToggle(item.key as keyof NotificationSettings)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-white bg-opacity-20 border-2 border-green-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:border-green-800 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-2 after:border-green-800 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-800"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timing and Test sections removed per requirements */}
                </div>
              </div>
            )}

            {/* Subscription Plan */}
            {activeSection === 'subscription' && (
              <div className="space-y-6">
                {/* Plan Change Messages */}
                {planChangeMessage && (
                  <div className={`glass-card rounded-xl p-4 border-l-4 ${
                    planChangeMessage.type === 'success' 
                      ? 'border-green-800 glass-success' 
                      : 'border-red-600 glass-error'
                  }`}>
                    <div className="flex items-center gap-3">
                      {planChangeMessage.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-800" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      <p className={`font-medium text-glass`}>
                        {planChangeMessage.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Current Plan */}
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 glass rounded-lg flex items-center justify-center glow">
                      <CreditCard className="w-6 h-6 text-green-800" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-glass">Subscription Plans</h2>
                      <p className="text-glass-muted">Choose or change your subscription plan</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {dataLoading ? (
                      <div className="col-span-3 text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-800 mx-auto"></div>
                        <p className="text-glass-muted mt-2">Loading subscription plans...</p>
                      </div>
                    ) : (
                      subscriptionPlans.map((plan) => {
                        const isCurrentPlan = userSubscription?.plan_id === plan.id;
                        const planComparison = userSubscription?.plan_id 
                          ? { isUpgrade: plan.price > (userSubscription.plan?.price || 0), isDowngrade: plan.price < (userSubscription.plan?.price || 0), isSamePlan: false, actionText: plan.price > (userSubscription.plan?.price || 0) ? 'Upgrade' : plan.price < (userSubscription.plan?.price || 0) ? 'Downgrade' : 'Change Plan' }
                          : { isUpgrade: false, isDowngrade: false, isSamePlan: false, actionText: 'Select Plan' };
                        
                        return (
                          <div
                            key={plan.id}
                            className={`glass-card rounded-xl p-6 relative transition-all duration-300 ${
                              isCurrentPlan ? 'ring-2 ring-green-800 glow' : 'hover:glow'
                            }`}
                          >
                            {isCurrentPlan && (
                              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <span className="glass-button text-white px-3 py-1 rounded-full text-xs font-medium">
                                  Current Plan
                                </span>
                              </div>
                            )}
                            
                            <div className="text-center mb-4">
                              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center mx-auto mb-3 glow">
                                {plan.name === 'Portfolio' ? (
                                  <Crown className="w-6 h-6 text-green-800" />
                                ) : plan.name === 'Professional' ? (
                                  <Zap className="w-6 h-6 text-green-800" />
                                ) : (
                                  <User className="w-6 h-6 text-green-800" />
                                )}
                              </div>
                              <h3 className="text-lg font-semibold text-glass">{plan.name}</h3>
                              <div className="mt-2">
                                <span className="text-2xl font-bold text-glass">{formatCurrency(plan.price)}</span>
                                <span className="text-glass-muted">/month</span>
                              </div>
                              <p className="text-sm text-glass-muted mt-1">Up to {plan.properties_limit} properties</p>
                            </div>

                            <ul className="space-y-2 mb-6">
                              {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm text-glass">
                                  <Check size={14} className="text-green-800 flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>

                            <Button
                              variant={isCurrentPlan ? 'outline' : planComparison.isUpgrade ? 'primary' : 'outline'}
                              className="w-full"
                              disabled={isCurrentPlan || planChangeLoading === plan.id}
                              loading={planChangeLoading === plan.id}
                              onClick={() => !isCurrentPlan && handlePlanChange(plan.id)}
                            >
                              {isCurrentPlan 
                                ? 'Current Plan' 
                                : planChangeLoading === plan.id 
                                  ? 'Processing...' 
                                  : planComparison.actionText
                              }
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Usage Statistics */}
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 glass rounded-lg flex items-center justify-center glow">
                      <BarChart3 className="w-6 h-6 text-green-800" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-glass">Usage Statistics</h2>
                      <p className="text-glass-muted">Current month usage</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {dataLoading ? (
                      <div className="col-span-3 text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-800 mx-auto"></div>
                        <p className="text-glass-muted mt-2">Loading usage statistics...</p>
                      </div>
                    ) : (
                      <>
                        <div className="glass-card rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-glass-muted">Properties</span>
                            <span className="text-glass font-medium">
                              {userSubscription?.properties_used || 0} / {userSubscription?.plan?.properties_limit || 3}
                            </span>
                          </div>
                          <div className="w-full glass-input rounded-full h-2">
                            {(() => {
                              const used = userSubscription?.properties_used || 0;
                              const limit = userSubscription?.plan?.properties_limit || 3;
                              const percentage = Math.min((used / limit) * 100, 100);
                              const color = percentage >= 100 ? 'bg-red-600' : percentage >= 80 ? 'bg-orange-500' : 'bg-green-800';
                              return <div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }} />;
                            })()}
                          </div>
                          <p className={`text-xs mt-1 ${
                            (userSubscription?.properties_used || 0) >= (userSubscription?.plan?.properties_limit || 3) 
                              ? 'text-red-600' 
                              : (userSubscription?.properties_used || 0) >= (userSubscription?.plan?.properties_limit || 3) * 0.8 
                                ? 'text-orange-600' 
                                : 'text-green-800'
                          }`}>
                            {(userSubscription?.properties_used || 0) >= (userSubscription?.plan?.properties_limit || 3) 
                              ? 'Upgrade needed' 
                              : (userSubscription?.properties_used || 0) >= (userSubscription?.plan?.properties_limit || 3) * 0.8 
                                ? 'Approaching limit' 
                                : 'Within limits'}
                          </p>
                        </div>

                        <div className="glass-card rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-glass-muted">Storage</span>
                            <span className="text-glass font-medium">
                              {formatFileSize((userSubscription?.storage_used_mb || 0) * 1024 * 1024)} / {
                                userSubscription?.plan?.storage_limit_mb === -1 
                                  ? 'Unlimited' 
                                  : formatFileSize((userSubscription?.plan?.storage_limit_mb || 100) * 1024 * 1024)
                              }
                            </span>
                          </div>
                          <div className="w-full glass-input rounded-full h-2">
                            {(() => {
                              const used = userSubscription?.storage_used_mb || 0;
                              const limit = userSubscription?.plan?.storage_limit_mb || 100;
                              if (limit === -1) return <div className="bg-green-800 h-2 rounded-full" style={{ width: '25%' }} />;
                              const percentage = Math.min((used / limit) * 100, 100);
                              const color = percentage >= 100 ? 'bg-red-600' : percentage >= 80 ? 'bg-orange-500' : 'bg-green-800';
                              return <div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }} />;
                            })()}
                          </div>
                          <p className={`text-xs mt-1 ${
                            userSubscription?.plan?.storage_limit_mb === -1 
                              ? 'text-green-800'
                              : (userSubscription?.storage_used_mb || 0) >= (userSubscription?.plan?.storage_limit_mb || 100) 
                                ? 'text-red-600' 
                                : (userSubscription?.storage_used_mb || 0) >= (userSubscription?.plan?.storage_limit_mb || 100) * 0.8 
                                  ? 'text-orange-600' 
                                  : 'text-green-800'
                          }`}>
                            {userSubscription?.plan?.storage_limit_mb === -1 
                              ? 'Unlimited' 
                              : (userSubscription?.storage_used_mb || 0) >= (userSubscription?.plan?.storage_limit_mb || 100) 
                                ? 'Upgrade needed' 
                                : (userSubscription?.storage_used_mb || 0) >= (userSubscription?.plan?.storage_limit_mb || 100) * 0.8 
                                  ? 'Approaching limit' 
                                  : 'Within limits'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Billing History */}
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 glass rounded-lg flex items-center justify-center glow">
                        <FileText className="w-6 h-6 text-green-800" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-glass">Billing History</h2>
                        <p className="text-glass-muted">Download invoices and receipts</p>
                      </div>
                    </div>
                    
                  </div>

                  <div className="mb-4 p-3 rounded-lg bg-yellow-100 bg-opacity-20 border border-yellow-500 border-opacity-30">
                    <p className="text-sm text-yellow-700">
                      This is an MVP prototype and this section is not implemented yet
                    </p>
                  </div>

                  
                </div>
              </div>
            )}


            {/* Error & Audit Testing */}
            {activeSection === 'testing' && (
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center glow">
                    <AlertTriangle className="w-6 h-6 text-green-800" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-glass">Error & Audit Testing</h2>
                    <p className="text-glass-muted">Test error handling and audit trail functionality</p>
                  </div>
                </div>

                {/* Development/Admin Warning */}
                <div className="mb-6 p-4 bg-yellow-100 bg-opacity-20 border border-yellow-500 border-opacity-30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-yellow-800 mb-1">Development/Admin Only</h3>
                      <p className="text-sm text-yellow-700">
                        This testing interface is only available to developers and administrators. 
                        It allows testing of error handling and audit trail systems.
                      </p>
                    </div>
                  </div>
                </div>

                <ErrorAuditTest />
              </div>
            )}
          </div>
        </div>

        {/* Delete Account Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="glass-card rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-glass">Confirm Account Deletion</h3>
                  <p className="text-glass-muted">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-glass-muted">
                  Are you sure you want to delete your account? This will immediately and permanently:
                </p>
                <ul className="text-sm text-glass-muted list-disc list-inside space-y-1 ml-2">
                  <li>Delete all properties, leases, and tenant information</li>
                  <li>Delete all payment records and financial data</li>
                  <li>Delete all documents and images from storage</li>
                  <li>Delete your account settings and preferences</li>
                  <li>Remove all data from the database</li>
                </ul>
                <p className="text-red-600 font-medium text-sm">
                  This action cannot be undone and your data cannot be recovered.
                </p>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowDeleteDialog(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    loading={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};