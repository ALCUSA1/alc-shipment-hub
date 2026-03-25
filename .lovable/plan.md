

## Plan: Add Wire Transfer / Bank Transfer Payment Option

### What We're Building
Enable customers to pay via bank wire transfer (ACH or Fedwire) through Stripe's `customer_balance` payment method. Stripe generates unique bank transfer instructions (routing number, account number, reference code) that the customer uses to send funds from their bank.

### How It Works (Stripe Bank Transfers)
1. Customer clicks "Pay via Bank Transfer"
2. Stripe Checkout opens with `customer_balance` payment method enabled
3. Stripe displays wire transfer instructions (bank details + unique reference code)
4. Customer initiates the wire from their bank using those instructions
5. Stripe matches the incoming funds and marks payment complete (ACH: 1-3 days, Wire: same day)

**Important**: Stripe requires a `customer` object (not just `customer_email`) for bank transfers — we already create customers in `create-payment`, so this is covered.

### Changes

#### 1. Update `create-payment` Edge Function
- Add `payment_method: "bank_transfer"` as an accepted parameter from the frontend
- When `payment_method` is `"bank_transfer"`:
  - Add `"customer_balance"` to `payment_method_types`
  - Add `payment_method_options.customer_balance` config specifying `funding_type: "bank_transfer"` and the appropriate transfer type (`us_bank_transfer` for USD, `eu_bank_transfer` for EUR, `gb_bank_transfer` for GBP)
- Keep `"card"` in the list so customer can choose either method at checkout

#### 2. Update `PaymentStatusCard.tsx`
- Add a second button "Pay via Bank Transfer" (with a `Landmark`/bank icon) alongside the existing "Pay Now" card button
- Clicking it calls `create-payment` with `payment_method: "bank_transfer"`
- Add a note below: "Wire transfers typically settle within 1-3 business days"

#### 3. Update `ShipmentChargesPanel.tsx`
- Add a "Wire Transfer" option next to the existing "Pay" button for unpaid charges
- Same pattern: calls `create-payment` with `payment_method: "bank_transfer"`

#### 4. Update `PaymentSuccess.tsx`
- Handle the `processing` state better for bank transfers — show messaging like "Your bank transfer instructions have been sent. Funds typically arrive within 1-3 business days."
- Stripe may not redirect to success_url for bank transfers until funds arrive, so the existing "processing" state handling already partially covers this

#### 5. Update `verify-payment` Edge Function
- No changes needed — it already handles `session.payment_status === "unpaid"` → `"pending"` which covers the bank transfer waiting period

### Technical Details

**Stripe Checkout session config for bank transfers:**
```typescript
payment_method_types: ["customer_balance", "card"],
payment_method_options: {
  customer_balance: {
    funding_type: "bank_transfer",
    bank_transfer: {
      type: "us_bank_transfer", // for USD
    },
  },
},
```

**Key constraint**: `customer` (not `customer_email`) is required — already handled since we create/find customers in the function.

### Files to Modify
1. `supabase/functions/create-payment/index.ts` — add bank transfer payment method support
2. `src/components/shipment/PaymentStatusCard.tsx` — add "Pay via Bank Transfer" button
3. `src/components/shipment/ShipmentChargesPanel.tsx` — add wire transfer option
4. `src/pages/PaymentSuccess.tsx` — improve bank transfer pending state messaging

