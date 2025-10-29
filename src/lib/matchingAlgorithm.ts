/**
 * AI Reconciliation Matching Algorithm
 * Implements confidence-based scoring to match payments with bank transactions
 */

import { SupabaseClient } from '@supabase/supabase-js';

// =====================================================
// TYPES
// =====================================================

export interface Payment {
  id: string;
  payment_date: string; // YYYY-MM-DD
  payment_amount: number;
  reference: string | null;
  lease_id: string;
  // Joined data
  tenant_id?: string;
  tenant_name?: string;
  property_name?: string;
}

export interface BankTransaction {
  id: string;
  transaction_date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  reference_number: string | null;
  raw_description: string;
}

export interface LearnedPattern {
  bank_description_pattern: string;
  confidence_boost: number;
  times_confirmed: number;
}

export interface MatchResult {
  payment_id: string;
  bank_transaction_id: string | null;
  confidence_score: number;
  match_status: 'definite_match' | 'high_confidence' | 'review_required' | 'unmatched';
  matching_reasons: string[];
}

// =====================================================
// SCORING CONSTANTS
// =====================================================

const SCORING = {
  // Amount matching (45 points total)
  AMOUNT_EXACT: 45,
  AMOUNT_WITHIN_1: 35,
  AMOUNT_WITHIN_10: 20,
  
  // Date proximity (30 points total)
  DATE_SAME_DAY: 30,
  DATE_WITHIN_2_DAYS: 25,
  DATE_WITHIN_5_DAYS: 15,
  DATE_WITHIN_7_DAYS: 10,
  DATE_PENALTY: -20, // For dates >7 days apart
  
  // Reference matching (15 points total)
  REFERENCE_EXACT: 15,
  REFERENCE_PARTIAL: 10,
  
  // Tenant name matching (10 points total)
  NAME_FULL_MATCH: 10,
  NAME_FIRST_OR_LAST: 7,
  NAME_FUZZY: 5,
  
  // Learned pattern bonus (up to 20 points)
  PATTERN_MAX_BOOST: 20
};

// Status thresholds
const THRESHOLDS = {
  DEFINITE_MATCH: 90,
  HIGH_CONFIDENCE: 75,
  REVIEW_REQUIRED: 50
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate days difference between two dates
 */
function daysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Normalize string for comparison (lowercase, remove special chars, trim)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
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
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Check if two amounts match within tolerance
 */
function matchAmount(payment: number, bank: number): { match: boolean; score: number; reason: string } {
  const diff = Math.abs(payment - bank);

  if (diff === 0) {
    return { match: true, score: SCORING.AMOUNT_EXACT, reason: 'exact_amount' };
  } else if (diff <= 1) {
    return { match: true, score: SCORING.AMOUNT_WITHIN_1, reason: 'amount_within_1' };
  } else if (diff <= 10) {
    return { match: true, score: SCORING.AMOUNT_WITHIN_10, reason: 'amount_within_10' };
  }

  return { match: false, score: 0, reason: 'amount_mismatch' };
}

/**
 * Score date proximity
 */
function scoreDate(paymentDate: string, bankDate: string): { score: number; reasons: string[] } {
  const days = daysDifference(paymentDate, bankDate);
  const reasons: string[] = [];

  if (days === 0) {
    reasons.push('same_day');
    return { score: SCORING.DATE_SAME_DAY, reasons };
  } else if (days <= 2) {
    reasons.push('within_2days');
    return { score: SCORING.DATE_WITHIN_2_DAYS, reasons };
  } else if (days <= 5) {
    reasons.push('within_5days');
    return { score: SCORING.DATE_WITHIN_5_DAYS, reasons };
  } else if (days <= 7) {
    reasons.push('within_week');
    return { score: SCORING.DATE_WITHIN_7_DAYS, reasons };
  } else {
    reasons.push('date_far_apart');
    return { score: SCORING.DATE_PENALTY, reasons };
  }
}

/**
 * Score reference number matching
 */
function scoreReference(paymentRef: string | null, bankRef: string | null): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  if (!paymentRef || !bankRef) {
    return { score: 0, reasons }; // Neutral, no reference to compare
  }

  const normalizedPaymentRef = normalizeString(paymentRef);
  const normalizedBankRef = normalizeString(bankRef);

  if (normalizedPaymentRef === normalizedBankRef) {
    reasons.push('reference_exact');
    return { score: SCORING.REFERENCE_EXACT, reasons };
  }

  // Check if one contains the other (partial match)
  if (normalizedBankRef.includes(normalizedPaymentRef) || normalizedPaymentRef.includes(normalizedBankRef)) {
    reasons.push('reference_partial');
    return { score: SCORING.REFERENCE_PARTIAL, reasons };
  }

  return { score: 0, reasons };
}

