import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogOut,
  HelpCircle,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  FileText,
  Download,
  Trash2,
  Eye,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { NotificationBell } from '../ui/NotificationBell';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../hooks/useAuth';
import { formatDateDDMMYYYY } from '../../utils/timezoneUtils';
import { supabase } from '../../lib/supabase';
import { formatFileSize } from '../../utils/bankStatementUpload';
import toast from 'react-hot-toast';

interface ReconciliationSession {
  id: string;
  file_name: string;
  file_size: number;
  upload_date: string;
  processing_status: 'uploaded' | 'processing' | 'completed' | 'failed';
  total_transactions: number;
  auto_matched: number;
  review_required: number;
  unmatched: number;
  error_message: string | null;
  created_at: string;
}

const ReconciliationHistory: React.FC = () => {
  const [sessions, setSessions] = useState<ReconciliationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  /**
   * Load reconciliation sessions
   */
  const loadSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reconciliation_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error('Failed to load reconciliation history');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a session
   */
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this reconciliation session? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(sessionId);
      const { error } = await supabase
        .from('reconciliation_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session deleted successfully');
      await loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete session');
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * View session details
   */
  const handleViewSession = (sessionId: string) => {
    navigate(`/payments/reconciliation?session=${sessionId}`);
  };

  /**
   * Export session report
   */
  const handleExportSession = async (sessionId: string) => {
    try {
      const { data: reconciliations, error } = await supabase
        .from('payment_reconciliations')
        .select(`
          *,
          payments!inner (
            payment_date,
            payment_amount,
            reference,
            leases!inner (
              properties!inner (
                name
              ),
              tenants (
                name
              )
            )
          ),
          bank_transactions (
            transaction_date,
            description,
            amount,
            reference_number
          )
        `)
        .eq('session_id', sessionId);

      if (error) throw error;

      const headers = ['Payment Date', 'Bank Date', 'Property', 'Tenant', 'Payment Amount', 'Bank Amount', 'Bank Description', 'Status', 'Confidence', 'Matching Reasons'];
      const csvContent = [
        headers.join(','),
        ...(reconciliations || []).map(rec => {
          return [
            rec.payments?.payment_date || '',
            rec.bank_transactions?.transaction_date || '',
            `"${rec.payments?.leases?.properties?.name || ''}"`,
            `"${rec.payments?.leases?.tenants?.name || ''}"`,
            rec.payments?.payment_amount || '',
            rec.bank_transactions?.amount || '',
            `"${rec.bank_transactions?.description || ''}"`,
            rec.match_status,
            rec.confidence_score,
            `"${rec.matching_reasons.join(', ')}"`,
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reconciliation-${sessionId}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Failed to export session:', error);
      toast.error('Failed to export report');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  /**
   * Filter sessions
   */
  const filteredSessions = sessions.filter(session => {
    const matchesStatus = filterStatus === 'all' || session.processing_status === filterStatus;
    const matchesSearch = session.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  /**
   * Get status badge
   */
  const getStatusBadge = (status: string) => {
    const config = {
      completed: {
        color: 'text-green-700 bg-green-100 bg-opacity-20',
        icon: <CheckCircle size={14} />,
        label: 'Completed'
      },
      processing: {
        color: 'text-blue-600 bg-blue-100 bg-opacity-20',
        icon: <RefreshCw size={14} className="animate-spin" />,
        label: 'Processing'
      },
      failed: {
        color: 'text-red-600 bg-red-100 bg-opacity-20',
        icon: <X size={14} />,
        label: 'Failed'
      },
      uploaded: {
        color: 'text-orange-600 bg-orange-100 bg-opacity-20',
        icon: <Clock size={14} />,
        label: 'Uploaded'
      }
    };

    const statusConfig = config[status as keyof typeof config] || config.uploaded;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
        {statusConfig.icon}
        {statusConfig.label}
      </span>
    );
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/payments" className="text-glass-muted hover:text-glass flex items-center gap-1">
            <ArrowLeft size={16} />
            Payments
          </Link>
          <span className="text-glass-muted">/</span>
          <Link to="/payments/ai-reconciliation" className="text-glass-muted hover:text-glass">
            AI Reconciliation
          </Link>
          <span className="text-glass-muted">/</span>
          <span className="text-glass">History</span>
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 glass rounded-lg flex items-center justify-center glow">
                <Clock className="w-6 h-6 text-green-800" />
              </div>
              <h1 className="text-3xl font-bold text-glass">Reconciliation History</h1>
            </div>
            <p className="text-glass-muted">View and manage past reconciliation sessions</p>
          </div>

          <Link to="/payments/reconciliation">
            <Button className="flex items-center gap-2">
              <FileText size={16} />
              New Reconciliation
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-glass mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by filename..."
                className="w-full px-4 py-2 glass rounded-lg border border-white border-opacity-20 text-glass placeholder-glass-muted focus:outline-none focus:ring-2 focus:ring-green-800 focus:ring-opacity-50"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-glass mb-2 flex items-center gap-2">
                <Filter size={16} />
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 glass rounded-lg border border-white border-opacity-20 text-glass focus:outline-none focus:ring-2 focus:ring-green-800 focus:ring-opacity-50"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="uploaded">Uploaded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="glass-card rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw size={32} className="mx-auto text-green-800 animate-spin mb-4" />
              <p className="text-glass-muted">Loading reconciliation history...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-12 text-center">
              <Clock size={48} className="mx-auto text-glass-muted mb-4" />
              <p className="text-glass text-lg mb-2">No reconciliation sessions found</p>
              <p className="text-glass-muted mb-6">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Upload your first bank statement to get started'}
              </p>
              {!searchQuery && filterStatus === 'all' && (
                <Link to="/payments/reconciliation">
                  <Button className="flex items-center gap-2 mx-auto">
                    <FileText size={16} />
                    Start Reconciliation
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white border-opacity-20">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-glass">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-glass">File Name</th>
                    <th className="text-left p-4 text-sm font-medium text-glass">Size</th>
                    <th className="text-left p-4 text-sm font-medium text-glass">Status</th>
                    <th className="text-center p-4 text-sm font-medium text-glass">Total</th>
                    <th className="text-center p-4 text-sm font-medium text-glass">Matched</th>
                    <th className="text-center p-4 text-sm font-medium text-glass">Review</th>
                    <th className="text-center p-4 text-sm font-medium text-glass">Unmatched</th>
                    <th className="text-right p-4 text-sm font-medium text-glass">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => (
                    <tr
                      key={session.id}
                      className="border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-5 transition-all"
                    >
                      <td className="p-4 text-sm text-glass">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-glass-muted" />
                          {formatDateDDMMYYYY(session.upload_date)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm text-glass font-medium">{session.file_name}</p>
                          {session.error_message && (
                            <p className="text-xs text-red-600 mt-1">{session.error_message}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-glass-muted">
                        {formatFileSize(session.file_size)}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(session.processing_status)}
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-glass">
                          {session.total_transactions}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-green-700">
                          {session.auto_matched}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-orange-600">
                          {session.review_required}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-red-600">
                          {session.unmatched}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {session.processing_status === 'completed' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewSession(session.id)}
                                className="flex items-center gap-1"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExportSession(session.id)}
                                className="flex items-center gap-1"
                                title="Export Report"
                              >
                                <Download size={14} />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSession(session.id)}
                            disabled={deletingId === session.id}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            title="Delete Session"
                          >
                            {deletingId === session.id ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {!loading && filteredSessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            <div className="glass-card rounded-xl p-6">
              <p className="text-sm text-glass-muted mb-1">Total Sessions</p>
              <p className="text-2xl font-bold text-glass">{filteredSessions.length}</p>
            </div>
            <div className="glass-card rounded-xl p-6">
              <p className="text-sm text-glass-muted mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-700">
                {filteredSessions.filter(s => s.processing_status === 'completed').length}
              </p>
            </div>
            <div className="glass-card rounded-xl p-6">
              <p className="text-sm text-glass-muted mb-1">Total Matched</p>
              <p className="text-2xl font-bold text-green-700">
                {filteredSessions.reduce((sum, s) => sum + s.auto_matched, 0)}
              </p>
            </div>
            <div className="glass-card rounded-xl p-6">
              <p className="text-sm text-glass-muted mb-1">Needs Review</p>
              <p className="text-2xl font-bold text-orange-600">
                {filteredSessions.reduce((sum, s) => sum + s.review_required, 0)}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export { ReconciliationHistory };

