# AI Bank Reconciliation Feature - Complete Implementation Guide

## Feature Overview: What We're Building

You are building an **AI-powered bank reconciliation feature** for Property Pro, a rental property management web application. This feature will help landlords automatically match their recorded rental payments with actual bank deposits, saving them hours of manual Excel cross-checking and providing verified records for income tax filing.

### The Business Problem

Small landlords (managing 5-30 properties) face a painful monthly task: opening their bank statement and manually checking off which tenants have actually paid rent. They need to:

- Verify that tenant payments they recorded in Property Pro actually hit their bank account
- Catch any payments they received but forgot to record in the system
- Have reconciled records ready for their CA at tax time (ITR filing)
- Resolve disputes when tenants claim they paid but landlords can't find the transaction

This manual process takes 2-4 hours per month and is error-prone.

### The Solution

An AI reconciliation system that:

1. **Parses any format** of bank statement CSV using OpenAI's GPT-4o (handles HDFC, ICICI, SBI, Axis, etc. automatically)
2. **Intelligently matches** bank transactions to recorded payments using a confidence-scoring algorithm
3. **Learns patterns** over time (e.g., "PHONEPE VINAY KUMAR" always means Vinay Kumar the tenant)
4. **Flags discrepancies** for manual review with clear explanations
5. **Maintains audit trail** of all reconciliation history for tax compliance

### Technical Architecture

**Data Flow:**

```
User uploads CSV → 
Supabase Storage → 
OpenAI Edge Function (parse CSV) → 
bank_transactions table → 
Matching Algorithm Edge Function → 
payment_reconciliations table → 
Review UI (confirm/reject/manual link) → 
Finalize (mark payments as reconciled)
```

**Key Components:**

1. **4 new database tables** to store reconciliation sessions, bank transactions, match results, and learned patterns
2. **2 Supabase Edge Functions** - one for AI parsing, one for matching algorithm
3. **Updated frontend UI** with upload, review queue, and finalization flows
4. **Learning system** that improves matching accuracy as users confirm/reject matches

**Matching Intelligence:**

- **95-100% Confidence (Definite Match)**: Exact amount + reference number match, OR exact amount + same date + tenant name in description
- **80-94% Confidence (High Confidence)**: Exact amount + date within 5 days + tenant keyword in description
- **50-79% Confidence (Review Required)**: Amount matches but date is >7 days apart, OR tenant name found but amount differs by <5%
- **<50% Confidence (Unmatched)**: No clear correlation found

The system uses deterministic rules for matching (you control the logic), but leverages OpenAI to parse messy CSV formats and extract structured data reliably.

***

## Implementation Prompts for Cursor

These prompts are designed to be fed to Cursor **one at a time, in sequence**. Each prompt builds on the previous one. Before starting each prompt, **use Supabase MCP to verify exact table and column names** when connecting to existing schema.

***

### 🎯 STEP 1: Database Schema - Reconciliation Tables

**PROMPT FOR CURSOR:**

```
CONTEXT: I'm building an AI bank reconciliation feature for Property Pro, a rental property management app. Users will upload bank statement CSVs, and the system will automatically match bank deposits with recorded payments in our existing payments table.

EXISTING SCHEMA TO VERIFY (Use Supabase MCP):
- I have a 'payments' table with columns: id, lease_id, payment_date, payment_amount, payment_method, status, reference, notes, created_at, updated_at, payment_type, payment_type_details, original_payment_id
- Payments are linked to leases via lease_id foreign key
- Before proceeding, use Supabase MCP to verify the exact column names in: payments table, leases table, tenants table, properties table, and auth.users table

TASK: Create 4 new tables for the reconciliation system with proper relationships, constraints, and indexes.

TABLE 1 - reconciliation_sessions:
Purpose: Track each bank statement upload session
Columns needed:
- id (uuid, primary key, auto-generated)
- user_id (uuid, foreign key to auth.users, not null)
- file_name (text, stores original CSV filename)
- file_url (text, Supabase storage URL)
- file_size (integer, in bytes)
- upload_date (timestamp with timezone, defaults to now)
- processing_status (text with check constraint: 'uploaded', 'processing', 'completed', 'failed')
- total_transactions (integer, default 0)
- auto_matched (integer, default 0, counts definite + high confidence matches)
- review_required (integer, default 0)
- unmatched (integer, default 0)
- error_message (text, nullable, for storing parsing errors)
- created_at, updated_at (timestamp with timezone)
- Cascade delete when user is deleted

TABLE 2 - bank_transactions:
Purpose: Store parsed transactions from bank statements
Columns needed:
- id (uuid, primary key)
- session_id (uuid, foreign key to reconciliation_sessions, not null)
- transaction_date (date, not null)
- description (text, cleaned description, not null)
- amount (numeric(10,2), not null, always positive for credits)
- balance (numeric(10,2), nullable)
- reference_number (text, nullable, stores UPI ref/UTR/cheque no)
- transaction_type (text, nullable, enum-like: 'UPI', 'NEFT', 'RTGS', 'IMPS', 'CASH', 'CHEQUE')
- raw_description (text, stores original unprocessed description)
- created_at (timestamp)
- Cascade delete when session is deleted
- Create indexes on: session_id, transaction_date, amount

TABLE 3 - payment_reconciliations:
Purpose: Store match results between payments and bank transactions
Columns needed:
- id (uuid, primary key)
- payment_id (uuid, foreign key to payments, not null)
- bank_transaction_id (uuid, foreign key to bank_transactions, nullable - null means unmatched)
- session_id (uuid, foreign key to reconciliation_sessions, not null)
- confidence_score (integer, 0-100, not null)
- match_status (text with check constraint: 'definite_match', 'high_confidence', 'review_required', 'unmatched', 'confirmed', 'rejected', 'manually_linked')
- matching_reasons (jsonb, stores array of reason strings like ["exact_amount", "date_within_2days"])
- reviewed_by (uuid, foreign key to auth.users, nullable)
- reviewed_at (timestamp, nullable)
- review_notes (text, nullable)
- is_reconciled (boolean, default false)
- created_at, updated_at (timestamp)
- Cascade delete when payment or session is deleted
- Set bank_transaction_id to null if bank transaction is deleted
- Create indexes on: payment_id, session_id, match_status

TABLE 4 - reconciliation_patterns:
Purpose: Learning system - stores confirmed matching patterns to improve future accuracy
Columns needed:
- id (uuid, primary key)
- user_id (uuid, foreign key to auth.users, not null)
- tenant_id (uuid, foreign key to tenants table - verify exact table name via Supabase MCP)
- bank_description_pattern (text, stores the bank description that matched)
- confidence_boost (integer, default 10, points to add when pattern matches in future)
- times_confirmed (integer, default 1, increments each time user confirms this pattern)
- last_seen_at (timestamp)
- created_at (timestamp)
- Cascade delete when user is deleted
- Create composite index on: (user_id, tenant_id)

ALSO UPDATE EXISTING PAYMENTS TABLE:
Add these columns if they don't exist:
- is_reconciled (boolean, default false)
- last_reconciliation_date (timestamp with timezone, nullable)
Create index on: is_reconciled

ROW LEVEL SECURITY (RLS):
Enable RLS on all 4 new tables and create policies:
- reconciliation_sessions: Users can only view/insert/update their own sessions (check user_id = auth.uid())
- bank_transactions: Users can access transactions from sessions they own (exists subquery check)
- payment_reconciliations: Users can access reconciliations for payments they own (exists subquery through payments -> leases -> properties -> owner_id)
- reconciliation_patterns: Users can only access their own patterns (user_id = auth.uid())

OUTPUT REQUIREMENTS:
1. Generate complete SQL migration script with all CREATE TABLE statements
2. Include all foreign key constraints with proper ON DELETE behavior
3. Include all check constraints for enum-like columns
4. Include all indexes for performance
5. Include RLS enable statements and policies for all tables
6. Use Supabase MCP to verify foreign key references match actual table/column names
7. Add helpful comments explaining each table's purpose

VERIFICATION CHECKLIST:
Before generating SQL, verify via Supabase MCP:
- Exact name of users table (is it auth.users or public.users?)
- Exact name of tenants table and its id column
- How payments table links to tenant info (via leases? verify relationship)
- Existing RLS patterns in the database to match the style

Generate the complete migration SQL file now.
```