/**
 * Score tenant name matching in bank description
 */
function scoreTenantName(tenantName: string | undefined, bankDescription: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  if (!tenantName) {
    return { score: 0, reasons };
  }

  const normalizedName = normalizeString(tenantName);
  const normalizedDesc = normalizeString(bankDescription);

  // Check for full name match
  if (normalizedDesc.includes(normalizedName)) {
    reasons.push('tenant_full_name');
    return { score: SCORING.NAME_FULL_MATCH, reasons };
  }

  // Split name and check for first/last name
  const nameParts = normalizedName.split(' ').filter(part => part.length > 2); // Filter out short words
  
  for (const part of nameParts) {
    if (normalizedDesc.includes(part)) {
      reasons.push('tenant_first_or_last_name');
      return { score: SCORING.NAME_FIRST_OR_LAST, reasons };
    }
  }

  // Fuzzy matching - check if any name part is close (Levenshtein distance <= 2)
  const descWords = normalizedDesc.split(' ');
  for (const namePart of nameParts) {
    for (const descWord of descWords) {
      if (descWord.length >= 4 && Math.abs(namePart.length - descWord.length) <= 2) {
        const distance = levenshteinDistance(namePart, descWord);
        if (distance <= 2) {
          reasons.push('tenant_name_fuzzy');
          return { score: SCORING.NAME_FUZZY, reasons };
        }
      }
    }
  }

  return { score: 0, reasons };
}

/**
 * Check for learned patterns and calculate boost
 */
function scoreLearnedPattern(
  bankDescription: string,
  patterns: LearnedPattern[]
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let totalBoost = 0;

  const normalizedDesc = normalizeString(bankDescription);

  for (const pattern of patterns) {
    const normalizedPattern = normalizeString(pattern.bank_description_pattern);
    
    if (normalizedDesc.includes(normalizedPattern)) {
      totalBoost += Math.min(pattern.confidence_boost, SCORING.PATTERN_MAX_BOOST);
      reasons.push(`learned_pattern_${pattern.times_confirmed}x`);
    }
  }

  return { 
    score: Math.min(totalBoost, SCORING.PATTERN_MAX_BOOST), 
    reasons 
  };
}

/**
 * Determine match status based on confidence score
 */
function getMatchStatus(score: number): MatchResult['match_status'] {
  if (score >= THRESHOLDS.DEFINITE_MATCH) {
    return 'definite_match';
  } else if (score >= THRESHOLDS.HIGH_CONFIDENCE) {
    return 'high_confidence';
  } else if (score >= THRESHOLDS.REVIEW_REQUIRED) {
    return 'review_required';
  }
  return 'unmatched';
}

// =====================================================
// MAIN MATCHING FUNCTIONS
// =====================================================

/**
 * Calculate match score between a payment and bank transaction
 */
export function calculateMatch(
  payment: Payment,
  bankTransaction: BankTransaction,
  patterns: LearnedPattern[] = []
): MatchResult {
  const reasons: string[] = [];
  let totalScore = 0;

  // Step 1: Amount matching (fail-fast if no match)
  const amountMatch = matchAmount(payment.payment_amount, bankTransaction.amount);
  if (!amountMatch.match) {
    return {
      payment_id: payment.id,
      bank_transaction_id: null,
      confidence_score: 0,
      match_status: 'unmatched',
      matching_reasons: [amountMatch.reason]
    };
  }

  totalScore += amountMatch.score;
  reasons.push(amountMatch.reason);

  // Step 2: Date proximity scoring
  const dateScore = scoreDate(payment.payment_date, bankTransaction.transaction_date);
  totalScore += dateScore.score;
  reasons.push(...dateScore.reasons);

  // Step 3: Reference number matching
  const refScore = scoreReference(payment.reference, bankTransaction.reference_number);
  totalScore += refScore.score;
  reasons.push(...refScore.reasons);

  // Step 4: Tenant name in description
  const nameScore = scoreTenantName(payment.tenant_name, bankTransaction.description);
  totalScore += nameScore.score;
  reasons.push(...nameScore.reasons);

  // Step 5: Learned pattern bonus
  const patternScore = scoreLearnedPattern(bankTransaction.description, patterns);
  totalScore += patternScore.score;
  reasons.push(...patternScore.reasons);

  // Ensure score is within bounds
  const finalScore = Math.max(0, Math.min(100, totalScore));

  return {
    payment_id: payment.id,
    bank_transaction_id: bankTransaction.id,
    confidence_score: finalScore,
    match_status: getMatchStatus(finalScore),
    matching_reasons: reasons.filter(r => r) // Remove empty reasons
  };
}

