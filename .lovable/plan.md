

## Current State

The database already has a `container_commodities` table with full AES-level detail (HS code, Schedule B, value, weight, ECCN, license codes, etc.) linked to both `container_id` and `shipment_id`. However, **no UI component reads from or writes to this table**. The workspace `CargoSection` currently shows cargo lines and containers as two independent lists with no mapping between them.

## Plan

### 1. Add container assignment to cargo lines

In the workspace `CargoSection`, add a "Container" dropdown to each cargo line that lets users assign it to one of the shipment's containers. This creates the visual and data link between "what's in this container."

### 2. Build a Container Contents view

Add a collapsible sub-section under each container card in the Equipment area showing the commodity lines assigned to it, with key fields (commodity, HS code, weight, value). This gives a per-container packing manifest.

### 3. Persist to `container_commodities` table

When saving from the workspace, map assigned cargo lines into `container_commodities` rows — writing `container_id`, `shipment_id`, `commodity_description`, `hs_code`, `hts_code`, `schedule_b_number`, `gross_weight_kg`, `value_usd`, and other relevant fields. On load, query `container_commodities` to restore assignments.

### 4. Wire into the shipment wizard submission

Update `NewShipmentWizard.tsx` so that when a shipment is booked, if there's only one container type, all cargo lines are auto-assigned to it and written to `container_commodities` alongside the existing `cargo` table inserts.

### Technical details

- **No schema changes needed** — `container_commodities` table already exists with all required columns and RLS policies.
- **Data model**: Each `container_commodities` row references a `container_id` and `shipment_id`. Multiple commodity lines per container are supported via `line_sequence`.
- **CargoLine type** in `shipment-dataset.ts` needs a new optional `containerId` field.
- **Reads**: Query `container_commodities` joined with containers when loading the workspace.
- **Writes**: Upsert on save; delete removed assignments.

### Files to modify

- `src/lib/shipment-dataset.ts` — add `containerId` to `CargoLine`
- `src/components/workspace/sections/CargoSection.tsx` — add container assignment dropdown per cargo line + container contents view
- `src/pages/NewShipmentWizard.tsx` — insert into `container_commodities` on booking
- `src/pages/ShipmentDetail.tsx` — fetch `container_commodities` and pass to workspace

