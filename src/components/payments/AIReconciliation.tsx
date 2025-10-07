import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  LogOut, 
  Bell, 
  HelpCircle, 
  User, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Download, 
  Eye, 
  ArrowLeft,
  Brain,
  Zap,
  Target,
  TrendingUp,
  RefreshCw,
  X
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { formatDateDDMMYYYY } from '../../utils/timezoneUtils';

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance: number;
}

interface MatchedPayment {
  id: string;
  bankTransactionId: string;
  propertyName: string;
  tenant: string;
  amount: number;
  confidence: number;
  status: 'auto_matched' | 'review_required' | 'unmatched';
  reason?: string;
}

interface ReconciliationSummary {
  totalTransactions: number;
  autoMatched: number;
  reviewRequired: number;
  unmatched: number;
  totalAmount: number;
  matchedAmount: number;
}

const mockBankTransactions: BankTransaction[] = [
  {
    id: '1',
    date: '2025-01-01',
    description: 'UPI/AMIT SHARMA/GREEN VALLEY',
    amount: 15000,
    type: 'credit',
    balance: 125000
  },
  {
    id: '2',
    date: '2025-01-02',
    description: 'NEFT/PRIYA PATEL/SUNRISE VILLA',
    amount: 25000,
    type: 'credit',
    balance: 150000
  },
  {
    id: '3',
    date: '2025-01-03',
    description: 'CASH DEP/FASHION HUB',
    amount: 12000,
    type: 'credit',
    balance: 162000
  },
  {
    id: '4',
    date: '2024-12-28',
    description: 'UPI/UNKNOWN SENDER',
    amount: 5000,
    type: 'credit',
    balance: 167000
  }
];

const mockMatchedPayments: MatchedPayment[] = [
  {
    id: '1',
    bankTransactionId: '1',
    propertyName: 'Green Valley Apartment',
    tenant: 'Amit Sharma',
    amount: 15000,
    confidence: 95,
    status: 'auto_matched'
  },
  {
    id: '2',
    bankTransactionId: '2',
    propertyName: 'Sunrise Villa',
    tenant: 'Priya Patel',
    amount: 25000,
    confidence: 92,
    status: 'auto_matched'
  },
  {
    id: '3',
    bankTransactionId: '3',
    propertyName: 'Metro Plaza Shop',
    tenant: 'Fashion Hub',
    amount: 12000,
    confidence: 78,
    status: 'review_required',
    reason: 'Amount matches but description partially matches'
  },
  {
    id: '4',
    bankTransactionId: '4',
    propertyName: '',
    tenant: '',
    amount: 5000,
    confidence: 0,
    status: 'unmatched',
    reason: 'No matching tenant or property found'
  }
];

const mockSummary: ReconciliationSummary = {
  totalTransactions: 4,
  autoMatched: 2,
  reviewRequired: 1,
  unmatched: 1,
  totalAmount: 57000,
  matchedAmount: 52000
};

