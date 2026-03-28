

## Plan: Full AES Filing Submission Form with Editable Fields

### What the PDF Shows vs What We Have

The real AES filing (from uploaded PDF) has these sections that the current system is missing or not capturing:

**Missing from DB schema** (need migration):
- `filing_option` (e.g., "2 - PREDEPARTURE")
- `xtn` (External Transaction Number)
- `usppi_address` (full USPPI address)
- `state_of_origin` (e.g., "GA - GEORGIA")
- `method_of_transportation` (coded, e.g., "11 - VESSEL, CONTAINERIZED")
- `containerized` (boolean, vessel only)
- `carrier_id_code` (e.g., "HLCU")
- `shipment_reference_no`
- `entry_number`
- `hazardous_materials` (boolean)
- `in_bond_code` (e.g., "70")
- `routed_export_transaction` (boolean)
- `consignee_type` (e.g., "O - OTHER/UNKNOWN")
- `authorized_agent_name`
- `authorized_agent_address`
- `original_itn`

**Missing from HTS line items** (stored in `hts_codes` JSONB):
- `d_f` (Domestic/Foreign indicator)
- `shipping_weight_kg`
- `vin_product_number`
- `export_info_code` (e.g., "OS")
- `license_number` (e.g., "NLR")
- `license_code` (e.g., "C33")

### Changes

#### 1. Database Migration — Add missing AES columns
Add ~15 new nullable columns to `customs_filings` table to match the official EEI form structure. No existing data is affected.

#### 2. Rebuild CustomsFilingPanel as an Editable Form
**File: `src/components/shipment/CustomsFilingPanel.tsx`**

When filing status is `draft`, render a full editable form organized into sections matching the official AES layout:

- **Section 1: USPPI** — Name, EIN, Address (pre-filled from shipment parties)
- **Section 2: Exportation Details** — Date of exportation, filing option
- **Section 3: Transportation Reference No.**
- **Section 4: Ultimate Consignee** — Name, address, consignee type
- **Section 5: Authorized Agent** — Name, address
- **Section 6: State of Origin / FTZ**
- **Section 7: Country of Ultimate Destination**
- **Section 8: Method of Transportation** (dropdown with AES codes)
- **Section 9: Carrier / Conveyance Name**
- **Section 10: Port of Export** (with AES code)
- **Section 11: Port of Unlading**
- **Section 12: Containerized** (Yes/No for vessel)
- **Section 13: Carrier ID Code**
- **Section 14: Shipment Reference No.**
- **Section 15: Entry Number**
- **Section 16: Hazardous Materials** (Yes/No)
- **Section 17: In Bond Code**
- **Section 18: Original ITN**
- **Section 19: Routed Export Transaction** (Yes/No)
- **Section 20: Commodity Line Items** — Editable table with HTS, D/F, quantity, weight, VIN, value, export info code, license number, license code

Each field is an Input/Select with a "Save" button that updates the `customs_filings` record. The "File AES Electronically" button is only enabled when all required fields are filled (validation).

When status is `submitted`/`accepted`, show the current read-only view.

#### 3. Create AES Filing Form Component
**New file: `src/components/shipment/AesFilingForm.tsx`**

Dedicated form component using react-hook-form with sections matching the numbered AES layout. Includes:
- Auto-save on blur for individual fields
- Validation before submission (USPPI EIN format, required fields)
- Add/remove commodity line items
- Pre-filled from existing filing data

#### 4. Update Edge Function for New Fields
**File: `supabase/functions/submit-aes-filing/index.ts`**

Update the `auto_create` action to also populate new fields from shipment data (carrier SCAC code, containerized flag, etc.). Update the `submit` action to validate all required fields before accepting submission.

### Technical Details
- Migration adds columns as nullable to avoid breaking existing data
- The HTS line items remain in the `hts_codes` JSONB column but with expanded object structure
- Form validation ensures all 20 sections have required data before the "File AES" button activates
- The `auto_create_customs_filing` trigger function will also be updated to populate new fields

