// =====================================================
// Parse Bank Statement Edge Function
// Uses OpenAI GPT-4o to parse any Indian bank CSV format
// =====================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
// OpenAI Configuration
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-2024-08-06'; // Supports structured outputs
// Supabase Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
// Error codes
const ERRORS = {
  OPENAI_KEY_MISSING: 'OPENAI_API_KEY not configured',
  INVALID_REQUEST: 'Invalid request body',
  NO_TRANSACTIONS: 'No credit transactions found in bank statement',
  FUTURE_DATES: 'Bank statement contains future dates',
  NO_VALID_AMOUNTS: 'No valid amounts found',
  PARSING_FAILED: 'Failed to parse bank statement',
  DB_ERROR: 'Database error'
};
/**
 * System prompt for OpenAI to parse Indian bank statements
 */ const SYSTEM_PROMPT = `You are an expert financial data extraction system specialized in parsing Indian bank statement CSV files. Your primary objective is to extract ONLY credit/deposit transactions (money received) with maximum accuracy.

## EXTRACTION TASK

Extract each credit transaction with these exact fields:
- date: Transaction date in YYYY-MM-DD format (required)
- description: Cleaned transaction description (required)
- amount: Positive number without currency symbols or commas (required)
- reference_number: Transaction reference as string, preserving exact format including leading zeros (required, use null if not found)
- transaction_type: One of [UPI, NEFT, RTGS, IMPS, CASH, CHEQUE, OTHER] (required)
- raw_description: Original description exactly as appears in CSV (required)

## CRITICAL RULES

1. **CREDIT TRANSACTIONS ONLY**: Extract ONLY rows where money is deposited/credited. Identify credits by:
   - Non-zero positive values in "Deposit Amount" or "Deposit Amt." or "Credit" columns
   - Empty or zero values in "Withdrawal Amount" or "Debit" columns
   - Keywords: "CR", "CREDIT", "DEPOSIT", "RECEIVED"

2. **MANDATORY EXCLUSIONS** - Skip these:
   - Interest credits (descriptions containing "Int.Pd", "Interest", "Int Received", "Interest Pd", "Interest Credited")
   - Bank charges and fees
   - Withdrawals/debits (any transaction with withdrawal amount > 0)
   - Header rows, metadata rows, summary rows
   - Rows with asterisks (******) or dashes (---) as separators
   - Balance rows, statement summary sections

3. **CSV FORMAT HANDLING**:
   - Skip all rows until you find the actual data header row (containing "Date", "Transaction", "Narration", etc.)
   - Ignore multiple header rows at the beginning with bank name, account details, address
   - Stop processing when you encounter summary sections ("STATEMENT SUMMARY", "End Of Statement")
   - Handle different CSV structures (ICICI, HDFC, SBI, Axis, etc.)

## FIELD EXTRACTION GUIDELINES

### DATE PARSING
- Input formats: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, DD.MM.YYYY
- Two-digit year conversion: 00-49 → 2000-2049, 50-99 → 1950-1999
- Always output as: YYYY-MM-DD
- **IMPORTANT**: Accept ALL dates including future dates (up to 1 year ahead). Do NOT filter out 2025 dates.

### AMOUNT PARSING
- Remove all: ₹, Rs, INR, commas (,), spaces
- Convert to number type
- Ensure positive values only
- Preserve decimal precision (e.g., 10000.50 not 10000)

### REFERENCE NUMBER EXTRACTION
**CRITICAL**: Extract reference numbers as strings to preserve format:
- UPI references are typically numeric (e.g., "411708729975", "431981770589", "435722881879")
- NEFT/RTGS references are alphanumeric (e.g., "AXISP00494478733")
- Some references are mixed format (e.g., "KOT247437196ONR49K5U6S1T6F9B")
- Extract from the transaction description/remarks field (usually appears after bank name or between slashes)
- If reference column contains only zeros ("000000000000000"), extract from description instead
- **Always return as string type** (even if purely numeric) to maintain consistency
- If no reference found anywhere, use null

### TRANSACTION TYPE CLASSIFICATION

**UPI**: Pattern: "UPI/", "UPI-", "@", "phone@", "@paytm", "@okaxis", "@okhdfcbank"

**NEFT**: Pattern: "NEFT", "NEFT CR", "NEFT-"

**RTGS**: Pattern: "RTGS", "RTGS CR", "RTGS-"

**IMPS**: Pattern: "IMPS", "IMPS/", "IMPS-"

**CASH**: Pattern: "CASH DEP", "CASH DEPOSIT", "CASH"

**CHEQUE**: Pattern: "CHQ", "CHEQUE", "CHQ DEP", "CHEQUE DEPOSIT"

**OTHER**: Use for any credit transaction not matching above patterns

### DESCRIPTION CLEANING
**For 'description' field**:
- Remove excessive whitespace and line breaks
- Standardize multiple spaces to single space
- Keep person/company names intact
- Preserve UPI IDs and key identifiers
- Trim leading/trailing spaces

**For 'raw_description' field**:
- Keep EXACTLY as appears in CSV with NO modifications

## VALIDATION CHECKLIST

Before returning results, verify:
✓ All amounts are positive numbers (no negatives or zeros)
✓ All dates are in YYYY-MM-DD format (including 2025 dates)
✓ No interest credits included
✓ No withdrawal transactions included
✓ References preserved as strings (not converted to numbers)
✓ Each transaction has all 6 required fields
✓ raw_description matches original CSV text exactly

IMPORTANT: Extract EVERY credit transaction you find, including those with 2025, 2026 or any other dates. Do NOT skip transactions based on date or year.`;
/**
 * Call OpenAI with retry logic for rate limits
 */ async function callOpenAIWithRetry(csvContent, maxRetries = 3) {
  for(let attempt = 0; attempt < maxRetries; attempt++){
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: `Parse this Indian bank statement CSV and extract ONLY credit/deposit transactions:\n\n${csvContent}`
            }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'bank_transactions',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  transactions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        date: {
                          type: 'string'
                        },
                        description: {
                          type: 'string'
                        },
                        amount: {
                          type: 'number'
                        },
                        reference_number: {
                          type: [
                            'string',
                            'null'
                          ]
                        },
                        transaction_type: {
                          type: [
                            'string',
                            'null'
                          ],
                          enum: [
                            'UPI',
                            'NEFT',
                            'RTGS',
                            'IMPS',
                            'CASH',
                            'CHEQUE',
                            'OTHER',
                            null
                          ]
                        },
                        raw_description: {
                          type: 'string'
                        }
                      },
                      required: [
                        'date',
                        'description',
                        'amount',
                        'reference_number',
                        'transaction_type',
                        'raw_description'
                      ],
                      additionalProperties: false
                    }
                  }
                },
                required: [
                  'transactions'
                ],
                additionalProperties: false
              }
            }
          },
          temperature: 0.1 // Low temperature for consistent parsing
        })
      });
      if (response.status === 429 && attempt < maxRetries - 1) {
        // Rate limit hit, wait and retry with exponential backoff
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Rate limit hit, retrying in ${waitTime}ms...`);
        await new Promise((resolve)=>setTimeout(resolve, waitTime));
        continue;
      }
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${error}`);
      }
      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      console.log(`[parse-bank-statement] Parsed ${parsed.transactions.length} transactions`);
      return parsed;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      console.log(`Attempt ${attempt + 1} failed, retrying...`);
    }
  }
  throw new Error('Max retries exceeded');
}
/**
 * Validate parsed transactions
 */ function validateTransactions(transactions) {
  // Check if any transactions found
  if (!transactions || transactions.length === 0) {
    throw new Error(ERRORS.NO_TRANSACTIONS);
  }
  // Check for valid amounts
  const validAmounts = transactions.filter((t)=>t.amount > 0);
  if (validAmounts.length === 0) {
    throw new Error(ERRORS.NO_VALID_AMOUNTS);
  }
  // Check for unreasonably future dates (more than 1 year ahead)
  const today = new Date();
  const oneYearAhead = new Date(today);
  oneYearAhead.setFullYear(today.getFullYear() + 1);
  const unreasonableFutureDates = transactions.filter((t)=>{
    const transactionDate = new Date(t.date);
    return transactionDate > oneYearAhead;
  });
  if (unreasonableFutureDates.length > 0) {
    console.warn('[parse-bank-statement] Warning: Found dates more than 1 year in future:', unreasonableFutureDates.map((t)=>t.date));
  }
  // Log statistics
  console.log(`[parse-bank-statement] Validation passed: ${transactions.length} transactions, ${validAmounts.length} with valid amounts`);
}
/**
 * Store parsed transactions in database
 */ async function storeTransactions(supabase, sessionId, transactions) {
  // Prepare batch insert
  const records = transactions.map((t)=>({
      session_id: sessionId,
      transaction_date: t.date,
      description: t.description,
      amount: t.amount,
      reference_number: t.reference_number,
      transaction_type: t.transaction_type,
      raw_description: t.raw_description
    }));
  // Batch insert all transactions
  const { error: insertError } = await supabase.from('bank_transactions').insert(records);
  if (insertError) {
    console.error('Database insert error:', insertError);
    throw new Error(`${ERRORS.DB_ERROR}: ${insertError.message}`);
  }
  // Update session with transaction count
  const { error: updateError } = await supabase.from('reconciliation_sessions').update({
    total_transactions: transactions.length,
    processing_status: 'processing',
    updated_at: new Date().toISOString()
  }).eq('id', sessionId);
  if (updateError) {
    console.error('Session update error:', updateError);
    throw new Error(`${ERRORS.DB_ERROR}: ${updateError.message}`);
  }
  console.log(`[parse-bank-statement] Stored ${transactions.length} transactions for session ${sessionId}`);
}
/**
 * Update session status on error
 */ async function updateSessionError(supabase, sessionId, errorMessage) {
  await supabase.from('reconciliation_sessions').update({
    processing_status: 'failed',
    error_message: errorMessage,
    updated_at: new Date().toISOString()
  }).eq('id', sessionId);
}
/**
 * Main Edge Function handler
 */ serve(async (req)=>{
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
  try {
    console.log('[parse-bank-statement] Starting request');
    // Check OpenAI API key
    if (!OPENAI_API_KEY) {
      throw new Error(ERRORS.OPENAI_KEY_MISSING);
    }
    // Parse request body
    const body = await req.json();
    const { csvContent, sessionId } = body;
    if (!csvContent || !sessionId) {
      throw new Error(ERRORS.INVALID_REQUEST);
    }
    // Check CSV size (prevent token limit issues)
    const csvSizeKB = new Blob([
      csvContent
    ]).size / 1024;
    if (csvSizeKB > 100) {
      throw new Error('CSV file too large (>100KB). Please split into smaller files (max 3 months).');
    }
    console.log(`[parse-bank-statement] Processing session ${sessionId}, CSV size: ${csvSizeKB.toFixed(2)}KB`);
    // Create Supabase client
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    // Call OpenAI to parse CSV
    const parsed = await callOpenAIWithRetry(csvContent);
    // Validate results
    validateTransactions(parsed.transactions);
    // Store in database
    await storeTransactions(supabase, sessionId, parsed.transactions);
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      transactionCount: parsed.transactions.length,
      transactions: parsed.transactions.slice(0, 5),
      message: 'Bank statement parsed successfully'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 200
    });
  } catch (error) {
    console.error('[parse-bank-statement] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Try to update session status
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.sessionId) {
          const authHeader = req.headers.get('Authorization');
          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
              headers: {
                Authorization: authHeader
              }
            }
          });
          await updateSessionError(supabase, body.sessionId, errorMessage);
        }
      } catch (e) {
        console.error('Failed to update session error:', e);
      }
    }
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 500
    });
  }
});
