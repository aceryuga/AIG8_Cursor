import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  LogOut, 
  Bell, 
  HelpCircle, 
  User, 
  CreditCard, 
  IndianRupee, 
  Calendar, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Home
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { Input } from '../webapp-ui/Input';
import { useAuth } from '../../hooks/useAuth';

interface PaymentForm {
  propertyId: string;
  amount: number;
  date: string;
  method: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card' | '';
  reference: string;
  notes: string;
}

interface Property {
  id: string;
  name: string;
  tenant: string;
  monthlyRent: number;
}

const mockProperties: Property[] = [
  { id: '1', name: 'Green Valley Apartment', tenant: 'Amit Sharma', monthlyRent: 15000 },
  { id: '2', name: 'Sunrise Villa', tenant: 'Priya Patel', monthlyRent: 25000 },
  { id: '3', name: 'City Center Office', tenant: 'Tech Solutions Ltd', monthlyRent: 35000 },
  { id: '4', name: 'Metro Plaza Shop', tenant: 'Fashion Hub', monthlyRent: 12000 }
];

export const RecordPayment: React.FC = () => {
  const [form, setForm] = useState<PaymentForm>({
    propertyId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    method: '',
    reference: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const selectedProperty = mockProperties.find(p => p.id === form.propertyId);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.propertyId) {
      newErrors.propertyId = 'Please select a property';
    }

    if (!form.amount || form.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!form.date) {
      newErrors.date = 'Payment date is required';
    }

    if (!form.method) {
      newErrors.method = 'Payment method is required';
    }

    if (form.method === 'cheque' && !form.reference.trim()) {
      newErrors.reference = 'Cheque number is required';
    }

    if (form.method === 'bank_transfer' && !form.reference.trim()) {
      newErrors.reference = 'Transaction reference is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkForDuplicates = () => {
    // Simulate duplicate check
    if (selectedProperty && form.amount === selectedProperty.monthlyRent) {
      const currentMonth = new Date().getMonth();
      const paymentMonth = new Date(form.date).getMonth();
      if (currentMonth === paymentMonth) {
        setShowDuplicateWarning(true);
        return true;
      }
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (checkForDuplicates() && !showDuplicateWarning) {
      return;
    }

    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLoading(false);
    setSuccess(true);
    
    setTimeout(() => {
      navigate('/payments');
    }, 2000);
  };

  const handleChange = (field: keyof PaymentForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = field === 'amount' ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    if (showDuplicateWarning) {
      setShowDuplicateWarning(false);
    }
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const propertyId = e.target.value;
    const property = mockProperties.find(p => p.id === propertyId);
    
    setForm(prev => ({ 
      ...prev, 
      propertyId,
      amount: property ? property.monthlyRent : 0
    }));
    
    if (errors.propertyId) {
      setErrors(prev => ({ ...prev, propertyId: '' }));
    }
  };

  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden floating-orbs flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
            <CheckCircle className="w-8 h-8 text-green-800" />
          </div>
          <h2 className="text-2xl font-bold text-glass mb-2">Payment Recorded!</h2>
          <p className="text-glass-muted mb-4">
            Payment of ₹{form.amount.toLocaleString()} has been successfully recorded.
          </p>
          <p className="text-sm text-glass-muted">Redirecting to payment history...</p>
        </div>
      </div>
    );
  }

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
                  { name: 'Settings', path: '/settings' }
                ].map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.path === '/payments'
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/payments" className="text-glass-muted hover:text-glass flex items-center gap-1">
            <ArrowLeft size={16} />
            Payments
          </Link>
          <span className="text-glass-muted">/</span>
          <span className="text-glass">Record Payment</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-glass mb-2">Record Payment</h1>
          <p className="text-glass-muted">Record a new rent payment from your tenant</p>
        </div>

        {/* Duplicate Warning */}
        {showDuplicateWarning && (
          <div className="glass-card rounded-xl p-4 mb-6 border-l-4 border-orange-500">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-glass mb-1">Possible Duplicate Payment</h3>
                <p className="text-sm text-glass-muted mb-3">
                  A payment for this property and amount may have already been recorded this month. 
                  Please verify before proceeding.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowDuplicateWarning(false)}>
                    Continue Anyway
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate('/payments')}>
                    Check Payment History
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="glass-card rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-glass">Property</label>
              <div className="relative">
                <Home size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-glass-muted" />
                <select
                  value={form.propertyId}
                  onChange={handlePropertyChange}
                  className={`w-full h-11 pl-10 pr-3 rounded-lg glass-input text-glass transition-all duration-200 ${
                    errors.propertyId ? 'border-red-400' : 'focus:border-white'
                  }`}
                >
                  <option value="">Select a property</option>
                  {mockProperties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name} - {property.tenant}
                    </option>
                  ))}
                </select>
              </div>
              {errors.propertyId && (
                <p className="text-sm text-red-600">{errors.propertyId}</p>
              )}
            </div>

            {/* Property Details */}
            {selectedProperty && (
              <div className="glass rounded-lg p-4">
                <h3 className="font-medium text-glass mb-2">Property Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-glass-muted">Tenant:</p>
                    <p className="text-glass font-medium">{selectedProperty.tenant}</p>
                  </div>
                  <div>
                    <p className="text-glass-muted">Monthly Rent:</p>
                    <p className="text-glass font-medium">₹{selectedProperty.monthlyRent.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount */}
              <Input
                label="Payment Amount (₹)"
                type="number"
                value={form.amount || ''}
                onChange={handleChange('amount')}
                error={errors.amount}
                icon={<IndianRupee size={18} />}
                placeholder="15000"
              />

              {/* Date */}
              <Input
                label="Payment Date"
                type="date"
                value={form.date}
                onChange={handleChange('date')}
                error={errors.date}
                icon={<Calendar size={18} />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Method */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-glass">Payment Method</label>
                <div className="relative">
                  <CreditCard size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-glass-muted" />
                  <select
                    value={form.method}
                    onChange={handleChange('method')}
                    className={`w-full h-11 pl-10 pr-3 rounded-lg glass-input text-glass transition-all duration-200 ${
                      errors.method ? 'border-red-400' : 'focus:border-white'
                    }`}
                  >
                    <option value="">Select payment method</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                {errors.method && (
                  <p className="text-sm text-red-600">{errors.method}</p>
                )}
              </div>

              {/* Reference Number */}
              <Input
                label={`Reference ${form.method === 'cheque' ? '(Cheque Number)' : form.method === 'bank_transfer' ? '(Transaction ID)' : '(Optional)'}`}
                type="text"
                value={form.reference}
                onChange={handleChange('reference')}
                error={errors.reference}
                icon={<FileText size={18} />}
                placeholder={
                  form.method === 'cheque' ? 'Cheque number' :
                  form.method === 'bank_transfer' ? 'Transaction ID' :
                  form.method === 'upi' ? 'UPI Reference' :
                  'Reference number'
                }
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-glass">Notes (Optional)</label>
              <textarea
                value={form.notes}
                onChange={handleChange('notes')}
                rows={3}
                className="w-full px-3 py-2 rounded-lg glass-input text-glass placeholder-glass-muted transition-all duration-200 focus:border-white"
                placeholder="Add any additional notes about this payment..."
              />
            </div>

            {/* Payment Summary */}
            {form.propertyId && form.amount > 0 && (
              <div className="glass rounded-lg p-4">
                <h3 className="font-medium text-glass mb-3">Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-glass-muted">Property:</span>
                    <span className="text-glass">{selectedProperty?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-muted">Tenant:</span>
                    <span className="text-glass">{selectedProperty?.tenant}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-muted">Amount:</span>
                    <span className="text-glass font-medium">₹{form.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-glass-muted">Date:</span>
                    <span className="text-glass">{new Date(form.date).toLocaleDateString()}</span>
                  </div>
                  {form.method && (
                    <div className="flex justify-between">
                      <span className="text-glass-muted">Method:</span>
                      <span className="text-glass capitalize">{form.method.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-white border-opacity-20">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/payments')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                className="flex-1"
              >
                Record Payment
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};