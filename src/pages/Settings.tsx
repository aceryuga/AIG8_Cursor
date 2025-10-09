import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  LogOut, 
  Bell, 
  HelpCircle, 
  User, 
  Settings as SettingsIcon,
  Mail,
  Phone,
  Lock,
  Shield,
  CreditCard,
  Database,
  Eye,
  EyeOff,
  Check,
  X,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Smartphone,
  Globe,
  Calendar,
  BarChart3,
  FileText,
  Crown,
  Zap
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PasswordStrength } from '../ui/PasswordStrength';
import { useAuth } from '../../hooks/useAuth';
import { formatDateDDMMYYYY } from '../../utils/timezoneUtils';
import { validateEmail, validatePhone, validatePassword } from '../../utils/validation';

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
  maintenanceAlerts: boolean;
  marketingEmails: boolean;
  reminderTiming: 'immediate' | '1day' | '3days' | '1week';
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
}

interface SubscriptionPlan {
  name: string;
  price: number;
  properties: number;
  features: string[];
  current: boolean;
}

interface LoginActivity {
  id: string;
  device: string;
  location: string;
  timestamp: string;
  ip: string;
  status: 'success' | 'failed';
}

const mockPlans: SubscriptionPlan[] = [
  {
    name: 'Starter',
    price: 0,
    properties: 3,
    features: ['Basic property management', 'Payment tracking', 'Document storage (100MB)'],
    current: true
  },
  {
    name: 'Professional',
    price: 999,
    properties: 15,
    features: ['Advanced analytics', 'AI reconciliation', 'Priority support', 'Document storage (1GB)'],
    current: false
  },
  {
    name: 'Enterprise',
    price: 2499,
    properties: 50,
    features: ['White-label solution', 'API access', 'Custom integrations', 'Unlimited storage'],
    current: false
  }
];

