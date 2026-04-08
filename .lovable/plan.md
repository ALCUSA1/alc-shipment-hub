

# Quote-to-Booking Conversion — Seamless Flow

## Problem

When a customer approves a quote, the forwarder currently has two confusing buttons ("Book" and "Convert") that both create shipments from scratch via client-side inserts. The flow should be streamlined: customer approves → forwarder clicks one button → shipment is created with all quote data pre-filled → forwarder lands in the booking workspace ready to finalize carrier booking and fill vessel spots.

## What Changes

### 1. Simplify Quote Actions — Single "Book Now" Button
**File**: `src/pages/Quotes.tsx`
- Remove the separate "Book" and "Convert" buttons for accepted quotes
- Replace with a single **"Book Now"** button that appears when `status === "accepted"`
- Clicking it opens the convert dialog (already has cutoff date fields) but with clearer labeling: "Confirm Booking" instead of "Convert Quote to Shipment"
- The dialog shows the pre-filled quote summary (route, carrier, price, container) and cutoff date inputs
- On confirm, creates the shipment using the existing `handleConvert` logic but also sets `status: "booked"` and `lifecycle_stage: "booked"` on the shipment (not just default)
- Navigates to `/dashboard/shipments/{id}` (the workspace) where the forwarder can manage carrier booking, vessel spot, and documents

### 2. Auto-Notify Forwarder When Customer Approves
**File**: `src/pages/QuoteApproval.tsx`
- After customer clicks "Accept", insert a notification for the quote owner: "Customer approved your quote for [route] — Book now to secure vessel space"
- This requires a small addition: after updating quote status to `accepted`, insert into `notifications` table using the quote's `user_id`

### 3. Customer Approval Page — Add Booking Context
**File**: `src/pages/QuoteApproval.tsx`
- After customer accepts, show a confirmation message: "Your freight forwarder will now proceed with booking. You'll receive updates as the shipment progresses."
- Remove the decline/accept buttons once acted upon (already done, just improve messaging)

### 4. Quote Status Flow Cleanup
**File**: `src/pages/Quotes.tsx`
- Remove `handleBookQuote` function entirely (redundant with `handleConvert`)
- Remove the "pending" status from being bookable — only `accepted` quotes can be booked
- Update the convert logic to:
  - Set quote status to `"booked"` (not `"converted"`)
  - Set shipment `lifecycle_stage` to `"booked"` and `status` to `"booked"`
  - Set carrier and container_type on the shipment
  - This ensures the shipment enters the lifecycle at the right stage

### 5. Vessel Spot Context
- The shipment workspace already shows carrier, route, and sailing details
- By setting `lifecycle_stage: "booked"`, the existing lifecycle automation triggers (document requests, tasks, customer notifications) all fire automatically
- The forwarder's dashboard pipeline view shows the shipment in the "Booked" column, making it clear they're filling vessel spots

## Technical Details

- **No new tables or migrations needed** — all data already exists in `quotes` and `shipments` tables
- **No new edge functions** — the client-side conversion logic is sufficient since the user is authenticated and RLS allows their own inserts
- The existing `notify_customer_on_booking` trigger will automatically notify linked customers when `lifecycle_stage` moves to `booked`
- The existing `auto_request_documents_on_booking` trigger will create document placeholders automatically

## Files Modified
- `src/pages/Quotes.tsx` — consolidate Book/Convert into single flow, clean up redundant code
- `src/pages/QuoteApproval.tsx` — add notification on approval, improve post-action messaging