const AIReconciliation: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState('auto_matched');
  const [showNotifications, setShowNotifications] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const processReconciliation = async () => {
    if (!uploadedFile) return;
    
    setIsProcessing(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsProcessing(false);
    setShowResults(true);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-700 bg-green-100';
    if (confidence >= 70) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'auto_matched': return 'text-green-700 bg-green-100';
      case 'review_required': return 'text-orange-600 bg-orange-100';
      case 'unmatched': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'auto_matched': return <CheckCircle size={16} />;
      case 'review_required': return <AlertTriangle size={16} />;
      case 'unmatched': return <X size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const filteredPayments = mockMatchedPayments.filter(payment => 
    activeTab === 'all' || payment.status === activeTab
  );

  const exportReconciliationReport = () => {
    const headers = ['Date', 'Bank Description', 'Amount', 'Property', 'Tenant', 'Status', 'Confidence', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...mockMatchedPayments.map(payment => {
        const transaction = mockBankTransactions.find(t => t.id === payment.bankTransactionId);
        return [
          transaction?.date || '',
          `"${transaction?.description || ''}"`,
          payment.amount,
          `"${payment.propertyName}"`,
          `"${payment.tenant}"`,
          payment.status,
          payment.confidence,
          `"${payment.reason || ''}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-report-${new Date().toISOString().split('T')[0]}.csv`;
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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/payments" className="text-glass-muted hover:text-glass flex items-center gap-1">
            <ArrowLeft size={16} />
            Payments
          </Link>
          <span className="text-glass-muted">/</span>
          <span className="text-glass">AI Reconciliation</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 glass rounded-lg flex items-center justify-center glow">
              <Brain className="w-6 h-6 text-green-800" />
            </div>
            <h1 className="text-3xl font-bold text-glass">AI Payment Reconciliation</h1>
          </div>
          <p className="text-glass-muted">Upload your bank statement and let AI automatically match payments</p>
        </div>

        {!showResults ? (
          <>
            {/* Upload Section */}
            <div className="glass-card rounded-xl p-8 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
                  <Upload className="w-8 h-8 text-green-800" />
                </div>
                <h2 className="text-xl font-semibold text-glass mb-2">Upload Bank Statement</h2>
                <p className="text-glass-muted mb-6">
                  Upload your bank statement in CSV, Excel, or PDF format for AI-powered reconciliation
                </p>

                <div className="border-2 border-dashed border-white border-opacity-30 rounded-lg p-8 mb-6">
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-green-800" />
                      <div>
                        <p className="font-medium text-glass">{uploadedFile.name}</p>
                        <p className="text-sm text-glass-muted">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadedFile(null)}
                        className="p-1"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="mx-auto text-glass-muted mb-4" />
                      <p className="text-glass-muted mb-4">
                        Drag and drop your bank statement here, or click to browse
                      </p>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button variant="outline" className="cursor-pointer">
                          Choose File
                        </Button>
                      </label>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="glass rounded-lg p-4">
                    <Zap className="w-6 h-6 text-green-800 mb-2" />
                    <h3 className="font-medium text-glass mb-1">Smart Matching</h3>
                    <p className="text-sm text-glass-muted">AI analyzes transaction descriptions and amounts</p>
                  </div>
                  <div className="glass rounded-lg p-4">
                    <Target className="w-6 h-6 text-green-800 mb-2" />
                    <h3 className="font-medium text-glass mb-1">High Accuracy</h3>
                    <p className="text-sm text-glass-muted">95%+ accuracy with confidence scoring</p>
                  </div>
                  <div className="glass rounded-lg p-4">
                    <TrendingUp className="w-6 h-6 text-green-800 mb-2" />
                    <h3 className="font-medium text-glass mb-1">Time Saving</h3>
                    <p className="text-sm text-glass-muted">Reduce manual reconciliation by 90%</p>
                  </div>
                </div>

                <Button
                  onClick={processReconciliation}
                  disabled={!uploadedFile || isProcessing}
                  loading={isProcessing}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Processing with AI...
                    </>
                  ) : (
                    <>
                      <Brain size={16} />
                      Start AI Reconciliation
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Demo Button */}
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadedFile(new File(['demo'], 'demo-statement.csv', { type: 'text/csv' }));
                  setTimeout(() => setShowResults(true), 1000);
                }}
                className="flex items-center gap-2"
              >
                <Eye size={16} />
                View Demo Results
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Results Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="glass-card rounded-xl p-6 glow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-800" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-glass-muted mb-1">Total Transactions</h3>
                <p className="text-3xl font-bold text-glass">{mockSummary.totalTransactions}</p>
                <p className="text-sm text-glass-muted mt-2">From bank statement</p>
              </div>

              <div className="glass-card rounded-xl p-6 glow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-800" />
                  </div>
                  <TrendingUp size={16} className="text-green-700" />
                </div>
                <h3 className="text-sm font-medium text-glass-muted mb-1">Auto Matched</h3>
                <p className="text-3xl font-bold text-green-700">{mockSummary.autoMatched}</p>
                <p className="text-sm text-green-700 mt-2">High confidence</p>
              </div>

              <div className="glass-card rounded-xl p-6 glow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-glass-muted mb-1">Review Required</h3>
                <p className="text-3xl font-bold text-orange-600">{mockSummary.reviewRequired}</p>
                <p className="text-sm text-orange-600 mt-2">Needs attention</p>
              </div>

              <div className="glass-card rounded-xl p-6 glow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-glass-muted mb-1">Unmatched</h3>
                <p className="text-3xl font-bold text-red-600">{mockSummary.unmatched}</p>
                <p className="text-sm text-red-600 mt-2">No match found</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={exportReconciliationReport}
                  className="flex items-center gap-2"
                >
                  <Download size={16} />
                  Export Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowResults(false)}
                  className="flex items-center gap-2"
                >
                  <Upload size={16} />
                  Upload New Statement
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="border-b border-white border-opacity-20">
                <nav className="flex">
                  {[
                    { id: 'auto_matched', label: 'Auto Matched', count: mockSummary.autoMatched },
                    { id: 'review_required', label: 'Review Required', count: mockSummary.reviewRequired },
                    { id: 'unmatched', label: 'Unmatched', count: mockSummary.unmatched },
                    { id: 'all', label: 'All', count: mockSummary.totalTransactions }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-6 py-4 text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'text-glass border-b-2 border-green-800 bg-white bg-opacity-10'
                          : 'text-glass-muted hover:text-glass hover:bg-white hover:bg-opacity-5'
                      }`}
                    >
                      {tab.label}
                      <span className="px-2 py-1 rounded-full bg-white bg-opacity-20 text-xs">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white border-opacity-20">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-glass">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Bank Description</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Amount</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Matched Property</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Tenant</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Confidence</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => {
                      const transaction = mockBankTransactions.find(t => t.id === payment.bankTransactionId);
                      return (
                        <tr key={payment.id} className="border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-5">
                          <td className="p-4 text-sm text-glass">
                            {transaction ? formatDateDDMMYYYY(transaction.date) : '-'}
                          </td>
                          <td className="p-4 text-sm text-glass-muted max-w-xs truncate">
                            {transaction?.description || '-'}
                          </td>
                          <td className="p-4 text-sm text-glass font-medium">
                            ₹{payment.amount.toLocaleString()}
                          </td>
                          <td className="p-4 text-sm text-glass">
                            {payment.propertyName || '-'}
                          </td>
                          <td className="p-4 text-sm text-glass">
                            {payment.tenant || '-'}
                          </td>
                          <td className="p-4">
                            {payment.confidence > 0 ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(payment.confidence)}`}>
                                {payment.confidence}%
                              </span>
                            ) : (
                              <span className="text-glass-muted">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                              {getStatusIcon(payment.status)}
                              {payment.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              {payment.status === 'review_required' && (
                                <Button variant="outline" size="sm">
                                  Review
                                </Button>
                              )}
                              {payment.status === 'unmatched' && (
                                <Button variant="outline" size="sm">
                                  Match
                                </Button>
                              )}
                              {payment.status === 'auto_matched' && (
                                <Button variant="ghost" size="sm" className="p-1">
                                  <Eye size={14} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export { AIReconciliation };