const mockLoginActivity: LoginActivity[] = [
  {
    id: '1',
    device: 'Chrome on Windows',
    location: 'Mumbai, India',
    timestamp: '2025-01-15 10:30 AM',
    ip: '192.168.1.1',
    status: 'success'
  },
  {
    id: '2',
    device: 'Safari on iPhone',
    location: 'Mumbai, India',
    timestamp: '2025-01-14 08:15 PM',
    ip: '192.168.1.2',
    status: 'success'
  },
  {
    id: '3',
    device: 'Chrome on Android',
    location: 'Delhi, India',
    timestamp: '2025-01-13 02:45 PM',
    ip: '203.192.1.5',
    status: 'failed'
  }
];

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@example.com',
    phone: '+91 9876543210',
    propertyCount: 5
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
    maintenanceAlerts: true,
    marketingEmails: false,
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
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const sections = [
    { id: 'profile', name: 'Profile Information', icon: User },
    { id: 'security', name: 'Password & Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'subscription', name: 'Subscription Plan', icon: CreditCard },
    { id: 'privacy', name: 'Data & Privacy', icon: Database }
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

    if (profileForm.propertyCount < 1 || profileForm.propertyCount > 50) {
      newErrors.propertyCount = 'Property count must be between 1 and 50';
    }

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
    if (!validateProfile()) return;

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    
    // Show success message
    alert('Profile updated successfully!');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    
    // Reset form and show success
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    alert('Password changed successfully!');
  };

  const handleProfileChange = (field: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'propertyCount' ? parseInt(e.target.value) || 0 : e.target.value;
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

  const handleNotificationToggle = (field: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleNotificationChange = (field: keyof NotificationSettings, value: string) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const sendTestNotification = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 3000);
  };

  const exportData = () => {
    const data = {
      profile: profileForm,
      properties: 'Property data would be included here...',
      payments: 'Payment history would be included here...',
      documents: 'Document metadata would be included here...'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'propertypro-data-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    setShowDeleteDialog(false);
    
    // In a real app, this would delete the account and redirect
    alert('Account deletion request submitted. You will receive a confirmation email.');
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
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 glass rounded-lg hover:bg-white hover:bg-opacity-10 transition-all duration-200"
                >
                  <Bell size={18} className="text-glass" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </button>
              </div>

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
                    onClick={() => setActiveSection(section.id)}
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

                    <Input
                      label="Property Count"
                      type="number"
                      value={profileForm.propertyCount}
                      onChange={handleProfileChange('propertyCount')}
                      error={errors.propertyCount}
                      icon={<Building2 size={18} />}
                      placeholder="5"
                    />
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

                {/* Login Activity */}
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 glass rounded-lg flex items-center justify-center glow">
                      <Shield className="w-6 h-6 text-green-800" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-glass">Login Activity</h2>
                      <p className="text-glass-muted">Recent login attempts and sessions</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {mockLoginActivity.map((activity) => (
                      <div key={activity.id} className="glass rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <p className="font-medium text-glass">{activity.device}</p>
                              <p className="text-sm text-glass-muted">{activity.location} • {activity.ip}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-glass">{activity.timestamp}</p>
                            <p className={`text-xs font-medium ${
                              activity.status === 'success' ? 'text-green-700' : 'text-red-600'
                            }`}>
                              {activity.status === 'success' ? 'Successful' : 'Failed'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                        { key: 'leaseExpiry', label: 'Lease Expiry Alerts', description: 'Alerts when leases are about to expire', icon: Calendar },
                        { key: 'maintenanceAlerts', label: 'Maintenance Alerts', description: 'Notifications for maintenance requests', icon: SettingsIcon },
                        { key: 'marketingEmails', label: 'Marketing Emails', description: 'Product updates and promotional content', icon: Globe }
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
                            <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-800"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timing Settings */}
                  <div>
                    <h3 className="text-lg font-medium text-glass mb-4">Timing Settings</h3>
                    <div className="space-y-4">
                      <div className="glass rounded-lg p-4">
                        <label className="block text-sm font-medium text-glass mb-2">Reminder Timing</label>
                        <select
                          value={notificationSettings.reminderTiming}
                          onChange={(e) => handleNotificationChange('reminderTiming', e.target.value)}
                          className="w-full glass-input rounded-lg px-3 py-2 text-glass"
                        >
                          <option value="immediate">Immediate</option>
                          <option value="1day">1 day before</option>
                          <option value="3days">3 days before</option>
                          <option value="1week">1 week before</option>
                        </select>
                      </div>

                      <div className="glass rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-medium text-glass">Quiet Hours</p>
                            <p className="text-sm text-glass-muted">Disable notifications during specific hours</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationSettings.quietHours}
                              onChange={() => handleNotificationToggle('quietHours')}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-800"></div>
                          </label>
                        </div>

                        {notificationSettings.quietHours && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-glass mb-1">Start Time</label>
                              <input
                                type="time"
                                value={notificationSettings.quietStart}
                                onChange={(e) => handleNotificationChange('quietStart', e.target.value)}
                                className="w-full glass-input rounded-lg px-3 py-2 text-glass"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-glass mb-1">End Time</label>
                              <input
                                type="time"
                                value={notificationSettings.quietEnd}
                                onChange={(e) => handleNotificationChange('quietEnd', e.target.value)}
                                className="w-full glass-input rounded-lg px-3 py-2 text-glass"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Test Notifications */}
                  <div className="glass rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-glass">Test Notifications</p>
                        <p className="text-sm text-glass-muted">Send a test notification to verify your settings</p>
                      </div>
                      <Button
                        onClick={sendTestNotification}
                        loading={loading}
                        disabled={loading || testNotificationSent}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {testNotificationSent ? (
                          <>
                            <CheckCircle size={16} />
                            Sent!
                          </>
                        ) : (
                          <>
                            <Zap size={16} />
                            Send Test
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Plan */}
            {activeSection === 'subscription' && (
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 glass rounded-lg flex items-center justify-center glow">
                      <CreditCard className="w-6 h-6 text-green-800" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-glass">Current Plan</h2>
                      <p className="text-glass-muted">Manage your subscription</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {mockPlans.map((plan) => (
                      <div
                        key={plan.name}
                        className={`glass rounded-xl p-6 relative ${
                          plan.current ? 'ring-2 ring-green-800' : ''
                        }`}
                      >
                        {plan.current && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-green-800 text-white px-3 py-1 rounded-full text-xs font-medium">
                              Current Plan
                            </span>
                          </div>
                        )}
                        
                        <div className="text-center mb-4">
                          <div className="w-12 h-12 glass rounded-lg flex items-center justify-center mx-auto mb-3">
                            {plan.name === 'Enterprise' ? (
                              <Crown className="w-6 h-6 text-green-800" />
                            ) : plan.name === 'Professional' ? (
                              <Zap className="w-6 h-6 text-green-800" />
                            ) : (
                              <User className="w-6 h-6 text-green-800" />
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-glass">{plan.name}</h3>
                          <div className="mt-2">
                            <span className="text-2xl font-bold text-glass">₹{plan.price}</span>
                            <span className="text-glass-muted">/month</span>
                          </div>
                          <p className="text-sm text-glass-muted mt-1">Up to {plan.properties} properties</p>
                        </div>

                        <ul className="space-y-2 mb-6">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-glass">
                              <Check size={14} className="text-green-700 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <Button
                          variant={plan.current ? 'outline' : 'primary'}
                          className="w-full"
                          disabled={plan.current}
                        >
                          {plan.current ? 'Current Plan' : 'Upgrade'}
                        </Button>
                      </div>
                    ))}
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
                    <div className="glass rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-glass-muted">Properties</span>
                        <span className="text-glass font-medium">5 / 3</span>
                      </div>
                      <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }} />
                      </div>
                      <p className="text-xs text-red-600 mt-1">Upgrade needed</p>
                    </div>

                    <div className="glass rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-glass-muted">Storage</span>
                        <span className="text-glass font-medium">156 MB / 100 MB</span>
                      </div>
                      <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: '100%' }} />
                      </div>
                      <p className="text-xs text-orange-600 mt-1">Upgrade needed</p>
                    </div>

                    <div className="glass rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-glass-muted">API Calls</span>
                        <span className="text-glass font-medium">1,250 / ∞</span>
                      </div>
                      <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }} />
                      </div>
                      <p className="text-xs text-green-700 mt-1">Within limits</p>
                    </div>
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
                    <Button variant="outline" className="flex items-center gap-2">
                      <Download size={16} />
                      Download All
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {[
                      { date: '2025-01-01', amount: 0, status: 'Paid', plan: 'Starter' },
                      { date: '2024-12-01', amount: 0, status: 'Paid', plan: 'Starter' },
                      { date: '2024-11-01', amount: 0, status: 'Paid', plan: 'Starter' }
                    ].map((invoice, index) => (
                      <div key={index} className="flex items-center justify-between p-4 glass rounded-lg">
                        <div>
                          <p className="font-medium text-glass">{invoice.plan} Plan</p>
                          <p className="text-sm text-glass-muted">{formatDateDDMMYYYY(invoice.date)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium text-glass">₹{invoice.amount}</p>
                            <p className="text-sm text-green-700">{invoice.status}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="p-2">
                            <Download size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Data & Privacy */}
            {activeSection === 'privacy' && (
              <div className="space-y-6">
                {/* Data Export */}
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 glass rounded-lg flex items-center justify-center glow">
                      <Download className="w-6 h-6 text-green-800" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-glass">Export Your Data</h2>
                      <p className="text-glass-muted">Download a copy of all your data</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-glass-muted">
                      You can request a copy of all your data including properties, payments, documents, and account information. 
                      The export will be provided in JSON format.
                    </p>
                    
                    <div className="flex items-center gap-4">
                      <Button onClick={exportData} className="flex items-center gap-2">
                        <Download size={16} />
                        Export Data
                      </Button>
                      <p className="text-sm text-glass-muted">
                        Last export: Never
                      </p>
                    </div>
                  </div>
                </div>

                {/* GDPR Information */}
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 glass rounded-lg flex items-center justify-center glow">
                      <Shield className="w-6 h-6 text-green-800" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-glass">Privacy & GDPR</h2>
                      <p className="text-glass-muted">Your privacy rights and data protection</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="glass rounded-lg p-4">
                      <h3 className="font-medium text-glass mb-2">Data We Collect</h3>
                      <ul className="text-sm text-glass-muted space-y-1">
                        <li>• Account information (name, email, phone)</li>
                        <li>• Property details and financial data</li>
                        <li>• Payment history and transaction records</li>
                        <li>• Uploaded documents and files</li>
                        <li>• Usage analytics and preferences</li>
                      </ul>
                    </div>

                    <div className="glass rounded-lg p-4">
                      <h3 className="font-medium text-glass mb-2">Your Rights</h3>
                      <ul className="text-sm text-glass-muted space-y-1">
                        <li>• Right to access your personal data</li>
                        <li>• Right to rectify inaccurate data</li>
                        <li>• Right to erase your data</li>
                        <li>• Right to restrict processing</li>
                        <li>• Right to data portability</li>
                      </ul>
                    </div>

                    <div className="flex gap-4">
                      <Button variant="outline">
                        Privacy Policy
                      </Button>
                      <Button variant="outline">
                        Terms of Service
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="glass-card rounded-xl p-6 border-l-4 border-red-500">
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
                            Deleting your account will permanently remove all your properties, payments, documents, 
                            and personal data. This action cannot be reversed.
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
                  Are you sure you want to delete your account? All your data including properties, 
                  payments, and documents will be permanently removed.
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