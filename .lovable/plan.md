

## Remove Internal Organization Approval Step

### What Changes
The `awaiting_approval` lifecycle stage is removed from the shipment flow. The new lifecycle becomes:

`draft → pending_pricing → quote_ready → booked → in_transit → delivered → closed`

When a shipment reaches `quote_ready`, the next transition goes directly to `booked` — no internal company approval gate. In reality, it's the shipping line that confirms the booking, not an internal team member.

### Files to Update

#### 1. `supabase/functions/shipment-workflow/index.ts`
- In the `approve_quote` action (customer approval path ~line 304-344): accept `quote_ready` directly and transition to `booked` (remove `awaiting_approval` from the valid states check)
- In the `submit_for_pricing` validation (~line 103): remove `awaiting_approval` from allowed source stages
- Remove any logic that sets `lifecycle_stage` to `awaiting_approval`

#### 2. `src/pages/UnifiedBookingFlow.tsx`
- Update the `transitionPath` map (~line 440): change `quote_ready → booked` (skip `awaiting_approval`)

#### 3. `src/pages/ShipmentWorkspace.tsx`
- Remove `awaiting_approval` from `stageOrder` array (~line 196)
- Remove from status color map (~line 33)

#### 4. `src/pages/Shipments.tsx`
- Remove `awaiting_approval` from status color map and filter options (~lines 36, 49)

#### 5. `src/pages/ShipmentDetail.tsx`
- Remove `awaiting_approval` from status color map (~line 60)

#### 6. `src/pages/Dashboard.tsx`
- Remove `awaiting_approval` from color/label maps (~lines 26, 36)
- Remove the approval count query and "awaiting approval" action banner (~lines 76, 143)

#### 7. `src/pages/CustomerShipmentWorkspace.tsx`
- Remove `awaiting_approval` from status color map if present

#### 8. `src/components/booking/BookingProgressBar.tsx`
- Remove any "Awaiting Approval" step from the progress indicator if listed

### No Database Migration Needed
The `lifecycle_stage` and `status` columns are text fields — removing a value from the UI/logic is sufficient. Existing shipments stuck in `awaiting_approval` will still display but can be manually advanced.

