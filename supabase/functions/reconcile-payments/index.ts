// =====================================================
// Reconcile Payments Edge Function
// Orchestrates the matching algorithm between payments and bank transactions
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Supabase Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Import matching algorithm types
interface Payment {
  id: string;
  payment_date: string;
  payment_amount: number;
  reference: string | null;
  lease_id: string;
  tenant_id?: string;
  tenant_name?: string;
  property_name?: string;
}

interface BankTransaction {
  id: string;
  transaction_date: string;
  amount: number;
  description: string;
  reference_number: string | null;
  raw_description: string;
}

interface LearnedPattern {
  bank_description_pattern: string;
  confidence_boost: number;
  times_confirmed: number;
}

interface MatchResult {
  payment_id: string;
  bank_transaction_id: string | null;
  confidence_score: number;
  match_status: 'definite_match' | 'high_confidence' | 'review_required' | 'unmatched';
  matching_reasons: string[];
}

interface RequestBody {
  sessionId: string;
}

// =====================================================
// MATCHING ALGORITHM (Inline implementation)
// =====================================================

const SCORING = {
  AMOUNT_EXACT: 45,
  AMOUNT_WITHIN_1: 35,
  AMOUNT_WITHIN_10: 20,
  DATE_SAME_DAY: 30,
  DATE_WITHIN_2_DAYS: 25,
  DATE_WITHIN_5_DAYS: 15,
  DATE_WITHIN_7_DAYS: 10,
  DATE_PENALTY: -20,
  REFERENCE_EXACT: 15,
  REFERENCE_PARTIAL: 10,
  NAME_FULL_MATCH: 10,
  NAME_FIRST_OR_LAST: 7,
  NAME_FUZZY: 5,
  PATTERN_MAX_BOOST: 20
};

const THRESHOLDS = {
  DEFINITE_MATCH: 90,
  HIGH_CONFIDENCE: 75,
  REVIEW_REQUIRED: 50
};

function daysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

