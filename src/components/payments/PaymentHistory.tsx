import React, { useState } from 'react';
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
  Calendar, 
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
}

interface PaymentSummary {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  paymentsThisMonth: number;
  collectionRate: number;
}

const mockPayments: Payment[] = [
  {
    id: '1',
    propertyName: 'Green Valley Apartment',
    tenant: 'Amit Sharma',
    amount: 15000,
    date: '2025-01-01',
    method: 'UPI',
    reference: 'TXN123456789',
    status: 'completed'
  },
  {
    id: '2',
    propertyName: 'Sunrise Villa',
    tenant: 'Priya Patel',
    amount: 25000,
    date: '2025-01-02',
    method: 'Bank Transfer',
    reference: 'TXN123456790',
    status: 'completed'
  },
  {
    id: '3',
    propertyName: 'City Center Office',
    tenant: 'Tech Solutions Ltd',
    amount: 35000,
    date: '2024-12-28',
    method: 'Cheque',
    reference: 'CHQ001234',
    status: 'pending'
  },
  {
    id: '4',
    propertyName: 'Metro Plaza Shop',
    tenant: 'Fashion Hub',
    amount: 12000,
    date: '2025-01-03',
    method: 'Cash',
    reference: 'CASH001',
    status: 'completed'
  },
  {
    id: '5',
    propertyName: 'Garden View Apartment',
    tenant: 'Rajesh Kumar',
    amount: 16000,
    date: '2024-12-25',
    method: 'UPI',
    reference: 'TXN123456791',
    status: 'failed',
    notes: 'Payment failed due to insufficient funds'
  }
];

const mockSummary: PaymentSummary = {
  totalCollected: 87000,
  totalPending: 35000,
  totalOverdue: 16000,
  paymentsThisMonth: 4,
  collectionRate: 84.5
};

export const PaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showNotifications, setShowNotifications] = useState(false);
  const itemsPerPage = 10;
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesMethod = filterMethod === 'all' || payment.method.toLowerCase() === filterMethod.toLowerCase();
    
    const matchesDateRange = (!dateRange.start || payment.date >= dateRange.start) &&
                            (!dateRange.end || payment.date <= dateRange.end);
    
    return matchesSearch && matchesStatus && matchesMethod && matchesDateRange;
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
    const headers = ['Date', 'Property', 'Tenant', 'Amount', 'Method', 'Reference', 'Status', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredPayments.map(payment => [
        payment.date,
        `"${payment.propertyName}"`,
        `"${payment.tenant}"`,
        payment.amount,
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
            <p className="text-2xl font-bold text-glass">₹{mockSummary.totalCollected.toLocaleString()}</p>
            <p className="text-sm text-green-700 mt-2">This month</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Pending</h3>
            <p className="text-2xl font-bold text-orange-600">₹{mockSummary.totalPending.toLocaleString()}</p>
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
            <p className="text-2xl font-bold text-red-600">₹{mockSummary.totalOverdue.toLocaleString()}</p>
            <p className="text-sm text-red-600 mt-2">Past due</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-800" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Payments</h3>
            <p className="text-2xl font-bold text-glass">{mockSummary.paymentsThisMonth}</p>
            <p className="text-sm text-green-700 mt-2">This month</p>
          </div>

          <div className="glass-card rounded-xl p-6 glow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-800" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-glass-muted mb-1">Collection Rate</h3>
            <p className="text-2xl font-bold text-glass">{mockSummary.collectionRate}%</p>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-glass mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-2 text-glass h-11"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-glass mb-2">Payment Method</label>
                  <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-2 text-glass h-11"
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
                  <label className="block text-sm font-medium text-glass mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full glass-input rounded-lg px-3 py-2 text-glass h-11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-glass mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full glass-input rounded-lg px-3 py-2 text-glass h-11"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterMethod('all');
                    setDateRange({ start: '', end: '' });
                    setSearchTerm('');
                  }}
                >
                  Clear All Filters
                </Button>
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
                      {new Date(payment.date).toLocaleDateString()}
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