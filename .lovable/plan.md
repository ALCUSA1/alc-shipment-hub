

## Fix Documents Page: Add Category-Based Organization

### Problem
The Documents page currently shows a flat grid of document cards with no categorization. Users need documents organized by category for quick navigation.

### Categories
Based on the uploaded reference and existing doc types in the codebase:

| Category | Doc Types |
|----------|-----------|
| **Invoicing** | `commercial_invoice` |
| **Bills of Lading & Waybills** | `bill_of_lading`, `seaway_bill`, `mawb`, `hawb` |
| **Insurance & Company** | `insurance_certificate`, `known_shipper_declaration`, `certificate_of_origin`, `cargo_manifest` |
| **AES / Customs** | `customs_declaration`, `aes_filing`, `dg_declaration_air` |
| **Shipping Instructions** | `packing_list`, `shipper_letter_of_instruction`, `dock_receipt` |

### Changes

**`src/pages/Documents.tsx`** — Full redesign:
- Define a `DOC_CATEGORIES` mapping that groups doc types into named categories with icons
- Add tab-based or accordion-based category navigation at the top
- Filter documents by selected category
- Add a count badge per category showing how many documents exist
- Add a human-readable label map (reuse `DOC_TYPE_LABELS` from `DocumentChecklist.tsx`)
- Include an "All" tab to show everything (default view)

### Technical details
- Extract `DOC_TYPE_LABELS` into a shared constant in `src/lib/document-types.ts` so both `DocumentChecklist` and `Documents` page can use it
- Use existing `Tabs` component from the UI library for category switching
- No database or schema changes needed — categorization is purely client-side grouping by `doc_type`

### Files to create
- `src/lib/document-types.ts` — shared labels and category mapping

### Files to modify
- `src/pages/Documents.tsx` — add category tabs and grouped display
- `src/components/shipment/DocumentChecklist.tsx` — import labels from shared file
- `src/pages/admin/AdminDocuments.tsx` — import doc type labels from shared file