***

### 🎯 STEP 2: Supabase Storage Bucket Setup

**PROMPT FOR CURSOR:**

```
CONTEXT: Continuing the AI reconciliation feature. Users will upload bank statement CSV files that need to be stored securely.

TASK: Create a Supabase Storage bucket configuration for bank statements with proper security policies.

REQUIREMENTS:
1. Create a storage bucket named 'bank-statements'
2. Bucket should be PRIVATE (not publicly accessible)
3. Set up bucket policies so that:
   - Users can only upload files to their own folder path: {user_id}/*
   - Users can only read/delete files from their own folder
   - File size limit: 10MB maximum
   - Allowed file types: text/csv, application/vnd.ms-excel, text/plain
4. Folder structure should be: bank-statements/{user_id}/{timestamp}_{filename}

SECURITY POLICIES NEEDED:
- INSERT policy: Check auth.uid() matches the folder path
- SELECT policy: Check auth.uid() matches the folder path  
- DELETE policy: Check auth.uid() matches the folder path
- No UPDATE policy needed (files are immutable)

OUTPUT REQUIREMENTS:
Generate SQL or Supabase dashboard instructions to:
1. Create the bucket with correct settings
2. Add all RLS policies for the bucket
3. Include code comments explaining each policy

Also provide a TypeScript helper function for the frontend that:
- Generates the correct file path with user_id and timestamp
- Uploads file to Supabase storage
- Returns the file URL and metadata
- Handles errors gracefully

Generate the bucket setup SQL and TypeScript helper function now.
```


***

### 🎯 STEP 3: OpenAI Edge Function - Bank Statement Parser

**PROMPT FOR CURSOR:**

```
CONTEXT: Building an AI reconciliation feature. I need an Edge Function that uses OpenAI GPT-4o to parse bank statement CSV files and extract structured transaction data.

WHY OPENAI: Indian banks (HDFC, ICICI, SBI, Axis, Kotak, etc.) all have different CSV formats with different column names and structures. OpenAI's structured output feature guarantees 100% JSON schema compliance, allowing us to handle any format automatically without manual column mapping.

TASK: Create a Supabase Edge Function that:
1. Receives CSV file content and session ID
2. Calls OpenAI GPT-4o with structured outputs to parse the CSV
3. Extracts ONLY credit/deposit transactions (ignore debits)
4. Inserts parsed transactions into bank_transactions table
5. Updates reconciliation_sessions table with total transaction count

OPENAI REQUIREMENTS:
- Use model: "gpt-4o-2024-08-06" (supports structured outputs)
- Use response_format with json_schema (NOT deprecated json_mode)
- Define strict schema for BankTransaction output
- System prompt should handle Indian banking specifics:
  * UPI references (format: "UPI/428577XXXX/gpay/name@okbank")
  * NEFT/RTGS/IMPS references (format: "NEFT CR-N123456789-NAME")
  * PhonePe, GPay, Paytm wallet patterns
  * Extract transaction type from description
  * Clean up descriptions (remove excess whitespace, standardize format)
  * Convert dates to YYYY-MM-DD format
  * Extract numeric amounts only (remove ₹, commas)

STRUCTURED OUTPUT SCHEMA:
{
  transactions: [
    {
      date: string (YYYY-MM-DD format),
      description: string (cleaned description),
      amount: number (positive only),
      reference_number: string | null (UPI ref, UTR, cheque no),
      transaction_type: 'UPI' | 'NEFT' | 'RTGS' | 'IMPS' | 'CASH' | 'CHEQUE' | 'OTHER' | null,
      raw_description: string (original unprocessed description)
    }
  ]
}

EDGE FUNCTION LOGIC:
1. Validate inputs (csvContent must be string, sessionId must be UUID)
2. Call OpenAI API with structured output schema
3. Handle OpenAI rate limits and errors gracefully
4. Bulk insert all transactions into bank_transactions table (use Supabase batch insert)
5. Update reconciliation_sessions:
   - Set processing_status = 'processing'
   - Set total_transactions = count of parsed transactions
6. Return parsed data to frontend
7. If OpenAI parsing fails, update session status to 'failed' with error message

ERROR HANDLING:
- Catch OpenAI API errors (rate limit, invalid API key, parsing failures)
- Catch Supabase insert errors (foreign key violations, duplicate entries)
- Log all errors to console for debugging
- Return proper HTTP status codes (200, 400, 500)

ENVIRONMENT VARIABLES:
- OPENAI_API_KEY (stored in Supabase secrets)
- SUPABASE_URL (auto-provided)
- SUPABASE_ANON_KEY (auto-provided)

FUNCTION FILE STRUCTURE:
Create: supabase/functions/parse-bank-statement/index.ts

OUTPUT REQUIREMENTS:
1. Complete Edge Function code with all imports
2. TypeScript types for request/response
3. OpenAI structured output schema definition
4. Detailed system prompt for Indian bank CSV parsing
5. Error handling for all failure modes
6. Console logs for debugging
7. Comments explaining each step

IMPORTANT: Use Deno imports (not Node.js imports):
- OpenAI: Use deno.land/x/openai
- Supabase: Use esm.sh/@supabase/supabase-js

Generate the complete Edge Function code now.
```


***

### 🎯 STEP 4: Matching Algorithm - Core Logic

**PROMPT FOR CURSOR:**

```
CONTEXT: Building AI reconciliation feature. After bank transactions are parsed, I need a sophisticated matching algorithm that compares them against existing unreconciled payments in the system.

TASK: Create a matching algorithm module that calculates confidence scores for payment-to-bank-transaction matches using deterministic rules.

MATCHING CRITERIA:
The algorithm must evaluate each potential match across multiple dimensions and assign points:

1. AMOUNT MATCHING (Most Important - 40 points):
   - Exact match (payment_amount === bank_amount): +40 points, reason "exact_amount"
   - Within ₹1 (Math.abs(difference) <= 1): +30 points, reason "amount_within_1"
   - No amount match: Auto-fail, return confidence 0, reason "amount_mismatch"

2. DATE PROXIMITY (30 points):
   - Same day (0 days difference): +30 points, reason "same_day"
   - Within 2 days: +25 points, reason "within_2days"
   - Within 5 days: +15 points, reason "within_5days"
   - Within 7 days: +10 points, reason "within_week"
   - More than 7 days: -20 points (penalty), reason "date_far_apart"

3. REFERENCE NUMBER MATCHING (30 points):
   - Exact match (case-insensitive, trimmed): +30 points, reason "reference_exact"
   - Partial match (one contains the other): +20 points, reason "reference_partial"
   - No reference available: 0 points (neutral)

4. TENANT NAME IN DESCRIPTION (20 points):
   - Full name found in bank description: +20 points, reason "tenant_full_name"
   - First name found: +15 points, reason "tenant_first_name"
   - Last name found: +15 points, reason "tenant_last_name"
   - No name match: 0 points

5. LEARNED PATTERN BONUS (Variable):
   - Check reconciliation_patterns table for this user + tenant
   - If bank description matches a previously confirmed pattern:
     * Add confidence_boost points from pattern record
     * Add reason "learned_pattern_{times_confirmed}x"

CONFIDENCE SCORE TO MATCH STATUS MAPPING:
- 95-100: 'definite_match'
- 80-94: 'high_confidence'
- 50-79: 'review_required'
- 0-49: 'unmatched'

MATCHING STRATEGY:
1. Get all payments where is_reconciled = false AND status = 'completed'
2. Join with leases -> tenants to get tenant name
3. Join with leases -> properties to get property name
4. Get all bank_transactions for the given session_id
5. For each payment:
   - Calculate match score against ALL bank transactions
   - Keep only the BEST match for that payment
   - If score >= 80, mark that bank transaction as "used" (can't be matched to another payment)
6. Return array of match results

IMPORTANT EDGE CASES:
- Don't match the same bank transaction to multiple payments (except if confidence < 80)
- If payment has no reference, rely more on date + amount + name
- Handle null/undefined values gracefully (especially reference fields)
- Bank descriptions should be compared case-insensitive
- Tenant names might have formatting differences (e.g., "Vinay Kumar" vs "VINAY KUMAR")

DATA STRUCTURES:
Input Payment object should include:
- id, payment_date, payment_amount, reference
- tenant_name (from joined leases.tenants.name)
- property_name (from joined leases.properties.name)
- lease_id (to link back to tenant_id for pattern matching)

Input BankTransaction object should include:
- id, transaction_date, amount, description, reference_number

Output MatchResult object:
- payment_id (uuid)
- bank_transaction_id (uuid or null)
- confidence_score (0-100 integer)
- match_status (enum string)
- matching_reasons (array of strings)

FILE STRUCTURE:
Create: lib/matching-algorithm.ts

BEFORE CODING: Use Supabase MCP to verify:
- How to join payments -> leases -> tenants (check foreign key names)
- Exact column name for tenant name field
- Exact column name for property name field

OUTPUT REQUIREMENTS:
1. TypeScript interfaces for Payment, BankTransaction, MatchResult
2. Main function: calculateMatch(payment, bankTransaction) => MatchResult
3. Helper function: reconcilePayments(sessionId, supabaseClient) => MatchResult[]
4. Include learned pattern checking logic
5. Extensive comments explaining scoring logic
6. Handle all null/undefined edge cases
7. Return array sorted by confidence score (highest first)

Generate the complete matching algorithm module now.
```


