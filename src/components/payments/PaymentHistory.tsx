import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  LogOut, 
  Bell, 
  HelpCircle, 
  User, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  IndianRupee, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { Input } from '../webapp-ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { formatDateDDMMYYYY } from '../../utils/timezoneUtils';
import { calculateRentSummary, PropertyWithLease, Payment as RentPayment } from '../../utils/rentCalculations';

interface Payment {
  id: string;
  propertyName: string;
  tenant: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed';
  notes?: string;
  paymentType?: string;
  paymentTypeDetails?: string;
  created_at?: string;
  updated_at?: string;
  // Database fields
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  leases?: {
    property_id: string;
    properties?: {
      name: string;
    };
    tenants?: {
      name: string;
    };
  };
}

interface PaymentSummary {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  paymentsThisMonth: number;
  collectionRate: number;
}


export const PaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0,
    paymentsThisMonth: 0,
    collectionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterPaymentType, setFilterPaymentType] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showNotifications, setShowNotifications] = useState(false);
  const itemsPerPage = 10;
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  // Fetch payments from Supabase
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchPayments = async () => {
      try {
        setLoading(true);
        
        // First get user's properties with lease information (including inactive leases)
        const { data: properties, error: propError } = await supabase
          .from('properties')
          .select(`
            id,
            leases(
              id,
              monthly_rent,
              start_date,
              is_active
            )
          `)
          .eq('owner_id', user.id)
          .eq('active', 'Y');

        if (propError) {
          throw propError;
        }

        if (!properties || properties.length === 0) {
          setPayments([]);
          setSummary({
            totalCollected: 0,
            totalPending: 0,
            totalOverdue: 0,
            paymentsThisMonth: 0,
            collectionRate: 0
          });
          setLoading(false);
          return;
        }

        // Get all lease IDs from properties (both active and inactive)
        const allLeaseIds = properties.flatMap(prop => 
          prop.leases ? prop.leases.map(lease => lease.id) : []
        );

        if (allLeaseIds.length === 0) {
          setPayments([]);
          setSummary({
            totalCollected: 0,
            totalPending: 0,
            totalOverdue: 0,
            paymentsThisMonth: 0,
            collectionRate: 0
          });
          setLoading(false);
          return;
        }

        // Fetch payments with related data (from all leases)
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            *,
            leases!inner(
              id,
              property_id,
              is_active,
              properties(
                id,
                name
              ),
              tenants(
                name
              )
            )
          `)
          .in('lease_id', allLeaseIds)
          .order('payment_date', { ascending: false });

        if (paymentsError) {
          throw paymentsError;
        }

        // Transform the data to match our interface
        const transformedPayments: Payment[] = (paymentsData || []).map(payment => ({
          id: payment.id,
          propertyName: payment.leases?.properties?.name || 'Unknown Property',
          tenant: payment.leases?.tenants?.name || 'Unknown Tenant',
          amount: payment.payment_amount,
          date: payment.payment_date,
          method: payment.payment_method,
          reference: payment.reference || '',
          status: payment.status as 'completed' | 'pending' | 'failed',
          notes: payment.notes || '',
          paymentType: payment.payment_type || 'Rent',
          paymentTypeDetails: payment.payment_type_details || '',
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          // Keep database fields for compatibility
          payment_amount: payment.payment_amount,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          leases: payment.leases
        }));

        setPayments(transformedPayments);

        // Calculate rent summary using only active leases
        const activeLeases = properties.flatMap(prop => 
          prop.leases ? prop.leases.filter(lease => lease.is_active) : []
        );
        
        const propertiesWithLeases: PropertyWithLease[] = activeLeases.map(lease => ({
          id: lease.id, // Using lease ID as property ID for rent calculation
          lease_id: lease.id,
          monthly_rent: lease.monthly_rent,
          start_date: lease.start_date,
          is_active: lease.is_active
        }));

        const rentPayments: RentPayment[] = (paymentsData || []).map(payment => ({
          id: payment.id,
          lease_id: payment.lease_id,
          payment_date: payment.payment_date,
          payment_amount: payment.payment_amount,
          status: payment.status as 'completed' | 'pending' | 'failed'
        }));

        // Calculate rent summary
        const rentSummary = calculateRentSummary(propertiesWithLeases, rentPayments);

        // Calculate additional metrics for display
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const thisMonthPayments = transformedPayments.filter(p => {
          const paymentDate = new Date(p.date);
          return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
        });

        const paymentsThisMonth = thisMonthPayments.length;
        const collectionRate = transformedPayments.length > 0 
          ? (transformedPayments.filter(p => p.status === 'completed').length / transformedPayments.length) * 100 
          : 0;

        setSummary({
          totalCollected: rentSummary.totalCollected,
          totalPending: rentSummary.totalPending,
          totalOverdue: rentSummary.totalOverdue,
          paymentsThisMonth,
          collectionRate
        });

      } catch (error: any) {
        console.error('Error fetching payments:', error);
        alert('Failed to load payments: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user?.id]);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesMethod = filterMethod === 'all' || payment.method.toLowerCase() === filterMethod.toLowerCase();
    const matchesPaymentType = filterPaymentType === 'all' || (payment.paymentType || 'Rent') === filterPaymentType;
    
    const matchesDateRange = (!dateRange.start || payment.date >= dateRange.start) &&
                            (!dateRange.end || payment.date <= dateRange.end);
    
    return matchesSearch && matchesStatus && matchesMethod && matchesPaymentType && matchesDateRange;
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-700 bg-green-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'failed': return <AlertTriangle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Property', 'Tenant', 'Amount', 'Type', 'Method', 'Reference', 'Status', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredPayments.map(payment => [
        payment.date,
        `"${payment.propertyName}"`,
        `"${payment.tenant}"`,
        payment.amount,
        payment.paymentType || 'Rent',
        payment.method,
        payment.reference,
        payment.status,
        `"${payment.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden floating-orbs flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
            <Clock className="w-8 h-8 text-green-800 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-glass mb-2">Loading Payments</h2>
          <p className="text-glass-muted">Please wait while we fetch your payment history...</p>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-glass mb-2">Payment History</h1>
            <p className="text-glass-muted">Track and manage all your rental payments</p>
          </div>
          <div className="flex gap-3">
            <Link to="/payments/reconcile">
              <Button variant="outline" className="flex items-center gap-2">
                <FileText size={18} />
                AI Reconcile
              </Button>
            </Link>
            <Link to="/payments/record">
              <Button className="flex items-center gap-2">
                <Plus size={18} />
                Record Payment
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-green-800" />
              </div>
              <TrendingUp size={16} className="text-green-700" />
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Total Collected</h3>
            <p className="text-2xl font-bold text-glass">₹{summary.totalCollected.toLocaleString()}</p>
            <p className="text-sm text-green-700 mt-2">This month</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Pending</h3>
            <p className="text-2xl font-bold text-orange-600">₹{summary.totalPending.toLocaleString()}</p>
            <p className="text-sm text-orange-600 mt-2">Awaiting</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <TrendingDown size={16} className="text-red-600" />
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Overdue</h3>
            <p className="text-2xl font-bold text-red-600">₹{summary.totalOverdue.toLocaleString()}</p>
            <p className="text-sm text-red-600 mt-2">Past due</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-800" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Payments</h3>
            <p className="text-2xl font-bold text-glass">{summary.paymentsThisMonth}</p>
            <p className="text-sm text-green-700 mt-2">This month</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-800" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Collection Rate</h3>
            <p className="text-2xl font-bold text-glass">{summary.collectionRate.toFixed(1)}%</p>
            <p className="text-sm text-green-700 mt-2">Success rate</p>
          </div>
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
                placeholder="Search by property, tenant, or reference..."
                className="h-12"
              />
            </div>

            {/* Export Button */}
            <Button
              variant="outline"
              onClick={exportToCSV}
              className="flex items-center gap-2 h-12"
            >
              <Download size={16} />
              Export CSV
            </Button>

            {/* Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 h-12"
            >
              <Filter size={16} />
              Filters
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-white border-opacity-20">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-glass mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full glass-input rounded-lg px-2 py-1.5 text-sm text-glass h-9"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-glass mb-1">Method</label>
                  <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="w-full glass-input rounded-lg px-2 py-1.5 text-sm text-glass h-9"
                  >
                    <option value="all">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-glass mb-1">Type</label>
                  <select
                    value={filterPaymentType}
                    onChange={(e) => setFilterPaymentType(e.target.value)}
                    className="w-full glass-input rounded-lg px-2 py-1.5 text-sm text-glass h-9"
                  >
                    <option value="all">All Types</option>
                    <option value="Rent">Rent</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Security Deposit">Security Deposit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-glass mb-1">From</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full glass-input rounded-lg px-1.5 py-1.5 text-xs text-glass h-9"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-glass mb-1">To</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full glass-input rounded-lg px-1.5 py-1.5 text-xs text-glass h-9"
                  />
                </div>

                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterStatus('all');
                      setFilterMethod('all');
                      setFilterPaymentType('all');
                      setDateRange({ start: '', end: '' });
                      setSearchTerm('');
                    }}
                    className="h-9 text-xs px-3"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-glass-muted">
            Showing {paginatedPayments.length} of {filteredPayments.length} payments
          </p>
        </div>

        {/* Payment Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white border-opacity-20">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-glass">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-glass">Property</th>
                  <th className="text-left p-4 text-sm font-medium text-glass">Tenant</th>
                  <th className="text-left p-4 text-sm font-medium text-glass">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-glass">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-glass">Method</th>
                  <th className="text-left p-4 text-sm font-medium text-glass">Reference</th>
                  <th className="text-left p-4 text-sm font-medium text-glass">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-glass">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-5">
                    <td className="p-4 text-sm text-glass">
                      {formatDateDDMMYYYY(payment.date)}
                    </td>
                    <td className="p-4 text-sm text-glass font-medium">
                      {payment.propertyName}
                    </td>
                    <td className="p-4 text-sm text-glass">
                      {payment.tenant}
                    </td>
                    <td className="p-4 text-sm text-glass font-medium">
                      ₹{payment.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-sm text-glass">
                      <div className="flex flex-col">
                        <span className="font-medium">{payment.paymentType || 'Rent'}</span>
                        {payment.paymentType === 'Other' && payment.paymentTypeDetails && (
                          <span className="text-xs text-glass-muted mt-1">
                            {payment.paymentTypeDetails}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-glass">
                      {payment.method}
                    </td>
                    <td className="p-4 text-sm text-glass-muted">
                      {payment.reference}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="p-1">
                          <FileText size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-white border-opacity-20">
              <div className="text-sm text-glass-muted">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft size={14} />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
              <CreditCard className="w-8 h-8 text-glass-muted" />
            </div>
            <h3 className="text-lg font-semibold text-glass mb-2">No payments found</h3>
            <p className="text-glass-muted mb-4">
              {searchTerm || filterStatus !== 'all' || filterMethod !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by recording your first payment'
              }
            </p>
            <Link to="/payments/record">
              <Button>Record Payment</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};