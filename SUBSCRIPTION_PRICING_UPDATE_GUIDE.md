# 📋 Subscription Pricing & Features Update Guide

This guide explains how to update subscription plan pricing and features in both the landing page and authenticated user's settings page.

## 🎯 Overview

The application has two places where subscription plans are displayed:
1. **Landing Page** (`/src/App.tsx`) - For public visitors
2. **Settings Page** (`/src/components/settings/SettingsPage.tsx`) - For authenticated users

Both must be kept in sync to maintain consistency.

---

## 🏠 Landing Page Updates

### Location
File: `/src/App.tsx`
Section: Landing page pricing component (around lines 140-202)

### Current Plans Structure
```typescript
plans={[
  {
    name: "Starter",
    price: "799",           // Monthly price in rupees
    yearlyPrice: "7668",    // Yearly price in rupees
    features: [
      "Capacity 1-3 properties",
      "Multi‑property dashboard",
      // ... more features
    ],
    buttonText: "Start Free Trial",
    href: "#/auth/signup",
    isPopular: false,
  },
  // ... more plans
]}
```

### How to Update Landing Page Pricing

1. **Open** `/src/App.tsx`
2. **Find** the `plans` array in the Pricing component
3. **Update** the following fields for each plan:
   - `name`: Plan name (e.g., "Starter", "Professional", "Portfolio")
   - `price`: Monthly price as string (e.g., "799", "1499", "2499")
   - `yearlyPrice`: Yearly price as string (calculate: monthly × 12 × 0.8 for 20% discount)
   - `features`: Array of feature strings
   - `isPopular`: Boolean to highlight the recommended plan

### Example Update
```typescript
// Before
{
  name: "Starter",
  price: "799",
  yearlyPrice: "7668",
  features: ["Capacity 1-3 properties", "Basic features"],
  isPopular: false,
}

// After
{
  name: "Starter",
  price: "899",           // Updated price
  yearlyPrice: "8630",    // Updated yearly price
  features: [
    "Capacity 1-3 properties",
    "Multi‑property dashboard",
    "AI rent matching",
    "Enhanced support"    // Added new feature
  ],
  isPopular: false,
}
```

---

## ⚙️ Settings Page Updates

### Location
File: `/src/components/settings/SettingsPage.tsx`
Data Source: Database table `subscription_plans`

### How Settings Page Gets Data
The settings page loads subscription plans from the database using:
```typescript
const { data: plans, error } = await supabase
  .from('subscription_plans')
  .select('*')
  .eq('is_active', true)
  .order('price');
```

### Database Schema
Table: `public.subscription_plans`
```sql
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    price INTEGER NOT NULL DEFAULT 0,        -- Price in rupees
    properties_limit INTEGER NOT NULL DEFAULT 3,
    storage_limit_mb INTEGER NOT NULL DEFAULT 100,
    features JSONB DEFAULT '[]'::jsonb,      -- Array of features
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

### How to Update Database Pricing

#### Method 1: Using Supabase SQL Editor

1. **Open** Supabase Dashboard
2. **Go to** SQL Editor
3. **Run** the following SQL commands:

```sql
-- Update Starter plan
UPDATE public.subscription_plans 
SET 
    price = 899,  -- New price in rupees
    properties_limit = 3,
    storage_limit_mb = 100,
    features = '["Capacity 1-3 properties", "Multi‑property dashboard", "AI rent matching", "Enhanced support"]',
    updated_at = now()
WHERE name = 'Starter';

-- Update Professional plan
UPDATE public.subscription_plans 
SET 
    price = 1599,  -- New price in rupees
    properties_limit = 8,
    storage_limit_mb = 1024,
    features = '["Capacity 4–8 properties", "Multi‑property dashboard", "AI rent matching", "Priority support"]',
    updated_at = now()
WHERE name = 'Professional';

-- Update Portfolio plan
UPDATE public.subscription_plans 
SET 
    price = 2699,  -- New price in rupees
    properties_limit = 15,
    storage_limit_mb = 2048,
    features = '["Capacity 9–15 properties", "Multi‑property dashboard", "AI rent matching", "Dedicated support"]',
    updated_at = now()
WHERE name = 'Portfolio';

-- Verify updates
SELECT name, price, properties_limit, features 
FROM public.subscription_plans 
ORDER BY price;
```

#### Method 2: Using SQL Script File

1. **Create** a new SQL file (e.g., `update-pricing-YYYY-MM-DD.sql`)
2. **Add** the update commands above
3. **Run** the script in Supabase SQL Editor

---

## 🔄 Complete Update Process

### Step-by-Step Workflow

1. **Plan Your Changes**
   - Decide on new pricing
   - List new/updated features
   - Calculate yearly prices (monthly × 12 × 0.8)

2. **Update Landing Page**
   - Edit `/src/App.tsx`
   - Update the `plans` array
   - Test the landing page

3. **Update Database**
   - Run SQL commands in Supabase
   - Verify data with SELECT queries

4. **Test Settings Page**
   - Login as authenticated user
   - Go to Settings → Subscription Plan
   - Verify pricing matches landing page

5. **Verify Consistency**
   - Compare prices between landing page and settings
   - Check feature lists match
   - Test currency formatting

---

## 🛠️ Currency Formatting

### How Currency is Displayed
The settings page uses the `formatCurrency` function in `/src/utils/settingsUtils.ts`:

```typescript
export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount); // Amount is already in rupees
};
```

### Important Notes
- Database stores prices in **rupees** (not paise)
- Function formats as Indian Rupee (₹)
- No decimal places shown (whole numbers only)

---

## 🚨 Common Issues & Solutions

### Issue 1: Prices Don't Match
**Problem**: Landing page shows different prices than settings page
**Solution**: 
1. Check database values match landing page
2. Verify `formatCurrency` function is correct
3. Clear browser cache and refresh

### Issue 2: Features Don't Update
**Problem**: New features not showing in settings page
**Solution**:
1. Verify JSON format in database features column
2. Check for syntax errors in JSON array
3. Ensure `is_active = true` for the plan

### Issue 3: Currency Formatting Issues
**Problem**: Prices showing as ₹7.99 instead of ₹799
**Solution**:
1. Check if `formatCurrency` is dividing by 100 (should not)
2. Verify database stores prices in rupees, not paise
3. Update the function if needed

---

## 📝 Best Practices

### 1. Always Update Both Places
- Landing page for public visitors
- Database for authenticated users
- Keep them synchronized

### 2. Test Thoroughly
- Check both landing page and settings page
- Verify currency formatting
- Test with different user accounts

### 3. Document Changes
- Keep a changelog of pricing updates
- Note effective dates
- Document feature additions/removals

### 4. Backup Before Changes
- Export current subscription plans data
- Keep a copy of the current App.tsx pricing section

### 5. Gradual Rollout
- Consider A/B testing for major price changes
- Monitor user feedback
- Have rollback plan ready

---

## 🔍 Verification Checklist

After updating pricing, verify:

- [ ] Landing page shows correct prices
- [ ] Settings page shows correct prices
- [ ] Currency formatting is correct (₹799, not ₹7.99)
- [ ] Features list matches between both pages
- [ ] Yearly pricing is calculated correctly
- [ ] Popular plan is highlighted correctly
- [ ] All plans are active and visible
- [ ] No console errors in browser
- [ ] Database queries return correct data

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify database connection
3. Test with different user accounts
4. Check Supabase logs for database errors

---

*Last updated: [Current Date]*
*Version: 1.0*
