import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
   
  LogOut, 
  HelpCircle, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Download, 
  ArrowLeft,
  Brain,
  Zap,
  Target,
  TrendingUp,
  RefreshCw,
  X,
  ThumbsUp,
  ThumbsDown,
  Link as LinkIcon,
  Info,
  Search,
  Filter,
  UserX
} from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { NotificationBell } from '../ui/NotificationBell';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../hooks/useAuth';
import { formatDateDDMMYYYY } from '../../utils/timezoneUtils';
import { supabase } from '../../lib/supabase';
import { 
  validateBankStatementFile, 
  uploadBankStatement, 
  readFileContent,
  formatFileSize 
} from '../../utils/bankStatementUpload';
import toast from 'react-hot-toast';

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  reference_number: string | null;
  transaction_type: string | null;
  raw_description: string;
}

interface PaymentReconciliation {
  id: string;
  payment_id: string;
  bank_transaction_id: string | null;
  confidence_score: number;
  match_status: 'definite_match' | 'high_confidence' | 'review_required' | 'unmatched' | 'confirmed' | 'rejected' | 'manually_linked';
  matching_reasons: string[];
  is_reconciled: boolean;
  // Joined data
  payments?: {
    payment_date: string;
    payment_amount: number;
    reference: string | null;
    leases?: {
      properties?: {
        name: string;
      };
      tenants?: {
        id: string;
        name: string;
      };
    };
  };
  bank_transactions?: BankTransaction;
}

interface ReconciliationSummary {
  auto_matched: number;
  review_required: number;
  unmatched: number;
  total_payments: number;
}

// Workflow states
type WorkflowState = 'upload' | 'processing' | 'results';
type ProcessingStep = 'uploading' | 'parsing' | 'matching' | 'complete';