***

### 🎯 STEP 5: Edge Function - Reconciliation Orchestrator

**PROMPT FOR CURSOR:**

```
CONTEXT: Continuing AI reconciliation feature. After bank transactions are parsed and stored, I need an Edge Function that runs the matching algorithm and stores results.

TASK: Create a Supabase Edge Function that:
1. Receives session_id from frontend
2. Fetches unreconciled payments with tenant/property info
3. Fetches bank_transactions for this session
4. Runs the matching algorithm (import from lib/matching-algorithm.ts)
5. Inserts match results into payment_reconciliations table
6. Updates reconciliation_sessions with summary counts
7. Returns match results to frontend

DETAILED LOGIC FLOW:

STEP 1 - VALIDATION:
- Verify session_id exists in reconciliation_sessions
- Verify session belongs to authenticated user (check user_id)
- Verify session status is 'processing' (not already completed)

STEP 2 - FETCH DATA:
Query payments table:
- WHERE is_reconciled = false
- AND status = 'completed'
- JOIN leases to get lease details
- JOIN tenants (via leases) to get tenant name
- JOIN properties (via leases) to get property name and verify ownership
- Only get payments for properties owned by current user
- Select fields: id, payment_date, payment_amount, reference, tenant_name, property_name, tenant_id (for pattern matching)

Query bank_transactions table:
- WHERE session_id = provided session_id
- Get all fields

STEP 3 - RUN MATCHING:
- Import and call reconcilePayments() from matching algorithm
- Pass supabase client instance for pattern lookups
- Get array of MatchResult objects

STEP 4 - STORE RESULTS:
Bulk insert into payment_reconciliations table:
- For each MatchResult, create a record with:
  * payment_id
  * bank_transaction_id (can be null if unmatched)
  * session_id
  * confidence_score
  * match_status
  * matching_reasons (store as JSONB array)
  * is_reconciled = false (user hasn't confirmed yet)
  * created_at, updated_at

STEP 5 - UPDATE SESSION SUMMARY:
Count matches by status:
- auto_matched = count where match_status IN ('definite_match', 'high_confidence')
- review_required = count where match_status = 'review_required'
- unmatched = count where match_status = 'unmatched'

Update reconciliation_sessions:
- Set processing_status = 'completed'
- Set auto_matched, review_required, unmatched counts
- Set updated_at

STEP 6 - RETURN RESPONSE:
Return to frontend:
- success: true
- session_id
- summary: { auto_matched, review_required, unmatched, total_payments }
- top_matches: First 10 matches sorted by confidence (for preview)

ERROR HANDLING:
- If session not found: Return 404 with message
- If unauthorized (wrong user): Return 403
- If matching algorithm fails: Return 500, update session status to 'failed'
- If database insert fails: Return 500 with detailed error
- Log all errors to console for debugging

PERFORMANCE CONSIDERATIONS:
- Use batch insert for payment_reconciliations (insert all at once, not in loop)
- Use proper indexes (already created in Step 1)
- Limit joins to necessary fields only
- If >100 payments, consider pagination (but not needed for MVP)

FUNCTION FILE STRUCTURE:
Create: supabase/functions/reconcile-payments/index.ts

IMPORTS NEEDED:
- Supabase client (Deno import)
- Matching algorithm functions (relative import from lib/)
- TypeScript types for MatchResult, Payment, BankTransaction

OUTPUT REQUIREMENTS:
1. Complete Edge Function code with all error handling
2. TypeScript interfaces for request/response
3. Detailed SQL queries with proper joins (verify table names via Supabase MCP)
4. Batch insert logic for performance
5. Summary calculation logic
6. Proper HTTP status codes for all scenarios
7. Console logging for debugging
8. Comments explaining each step

VERIFICATION CHECKLIST (Use Supabase MCP):
- Confirm relationship: payments -> leases (foreign key name)
- Confirm relationship: leases -> tenants (foreign key name)
- Confirm relationship: leases -> properties (foreign key name)
- Confirm: properties table has owner_id column linking to auth.users
- Verify column names: tenant name field, property name field

Generate the complete Edge Function code now.
```


***

### 🎯 STEP 6: Frontend - File Upload \& Progress Flow

**PROMPT FOR CURSOR:**

```
CONTEXT: Building AI reconciliation feature frontend. Users need to upload bank statement CSV files and see real-time progress as the system parses and matches transactions.

EXISTING FILE: AIReconciliation.tsx already has basic UI structure. We need to implement the actual upload logic and progress tracking.

TASK: Update AIReconciliation.tsx component to handle the complete upload-to-results flow.

WORKFLOW STATES:
1. 'upload' - Initial state, show file upload dropzone
2. 'processing' - File uploaded, show progress animation
3. 'results' - Processing complete, show summary and review queue

UPLOAD FLOW IMPLEMENTATION:

STEP 1 - FILE VALIDATION:
When user selects file:
- Validate file type is CSV (.csv, .txt, text/csv mime type)
- Validate file size < 10MB
- Show error toast if validation fails
- Enable upload button only after validation passes

STEP 2 - UPLOAD TO SUPABASE STORAGE:
On form submit:
- Generate file path: `${userId}/${Date.now()}_${sanitizedFileName}`
- Upload to 'bank-statements' bucket using Supabase storage API
- Show upload progress bar (use storage upload progress callback)
- Get public URL after upload completes

STEP 3 - CREATE RECONCILIATION SESSION:
Insert record into reconciliation_sessions table:
- user_id: current authenticated user
- file_name: original filename
- file_url: Supabase storage URL
- file_size: file size in bytes
- processing_status: 'uploaded'
- upload_date: current timestamp

Get back the session.id for tracking

STEP 4 - READ CSV CONTENT:
- Use FileReader API to read CSV file as text
- Store in variable: csvContent

STEP 5 - CALL PARSE EDGE FUNCTION:
- Invoke 'parse-bank-statement' Edge Function
- Pass: { csvContent, sessionId }
- Show progress message: "Parsing bank statement..."
- Handle errors (API key missing, parsing failed, rate limit)

STEP 6 - CALL RECONCILE EDGE FUNCTION:
After parsing succeeds:
- Invoke 'reconcile-payments' Edge Function  
- Pass: { sessionId }
- Show progress message: "Matching transactions..."
- Handle errors

STEP 7 - NAVIGATE TO RESULTS:
When both Edge Functions complete:
- Save sessionId to component state
- Change workflow state to 'results'
- Fetch and display reconciliation summary
- Load review queue with matches needing attention

UI COMPONENTS NEEDED:

1. FILE DROPZONE:
   - Drag-and-drop area with dashed border
   - Click to browse alternative
   - Show selected file with name, size, remove button
   - Display file type icon
   - Show validation errors in red text

2. PROGRESS INDICATOR:
   - Loading spinner
   - Step-by-step progress text:
     * "Uploading file... X%"
     * "Parsing bank statement..."
     * "Analyzing transactions..."
     * "Matching payments..."
   - Estimated time remaining (optional, can mock)

3. ERROR HANDLING:
   - Toast notifications for errors (use your existing toast system)
   - Retry button if Edge Function fails
   - Clear error messaging (e.g., "OpenAI API key not configured" vs generic error)

STATE MANAGEMENT:
Component should track:
- selectedFile (File | null)
- uploading (boolean)
- uploadProgress (0-100)
- currentStep (string, for progress messages)
- sessionId (string | null)
- error (string | null)
- workflowState ('upload' | 'processing' | 'results')

INTEGRATION POINTS:
- Use existing Supabase client from your app context
- Use existing auth user from your auth context
- Use existing toast system for notifications
- Match styling from existing RecordPayment.tsx and PaymentHistory.tsx components

BEFORE CODING: Verify via Supabase MCP:
- Exact name of storage bucket (is it 'bank-statements'?)
- Exact Edge Function names (parse-bank-statement, reconcile-payments)
- RLS policies allow user to insert into reconciliation_sessions

OUTPUT REQUIREMENTS:
1. Complete handleFileUpload() async function with all steps
2. File validation logic with helpful error messages
3. Progress tracking state management
4. Retry logic for failed uploads
5. Loading UI components
6. Error boundary handling
7. TypeScript types for all function parameters
8. Comments explaining each API call
9. Cleanup logic (cancel upload, reset form)

Generate the updated AIReconciliation.tsx upload flow code now.
```


