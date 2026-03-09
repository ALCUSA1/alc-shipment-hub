

## Shipper Experience Enhancement Plan

After a thorough inspection of the shipper portal, here is a comprehensive plan to enhance the user experience across shipment creation, cross-portal integration, payments, document management, and smart pre-filling.

---

### Current Gaps Identified

1. **No auto-fill from CRM when customer is selected** — Selecting a customer in Basics doesn't populate consignee/parties
2. **Warehouse Panel still reads from old `warehouse_operations` table** — not connected to new `warehouse_orders`
3. **Trucking Panel is read-only** — no way to request trucking from within a shipment
4. **No "Clone Shipment" feature** for repeat routes
5. **Document checklist is toggle-only** — no file upload, no download, no preview
6. **No country dropdown** — country fields are free text across party forms
7. **No smart suggestions** — e.g. recently used ports, last consignee, favorite carriers
8. **Payment flow disconnected** — Pay button on Quotes page only, no payment status on Shipment Detail
9. **No warehouse order creation from shipment** — WarehousePanel shows old data but can't create new `warehouse_orders`
10. **No trucking quote request from shipment** — can't request carrier pickup from the shipment workspace

---

### Implementation: 8 Enhancement Areas

#### 1. Smart Auto-Fill When Customer Selected
**What:** When a user selects a customer from CRM in the Basics section (both NewShipment and NewQuote), auto-populate:
- Consignee party fields (name, address, email, phone, tax ID) from the `companies` table
- If the company has associated contacts (`company_contacts`), use the primary contact

**Files:** `BasicsSection.tsx`, `NewShipment.tsx`, `NewQuote.tsx`

#### 2. Country & Port Smart Selectors
**What:** Replace free-text country inputs across all party forms with a searchable country dropdown (ISO 3166). Add "Recently Used Ports" section to `PortSelector` that shows the user's last 5 unique ports from their shipments.

**Files:** New `CountrySelector.tsx` component, update `PartiesSection.tsx`, `PortSelector.tsx`, `NewShipment.tsx`

#### 3. Clone Shipment Feature
**What:** Add a "Clone" button on the Shipment Detail page and Shipments list that pre-fills a new shipment with the same parties, routing, cargo, and commercial data. Navigates to `/dashboard/shipments/new?clone={id}`.

**Files:** `ShipmentDetail.tsx`, `Shipments.tsx`, `NewShipment.tsx` (read clone param and fetch source shipment data)

#### 4. Connect Warehouse Panel to New `warehouse_orders` Table
**What:** Update `WarehousePanel.tsx` to:
- Read from `warehouse_orders` instead of `warehouse_operations`
- Add "Request Warehouse Receiving" button that creates a `warehouse_orders` record (type: `receiving`) linked to the shipment
- Show status updates from warehouse operators in real-time

**Files:** `WarehousePanel.tsx`

#### 5. Request Trucking from Shipment
**What:** Update `TruckingPanel.tsx` to:
- Show a "Request Pickup" button when no trucking is assigned
- Create a `trucking_quotes` record (status: `available`) so carrier portal can see it
- Show assigned driver status if a `driver_assignments` record exists

**Files:** `TruckingPanel.tsx`

#### 6. Enhanced Document Management
**What:** Upgrade `DocumentChecklist.tsx`:
- Add file upload capability (upload to `documents` storage bucket, store URL in `file_url`)
- Add download button for uploaded files
- Show document status badges with timestamps
- Create a new storage bucket `shipment-documents` for file storage

**Database:** Create `shipment-documents` storage bucket
**Files:** `DocumentChecklist.tsx`

#### 7. Payment Status on Shipment Detail
**What:** Add a payment status card to the Shipment Detail sidebar showing:
- Payment status from linked quote (`payment_status`)
- Pay Now button (invokes `create-payment` edge function)
- Payment history from `payments` table
- Visual indicator: unpaid (orange), pending (yellow), paid (green)

**Files:** `ShipmentDetail.tsx` (new `PaymentStatusCard` component inline or separate)

#### 8. Shipper ↔ Carrier/Warehouse Integration Banners
**What:** Enhance `DashboardActionBanners.tsx` and `ShipmentNextAction.tsx` to show:
- "Warehouse has received your cargo" when `warehouse_orders` status changes to `confirmed`
- "Driver en route to pickup" when `driver_assignments` status changes
- "Trucking quote available" when a carrier submits a bid on a trucking order

**Files:** `DashboardActionBanners.tsx`, `ShipmentNextAction.tsx`

---

### Implementation Order

1. Smart Auto-Fill (customer → consignee) — highest UX impact, minimal code
2. Country Selector — standardizes data entry across all forms
3. Connect Warehouse Panel to `warehouse_orders`
4. Request Trucking from Shipment
5. Document upload/download
6. Payment Status on Shipment Detail
7. Clone Shipment
8. Integration banners (carrier/warehouse status)

---

### Database Changes

- **New storage bucket:** `shipment-documents` (public: No — authenticated access only)
- **No table schema changes** — all features use existing tables (`warehouse_orders`, `driver_assignments`, `trucking_quotes`, `documents`, `payments`)

### Summary of Files Changed

| Area | Files |
|------|-------|
| Auto-fill | `BasicsSection.tsx`, `NewShipment.tsx`, `NewQuote.tsx` |
| Country selector | New `CountrySelector.tsx`, `PartiesSection.tsx` |
| Clone shipment | `ShipmentDetail.tsx`, `Shipments.tsx`, `NewShipment.tsx` |
| Warehouse integration | `WarehousePanel.tsx` |
| Trucking integration | `TruckingPanel.tsx` |
| Documents | `DocumentChecklist.tsx` |
| Payments | `ShipmentDetail.tsx` |
| Banners | `DashboardActionBanners.tsx`, `ShipmentNextAction.tsx` |

