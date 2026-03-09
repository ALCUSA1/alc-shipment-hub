

## Carrier Portal: Back Office + Driver Split

### Current State
The Carrier Portal (`/trucking/*`) has a single unified view with: Dashboard, Available Orders, My Quotes, and Account. All pages use `TruckingLayout` with a desktop sidebar. There is no distinction between back office operations and driver field use.

### Design

Split the Carrier Portal into two distinct experiences under the same `trucker` role:

**Back Office View** (existing pages, enhanced) — Desktop-first, full sidebar:
- Dashboard with stats, earnings, active jobs
- Browse & bid on available orders (existing)
- Manage quotes and accepted jobs
- Assign drivers to accepted jobs (new)
- Account & company management

**Driver View** (new pages) — Mobile-optimized, minimal chrome:
- Active assignments list — only jobs assigned to this driver
- Assignment detail with: pickup/delivery addresses, contact info, cargo instructions, container numbers
- One-tap navigation buttons (deep link to Google/Apple Maps)
- One-tap call buttons for shipper/warehouse contacts
- Status update buttons: En Route → Arrived → Loaded → In Transit → Delivered
- Minimal layout optimized for phone screens

### Database Changes

**1. New `driver_assignments` table** to link drivers to accepted trucking quotes:

```sql
CREATE TABLE public.driver_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trucking_quote_id uuid NOT NULL REFERENCES public.trucking_quotes(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  driver_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  driver_name text,
  driver_phone text,
  truck_plate text,
  pickup_address text,
  pickup_contact_name text,
  pickup_contact_phone text,
  delivery_address text,
  delivery_contact_name text,
  delivery_contact_phone text,
  instructions text,
  container_numbers text[],
  status text NOT NULL DEFAULT 'assigned', -- assigned | en_route | arrived | loaded | in_transit | delivered
  status_updated_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own assignments
CREATE POLICY "Drivers can view own assignments" ON public.driver_assignments
  FOR SELECT TO authenticated USING (driver_user_id = auth.uid());

-- Drivers can update status on their own assignments
CREATE POLICY "Drivers can update own assignments" ON public.driver_assignments
  FOR UPDATE TO authenticated USING (driver_user_id = auth.uid());

-- Truckers (back office) can manage assignments they created
CREATE POLICY "Back office can manage assignments" ON public.driver_assignments
  FOR ALL TO authenticated USING (assigned_by = auth.uid());

-- Admins can manage all
CREATE POLICY "Admins can manage all assignments" ON public.driver_assignments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
```

**2. Add `driver` to the `app_role` enum** so drivers can be assigned a distinct role:

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';
```

### New Role: `driver`
- Separate from `trucker` (back office). A driver is someone who operates the truck in the field.
- During signup, the role selector will add a "Driver" option under the Carrier category.
- Drivers log in via the same unified login and get routed to `/driver`.

### Frontend Changes

**New Files:**
- `src/components/driver/DriverLayout.tsx` — Minimal mobile layout with bottom tab bar (no sidebar)
- `src/components/driver/DriverGate.tsx` — Auth gate checking for `driver` role
- `src/pages/driver/DriverDashboard.tsx` — List of active assignments with status badges
- `src/pages/driver/DriverAssignmentDetail.tsx` — Full assignment detail with:
  - Pickup/delivery addresses with "Navigate" buttons (Google Maps deep links)
  - Contact info with "Call" buttons (`tel:` links)
  - Cargo & container details
  - Special instructions
  - Status update buttons (large, touch-friendly)

**Modified Files:**
- `src/App.tsx` — Add `/driver` routes with `DriverGate`
- `src/lib/role-routing.ts` — Route `driver` role to `/driver`
- `src/pages/SignUp.tsx` — Add "Driver" option to role selector
- `src/components/trucking/TruckingSidebar.tsx` — Add "Driver Assignments" nav item
- `src/pages/trucking/TruckingQuotes.tsx` or new `TruckingJobs.tsx` — Add "Assign Driver" action on accepted quotes
- `src/lib/permissions.ts` — Add `/driver` route permissions
- `src/hooks/useUserRole.ts` — Add `driver` to `AppRole` type

### Back Office Enhancement: Assign Driver Flow
On accepted quotes, the back office user sees an "Assign Driver" button that opens a form to:
- Select or enter driver name, phone, truck plate
- Add pickup/delivery contact info and special instructions
- This creates a `driver_assignments` record

### Driver Mobile UI Design
- Bottom tab navigation: **My Jobs** | **Account**
- Large touch targets for status updates
- Prominent "Navigate" and "Call" buttons
- Status progression: Assigned → En Route → Arrived → Loaded → In Transit → Delivered
- Each status change updates `driver_assignments.status` and `status_updated_at`

### User Flow

```text
Back Office (trucker role)          Driver (driver role)
┌──────────────────────┐            ┌──────────────────────┐
│ Browse orders        │            │ My Jobs (assigned)   │
│ Submit quotes        │            │                      │
│ Quote accepted ──────┼──Assign───▶│ See assignment       │
│ Assign driver        │  Driver    │ Navigate to pickup   │
│ Monitor status       │◀──────────│ Update status         │
└──────────────────────┘            │ Call contacts         │
                                    └──────────────────────┘
```