***

### 🎯 STEP 7: Frontend - Review Queue \& Manual Actions

**PROMPT FOR CURSOR:**

```
CONTEXT: Building AI reconciliation feature frontend. After upload completes, users need to review matches (especially those flagged as 'review_required') and take actions.

TASK: Create a review queue component that displays matches sorted by status, with action buttons for each match.

REQUIRED MANUAL ACTIONS:
1. ✅ CONFIRM - User agrees with AI match, mark as confirmed
2. ❌ REJECT - User disagrees, unlink bank transaction, mark as rejected  
3. 🔗 MANUAL LINK - User picks different bank transaction from dropdown
4. ➕ MARK AS UNRECONCILABLE - For payments not in bank (cash, different account)

COMPONENT STRUCTURE:

1. RECONCILIATION SUMMARY CARDS (Top Section):
Display 5 metric cards:
- Total Transactions (from bank statement)
- Auto Matched (definite_match + high_confidence + confirmed)
- Review Required (review_required status)
- Unmatched (unmatched status + rejected)
- Reconciliation Rate (auto matched / total * 100)

Style: Grid layout, colored cards (green for matched, yellow for review, red for unmatched)

2. FILTER TABS:
- All Matches
- Review Required (default active)
- Auto Matched
- Unmatched
- Confirmed

3. MATCH TABLE:
Columns:
- Payment Date | Bank Date
- Property Name
- Tenant Name
- Payment Amount | Bank Amount
- Bank Description (truncated, show full on hover)
- Reference Numbers (Payment ref | Bank ref)
- Confidence Score (with color-coded badge)
- Match Status (with icon)
- Actions (button group)

Sort: By confidence score descending (lowest confidence / most uncertain first)

4. ACTION BUTTONS:
For 'review_required' and 'high_confidence' matches:
- Confirm button (green checkmark icon)
- Reject button (red X icon)
- Manual Link button (blue link icon, opens modal)

For 'unmatched' matches:
- Manual Link button (opens modal with all available bank transactions)
- Mark as Cash/Different Account (opens note input modal)

For 'definite_match':
- Show "Auto-matched" badge, no actions needed
- Allow optional reject if user disagrees

5. MANUAL LINK MODAL:
When user clicks Manual Link:
- Show current payment details (date, amount, property, tenant)
- Show dropdown/searchable list of ALL bank transactions from this session
- Filter out already-matched bank transactions (confidence >= 80)
- For each bank transaction option, show: date, description, amount, reference
- Highlight similarities (matching amount = green, close date = yellow)
- Confirm button to create manual link

ACTION HANDLERS:

handleConfirm(reconciliationId):
- Update payment_reconciliations:
  * match_status = 'confirmed'
  * reviewed_by = current user id
  * reviewed_at = current timestamp
- If bank_transaction_id exists, check for learned pattern:
  * Get bank_transaction.description
  * Get payment.tenant_id (via join)
  * Check if pattern exists in reconciliation_patterns
  * If exists: increment times_confirmed, update last_seen_at
  * If not exists: insert new pattern with times_confirmed = 1
- Refresh review queue
- Show success toast

handleReject(reconciliationId):
- Update payment_reconciliations:
  * match_status = 'rejected'
  * bank_transaction_id = null (unlink)
  * reviewed_by = current user id
  * reviewed_at = current timestamp
- Don't store negative patterns (false negatives are dangerous)
- Refresh review queue
- Show success toast

handleManualLink(reconciliationId, newBankTransactionId, notes):
- Update payment_reconciliations:
  * bank_transaction_id = newBankTransactionId
  * match_status = 'manually_linked'
  * confidence_score = 100 (user confirmed)
  * review_notes = notes
  * reviewed_by = current user id
  * reviewed_at = current timestamp
- Store learned pattern (user knows best)
- Refresh review queue
- Show success toast

handleMarkUnreconcilable(paymentId, reason):
- Keep payment_reconciliations as is (unmatched)
- Add review_notes with reason
- Mark reviewed_by and reviewed_at
- Don't set is_reconciled (still shows as unmatched in reports)

DATA FETCHING:
On component mount:
- Fetch all payment_reconciliations for sessionId with joins:
  * JOIN payments (get payment details)
  * JOIN leases -> tenants (get tenant name)
  * JOIN leases -> properties (get property name)
  * JOIN bank_transactions (get bank details, nullable)
- Fetch reconciliation_sessions summary for metric cards
- Set up real-time subscription (optional) to refresh when other user actions occur

FILTER LOGIC:
- Filter matches by selected tab status
- Search across: tenant name, property name, bank description
- Sort by confidence score (ascending) for review_required, by date otherwise

STYLING CONSIDERATIONS:
- Color code confidence scores:
  * 95-100: Green badge "Definite Match"
  * 80-94: Blue badge "High Confidence"
  * 50-79: Yellow/Orange badge "Review Required"
  * 0-49: Red badge "Unmatched"
- Use icons consistently (✅ ❌ 🔗 ⚠️)
- Highlight amount discrepancies in red
- Show matching reasons as tooltips on hover

BEFORE CODING: Use Supabase MCP to verify:
- Exact join path: payment_reconciliations -> payments -> leases -> tenants
- Column names for tenant name, property name
- Whether real-time subscriptions are enabled on these tables

OUTPUT REQUIREMENTS:
1. Complete ReviewQueue component with all sub-components
2. Action handler functions with Supabase queries
3. Manual Link modal component
4. Learned pattern storage logic
5. Filter and search functionality
6. TypeScript types for all data structures
7. Error handling for all Supabase calls
8. Loading states for async operations
9. Responsive table layout (handle mobile if needed)
10. Accessibility (keyboard navigation, ARIA labels)

Generate the complete ReviewQueue component code now.
```


***

### 🎯 STEP 8: Finalize Reconciliation \& Bulk Operations

**PROMPT FOR CURSOR:**