const AIReconciliation: React.FC = () => {
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Processing states
  const [workflowState, setWorkflowState] = useState<WorkflowState>('upload');
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('uploading');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Session and results states
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reconciliationSummary, setReconciliationSummary] = useState<ReconciliationSummary | null>(null);
  const [reconciliations, setReconciliations] = useState<PaymentReconciliation[]>([]);
  const [activeTab, setActiveTab] = useState('review_required');
  
  // Modal states
  const [showManualLinkModal, setShowManualLinkModal] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState<PaymentReconciliation | null>(null);
  const [availableBankTransactions, setAvailableBankTransactions] = useState<BankTransaction[]>([]);
  const [selectedBankTransactionId, setSelectedBankTransactionId] = useState<string | null>(null);
  const [manualLinkNotes, setManualLinkNotes] = useState('');
  
  // Bulk selection states
  const [selectedReconciliationIds, setSelectedReconciliationIds] = useState<Set<string>>(new Set());
  const [isFinishing, setIsFinishing] = useState(false);
  
  // UI enhancement states
  const [showMatchReasons, setShowMatchReasons] = useState<string | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Load session from URL if present
  useEffect(() => {
    const sessionIdFromUrl = searchParams.get('session');
    if (sessionIdFromUrl && user) {
      loadExistingSession(sessionIdFromUrl);
    }
  }, [searchParams, user]);

  /**
   * Load an existing session
   */
  const loadExistingSession = async (existingSessionId: string) => {
    if (!user) return;

    try {
      setWorkflowState('processing');
      setProcessingStep('matching');
      setUploadProgress(75);
      setSessionId(existingSessionId);

      // Load session data
      const { data: session, error: sessionError } = await supabase
        .from('reconciliation_sessions')
        .select('*')
        .eq('id', existingSessionId)
        .eq('user_id', user.id)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      // Check if session is finalized (read-only mode)
      setIsReadOnly(session.processing_status === 'completed');

      // Set summary
      setReconciliationSummary({
        auto_matched: session.auto_matched,
        review_required: session.review_required,
        unmatched: session.unmatched,
        total_payments: session.total_transactions
      });

      // Load reconciliation results
      await loadReconciliationResults(existingSessionId);

      setProcessingStep('complete');
      setUploadProgress(100);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setWorkflowState('results');
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Failed to load reconciliation session');
      setWorkflowState('upload');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file
    const validation = validateBankStatementFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  /**
   * Clear selected file
   */
  const handleClearFile = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  /**
   * Process reconciliation - complete upload workflow
   */
  const processReconciliation = async () => {
    if (!selectedFile || !user) return;
    
    try {
      setWorkflowState('processing');
      setProcessingStep('uploading');
      setUploadProgress(0);

      // Step 1: Create reconciliation session record
      const { data: session, error: sessionError } = await supabase
        .from('reconciliation_sessions')
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          processing_status: 'uploaded'
        })
        .select()
        .single();

      if (sessionError || !session) {
        throw new Error('Failed to create reconciliation session');
      }

      setSessionId(session.id);
      console.log('Created session:', session.id);

      // Step 2: Upload file to Supabase storage
      setUploadProgress(25);
      const uploadResult = await uploadBankStatement(user.id, selectedFile);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'File upload failed');
      }

      // Update session with file URL
      await supabase
        .from('reconciliation_sessions')
        .update({ file_url: uploadResult.fileUrl })
        .eq('id', session.id);

      console.log('File uploaded:', uploadResult.filePath);

      // Step 3: Read CSV content
      setProcessingStep('parsing');
      setUploadProgress(50);
      const csvContent = await readFileContent(selectedFile);

      // Step 4: Call parse Edge Function
      console.log('Calling parse-bank-statement Edge Function...');
      const { data: parseData, error: parseError } = await supabase.functions.invoke(
        'parse-bank-statement',
        {
          body: {
            csvContent,
            sessionId: session.id
          }
        }
      );

      console.log('Parse response:', { parseData, parseError });

      if (parseError) {
        console.error('Parse Edge Function error:', parseError);
        throw new Error(`Parse failed: ${parseError.message || JSON.stringify(parseError)}`);
      }

      if (!parseData?.success) {
        console.error('Parse failed:', parseData);
        throw new Error(parseData?.error || 'Failed to parse bank statement');
      }

      console.log('Parsed transactions:', parseData.transactionCount);

      // Step 5: Call reconcile Edge Function
      setProcessingStep('matching');
      setUploadProgress(75);

      console.log('Calling reconcile-payments Edge Function...');
      const { data: reconcileData, error: reconcileError } = await supabase.functions.invoke(
        'reconcile-payments',
        {
          body: {
            sessionId: session.id
          }
        }
      );

      console.log('Reconcile response:', { reconcileData, reconcileError });

      if (reconcileError) {
        console.error('Reconcile Edge Function error:', reconcileError);
        console.error('Error details:', {
          message: reconcileError.message,
          context: reconcileError.context,
          name: reconcileError.name
        });
        
        // Provide user-friendly error messages
        let userMessage = 'Reconciliation failed: ';
        if (reconcileError.message?.includes('non-2xx status code')) {
          userMessage += 'The matching process encountered an error. This could be due to:\n' +
                        '• No unreconciled payments found in your account\n' +
                        '• Database connection issue\n' +
                        '• Invalid bank statement format\n\n' +
                        'Please try again or contact support if the issue persists.';
        } else if (reconcileError.message?.includes('timeout')) {
          userMessage += 'The request took too long. Please try with a smaller bank statement file.';
        } else if (reconcileError.message?.includes('authentication') || reconcileError.message?.includes('unauthorized')) {
          userMessage += 'Session expired. Please refresh the page and try again.';
        } else {
          userMessage += reconcileError.message || 'An unexpected error occurred. Please try again.';
        }
        
        throw new Error(userMessage);
      }
      
      if (reconcileData && !reconcileData.success) {
        console.error('Reconcile failed with error:', reconcileData.error);
        const errorMessage = reconcileData.error || 'Reconciliation failed';
        
        // Make error messages more user-friendly
        let userMessage = errorMessage;
        if (errorMessage.includes('No unreconciled payments found')) {
          userMessage = 'No unreconciled payments found. All your payments appear to be already reconciled.';
        } else if (errorMessage.includes('No bank transactions found')) {
          userMessage = 'No transactions found in the bank statement for this session. Please ensure the file was parsed correctly.';
        } else if (errorMessage.includes('Failed to fetch payments')) {
          userMessage = 'Unable to load your payment records. Please refresh the page and try again.';
        }
        
        throw new Error(userMessage);
      }

      if (!reconcileData?.success) {
        console.error('Reconcile failed:', reconcileData);
        throw new Error(reconcileData?.error || 'Failed to reconcile payments. Please try again.');
      }

      console.log('Reconciliation summary:', reconcileData.summary);

      // Step 6: Complete and navigate to results
      setProcessingStep('complete');
      setUploadProgress(100);
      setReconciliationSummary(reconcileData.summary);
      
      // Fetch reconciliation results
      await loadReconciliationResults(session.id);
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setWorkflowState('results');

    } catch (error) {
      console.error('Reconciliation error:', error);
      setUploadError(error instanceof Error ? error.message : 'An error occurred during reconciliation');
      setWorkflowState('upload');
      setProcessingStep('uploading');
      setUploadProgress(0);
      
      // Clean up session if created
      if (sessionId) {
        await supabase
          .from('reconciliation_sessions')
          .update({
            processing_status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', sessionId);
      }
    }
  };

  /**
   * Load reconciliation results from database
   */
  const loadReconciliationResults = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
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
                id,
                name
              )
            )
          ),
          bank_transactions (
            id,
            transaction_date,
            description,
            amount,
            reference_number,
            transaction_type,
            raw_description
          )
        `)
        .eq('session_id', sessionId)
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      setReconciliations(data || []);
    } catch (error) {
      console.error('Failed to load reconciliation results:', error);
      toast.error('Failed to load reconciliation results');
    }
  };

  /**
   * Confirm a match
   */
  const handleConfirmMatch = async (reconciliation: PaymentReconciliation) => {
    if (!user || !reconciliation.bank_transaction_id) return;

    try {
      // Update reconciliation status
      const { error } = await supabase
        .from('payment_reconciliations')
        .update({
          match_status: 'confirmed',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reconciliation.id);

      if (error) throw error;

      // Store learned pattern if tenant exists
      const tenantId = reconciliation.payments?.leases?.tenants?.id;
      const bankDesc = reconciliation.bank_transactions?.description;
      
      if (tenantId && bankDesc) {
        await supabase
          .from('reconciliation_patterns')
          .upsert({
            user_id: user.id,
            tenant_id: tenantId,
            bank_description_pattern: bankDesc,
            confidence_boost: 10,
            times_confirmed: 1,
            last_seen_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,tenant_id,bank_description_pattern',
            ignoreDuplicates: false
          });
      }

      // Refresh data
      if (sessionId) await loadReconciliationResults(sessionId);
      toast.success('Match confirmed successfully');
    } catch (error) {
      console.error('Failed to confirm match:', error);
      toast.error('Failed to confirm match');
    }
  };

  /**
   * Reject a match
   */
  const handleRejectMatch = async (reconciliation: PaymentReconciliation) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('payment_reconciliations')
        .update({
          match_status: 'rejected',
          bank_transaction_id: null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reconciliation.id);

      if (error) throw error;

      // Refresh data
      if (sessionId) await loadReconciliationResults(sessionId);
      toast.success('Match rejected');
    } catch (error) {
      console.error('Failed to reject match:', error);
      toast.error('Failed to reject match');
    }
  };

  /**
   * Open manual link modal
   */
  const openManualLinkModal = async (reconciliation: PaymentReconciliation) => {
    if (!sessionId) return;

    try {
      setSelectedReconciliation(reconciliation);
      
      // Fetch all bank transactions for this session
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('session_id', sessionId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setAvailableBankTransactions(data || []);
      setShowManualLinkModal(true);
    } catch (error) {
      console.error('Failed to load bank transactions:', error);
      toast.error('Failed to load transactions');
    }
  };

  /**
   * Submit manual link
   */
  const handleManualLink = async () => {
    if (!user || !selectedReconciliation || !selectedBankTransactionId) return;

    try {
      const { error } = await supabase
        .from('payment_reconciliations')
        .update({
          bank_transaction_id: selectedBankTransactionId,
          match_status: 'manually_linked',
          confidence_score: 100,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: manualLinkNotes || null
        })
        .eq('id', selectedReconciliation.id);

      if (error) throw error;

      // Store learned pattern
      const tenantId = selectedReconciliation.payments?.leases?.tenants?.id;
      const bankTransaction = availableBankTransactions.find(t => t.id === selectedBankTransactionId);
      
      if (tenantId && bankTransaction?.description) {
        await supabase
          .from('reconciliation_patterns')
          .upsert({
            user_id: user.id,
            tenant_id: tenantId,
            bank_description_pattern: bankTransaction.description,
            confidence_boost: 15,
            times_confirmed: 1,
            last_seen_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,tenant_id,bank_description_pattern',
            ignoreDuplicates: false
          });
      }

      // Close modal and refresh
      closeManualLinkModal();
      if (sessionId) await loadReconciliationResults(sessionId);
      toast.success('Manual link created successfully');
    } catch (error) {
      console.error('Failed to create manual link:', error);
      toast.error('Failed to create manual link');
    }
  };

  /**
   * Close manual link modal
   */
  const closeManualLinkModal = () => {
    setShowManualLinkModal(false);
    setSelectedReconciliation(null);
    setSelectedBankTransactionId(null);
    setManualLinkNotes('');
    setAvailableBankTransactions([]);
  };

  /**
   * Toggle bulk selection
   */
  const toggleReconciliationSelection = (reconciliationId: string) => {
    const newSelected = new Set(selectedReconciliationIds);
    if (newSelected.has(reconciliationId)) {
      newSelected.delete(reconciliationId);
    } else {
      newSelected.add(reconciliationId);
    }
    setSelectedReconciliationIds(newSelected);
  };

  /**
   * Select all reconciliations in current tab
   */
  const handleSelectAll = () => {
    if (selectedReconciliationIds.size === filteredReconciliations.length) {
      setSelectedReconciliationIds(new Set());
    } else {
      const newSelected = new Set(filteredReconciliations.map(r => r.id));
      setSelectedReconciliationIds(newSelected);
    }
  };

  /**
   * Bulk confirm selected reconciliations
   */
  const handleBulkConfirm = async () => {
    if (!user || selectedReconciliationIds.size === 0) return;

    const selectedRecs = reconciliations.filter(r => selectedReconciliationIds.has(r.id));
    let successCount = 0;

    try {
      for (const rec of selectedRecs) {
        try {
          await supabase
            .from('payment_reconciliations')
            .update({
              match_status: 'confirmed',
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString()
            })
            .eq('id', rec.id);

          // Store pattern if available
          const tenantId = rec.payments?.leases?.tenants?.id;
          const bankDesc = rec.bank_transactions?.description;
          
          if (tenantId && bankDesc) {
            await supabase
              .from('reconciliation_patterns')
              .upsert({
                user_id: user.id,
                tenant_id: tenantId,
                bank_description_pattern: bankDesc,
                confidence_boost: 10,
                times_confirmed: 1,
                last_seen_at: new Date().toISOString()
              }, {
                onConflict: 'user_id,tenant_id,bank_description_pattern',
                ignoreDuplicates: false
              });
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to confirm reconciliation ${rec.id}:`, error);
        }
      }

      // Refresh data
      if (sessionId) await loadReconciliationResults(sessionId);
      setSelectedReconciliationIds(new Set());
      toast.success(`${successCount} match${successCount !== 1 ? 'es' : ''} confirmed`);
    } catch (error) {
      console.error('Bulk confirm error:', error);
      toast.error('Failed to confirm some matches');
    }
  };

  /**
   * Show finalize confirmation modal
   */
  const openFinalizeModal = () => {
    setShowFinalizeModal(true);
  };

  /**
   * Finalize reconciliation - mark auto-matched as reconciled
   */
  const handleFinalize = async () => {
    if (!sessionId || !user) return;

    setIsFinishing(true);
    try {
      // Get auto-matched reconciliations (high_confidence and definite_match)
      const autoMatchedStatuses = ['definite_match', 'high_confidence'];
      const autoMatchedRecs = reconciliations.filter(r => autoMatchedStatuses.includes(r.match_status));

      if (autoMatchedRecs.length === 0) {
        toast.error('No auto-matched payments to finalize');
        setIsFinishing(false);
        setShowFinalizeModal(false);
        return;
      }

      const paymentIds = autoMatchedRecs.map(r => r.payment_id);
      const reconciliationIds = autoMatchedRecs.map(r => r.id);

      // Update payments table - mark as reconciled
      const { error: paymentsError } = await supabase
        .from('payments')
        .update({
          is_reconciled: true,
          last_reconciliation_date: new Date().toISOString()
        })
        .in('id', paymentIds);

      if (paymentsError) throw paymentsError;

      // Update reconciliation records - mark as reconciled
      const { error: recsError } = await supabase
        .from('payment_reconciliations')
        .update({ is_reconciled: true })
        .in('id', reconciliationIds);

      if (recsError) throw recsError;

      // Check if there are any review required items
      const reviewRequiredCount = reconciliations.filter(r => r.match_status === 'review_required').length;

      // Only mark session as completed if no review required items
      if (reviewRequiredCount === 0) {
        const { error: sessionError } = await supabase
          .from('reconciliation_sessions')
          .update({ processing_status: 'completed' })
          .eq('id', sessionId);

        if (sessionError) throw sessionError;
      }

      toast.success(`${autoMatchedRecs.length} payment${autoMatchedRecs.length !== 1 ? 's' : ''} finalized successfully!`);
      
      setShowFinalizeModal(false);
      setIsFinishing(false);
      
      // Navigate to history page
      navigate('/payments/reconciliation/history');
    } catch (error) {
      console.error('Finalization error:', error);
      toast.error('Failed to finalize reconciliation');
      setIsFinishing(false);
      setShowFinalizeModal(false);
    }
  };

  /**
   * Terminate reconciliation - delete bank transactions and reconciliations, mark as cancelled
   */
  const handleTerminate = async () => {
    if (!sessionId || !user) return;

    setIsTerminating(true);
    try {
      // Delete payment reconciliations for this session
      const { error: recsError } = await supabase
        .from('payment_reconciliations')
        .delete()
        .eq('session_id', sessionId);

      if (recsError) throw recsError;

      // Delete bank transactions for this session
      const { error: bankError } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('session_id', sessionId);

      if (bankError) throw bankError;

      // Update session status to cancelled
      const { error: sessionError } = await supabase
        .from('reconciliation_sessions')
        .update({ 
          processing_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      toast.success('Session terminated successfully');
      
      setShowTerminateModal(false);
      setIsTerminating(false);
      
      // Navigate to history page
      navigate('/payments/reconciliation/history');
    } catch (error) {
      console.error('Termination error:', error);
      toast.error('Failed to terminate session');
      setIsTerminating(false);
      setShowTerminateModal(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-700 bg-green-100';
    if (confidence >= 70) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'definite_match':
      case 'high_confidence':
      case 'confirmed':
      case 'manually_linked':
        return 'text-green-700 bg-green-100 bg-opacity-20';
      case 'review_required': 
        return 'text-orange-600 bg-orange-100 bg-opacity-20';
      case 'unmatched':
      case 'rejected':
        return 'text-red-600 bg-red-100 bg-opacity-20';
      default: 
        return 'text-glass-muted bg-white bg-opacity-10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'definite_match':
      case 'high_confidence':
      case 'confirmed':
      case 'manually_linked':
        return <CheckCircle size={16} />;
      case 'review_required': 
        return <AlertTriangle size={16} />;
      case 'unmatched':
      case 'rejected':
        return <X size={16} />;
      default: 
        return <Clock size={16} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'definite_match': return 'Definite Match';
      case 'high_confidence': return 'High Confidence';
      case 'review_required': return 'Review Required';
      case 'unmatched': return 'Unmatched';
      case 'confirmed': return 'Confirmed';
      case 'rejected': return 'Rejected';
      case 'manually_linked': return 'Manual Link';
      default: return status;
    }
  };

  /**
   * Check if tenant names are completely different (not just partial match)
   */
  const hasTenantMismatch = (rec: PaymentReconciliation): boolean => {
    const paymentTenant = rec.payments?.leases?.tenants?.name?.toLowerCase() || '';
    const bankDesc = rec.bank_transactions?.description?.toLowerCase() || '';
    
    if (!paymentTenant || !bankDesc || !rec.bank_transaction_id) return false;
    
    // Extract potential tenant name from bank description
    const tenantWords = paymentTenant.split(' ');
    const hasMatch = tenantWords.some(word => 
      word.length > 2 && bankDesc.includes(word)
    );
    
    // If no words match at all, it's a complete mismatch
    return !hasMatch;
  };

  /**
   * Get user-friendly match reasons
   */
  const getMatchReasons = (rec: PaymentReconciliation): { friendly: string; detailed: string[] } => {
    const paymentAmount = rec.payments?.payment_amount || 0;
    const bankAmount = rec.bank_transactions?.amount || 0;
    const amountDiff = Math.abs(paymentAmount - bankAmount);
    
    const paymentDate = new Date(rec.payments?.payment_date || '');
    const bankDate = new Date(rec.bank_transactions?.transaction_date || '');
    const daysDiff = Math.abs(Math.floor((bankDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    const paymentRef = rec.payments?.reference || '';
    const bankRef = rec.bank_transactions?.reference_number || '';
    const bankDesc = rec.bank_transactions?.description || '';
    
    const paymentTenant = rec.payments?.leases?.tenants?.name || '';
    
    const detailed: string[] = [];
    let friendly = '';
    
    // Amount matching
    if (amountDiff === 0) {
      detailed.push('✓ Amount: Exact match');
    } else if (amountDiff <= 1) {
      detailed.push(`✓ Amount: Within ₹1 difference`);
    } else if (amountDiff <= 10) {
      detailed.push(`⚠ Amount: Within ₹10 difference`);
    } else {
      detailed.push(`✗ Amount: Significant mismatch (₹${Math.abs(paymentAmount - bankAmount)} difference)`);
    }
    
    // Date matching
    if (daysDiff === 0) {
      detailed.push('✓ Date: Same day');
    } else if (daysDiff <= 2) {
      detailed.push(`✓ Date: ${daysDiff} day${daysDiff > 1 ? 's' : ''} apart`);
    } else if (daysDiff <= 5) {
      detailed.push(`⚠ Date: ${daysDiff} days apart`);
    } else if (daysDiff <= 7) {
      detailed.push(`⚠ Date: ${daysDiff} days apart (edge of tolerance)`);
    } else {
      detailed.push(`✗ Date: ${daysDiff} days apart (beyond tolerance)`);
    }
    
    // Reference matching
    if (paymentRef && bankRef && paymentRef.toLowerCase() === bankRef.toLowerCase()) {
      detailed.push('✓ Reference: Exact match');
    } else if (paymentRef && (bankRef.toLowerCase().includes(paymentRef.toLowerCase()) || 
               bankDesc.toLowerCase().includes(paymentRef.toLowerCase()))) {
      detailed.push('✓ Reference: Partial match found');
    } else if (!paymentRef) {
      detailed.push('○ Reference: Payment has no reference');
    } else {
      detailed.push('✗ Reference: No match found');
    }
    
    // Tenant matching
    const tenantWords = paymentTenant.toLowerCase().split(' ');
    const fullMatch = bankDesc.toLowerCase().includes(paymentTenant.toLowerCase());
    const partialMatch = tenantWords.some(word => word.length > 2 && bankDesc.toLowerCase().includes(word));
    
    if (fullMatch) {
      detailed.push('✓ Tenant: Full name match');
    } else if (partialMatch) {
      detailed.push('✓ Tenant: Partial name match');
    } else {
      detailed.push('⚠ Tenant: Name not found in description');
    }
    
    // Generate friendly summary
    if (rec.confidence_score >= 90) {
      friendly = 'High confidence match with strong signals across multiple factors.';
    } else if (rec.confidence_score >= 75) {
      friendly = 'Good match with most factors aligning well.';
    } else if (rec.confidence_score >= 50) {
      friendly = 'Partial match detected. Manual review recommended.';
    } else {
      friendly = 'Low confidence match or no suitable match found.';
    }
    
    return { friendly, detailed };
  };

  // Filter reconciliations based on active tab, search, and property filter
  const filteredReconciliations = reconciliations.filter(rec => {
    // Tab filter
    let matchesTab = true;
    if (activeTab !== 'all') {
      if (activeTab === 'auto_matched') {
        matchesTab = ['definite_match', 'high_confidence', 'confirmed', 'manually_linked'].includes(rec.match_status);
      } else {
        matchesTab = rec.match_status === activeTab;
      }
    }

    // Search filter
    const matchesSearch = !searchFilter || 
      rec.payments?.leases?.tenants?.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      rec.bank_transactions?.description?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      rec.payments?.reference?.toLowerCase().includes(searchFilter.toLowerCase());

    // Property filter
    const matchesProperty = propertyFilter === 'all' || 
      rec.payments?.leases?.properties?.name === propertyFilter;

    return matchesTab && matchesSearch && matchesProperty;
  });

  // Calculate summary counts
  const summaryFromReconciliations = {
    auto_matched: reconciliations.filter(r => 
      ['definite_match', 'high_confidence', 'confirmed', 'manually_linked'].includes(r.match_status)
    ).length,
    review_required: reconciliations.filter(r => r.match_status === 'review_required').length,
    unmatched: reconciliations.filter(r => r.match_status === 'unmatched' || r.match_status === 'rejected').length,
    total: reconciliations.length
  };

  // Get unique properties for filter
  const uniqueProperties = Array.from(
    new Set(reconciliations.map(r => r.payments?.leases?.properties?.name).filter(Boolean))
  );

  const exportReconciliationReport = () => {
    const headers = ['Payment Date', 'Bank Date', 'Property', 'Tenant', 'Payment Amount', 'Bank Amount', 'Bank Description', 'Status', 'Confidence', 'Matching Reasons'];
    const csvContent = [
      headers.join(','),
      ...reconciliations.map(rec => {
        return [
          rec.payments?.payment_date || '',
          rec.bank_transactions?.transaction_date || '',
          `"${rec.payments?.leases?.properties?.name || ''}"`,
          `"${rec.payments?.leases?.tenants?.name || ''}"`,
          rec.payments?.payment_amount || '',
          rec.bank_transactions?.amount || '',
          `"${rec.bank_transactions?.description || ''}"`,
          getStatusLabel(rec.match_status),
          rec.confidence_score,
          `"${rec.matching_reasons.join(', ')}"`,
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
    toast.success('Report downloaded successfully');
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 glass rounded-lg flex items-center justify-center glow">
                <Brain className="w-6 h-6 text-green-800" />
              </div>
              <h1 className="text-3xl font-bold text-glass">AI Payment Reconciliation</h1>
            </div>
            <p className="text-glass-muted">Upload your bank statement and let AI automatically match payments</p>
          </div>
          
          <Link to="/payments/reconciliation/history">
            <Button variant="outline" className="flex items-center gap-2">
              <Clock size={16} />
              View History
            </Button>
          </Link>
        </div>

        {workflowState === 'upload' && (
          <>
            {/* Upload Section */}
            <div className="glass-card rounded-xl p-8 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
                  <Upload className="w-8 h-8 text-green-800" />
                </div>
                <h2 className="text-xl font-semibold text-glass mb-2">Upload Bank Statement</h2>
                <p className="text-glass-muted mb-6">
                  Upload your bank statement CSV file for AI-powered reconciliation
                </p>

                {/* Error Display */}
                {uploadError && (
                  <div className="mb-6 p-4 bg-red-100 bg-opacity-20 border border-red-300 rounded-lg">
                    <p className="text-red-600 text-sm">{uploadError}</p>
                  </div>
                )}

                <div className="border-2 border-dashed border-white border-opacity-30 rounded-lg p-8 mb-6">
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-green-800" />
                      <div>
                        <p className="font-medium text-glass">{selectedFile.name}</p>
                        <p className="text-sm text-glass-muted">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFile}
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
                        accept=".csv,.txt,text/csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label 
                        htmlFor="file-upload"
                        className="inline-flex items-center justify-center px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all cursor-pointer"
                      >
                        Choose File
                      </label>
                      <p className="text-xs text-glass-muted mt-3">
                        Supported formats: CSV • Max size: 10MB
                      </p>
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
                  disabled={!selectedFile}
                  className="flex items-center gap-2"
                >
                  <Brain size={16} />
                  Start AI Reconciliation
                </Button>
              </div>
            </div>

          </>
        )}

        {/* Processing State */}
        {workflowState === 'processing' && (
          <div className="glass-card rounded-xl p-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 glow">
                <RefreshCw className="w-8 h-8 text-green-800 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-glass mb-2">Processing Bank Statement</h2>
              <p className="text-glass-muted mb-6">
                AI is analyzing your bank statement and matching transactions
              </p>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="w-full bg-gray-200 bg-opacity-20 rounded-full h-3 mb-2">
                  <div 
                    className="bg-green-800 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-glass-muted">{uploadProgress}% Complete</p>
              </div>

              {/* Processing Steps */}
              <div className="space-y-3">
                {[
                  { step: 'uploading', label: 'Uploading file to secure storage', progress: 0 },
                  { step: 'parsing', label: 'Parsing bank statement with AI', progress: 50 },
                  { step: 'matching', label: 'Matching transactions with payments', progress: 75 },
                  { step: 'complete', label: 'Finalizing results', progress: 100 }
                ].map(({ step, label, progress }) => (
                  <div 
                    key={step}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      processingStep === step 
                        ? 'glass' 
                        : uploadProgress > progress 
                        ? 'bg-green-100 bg-opacity-10' 
                        : 'bg-white bg-opacity-5'
                    }`}
                  >
                    {uploadProgress > progress ? (
                      <CheckCircle size={20} className="text-green-700" />
                    ) : processingStep === step ? (
                      <RefreshCw size={20} className="text-green-800 animate-spin" />
                    ) : (
                      <Clock size={20} className="text-glass-muted" />
                    )}
                    <span className={`text-sm ${
                      processingStep === step || uploadProgress > progress
                        ? 'text-glass font-medium'
                        : 'text-glass-muted'
                    }`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-glass-muted mt-6">
                This usually takes 30-60 seconds
              </p>
            </div>
          </div>
        )}

        {workflowState === 'results' && (
          <>
            {/* Results Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="glass-card rounded-xl p-6 glow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-800" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-glass-muted mb-1">Total Payments</h3>
                <p className="text-3xl font-bold text-glass">{reconciliationSummary?.total_payments || 0}</p>
                <p className="text-sm text-glass-muted mt-2">To reconcile</p>
              </div>

              <div className="glass-card rounded-xl p-6 glow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-800" />
                  </div>
                  <TrendingUp size={16} className="text-green-700" />
                </div>
                <h3 className="text-sm font-medium text-glass-muted mb-1">Auto Matched</h3>
                <p className="text-3xl font-bold text-green-700">{reconciliationSummary?.auto_matched || 0}</p>
                <p className="text-sm text-green-700 mt-2">High confidence</p>
              </div>

              <div className="glass-card rounded-xl p-6 glow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-glass-muted mb-1">Review Required</h3>
                <p className="text-3xl font-bold text-orange-600">{reconciliationSummary?.review_required || 0}</p>
                <p className="text-sm text-orange-600 mt-2">Needs attention</p>
              </div>

              <div className="glass-card rounded-xl p-6 glow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 glass rounded-lg flex items-center justify-center">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-glass-muted mb-1">Unmatched</h3>
                <p className="text-3xl font-bold text-red-600">{reconciliationSummary?.unmatched || 0}</p>
                <p className="text-sm text-red-600 mt-2">No match found</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-3">
                {/* Bulk Actions */}
                {selectedReconciliationIds.size > 0 && (
                  <Button
                    onClick={handleBulkConfirm}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Confirm Selected ({selectedReconciliationIds.size})
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={exportReconciliationReport}
                  className="flex items-center gap-2"
                >
                  <Download size={16} />
                  Export Report
                </Button>
                {/* Save for Later and Terminate buttons - only show if not finalized */}
                {!isReadOnly && (
                  <>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (sessionId) {
                          await supabase
                            .from('reconciliation_sessions')
                            .update({ 
                              processing_status: 'saved',
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', sessionId);
                          toast.success('Session saved. You can continue later.');
                        }
                        navigate('/payments/reconciliation/history');
                      }}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft size={16} />
                      Save for Later
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowTerminateModal(true)}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                    >
                      <X size={16} />
                      Terminate
                    </Button>
                  </>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setWorkflowState('upload');
                    setSelectedFile(null);
                    setSessionId(null);
                    setReconciliationSummary(null);
                    setUploadError(null);
                    setSelectedReconciliationIds(new Set());
                  }}
                  className="flex items-center gap-2"
                >
                  <Upload size={16} />
                  Upload New Statement
                </Button>
              </div>

              {/* Finalize Button */}
              {!isReadOnly && (
                <Button
                  onClick={openFinalizeModal}
                  disabled={isFinishing || summaryFromReconciliations.auto_matched === 0}
                  className="flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Finalize Reconciliation
                </Button>
              )}
              {isReadOnly && (
                <div className="px-4 py-2 glass rounded-lg flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-700" />
                  <span className="text-sm font-medium text-green-700">Finalized</span>
                </div>
              )}
            </div>

            {/* Search and Filters */}
            <div className="glass-card rounded-xl p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search */}
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-glass-muted" size={18} />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search by tenant, description, or reference..."
                      className="w-full pl-10 pr-4 py-2 glass rounded-lg border border-white border-opacity-20 text-glass placeholder-glass-muted focus:outline-none focus:ring-2 focus:ring-green-800 focus:ring-opacity-50"
                    />
                  </div>
                </div>

                {/* Property Filter */}
                <div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-glass-muted" size={18} />
                    <select
                      value={propertyFilter}
                      onChange={(e) => setPropertyFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 glass rounded-lg border border-white border-opacity-20 text-glass focus:outline-none focus:ring-2 focus:ring-green-800 focus:ring-opacity-50 appearance-none cursor-pointer"
                    >
                      <option value="all">All Properties</option>
                      {uniqueProperties.map((property) => (
                        <option key={property} value={property}>
                          {property}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="border-b border-white border-opacity-20">
                <nav className="flex">
                  {[
                    { id: 'review_required', label: 'Review Required', count: summaryFromReconciliations.review_required },
                    { id: 'auto_matched', label: 'Auto Matched', count: summaryFromReconciliations.auto_matched },
                    { id: 'unmatched', label: 'Unmatched', count: summaryFromReconciliations.unmatched },
                    { id: 'all', label: 'All', count: summaryFromReconciliations.total }
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
                      <th className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedReconciliationIds.size === filteredReconciliations.length && filteredReconciliations.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-white border-opacity-30 bg-white bg-opacity-10 text-green-800 focus:ring-2 focus:ring-green-800 focus:ring-opacity-50 cursor-pointer"
                        />
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Payment Date</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Bank Date</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Property</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Tenant</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Amount</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Bank Description</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Confidence</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-glass">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReconciliations.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-glass-muted">
                          No records found
                        </td>
                      </tr>
                    ) : (
                      filteredReconciliations.map((rec) => (
                        <tr key={rec.id} className="border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-5 transition-all">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedReconciliationIds.has(rec.id)}
                              onChange={() => toggleReconciliationSelection(rec.id)}
                              disabled={rec.match_status === 'confirmed' || rec.match_status === 'manually_linked'}
                              className="w-4 h-4 rounded border-white border-opacity-30 bg-white bg-opacity-10 text-green-800 focus:ring-2 focus:ring-green-800 focus:ring-opacity-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="p-4 text-sm text-glass">
                            {rec.payments?.payment_date ? formatDateDDMMYYYY(rec.payments.payment_date) : '-'}
                          </td>
                          <td className="p-4 text-sm text-glass">
                            {rec.bank_transactions?.transaction_date ? formatDateDDMMYYYY(rec.bank_transactions.transaction_date) : '-'}
                          </td>
                          <td className="p-4 text-sm text-glass max-w-xs truncate">
                            {rec.payments?.leases?.properties?.name || '-'}
                          </td>
                          <td className="p-4 text-sm text-glass">
                            <div className="flex items-center gap-2">
                              {rec.payments?.leases?.tenants?.name || '-'}
                              {/* Tenant Mismatch Warning */}
                              {hasTenantMismatch(rec) && (
                                <div className="relative group">
                                  <UserX size={16} className="text-orange-600" />
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-orange-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    Tenant name not found in bank description
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-orange-600 rotate-45"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-glass font-medium">
                            <div className="flex flex-col gap-1">
                              <span>₹{rec.payments?.payment_amount?.toLocaleString() || 0}</span>
                              {rec.bank_transactions?.amount && (
                                <span className="text-xs text-glass-muted">
                                  Bank: ₹{rec.bank_transactions.amount.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-glass-muted max-w-xs">
                            <div className="truncate" title={rec.bank_transactions?.description || '-'}>
                              {rec.bank_transactions?.description || '-'}
                            </div>
                          </td>
                          <td className="p-4">
                            {rec.confidence_score > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(rec.confidence_score)}`}>
                                  {rec.confidence_score}%
                                </span>
                                {/* Match Reasons Info Icon */}
                                <div className="relative group">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowMatchReasons(showMatchReasons === rec.id ? null : rec.id);
                                    }}
                                    className="p-1 hover:bg-white hover:bg-opacity-10 rounded transition-all"
                                  >
                                    <Info size={14} className="text-glass-muted hover:text-glass" />
                                  </button>
                                  {showMatchReasons === rec.id && (
                                    <div className="absolute right-0 top-full mt-2 w-80 glass-card rounded-lg shadow-xl z-50 p-4">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowMatchReasons(null);
                                        }}
                                        className="absolute top-2 right-2 p-1 hover:bg-white hover:bg-opacity-10 rounded transition-all"
                                      >
                                        <X size={14} className="text-glass" />
                                      </button>
                                      <h4 className="text-sm font-semibold text-glass mb-2">Match Analysis</h4>
                                      <p className="text-xs text-glass-muted mb-3 pr-6">
                                        {getMatchReasons(rec).friendly}
                                      </p>
                                      <div className="border-t border-white border-opacity-20 pt-3">
                                        <h5 className="text-xs font-medium text-glass mb-2">Detailed Breakdown:</h5>
                                        <div className="space-y-1">
                                          {getMatchReasons(rec).detailed.map((reason, idx) => (
                                            <p key={idx} className="text-xs text-glass-muted font-mono">
                                              {reason}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-glass-muted text-sm">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rec.match_status)}`}>
                              {getStatusIcon(rec.match_status)}
                              {getStatusLabel(rec.match_status)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              {!isReadOnly ? (
                                <>
                                  {/* Review Required Actions */}
                                  {rec.match_status === 'review_required' && (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleConfirmMatch(rec)}
                                        className="flex items-center gap-1"
                                      >
                                        <ThumbsUp size={14} />
                                        Confirm
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleRejectMatch(rec)}
                                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                                      >
                                        <ThumbsDown size={14} />
                                        Reject
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => openManualLinkModal(rec)}
                                        className="flex items-center gap-1"
                                      >
                                        <LinkIcon size={14} />
                                        Relink
                                      </Button>
                                    </>
                                  )}

                                  {/* High Confidence Actions */}
                                  {(rec.match_status === 'high_confidence' || rec.match_status === 'definite_match') && (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleConfirmMatch(rec)}
                                        className="flex items-center gap-1"
                                      >
                                        <ThumbsUp size={14} />
                                        Confirm
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleRejectMatch(rec)}
                                        className="flex items-center gap-1 text-red-600"
                                      >
                                        <ThumbsDown size={14} />
                                      </Button>
                                    </>
                                  )}

                                  {/* Unmatched/Rejected Actions */}
                                  {(rec.match_status === 'unmatched' || rec.match_status === 'rejected') && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => openManualLinkModal(rec)}
                                      className="flex items-center gap-1"
                                    >
                                      <LinkIcon size={14} />
                                      Manual Link
                                    </Button>
                                  )}

                                  {/* Confirmed/Manually Linked - View Only */}
                                  {(rec.match_status === 'confirmed' || rec.match_status === 'manually_linked') && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="flex items-center gap-1 text-green-700"
                                      disabled
                                    >
                                      <CheckCircle size={14} />
                                      Confirmed
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-glass-muted">View Only</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Manual Link Modal */}
      {showManualLinkModal && selectedReconciliation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white border-opacity-20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-glass flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-green-800" />
                    Manual Link Transaction
                  </h2>
                  <p className="text-sm text-glass-muted mt-1">
                    Select a bank transaction to link with this payment
                  </p>
                </div>
                <button
                  onClick={closeManualLinkModal}
                  className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-all"
                >
                  <X size={20} className="text-glass" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Payment Details */}
              <div className="glass rounded-lg p-4">
                <h3 className="text-sm font-medium text-glass mb-3">Payment Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-glass-muted">Property:</span>
                    <p className="text-glass font-medium">
                      {selectedReconciliation.payments?.leases?.properties?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-glass-muted">Tenant:</span>
                    <p className="text-glass font-medium">
                      {selectedReconciliation.payments?.leases?.tenants?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-glass-muted">Date:</span>
                    <p className="text-glass font-medium">
                      {selectedReconciliation.payments?.payment_date ? formatDateDDMMYYYY(selectedReconciliation.payments.payment_date) : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-glass-muted">Amount:</span>
                    <p className="text-glass font-medium">
                      ₹{selectedReconciliation.payments?.payment_amount?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Transaction Selection */}
              <div>
                <label className="block text-sm font-medium text-glass mb-2">
                  Select Bank Transaction
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableBankTransactions.map((transaction) => {
                    const isSelected = selectedBankTransactionId === transaction.id;
                    const amountMatch = transaction.amount === selectedReconciliation.payments?.payment_amount;
                    
                    return (
                      <button
                        key={transaction.id}
                        onClick={() => setSelectedBankTransactionId(transaction.id)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-green-800 glass'
                            : amountMatch
                            ? 'border-green-800 border-opacity-30 bg-white bg-opacity-5 hover:bg-opacity-10'
                            : 'border-white border-opacity-20 bg-white bg-opacity-5 hover:bg-opacity-10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-glass-muted">
                            {formatDateDDMMYYYY(transaction.transaction_date)}
                          </span>
                          <span className={`text-sm font-medium ${amountMatch ? 'text-green-700' : 'text-glass'}`}>
                            ₹{transaction.amount.toLocaleString()}
                            {amountMatch && <CheckCircle size={14} className="inline ml-1" />}
                          </span>
                        </div>
                        <p className="text-sm text-glass truncate" title={transaction.description}>
                          {transaction.description}
                        </p>
                        {transaction.reference_number && (
                          <p className="text-xs text-glass-muted mt-1">
                            Ref: {transaction.reference_number}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-glass mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={manualLinkNotes}
                  onChange={(e) => setManualLinkNotes(e.target.value)}
                  placeholder="Add any notes about this manual link..."
                  className="w-full px-4 py-3 glass rounded-lg border border-white border-opacity-20 text-glass placeholder-glass-muted focus:outline-none focus:ring-2 focus:ring-green-800 focus:ring-opacity-50"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-white border-opacity-20">
                <Button
                  variant="outline"
                  onClick={closeManualLinkModal}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManualLink}
                  disabled={!selectedBankTransactionId}
                  className="flex items-center gap-2"
                >
                  <LinkIcon size={16} />
                  Create Link
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Confirmation Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-white border-opacity-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 bg-opacity-20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-glass">
                    Finalize Reconciliation
                  </h2>
                </div>
                <button
                  onClick={() => setShowFinalizeModal(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-all"
                  disabled={isFinishing}
                >
                  <X size={20} className="text-glass" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="glass rounded-lg p-4">
                <h3 className="text-sm font-semibold text-glass mb-3">This action will:</h3>
                <ul className="space-y-2 text-sm text-glass-muted">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-700 mt-0.5 flex-shrink-0" />
                    <span>
                      Mark <strong className="text-glass">
                        {reconciliations.filter(r => ['definite_match', 'high_confidence'].includes(r.match_status)).length} auto-matched payments
                      </strong> as reconciled
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-700 mt-0.5 flex-shrink-0" />
                    <span>Update payment records with reconciliation date</span>
                  </li>
                  {reconciliations.filter(r => r.match_status === 'review_required').length === 0 ? (
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-700 mt-0.5 flex-shrink-0" />
                      <span>Mark this session as <strong className="text-glass">completed</strong></span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong className="text-orange-600">
                          {reconciliations.filter(r => r.match_status === 'review_required').length} payments require review
                        </strong>
                        <br />
                        Session will remain active until all are reviewed
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="bg-orange-100 bg-opacity-10 border border-orange-600 border-opacity-30 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-orange-600 font-medium mb-1">Important:</p>
                    <p className="text-glass-muted">
                      After finalization, you will be redirected to the history page. 
                      {reconciliations.filter(r => r.match_status === 'review_required').length === 0 
                        ? ' This session will become read-only.'
                        : ' Complete remaining reviews to finalize the session.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white border-opacity-20 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowFinalizeModal(false)}
                disabled={isFinishing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={isFinishing}
                className="flex items-center gap-2"
              >
                {isFinishing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Confirm Finalization
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Confirmation Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-white border-opacity-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 bg-opacity-20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-glass">
                    Terminate Session
                  </h2>
                </div>
                <button
                  onClick={() => setShowTerminateModal(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-all"
                  disabled={isTerminating}
                >
                  <X size={20} className="text-glass" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-100 bg-opacity-10 border border-red-600 border-opacity-30 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm space-y-2">
                    <p className="text-red-600 font-semibold">Warning: This action cannot be undone!</p>
                    <p className="text-glass-muted">
                      Terminating this session will:
                    </p>
                    <ul className="list-disc list-inside text-glass-muted space-y-1 ml-2">
                      <li>Delete all bank transactions uploaded in this session</li>
                      <li>Delete all reconciliation matches</li>
                      <li>Mark this session as cancelled</li>
                      <li>Allow you to upload the same file again without duplicates</li>
                    </ul>
                    <p className="text-red-600 font-medium mt-3">
                      No payments will be marked as reconciled.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-glass-muted">
                Are you sure you want to terminate this reconciliation session?
              </p>
            </div>

            <div className="p-6 border-t border-white border-opacity-20 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowTerminateModal(false)}
                disabled={isTerminating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTerminate}
                disabled={isTerminating}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
              >
                {isTerminating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Terminating...
                  </>
                ) : (
                  <>
                    <X size={16} />
                    Terminate Session
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { AIReconciliation };