function calculateMatch(
  payment: Payment,
  bankTransaction: BankTransaction,
  patterns: LearnedPattern[] = []
): MatchResult {
  const reasons: string[] = [];
  let totalScore = 0;

  // Amount matching
  const diff = Math.abs(payment.payment_amount - bankTransaction.amount);
  if (diff === 0) {
    totalScore += SCORING.AMOUNT_EXACT;
    reasons.push('exact_amount');
  } else if (diff <= 1) {
    totalScore += SCORING.AMOUNT_WITHIN_1;
    reasons.push('amount_within_1');
  } else if (diff <= 10) {
    totalScore += SCORING.AMOUNT_WITHIN_10;
    reasons.push('amount_within_10');
  } else {
    return {
      payment_id: payment.id,
      bank_transaction_id: null,
      confidence_score: 0,
      match_status: 'unmatched',
      matching_reasons: ['amount_mismatch']
    };
  }

  // Date scoring
  const days = daysDifference(payment.payment_date, bankTransaction.transaction_date);
  if (days === 0) {
    totalScore += SCORING.DATE_SAME_DAY;
    reasons.push('same_day');
  } else if (days <= 2) {
    totalScore += SCORING.DATE_WITHIN_2_DAYS;
    reasons.push('within_2days');
  } else if (days <= 5) {
    totalScore += SCORING.DATE_WITHIN_5_DAYS;
    reasons.push('within_5days');
  } else if (days <= 7) {
    totalScore += SCORING.DATE_WITHIN_7_DAYS;
    reasons.push('within_week');
  } else {
    totalScore += SCORING.DATE_PENALTY;
    reasons.push('date_far_apart');
  }

  // Reference matching
  if (payment.reference && bankTransaction.reference_number) {
    const normPaymentRef = normalizeString(payment.reference);
    const normBankRef = normalizeString(bankTransaction.reference_number);
    if (normPaymentRef === normBankRef) {
      totalScore += SCORING.REFERENCE_EXACT;
      reasons.push('reference_exact');
    } else if (normBankRef.includes(normPaymentRef) || normPaymentRef.includes(normBankRef)) {
      totalScore += SCORING.REFERENCE_PARTIAL;
      reasons.push('reference_partial');
    }
  }

  // Tenant name matching
  if (payment.tenant_name) {
    const normName = normalizeString(payment.tenant_name);
    const normDesc = normalizeString(bankTransaction.description);
    
    if (normDesc.includes(normName)) {
      totalScore += SCORING.NAME_FULL_MATCH;
      reasons.push('tenant_full_name');
    } else {
      const nameParts = normName.split(' ').filter(part => part.length > 2);
      for (const part of nameParts) {
        if (normDesc.includes(part)) {
          totalScore += SCORING.NAME_FIRST_OR_LAST;
          reasons.push('tenant_first_or_last_name');
          break;
        }
      }
    }
  }

  // Learned patterns
  const normDesc = normalizeString(bankTransaction.description);
  for (const pattern of patterns) {
    const normPattern = normalizeString(pattern.bank_description_pattern);
    if (normDesc.includes(normPattern)) {
      totalScore += Math.min(pattern.confidence_boost, SCORING.PATTERN_MAX_BOOST);
      reasons.push(`learned_pattern_${pattern.times_confirmed}x`);
      break;
    }
  }

  const finalScore = Math.max(0, Math.min(100, totalScore));

  let matchStatus: MatchResult['match_status'];
  if (finalScore >= THRESHOLDS.DEFINITE_MATCH) {
    matchStatus = 'definite_match';
  } else if (finalScore >= THRESHOLDS.HIGH_CONFIDENCE) {
    matchStatus = 'high_confidence';
  } else if (finalScore >= THRESHOLDS.REVIEW_REQUIRED) {
    matchStatus = 'review_required';
  } else {
    matchStatus = 'unmatched';
  }

  return {
    payment_id: payment.id,
    bank_transaction_id: bankTransaction.id,
    confidence_score: finalScore,
    match_status: matchStatus,
    matching_reasons: reasons
  };
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  let sessionId: string | null = null; // Store in outer scope for error handling

  try {
    console.log('[reconcile-payments] Starting reconciliation');

    // Parse request
    const body: RequestBody = await req.json();
    sessionId = body.sessionId; // Assign to outer variable

    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    // Create Supabase client
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Fetch session (includes user_id - session auth is more reliable than JWT in Edge Functions)
    const { data: session, error: sessionError } = await supabase
      .from('reconciliation_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found or access denied');
    }

    // Use user_id from session instead of auth.getUser() to avoid Edge Function auth issues
    const userId = session.user_id;
    console.log(`[reconcile-payments] Processing session ${sessionId} for user ${userId}`);

    // Fetch unreconciled payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        payment_date,
        payment_amount,
        reference,
        lease_id,
        leases (
          id,
          tenant_id,
          tenants (
            id,
            name
          ),
          properties (
            id,
            name,
            owner_id
          )
        )
      `)
      .eq('is_reconciled', false)
      .eq('status', 'completed');

    if (paymentsError) {
      console.error('[reconcile-payments] Payment fetch error:', paymentsError);
      throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
    }

    console.log(`[reconcile-payments] Raw payments fetched:`, payments?.length || 0);
    if (payments && payments.length > 0) {
      console.log(`[reconcile-payments] Sample payment structure:`, JSON.stringify(payments[0], null, 2));
    }

    // Filter payments for current user
    const userPayments = (payments || []).filter((p: any) => 
      p.leases?.properties?.owner_id === userId
    );

    console.log(`[reconcile-payments] User ID:`, userId);
    console.log(`[reconcile-payments] Filtered payments count:`, userPayments.length);
    if (userPayments.length > 0) {
      console.log(`[reconcile-payments] Sample filtered payment:`, JSON.stringify(userPayments[0], null, 2));
    } else {
      console.warn(`[reconcile-payments] WARNING: No payments after filtering! This may indicate:
        1. Nested select not returning expected structure
        2. RLS policies blocking nested data
        3. Auth context mismatch`);
    }

    // Transform payments
    const transformedPayments: Payment[] = userPayments.map((p: any) => ({
      id: p.id,
      payment_date: p.payment_date,
      payment_amount: p.payment_amount,
      reference: p.reference,
      lease_id: p.lease_id,
      tenant_id: p.leases?.tenants?.id,
      tenant_name: p.leases?.tenants?.name,
      property_name: p.leases?.properties?.name
    }));

    console.log(`[reconcile-payments] Found ${transformedPayments.length} payments to reconcile for user ${userId}`);
    if (transformedPayments.length > 0) {
      console.log(`[reconcile-payments] Sample transformed payment:`, JSON.stringify(transformedPayments[0], null, 2));
    }

    if (transformedPayments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          warning: 'No unreconciled payments found',
          summary: {
            auto_matched: 0,
            review_required: 0,
            unmatched: 0,
            total_payments: 0
          }
        }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Fetch bank transactions
    const { data: bankTransactions, error: bankError } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('session_id', sessionId);

    if (bankError || !bankTransactions || bankTransactions.length === 0) {
      throw new Error('No bank transactions found for this session');
    }

    console.log(`[reconcile-payments] Found ${bankTransactions.length} bank transactions`);

    // Fetch learned patterns
    const tenantIds = transformedPayments.map(p => p.tenant_id).filter(Boolean);
    let patterns: LearnedPattern[] = [];
    
    if (tenantIds.length > 0) {
      const { data: patternsData } = await supabase
        .from('reconciliation_patterns')
        .select('bank_description_pattern, confidence_boost, times_confirmed')
        .eq('user_id', userId)
        .in('tenant_id', tenantIds);
      
      patterns = patternsData || [];
      console.log(`[reconcile-payments] Loaded ${patterns.length} learned patterns`);
    }

    // Run matching algorithm
    const matches: MatchResult[] = [];
    const usedBankTransactions = new Set<string>();

    for (const payment of transformedPayments) {
      let bestMatch: MatchResult | null = null;
      let highestScore = 0;

      for (const bankTransaction of bankTransactions) {
        if (usedBankTransactions.has(bankTransaction.id)) {
          continue;
        }

        const match = calculateMatch(payment, bankTransaction, patterns);

        if (match.confidence_score > highestScore) {
          highestScore = match.confidence_score;
          bestMatch = match;
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
        if (bestMatch.confidence_score >= THRESHOLDS.HIGH_CONFIDENCE && bestMatch.bank_transaction_id) {
          usedBankTransactions.add(bestMatch.bank_transaction_id);
        }
      } else {
        matches.push({
          payment_id: payment.id,
          bank_transaction_id: null,
          confidence_score: 0,
          match_status: 'unmatched',
          matching_reasons: ['no_match_found']
        });
      }
    }

    console.log(`[reconcile-payments] Generated ${matches.length} matches`);

    // Store results
    const records = matches.map(m => ({
      payment_id: m.payment_id,
      bank_transaction_id: m.bank_transaction_id,
      session_id: sessionId,
      confidence_score: m.confidence_score,
      match_status: m.match_status,
      matching_reasons: m.matching_reasons,
      is_reconciled: false
    }));

    const { error: insertError } = await supabase
      .from('payment_reconciliations')
      .insert(records);

    if (insertError) {
      throw new Error(`Failed to store results: ${insertError.message}`);
    }

    // Calculate summary
    const autoMatched = matches.filter(m => 
      m.match_status === 'definite_match' || m.match_status === 'high_confidence'
    ).length;
    const reviewRequired = matches.filter(m => m.match_status === 'review_required').length;
    const unmatched = matches.filter(m => m.match_status === 'unmatched').length;

    // Mark session as saved - user can view and continue, then finalize or terminate
    // Use service role to bypass RLS since we're doing internal status update
    const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    await adminClient
      .from('reconciliation_sessions')
      .update({
        processing_status: 'saved',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Call the database function to calculate accurate stats
    // This will be triggered automatically by the trigger we created
    // But we can also call it explicitly to ensure immediate update
    await supabase.rpc('update_reconciliation_session_stats', {
      p_session_id: sessionId
    });

    console.log(`[reconcile-payments] Completed: ${autoMatched} auto-matched, ${reviewRequired} review required, ${unmatched} unmatched`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          auto_matched: autoMatched,
          review_required: reviewRequired,
          unmatched: unmatched,
          total_payments: matches.length
        },
        top_matches: matches.slice(0, 10).map(m => ({
          payment_id: m.payment_id,
          confidence_score: m.confidence_score,
          match_status: m.match_status
        }))
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('[reconcile-payments] Error:', error);
    console.error('[reconcile-payments] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[reconcile-payments] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[reconcile-payments] Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    
    // Update session status to failed
    // Use service role to bypass RLS since we're doing internal status update
    try {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Use sessionId from outer scope (already parsed earlier)
      if (sessionId) {
        await adminClient
          .from('reconciliation_sessions')
          .update({
            processing_status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error occurred during reconciliation',
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
        console.log(`[reconcile-payments] Updated session ${sessionId} to failed status`);
      }
    } catch (updateError) {
      console.error('[reconcile-payments] Failed to update session status:', updateError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500
      }
    );
  }
});