```
CONTEXT: Building AI reconciliation feature. After users review and confirm matches, they need to finalize the reconciliation, which marks payments as reconciled and locks the session.

TASK: Add finalization logic and bulk operation features to the reconciliation flow.

FINALIZE BUTTON:
Location: Bottom of review queue, appears after user has reviewed matches
Behavior:
- Show confirmation dialog: "Finalize reconciliation? This will mark X payments as reconciled. You can unreconcile individual payments later if needed."
- Disable button if there are unreviewed high-confidence matches (force user to at least look at them)
- Show count of payments that will be marked reconciled

FINALIZE LOGIC:

STEP 1 - GET CONFIRMED MATCHES:
Query payment_reconciliations WHERE:
- session_id = current session
- match_status IN ('confirmed', 'definite_match', 'manually_linked')
- is_reconciled = false (not already finalized)

Get array of payment_ids

STEP 2 - UPDATE PAYMENTS TABLE:
Bulk update payments WHERE id IN (payment_ids):
- is_reconciled = true
- last_reconciliation_date = current timestamp

STEP 3 - UPDATE RECONCILIATION RECORDS:
Bulk update payment_reconciliations WHERE:
- session_id = current session
- match_status IN ('confirmed', 'definite_match', 'manually_linked')
Set:
- is_reconciled = true
- updated_at = current timestamp

STEP 4 - UPDATE SESSION:
Update reconciliation_sessions:
- processing_status = 'completed'
- updated_at = current timestamp

STEP 5 - SHOW SUCCESS:
- Success toast: "Reconciliation finalized! X payments marked as reconciled."
- Navigate back to payment history or show finalization summary

BULK ACTIONS:
Add these bulk operation features to review queue:

1. BULK CONFIRM (Checkbox select):
   - Add checkbox to each row in review queue
   - Select all checkbox in table header
   - "Confirm Selected" button (only enabled if 1+ selected)
   - Bulk update match_status = 'confirmed' for selected reconciliations
   - Store learned patterns for all bulk-confirmed matches
   - Useful for confirming multiple high-confidence matches at once

2. RE-RECONCILE FEATURE:
   Users want to upload a new bank statement for the same period (correcting errors, etc.)
   
   Location: Add "Re-reconcile" button on payment history page
   
   Behavior:
   - Show modal: "Select payments to unreconcile"
   - Display list of reconciled payments with checkboxes
   - Filter by date range (e.g., last month)
   - "Unreconcile Selected" button
   
   Logic:
   - Update payments: is_reconciled = false, last_reconciliation_date = null
   - Update payment_reconciliations: is_reconciled = false
   - Allow user to start new reconciliation session with these payments

3. UNRECONCILE INDIVIDUAL PAYMENT:
   Location: Action button on payment history table (for reconciled payments)
   
   Behavior:
   - Show confirmation: "Unreconcile this payment? It will appear in future reconciliations."
   - Update single payment: is_reconciled = false
   - Update related payment_reconciliations: is_reconciled = false
   
   Use case: User realizes a match was wrong after finalizing

FINALIZATION SUMMARY COMPONENT:
After finalize completes, show summary screen:
- Total payments reconciled
- Date range of reconciled payments
- Total amount reconciled
- Breakdown by property
- "Export Report" button
- "Start New Reconciliation" button
- "View Payment History" button

ERROR HANDLING:
- If finalize fails mid-process (partial update), show error and suggest retrying
- If no matches to finalize, show message: "No confirmed matches to finalize. Please review and confirm matches first."
- If user tries to finalize while Edge Functions still processing, show warning

PERMISSIONS & VALIDATION:
- Only allow finalize if user owns the session (check user_id)
- Don't allow finalize if session status = 'failed'
- Don't allow re-finalize of already completed session (unless unreconcile first)

INTEGRATION WITH PAYMENT HISTORY:
Update PaymentHistory.tsx to:
- Show "Reconciled" badge on payments where is_reconciled = true
- Show last_reconciliation_date on hover
- Add filter toggle: Show All | Show Reconciled Only | Show Unreconciled Only
- Add "Reconciled" column in table with checkmark icon
- Add "Unreconcile" action button for reconciled payments

BEFORE CODING: Use Supabase MCP to verify:
- Exact column names: is_reconciled, last_reconciliation_date in payments table
- Whether bulk update syntax is correct for Supabase client
- RLS policies allow user to update their own payments

OUTPUT REQUIREMENTS:
1. handleFinalize() async function with transaction logic
2. Bulk confirm checkbox selection state management
3. handleBulkConfirm() function
4. handleUnreconcile() function for individual payments
5. Re-reconcile modal component
6. Finalization summary component
7. Updated PaymentHistory.tsx integration code
8. Confirmation dialogs for destructive actions
9. Error handling for all scenarios
10. Success/error toast messages
11. Loading states during bulk operations

Generate the finalization and bulk operations code now.
```


***

### 🎯 STEP 9: Export Reconciliation Report

**PROMPT FOR CURSOR:**

```
CONTEXT: Building AI reconciliation feature. Landlords need to export reconciliation reports for their CA (Chartered Accountant) for ITR filing and audit purposes.

TASK: Create an export function that generates a detailed CSV report of the reconciliation session.

REPORT REQUIREMENTS (For Tax Compliance):
Indian ITRs need:
- Property-wise rental income breakdown
- Date of receipt (bank transaction date)
- Mode of receipt (UPI/NEFT/etc.)
- Tenant details
- Reconciliation status (confirmed/unmatched)

EXPORT BUTTON LOCATION:
- On reconciliation results page (after processing completes)
- On reconciliation history page (list of all past reconciliations)

EXPORT FORMATS:
1. CSV (primary) - Easy to open in Excel, share with CA
2. PDF (optional, future enhancement) - Professional format

CSV STRUCTURE:

HEADER SECTION:
Row 1: Reconciliation Report - Property Pro
Row 2: Session Date: {upload_date}
Row 3: Bank Statement: {file_name}
Row 4: Total Transactions: {total_transactions}
Row 5: Reconciled: {auto_matched + confirmed}
Row 6: Unreconciled: {unmatched + rejected}
Row 7: (empty row)

SUMMARY SECTION:
Row 8: Summary by Property
Row 9: Headers - Property Name, Total Amount Received, Transactions Count, Reconciliation Rate
Row 10+: Data rows (one per property)
Row X: (empty row)

DETAILED TRANSACTION SECTION:
Headers: Date, Property, Tenant, Payment Date, Payment Amount, Payment Reference, Bank Date, Bank Amount, Bank Description, Bank Reference, Match Status, Confidence Score, Reconciliation Status, Notes

Data rows:
- One row per payment_reconciliation record
- Include both matched and unmatched payments
- Sort by: Property name, then Payment date
- Format dates as DD/MM/YYYY (Indian standard)
- Format amounts with ₹ symbol and thousand separators (₹15,000.00)
- Match status with emoji indicators (✅ Confirmed, ⚠️ Review Required, ❌ Unmatched)

FOOTER SECTION:
Last row: Generated by Property Pro on {current_date}

EXPORT FUNCTION LOGIC:

async function exportReconciliationReport(sessionId: string):

STEP 1 - FETCH SESSION DATA:
Get reconciliation_sessions record with summary counts

STEP 2 - FETCH DETAILED MATCHES:
Query payment_reconciliations for this session with joins:
- JOIN payments (get payment details)
- JOIN leases -> tenants (get tenant name, phone)
- JOIN leases -> properties (get property name, address)
- JOIN bank_transactions (get bank details, nullable for unmatched)
Include all fields needed for report

STEP 3 - CALCULATE PROPERTY SUMMARIES:
Group matches by property_id:
- Sum total payment amounts per property
- Count transactions per property
- Calculate reconciliation rate (confirmed / total * 100)

STEP 4 - FORMAT DATA:
- Convert dates to DD/MM/YYYY format
- Format amounts: ₹15,000.00 (2 decimal places, thousand separators)
- Map match_status to friendly labels:
  * 'definite_match' -> '✅ Definite Match'
  * 'high_confidence' -> '✅ High Confidence'
  * 'confirmed' -> '✅ Confirmed'
  * 'manually_linked' -> '🔗 Manually Linked'
  * 'review_required' -> '⚠️ Review Required'
  * 'unmatched' -> '❌ Unmatched'
  * 'rejected' -> '❌ Rejected'
- Truncate long descriptions (max 100 chars)

STEP 5 - BUILD CSV:
- Use CSV library or manual string building
- Properly escape commas and quotes in descriptions
- Use \n for line breaks (cross-platform compatible)
- Encode as UTF-8 with BOM (for Excel to recognize special characters like ₹)

STEP 6 - TRIGGER DOWNLOAD:
- Create Blob with CSV content
- Generate download link with filename: `reconciliation_${sessionId}_${date}.csv`
- Click link programmatically
- Clean up blob URL

ADDITIONAL EXPORT OPTIONS:

1. EXPORT UNRECONCILED ONLY:
   Separate CSV with only unmatched/rejected payments for follow-up
   
2. EXPORT FOR CA:
   Simplified format with only tax-relevant fields:
   - Property name
   - Tenant name  
   - Date of receipt
   - Amount received
   - Mode of receipt
   No internal system fields (match confidence, etc.)

3. EXPORT RECONCILIATION HISTORY:
   On settings/history page, show all past reconciliation sessions
   Columns: Date, File Name, Total Transactions, Matched, Unmatched, Actions
   Actions: View Details, Export Report, Delete Session
   
FORMATTING HELPERS:

formatDate(date: string): string
- Convert YYYY-MM-DD to DD/MM/YYYY

formatAmount(amount: number): string
- Return ₹15,000.00 format
- Handle null/undefined (return '-')

formatMatchStatus(status: string): string
- Map status codes to friendly labels with icons

escapeCSV(value: string): string
- Wrap in quotes if contains comma, quote, or newline
- Escape internal quotes by doubling them

BEFORE CODING: Use Supabase MCP to verify:
- Exact relationship path for all joins
- Whether tenant table has phone column (optional to include in report)
- Whether property table has address column (good for report clarity)

OUTPUT REQUIREMENTS:
1. Complete exportReconciliationReport() function
2. CSV formatting helper functions
3. Property summary calculation logic
4. Download trigger mechanism (blob + link)
5. TypeScript types for report data structures
6. Error handling (if session not found, if no data)
7. Loading indicator while generating report (can take 1-2 seconds for large files)
8. Success toast after download starts
9. Export button component with icon
10. Optional: Export options dropdown (Full Report, Unreconciled Only, For CA)

TESTING CONSIDERATIONS:
- Test with special characters in tenant names (e.g., D'Souza)
- Test with long descriptions (truncation)
- Test with missing bank transaction data (unmatched payments)
- Test CSV opens correctly in Excel and Google Sheets

Generate the export report functionality code now.
```


