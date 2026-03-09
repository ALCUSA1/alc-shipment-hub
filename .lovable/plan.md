

## Dedicated Warehouse Portal — Full Solution

### Context

Currently, warehouses exist only as a `warehouse_operations` table tied to shipments — a flat list with no dedicated portal, no warehouse identity, and no self-service capability. Warehouse operators sign up as `ops_manager` and land in the shipper dashboard, which doesn't serve their needs.

Since ALC is a 3PL and warehouses are integral to every order, we need to treat warehouse operators as first-class platform participants — similar to how we built the Carrier Portal with back office + driver split.

### Design Overview

A dedicated **Warehouse Portal** at `/warehouse/*` with its own layout, sidebar, and role (`warehouse`). Warehouse operators can:
1. **Receive & log incoming cargo** — see inbound orders from shippers, confirm receipt, record condition/photos
2. **Manage storage & inventory** — track what's stored, bay/zone location, storage duration
3. **Process release orders** — receive release instructions, coordinate dispatch
4. **Billing & invoicing** — log handling fees, storage charges, generate invoice summaries

Shippers interact with warehouses by creating warehouse orders from their shipment workspace. Warehouse operators can also self-manage operations and create their own shipments when they need freight forwarding services (the bidirectional relationship you described).

---

### Database Changes

**1. Add `warehouse` role to `app_role` enum:**
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'warehouse';
```

**2. New `warehouses` table** — the warehouse identity/facility registry:
```sql
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  warehouse_name text NOT NULL,
  address text,
  city text,
  state text,
  country text DEFAULT 'US',
  contact_name text,
  contact_phone text,
  contact_email text,
  operating_hours text,
  capabilities text[] DEFAULT '{}',  -- e.g. {'reefer','hazmat','bonded'}
  total_capacity_sqft numeric,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**3. New `warehouse_orders` table** — replaces/extends `warehouse_operations` as the core work order:
```sql
CREATE TABLE public.warehouse_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES public.warehouses(id),
  shipment_id uuid REFERENCES public.shipments(id),
  order_type text NOT NULL DEFAULT 'receiving',  -- receiving | storage | release
  status text NOT NULL DEFAULT 'pending',  -- pending | confirmed | in_progress | completed | cancelled
  requester_user_id uuid,  -- shipper who requested
  warehouse_user_id uuid,  -- warehouse operator handling it
  
  -- Cargo details
  cargo_description text,
  num_packages integer,
  weight numeric,
  volume numeric,
  container_numbers text[],
  
  -- Location within warehouse
  storage_zone text,
  bay_number text,
  
  -- Instructions
  handling_instructions text,
  storage_instructions text,
  release_authorization text,
  release_to_name text,
  release_to_phone text,
  
  -- Dates
  expected_date date,
  actual_date date,
  storage_start_date date,
  storage_end_date date,
  
  -- Billing
  handling_fee numeric DEFAULT 0,
  storage_rate_per_day numeric DEFAULT 0,
  total_storage_charges numeric DEFAULT 0,
  billing_status text DEFAULT 'unbilled',  -- unbilled | invoiced | paid
  
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Both tables get RLS policies: warehouse owners see their own facilities/orders, shippers see orders they requested, admins see all.

---

### New Role & Routing

- **New role**: `warehouse` (distinct from `ops_manager`)
- **Signup**: Update "Warehouse Operator" option from `ops_manager` → `warehouse`
- **Post-login routing**: `warehouse` role → `/warehouse`
- **Permissions**: `/warehouse` route restricted to `warehouse` role

---

### Warehouse Portal Pages

All under `/warehouse/*` with a dedicated `WarehouseLayout` (sidebar + header):

| Page | Purpose |
|------|---------|
| **Dashboard** | Stats overview: pending receiving, items in storage, pending releases, revenue |
| **Inbound Orders** | List of receiving orders — confirm arrival, log cargo details, update status |
| **Inventory** | Current storage — what's in the warehouse, zone/bay, duration, linked shipment |
| **Release Orders** | Pending release instructions — process and dispatch |
| **Billing** | Handling fees, storage charges per order, invoice summaries |
| **My Facility** | Warehouse profile — name, address, capabilities, operating hours |
| **Account** | User account settings |

**Bonus — Bidirectional**: Since warehouse operators also need freight forwarding, they can access a "Ship Cargo" section that links to creating shipments (reusing the existing shipment wizard), making the platform useful in both directions.

---

### Frontend Files

**New:**
- `src/components/warehouse/WarehouseGate.tsx` — auth gate for `warehouse` role
- `src/components/warehouse/WarehouseLayout.tsx` — sidebar layout
- `src/components/warehouse/WarehouseSidebar.tsx` — navigation
- `src/pages/warehouse/WarehouseDashboard.tsx`
- `src/pages/warehouse/WarehouseInbound.tsx`
- `src/pages/warehouse/WarehouseInventory.tsx`
- `src/pages/warehouse/WarehouseReleases.tsx`
- `src/pages/warehouse/WarehouseBilling.tsx`
- `src/pages/warehouse/WarehouseFacility.tsx`
- `src/pages/warehouse/WarehouseAccount.tsx`

**Modified:**
- `src/App.tsx` — add `/warehouse/*` routes with `WarehouseGate`
- `src/pages/SignUp.tsx` — change warehouse role from `ops_manager` to `warehouse`
- `src/lib/role-routing.ts` — route `warehouse` → `/warehouse`
- `src/lib/permissions.ts` — add `/warehouse` permissions
- `src/hooks/useUserRole.ts` — add `warehouse` to `AppRole` type

---

### Shipper ↔ Warehouse Interaction

From the shipper's shipment detail page, the existing "Warehouse Operations" panel will be updated to create `warehouse_orders` (instead of `warehouse_operations`), which the warehouse operator then sees in their portal. Status updates flow both ways via the shared table.

---

### Implementation Order

1. Database: add role + create tables with RLS
2. Auth & routing: gate, role routing, permissions
3. Warehouse layout + sidebar
4. Dashboard + Inbound Orders pages
5. Inventory + Release Orders pages
6. Billing page
7. Facility profile page
8. Update shipper-side to create warehouse orders
9. Admin warehouse module update