/**
 * Reconcile payments with bank transactions for a session
 */
export async function reconcilePayments(
  sessionId: string,
  supabase: SupabaseClient
): Promise<MatchResult[]> {
  console.log(`[matchingAlgorithm] Starting reconciliation for session ${sessionId}`);

  // Get user ID from auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  const userId = user.id;

  // Step 1: Fetch unreconciled payments with tenant/property data
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      payment_date,
      payment_amount,
      reference,
      lease_id,
      leases!inner (
        id,
        tenant_id,
        tenants (
          id,
          name
        ),
        properties!inner (
          id,
          name,
          owner_id
        )
      )
    `)
    .eq('is_reconciled', false)
    .eq('status', 'completed')
    .eq('leases.properties.owner_id', userId);

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
    throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
  }

  // Transform payments data
  const transformedPayments: Payment[] = (payments || []).map((p: any) => ({
    id: p.id,
    payment_date: p.payment_date,
    payment_amount: p.payment_amount,
    reference: p.reference,
    lease_id: p.lease_id,
    tenant_id: p.leases?.tenants?.id,
    tenant_name: p.leases?.tenants?.name,
    property_name: p.leases?.properties?.name
  }));

  console.log(`[matchingAlgorithm] Found ${transformedPayments.length} unreconciled payments`);

  // Step 2: Fetch bank transactions for this session
  const { data: bankTransactions, error: bankError } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('session_id', sessionId);

  if (bankError) {
    console.error('Error fetching bank transactions:', bankError);
    throw new Error(`Failed to fetch bank transactions: ${bankError.message}`);
  }

  console.log(`[matchingAlgorithm] Found ${bankTransactions?.length || 0} bank transactions`);

  if (!bankTransactions || bankTransactions.length === 0) {
    throw new Error('No bank transactions found for this session');
  }

  // Step 3: Fetch learned patterns for this user and their tenants
  const tenantIds = transformedPayments
    .map(p => p.tenant_id)
    .filter((id): id is string => id !== undefined);

  let patterns: LearnedPattern[] = [];
  if (tenantIds.length > 0) {
    const { data: patternsData, error: patternsError } = await supabase
      .from('reconciliation_patterns')
      .select('bank_description_pattern, confidence_boost, times_confirmed')
      .eq('user_id', userId)
      .in('tenant_id', tenantIds);

    if (patternsError) {
      console.warn('Error fetching patterns (non-critical):', patternsError);
    } else {
      patterns = patternsData || [];
      console.log(`[matchingAlgorithm] Loaded ${patterns.length} learned patterns`);
    }
  }

  // Step 4: Match each payment to best bank transaction
  const matches: MatchResult[] = [];
  const usedBankTransactions = new Set<string>();

  for (const payment of transformedPayments) {
    let bestMatch: MatchResult | null = null;
    let highestScore = 0;

    // Calculate score against ALL bank transactions
    for (const bankTransaction of bankTransactions) {
      // Skip if this transaction is already matched with high confidence (>= 75)
      if (usedBankTransactions.has(bankTransaction.id)) {
        continue;
      }

      const match = calculateMatch(payment, bankTransaction, patterns);

      if (match.confidence_score > highestScore) {
        highestScore = match.confidence_score;
        bestMatch = match;
      }
    }

    // Use best match or mark as unmatched
    if (bestMatch) {
      matches.push(bestMatch);
      
      // Mark transaction as used if confidence >= 75
      if (bestMatch.confidence_score >= THRESHOLDS.HIGH_CONFIDENCE && bestMatch.bank_transaction_id) {
        usedBankTransactions.add(bestMatch.bank_transaction_id);
      }
    } else {
      // No match found
      matches.push({
        payment_id: payment.id,
        bank_transaction_id: null,
        confidence_score: 0,
        match_status: 'unmatched',
        matching_reasons: ['no_match_found']
      });
    }
  }

  // Sort by confidence score (lowest first for review queue)
  matches.sort((a, b) => a.confidence_score - b.confidence_score);

  console.log(`[matchingAlgorithm] Generated ${matches.length} match results`);
  console.log(`[matchingAlgorithm] Stats: ${matches.filter(m => m.match_status === 'definite_match').length} definite, ${matches.filter(m => m.match_status === 'high_confidence').length} high confidence, ${matches.filter(m => m.match_status === 'review_required').length} review required, ${matches.filter(m => m.match_status === 'unmatched').length} unmatched`);

  return matches;
}