***

### 🎯 STEP 10: Reconciliation History \& Session Management

**PROMPT FOR CURSOR:**

```
CONTEXT: Building AI reconciliation feature. Users will run reconciliations monthly, so they need a history page to view, manage, and compare past reconciliation sessions.

TASK: Create a reconciliation history page that lists all past sessions with management actions.

PAGE LOCATION:
Add new route: /reconciliation-history
Navigation: Link from main dashboard and from AIReconciliation.tsx "View History" button

HISTORY TABLE:
Columns:
1. Upload Date (formatted as "DD MMM YYYY, HH:mm")
2. File Name (with file size badge)
3. Status (badge: Completed/Processing/Failed)
4. Total Transactions (from bank statement)
5. Matched (count and percentage)
6. Review Required (count, yellow badge if >0)
7. Unmatched (count, red badge if >0)
8. Reconciliation Rate (percentage with progress bar visual)
9. Actions (dropdown menu)

Sort: Most recent first (upload_date DESC)

ACTIONS DROPDOWN:
For each session:
- 📊 View Details (navigate to results page for that session)
- 📥 Export Report (trigger CSV download)
- 🔄 Re-run Matching (useful if user updated payment data)
- 🗑️ Delete Session (with confirmation, cascade deletes)

STATUS BADGES:
- ✅ Completed (green)
- ⏳ Processing (blue, animated pulse)
- ❌ Failed (red, show error tooltip)

FILTERS & SEARCH:
1. Date Range Filter:
   - Quick filters: This Month, Last Month, Last 3 Months, All Time
   - Custom date picker (from/to)

2. Status Filter:
   - All, Completed Only, Failed Only

3. Search:
   - Search by file name
   - Search by date

SESSION COMPARISON FEATURE (Advanced):
Allow users to select 2 sessions and compare:
- Show side-by-side summary
- Highlight differences in match rates
- Useful for: "Did my reconciliation improve after fixing payment data?"

Modal shows:
- Session 1 vs Session 2
- Date uploaded
- Total transactions
- Match rate comparison (with up/down arrow)
- List of payments that were matched in one but not the other

RE-RUN MATCHING LOGIC:
When user clicks "Re-run Matching" on a past session:

Use case: User realizes they forgot to record some payments, adds them, and wants to see if they match the bank statement from last month.

Logic:
1. Verify session exists and belongs to user
2. Delete existing payment_reconciliations for this session (to start fresh)
3. Call reconcile-payments Edge Function with this session_id
4. It will re-fetch current unreconciled payments and match against the existing bank_transactions
5. Update session summary counts
6. Show success toast: "Matching re-run complete"

This DOESN'T re-parse the bank statement (bank_transactions remain unchanged), only re-runs the matching algorithm.

DELETE SESSION LOGIC:
When user clicks "Delete Session":

Confirmation dialog:
"Delete reconciliation session '{file_name}'? This will delete:
- Bank transaction data (X transactions)
- Match results (Y matches)
- The uploaded bank statement file

Payments will NOT be deleted or marked as unreconciled. You can re-upload the bank statement if needed.

This action cannot be undone."

Logic:
1. Delete from Supabase Storage: bank-statements/{userId}/{filename}
2. Database deletes CASCADE automatically:
   - payment_reconciliations (linked to session_id)
   - bank_transactions (linked to session_id)
   - reconciliation_sessions (main record)
3. Show success toast

DELETE BUTTON: Only show if session is >30 days old OR user explicitly enables "Show Delete" toggle (prevent accidental deletions)

EMPTY STATE:
If no reconciliation sessions exist:
- Show friendly illustration
- Heading: "No Reconciliation History Yet"
- Subheading: "Upload your first bank statement to get started"
- CTA button: "Start Reconciliation" (navigates to AIReconciliation page)

SESSION DETAILS VIEW:
When user clicks "View Details" on a session:
- If session is completed: Show full review queue with all matches
- If session is processing: Show progress indicator
- If session is failed: Show error message and "Retry" button
- Add breadcrumb navigation: History > Session {file_name}

RETRY FAILED SESSION:
If parsing or matching failed:
- Show error message from reconciliation_sessions.error_message
- "Retry" button that:
  1. Re-reads CSV from storage
  2. Calls parse-bank-statement Edge Function again
  3. If successful, proceeds to matching
  4. Updates session status

Use case: OpenAI API was down, or rate limit hit, user wants to retry

PAGINATION:
If user has >50 sessions:
- Implement pagination (20 sessions per page)
- Show page numbers and next/prev buttons
- Optional: Infinite scroll instead of pagination

REAL-TIME UPDATES:
If a session is in 'processing' state:
- Set up Supabase real-time subscription to reconciliation_sessions
- When processing_status changes to 'completed' or 'failed', update UI automatically
- No need for manual page refresh

BEFORE CODING: Use Supabase MCP to verify:
- Exact column names in reconciliation_sessions table
- Cascade delete behavior (ON DELETE CASCADE configured in Step 1?)
- Whether real-time subscriptions are enabled for reconciliation_sessions table

OUTPUT REQUIREMENTS:
1. ReconciliationHistory.tsx page component with table
2. Session details view component (reuse ReviewQueue from Step 7)
3. handleDeleteSession() function with cascade logic
4. handleRerunMatching() function
5. handleRetryFailed() function
6. Session comparison modal component
7. Date range and status filters
8. Pagination logic
9. Real-time subscription for processing sessions
10. Empty state component
11. Export button integration (from Step 9)
12. Responsive design (works on mobile)
13. Loading states for async operations
14. Error handling with helpful messages

Generate the complete reconciliation history page code now.
```


***

### 🎯 STEP 11: Integration Testing \& Error Handling

**PROMPT FOR CURSOR:**

