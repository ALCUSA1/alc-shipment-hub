

## Plan: Add BL-Level Payment Reconciliation

### What We're Building
Add Bill of Lading (BL) number tracking to the payment splitting system so that when funds are transferred to each shipping line's Stripe Connect account, the BL number is included in the transfer description and metadata. This allows shipping lines to match incoming payments to specific BLs and release cargo accordingly.

### Changes

#### 1. Database Migration — Add `bl_number` to `payment_splits`
Add a nullable `bl_number TEXT` column to the existing `payment_splits` table.

```sql
ALTER TABLE public.payment_splits ADD COLUMN bl_number TEXT;
```

#### 2. Update `create-payment` Edge Function
- Accept `bl_number` in each item of the `carrier_splits` array:
  ```typescript
  carrier_splits: [
    { carrier_name: "MSC", amount: 8000, bl_number: "MSCU1234567" },
    { carrier_name: "Hapag-Lloyd", amount: 5000, bl_number: "HLCU7654321" }
  ]
  ```
- Store `bl_number` in the `payment_splits` insert for each carrier
- Include BL numbers in the Checkout line item description

#### 3. Update `settle-carriers` Edge Function
- Include `bl_number` in the Stripe Transfer `description` and `metadata`:
  ```typescript
  description: `BL: ${split.bl_number} — Freight settlement — ${split.carrier_name}`,
  metadata: { bl_number: split.bl_number, ... }
  ```
- This is what the shipping line sees on their Stripe dashboard for reconciliation

#### 4. Update `ShipmentChargesPanel.tsx`
- When calling `create-payment` with `carrier_splits`, include `bl_number` from the charge's metadata or shipment data so it flows through to settlement

### Files to Modify
1. **New migration** — Add `bl_number` column to `payment_splits`
2. `supabase/functions/create-payment/index.ts` — Accept and store `bl_number` per split
3. `supabase/functions/settle-carriers/index.ts` — Include BL in transfer description + metadata
4. `src/components/shipment/ShipmentChargesPanel.tsx` — Pass BL number in payment requests

