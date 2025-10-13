// Landing Page Pricing Template
// Copy this template and replace the plans array in /src/App.tsx
// Location: Around line 141 in the Pricing component

plans={[
  {
    name: "Starter",
    price: "799",           // UPDATE: Monthly price as string
    yearlyPrice: "7668",    // UPDATE: Yearly price (monthly × 12 × 0.8)
    features: [
      "Capacity 1-3 properties",
      "Multi‑property dashboard",
      "AI rent matching",
      "Per‑tenant UPI QR",
      "Payment recording & overdue alerts",
      "Digital document vault with renewals",
      "Telegram/WhatsApp notifications",
      "Custom matching rules",
      "Data export",
      "Email support"
    ],
    buttonText: "Start Free Trial",
    href: "#/auth/signup",
    isPopular: false,
  },
  {
    name: "Professional",
    price: "1499",          // UPDATE: Monthly price as string
    yearlyPrice: "14390",   // UPDATE: Yearly price (monthly × 12 × 0.8)
    features: [
      "Capacity 4–8 properties",
      "Multi‑property dashboard",
      "AI rent matching",
      "Per‑tenant UPI QR",
      "Payment recording & overdue alerts",
      "Digital document vault with renewals",
      "Telegram/WhatsApp notifications",
      "Custom matching rules",
      "Data export",
      "Email support"
    ],
    buttonText: "Start Free Trial",
    href: "#/auth/signup",
    isPopular: true,        // UPDATE: Set to true for recommended plan
  },
  {
    name: "Portfolio",
    price: "2499",          // UPDATE: Monthly price as string
    yearlyPrice: "23990",   // UPDATE: Yearly price (monthly × 12 × 0.8)
    features: [
      "Capacity 9–15 properties",
      "Multi‑property dashboard",
      "AI rent matching",
      "Per‑tenant UPI QR",
      "Payment recording & overdue alerts",
      "Digital document vault with renewals",
      "Telegram/WhatsApp notifications",
      "Custom matching rules",
      "Data export",
      "Priority support"
    ],
    buttonText: "Start Free Trial",
    href: "#/auth/signup",
    isPopular: false,
  },
]}

// ============================================
// QUICK REFERENCE
// ============================================

// Yearly Price Calculation:
// Monthly Price × 12 × 0.8 (20% discount)
// Example: 799 × 12 × 0.8 = 7668

// Popular Plan:
// Set isPopular: true for the recommended plan
// Only one plan should have isPopular: true

// Features:
// - Keep features consistent between landing page and database
// - Use same wording and capitalization
// - Order features by importance

// Price Format:
// - Always use strings for price and yearlyPrice
// - No currency symbols (₹) in the values
// - Whole numbers only (no decimals)