```
CONTEXT: We've built all core components of the AI reconciliation feature. Now we need comprehensive error handling and testing to ensure production-readiness.

TASK: Add robust error handling, edge case management, and create test scenarios.

ERROR SCENARIOS TO HANDLE:

1. OPENAI API ERRORS:
   Error: API key not configured
   - Check: OPENAI_API_KEY exists in Edge Function environment
   - User message: "OpenAI API key not configured. Please contact support."
   - Admin action needed: Add key to Supabase secrets
   
   Error: Rate limit exceeded
   - OpenAI returns 429 status
   - User message: "Too many requests. Please try again in 1 minute."
   - Implementation: Add retry logic with exponential backoff (3 retries)
   
   Error: Invalid CSV format (OpenAI can't parse)
   - OpenAI returns parsing error or empty transactions array
   - User message: "Unable to parse bank statement. Please ensure it's a valid CSV with transaction data."
   - Allow user to: Download sample CSV template, or try different file
   
   Error: Token limit exceeded
   - CSV is too large (>100KB of text)
   - User message: "Bank statement is too large. Please split into multiple files (max 3 months per file)."

2. SUPABASE ERRORS:
   Error: Storage upload fails
   - Network error, storage bucket full, or permissions issue
   - User message: "Failed to upload file. Please check your connection and try again."
   - Cleanup: Don't create reconciliation_sessions record if upload fails
   
   Error: Database insert fails
   - Foreign key violation, unique constraint violation
   - User message: "Database error. Please contact support with error code: {error.code}"
   - Rollback: If batch insert fails, delete uploaded file from storage
   
   Error: RLS policy blocks access
   - User trying to access session they don't own
   - User message: "Access denied."
   - Return 403 HTTP status

3. EDGE FUNCTION ERRORS:
   Error: Function timeout (>30 seconds)
   - Large CSV with many transactions
   - User message: "Processing is taking longer than expected. We'll notify you when complete."
   - Solution: For MVP, show error and ask user to reduce file size
   - Future: Implement async processing with webhooks/polling
   
   Error: Function deploy failed
   - Edge Function not deployed or has syntax error
   - User message: "Service temporarily unavailable. Please try again later."
   - Admin action: Check Supabase function logs

4. DATA QUALITY ERRORS:
   Error: No credit transactions found
   - CSV has only debits/expenses
   - User message: "No deposit transactions found in bank statement. Please upload a statement with incoming payments."
   
   Error: Dates in future
   - CSV has transaction dates > today
   - Either: OpenAI parsing error (wrong date format), or user uploaded wrong file
   - User message: "Bank statement contains future dates. Please check the file and try again."
   
   Error: All amounts are zero
   - Parsing error or invalid CSV
   - User message: "No valid amounts found. Please check CSV format."

5. MATCHING ERRORS:
   Error: No payments to reconcile
   - User has marked all payments as reconciled already
   - User message: "No unreconciled payments found. All payments are already reconciled."
   - Show: "Unreconcile" action suggestion
   
   Error: No matches found (all confidence <50%)
   - Bank statement is from wrong account, or wrong date range
   - User message: "No matches found. Possible reasons:
     - Bank statement is from a different time period than your recorded payments
     - Payments are already reconciled
     - This is a different bank account
     Try unreconciling some payments or upload a different statement."

TESTING SCENARIOS:

Create test CSV files for these scenarios:

1. HAPPY PATH TEST:
   File: test_bank_statement_happy.csv
   Contents: 10 transactions with clear matches to test payments
   - 5 exact matches (amount + date + reference)
   - 3 high confidence (amount + date within 3 days + tenant name)
   - 2 review required (amount match but date far apart)
   Expected: All parsed correctly, 5 definite matches, 3 high confidence, 2 review required

2. EDGE CASE TEST:
   File: test_bank_statement_edge_cases.csv
   Contents:
   - Transaction with no reference number
   - Transaction with special characters in description (commas, quotes)
   - Transaction with amount ₹10,000.00 vs payment ₹10,000 (exact match despite formatting)
   - Transaction with tenant name misspelled (e.g., "Vinay" vs "Vinai")
   - Transaction with date format DD-MM-YYYY vs YYYY-MM-DD
   Expected: OpenAI handles formatting, matching algorithm handles minor typos

3. ERROR CASE TEST:
   File: test_bank_statement_invalid.csv
   Contents: Random data, not a bank statement
   Expected: OpenAI returns empty transactions array, user gets error message

4. LARGE FILE TEST:
   File: test_bank_statement_large.csv
   Contents: 200 transactions (simulate 2 years of data)
   Expected: Parsing takes longer but completes, matching works correctly

VALIDATION LOGIC:

Add to parse-bank-statement Edge Function:
```

// After OpenAI parsing
if (!parsed.transactions || parsed.transactions.length === 0) {
throw new Error("No transactions found in bank statement");
}

// Validate dates
const futureTransactions = parsed.transactions.filter(t =>
new Date(t.date) > new Date()
);
if (futureTransactions.length > 0) {
throw new Error("Bank statement contains future dates");
}

// Validate amounts
const zeroAmounts = parsed.transactions.filter(t => t.amount === 0);
if (zeroAmounts.length === parsed.transactions.length) {
throw new Error("No valid amounts found");
}

```

Add to reconcile-payments Edge Function:
```

// Check if any payments to reconcile
if (payments.length === 0) {
return {
success: true,
warning: "No unreconciled payments found",
summary: { auto_matched: 0, review_required: 0, unmatched: 0 }
};
}

// Check if matching found any results
const allUnmatched = matches.every(m => m.confidence_score < 50);
if (allUnmatched) {
return {
success: true,
warning: "No matches found. Check date range and account details.",
summary: { auto_matched: 0, review_required: 0, unmatched: matches.length }
};
}

```

LOGGING & DEBUGGING:

Add to Edge Functions:
```

console.log('[parse-bank-statement] Starting parse', {
sessionId,
csvLength: csvContent.length,
timestamp: new Date().toISOString()
});

console.log('[parse-bank-statement] OpenAI response', {
transactionCount: parsed.transactions.length,
firstTransaction: parsed.transactions // sample
});

console.log('[reconcile-payments] Matching results', {
sessionId,
paymentsChecked: payments.length,
definiteMatches: matches.filter(m => m.match_status === 'definite_match').length,
highConfidence: matches.filter(m => m.match_status === 'high_confidence').length
});

```

View logs: Supabase Dashboard > Edge Functions > Logs

RETRY MECHANISMS:

For OpenAI rate limits:
```

async function callOpenAIWithRetry(params, maxRetries = 3) {
for (let i = 0; i < maxRetries; i++) {
try {
return await openai.chat.completions.create(params);
} catch (error) {
if (error.status === 429 \&\& i < maxRetries - 1) {
await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // exponential backoff
continue;
}
throw error;
}
}
}

```

USER-FRIENDLY ERROR MESSAGES:

Create error message mapping:
```

const ERROR_MESSAGES = {
'OPENAI_KEY_MISSING': 'AI service not configured. Please contact support.',
'OPENAI_RATE_LIMIT': 'Too many requests. Please wait 1 minute and try again.',
'INVALID_CSV': 'Unable to read bank statement. Please check the file format.',
'NO_TRANSACTIONS': 'No transactions found. Please ensure the file contains transaction data.',
'FUTURE_DATES': 'Invalid dates detected. Please check the bank statement.',
'STORAGE_UPLOAD_FAILED': 'File upload failed. Please check your connection.',
'NO_PAYMENTS': 'No unreconciled payments found. Try unreconciling some payments first.',
'NO_MATCHES': 'No matches found. This bank statement may be from a different period or account.'
};

```

BEFORE CODING: Use Supabase MCP to verify:
- How to access Edge Function environment variables (Deno.env.get?)
- How to view Edge Function logs in dashboard
- Whether Supabase client throws typed errors (check error.code)

OUTPUT REQUIREMENTS:
1. Error handling wrapper functions for all Edge Functions
2. Retry logic for OpenAI API calls
3. Validation functions for parsed data
4. User-friendly error message mapping
5. Console logging strategy
6. 4 test CSV files with different scenarios
7. Test documentation explaining each scenario
8. Rollback logic (cleanup on failure)
9. Error boundary component in frontend (catch React errors)
10. Toast notification integration for all error types

Generate the comprehensive error handling and testing code now.
```


***

### 🎯 STEP 12: Final Integration \& Deployment Checklist

**PROMPT FOR CURSOR:**

```
CONTEXT: All AI reconciliation components are built. Now we need final integration, testing, and deployment preparation.

TASK: Create a deployment checklist and final integration tasks to make the feature production-ready.

FINAL INTEGRATION TASKS:

1. NAVIGATION & ROUTING:
   Add "AI Reconciliation" link to main navigation menu:
   - Location: Next to "Payment History" or in a "Tools" dropdown
   - Icon: 🤖 or bank icon
   - Route: /reconciliation
   - Badge: Show "New" badge for first 2 weeks after launch

   Update routing config (verify exact file location in your app):
   - Add /reconciliation route -> AIReconciliation.tsx
   - Add /reconciliation/history route -> ReconciliationHistory.tsx
   - Add /reconciliation/session/:sessionId route -> ReviewQueue view

2. PERMISSIONS & ACCESS CONTROL:
   Add feature flag check:
   - Check if user has access to AI Reconciliation (could be premium feature)
   - If not, show upgrade prompt
   - For MVP: Available to all users

   Verify RLS policies are working:
   - Test: User A cannot access User B's reconciliation sessions
   - Test: User A cannot view/edit User B's payment reconciliations
   - Test: User A can only upload to their own storage folder

3. ENVIRONMENT VARIABLES:
   Ensure these are set in Supabase:
   - OPENAI_API_KEY (in Supabase Dashboard > Edge Functions > Secrets)
   
   Ensure these are set in frontend .env:
   - NEXT_PUBLIC_SUPABASE_URL (or VITE_ prefix if using Vite)
   - NEXT_PUBLIC_SUPABASE_ANON_KEY

4. EDGE FUNCTION DEPLOYMENT:
   Deploy both functions:
```

supabase functions deploy parse-bank-statement
supabase functions deploy reconcile-payments

```

Verify deployment:
- Check Supabase Dashboard > Edge Functions > Status (should show green)
- Test invoke from dashboard with sample data
- Check logs for any deployment errors

5. DATABASE MIGRATIONS:
Run migration SQL from Step 1:
- Copy SQL to Supabase Dashboard > SQL Editor
- Run migration
- Verify all tables created: reconciliation_sessions, bank_transactions, payment_reconciliations, reconciliation_patterns
- Verify indexes created (check query performance)
- Verify RLS policies enabled (try accessing data without auth)

6. STORAGE BUCKET:
Create bucket from Step 2:
- Supabase Dashboard > Storage > Create Bucket
- Name: bank-statements
- Public: No (private)
- Add RLS policies
- Test upload: Try uploading a file via frontend
- Test access: Try accessing someone else's file (should fail)

7. FRONTEND BUILD:
Check for any build errors:
- Run: npm run build (or yarn build)
- Fix any TypeScript errors
- Fix any missing imports
- Verify all components render without errors

8. INTEGRATION TESTING:
Test complete flow:
- [ ] Upload CSV file
- [ ] See progress indicator
- [ ] Parse completes, bank transactions saved
- [ ] Matching runs, results displayed
- [ ] Review queue shows matches sorted correctly
- [ ] Confirm a match -> updates database, shows in review queue
- [ ] Reject a match -> updates database, unlinks bank transaction
- [ ] Manual link -> opens modal, select different transaction, saves
- [ ] Finalize -> marks payments as reconciled
- [ ] Export report -> downloads CSV with correct data
- [ ] View history -> shows all sessions
- [ ] Delete session -> removes data and file

9. ERROR TESTING:
Test error scenarios:
- [ ] Upload invalid file (not CSV) -> shows error message
- [ ] Upload file >10MB -> shows error message
- [ ] Upload empty CSV -> shows "no transactions" error
- [ ] OpenAI API key missing -> shows error message (temporarily remove key to test)
- [ ] Network error during upload -> shows error, allows retry
- [ ] Try to access another user's session -> shows 403 error

10. PERFORMANCE TESTING:
 Test with realistic data:
 - [ ] Upload CSV with 50 transactions
 - [ ] Test with 20 unreconciled payments
 - [ ] Measure total time: upload -> parse -> match -> display (should be <30 seconds)
 - [ ] Check if table pagination works smoothly
 - [ ] Check if search/filter is responsive

11. MOBILE RESPONSIVENESS:
 Test on mobile device:
 - [ ] File upload works on mobile
 - [ ] Tables are scrollable/responsive
 - [ ] Action buttons are tappable (not too small)
 - [ ] Modals display correctly
 - [ ] No horizontal scroll overflow

12. DOCUMENTATION:
 Create user guide (in-app or help docs):
 - How to export bank statement CSV from common Indian banks (HDFC, ICICI, SBI)
 - Step-by-step reconciliation process
 - What each confidence score means
 - When to use manual link vs reject
 - How to export report for CA

 Create developer documentation:
 - Architecture overview
 - Database schema
 - Edge Function logic
 - Matching algorithm explanation
 - How to add new transaction types
 - How to adjust confidence thresholds

DEPLOYMENT CHECKLIST:

Pre-deployment:
- [ ] All Step 1-11 prompts completed successfully
- [ ] Database migrations run without errors
- [ ] Edge Functions deployed and tested
- [ ] Storage bucket created with correct policies
- [ ] Environment variables configured
- [ ] Frontend builds without errors
- [ ] All tests passed (integration + error scenarios)
- [ ] Mobile responsive testing complete

Deployment:
- [ ] Deploy frontend to production (Netlify, Vercel, etc.)
- [ ] Test production URL with real data
- [ ] Monitor Supabase logs for errors in first hour
- [ ] Test with 2-3 real users (beta testers)

Post-deployment:
- [ ] Monitor OpenAI API costs (check usage dashboard)
- [ ] Monitor Supabase Edge Function invocations
- [ ] Monitor storage bucket size growth
- [ ] Set up alerts for errors (if available)
- [ ] Collect user feedback on accuracy and UX
- [ ] Track key metrics:
* Reconciliations per day
* Average match confidence
* Manual link usage rate (higher = algorithm needs improvement)
* Time saved per reconciliation (survey users)

MONITORING & OPTIMIZATION:

Week 1 after launch:
- Review OpenAI API costs: Should be <$10 for 100 reconciliations
- Review matching accuracy: Aim for >85% auto-match rate
- Collect user feedback: Survey 10 users about the experience
- Fix any critical bugs immediately

Month 1 optimization:
- Analyze which matching rules are most effective (query matching_reasons)
- Identify common patterns in manual links (query review_notes)
- Consider adjusting confidence thresholds if too many false positives/negatives
- Add most-requested features (e.g., PDF support, multi-account)

BEFORE GOING LIVE: Run this verification script:

```

// Create: scripts/verify-reconciliation-setup.ts

async function verifyReconciliationSetup() {
const checks = [];

// Check 1: Database tables exist
checks.push(await checkTable('reconciliation_sessions'));
checks.push(await checkTable('bank_transactions'));
checks.push(await checkTable('payment_reconciliations'));
checks.push(await checkTable('reconciliation_patterns'));

// Check 2: Indexes exist
checks.push(await checkIndex('bank_transactions', 'session_id'));
checks.push(await checkIndex('payment_reconciliations', 'match_status'));

// Check 3: RLS policies enabled
checks.push(await checkRLS('reconciliation_sessions'));

// Check 4: Storage bucket exists
checks.push(await checkBucket('bank-statements'));

// Check 5: Edge Functions deployed
checks.push(await checkEdgeFunction('parse-bank-statement'));
checks.push(await checkEdgeFunction('reconcile-payments'));

// Check 6: Environment variables
checks.push(checkEnvVar('OPENAI_API_KEY'));

const allPassed = checks.every(c => c.passed);

console.log('Verification Results:');
checks.forEach(check => {
console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
});

if (allPassed) {
console.log('\n🎉 All checks passed! Ready for deployment.');
} else {
console.log('\n⚠️  Some checks failed. Fix issues before deploying.');
}

return allPassed;
}

// Run: npx ts-node scripts/verify-reconciliation-setup.ts

```

OUTPUT REQUIREMENTS:
1. Complete deployment checklist (copy-paste ready)
2. Verification script to check all components
3. Navigation/routing integration code
4. User documentation outline
5. Developer documentation outline
6. Monitoring plan with key metrics
7. Week 1 and Month 1 optimization plan
8. Rollback plan (what to do if major issues found)

Generate the final integration and deployment documentation now.
```


***

## Summary of Implementation Steps

You now have a complete, production-ready AI Bank Reconciliation feature implementation plan with **12 sequential prompts** for Cursor.

**Here's how to use these prompts:**

1. **Feed prompts ONE AT A TIME** - Don't skip ahead, each builds on the previous
2. **Use Supabase MCP before each step** - Verify table/column names before generating code
3. **Test after each step** - Verify database tables, test Edge Functions, check UI components
4. **Expected timeline**: 10-15 days of focused development
5. **Final outcome**: A feature that saves landlords 2-4 hours per month and gives you a competitive advantage in the property management space

**Key reminders for Cursor:**

- Always verify schema names via Supabase MCP
- Use OpenAI GPT-4o for parsing (not Gemini for MVP)
- Implement deterministic matching rules (you control logic)
- Store learned patterns to improve accuracy over time
- Comprehensive error handling at every step
- Export reports for tax compliance (key user need)

Once you complete all 12 steps, you'll have a feature that genuinely solves a painful problem for your target users. The AI reconciliation will be a **major differentiator** for Property Pro! 🚀

