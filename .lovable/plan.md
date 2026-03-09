

## Current State of US Customs Filing

Here is how your customs process currently works:

### What exists today

1. **Data capture only** — The `ComplianceSection` in the shipment workspace collects AES/EEI fields (USPPI name, EIN, AES citation, ITN, ECCN, export license, destination country) and stores them locally in the shipment dataset. These are **not** submitted anywhere electronically.

2. **`customs_filings` table** — A database table stores filing records with fields for exporter info, consignee, HTS codes, ports, vessel/voyage, broker info, and status (draft → submitted → itn_received → accepted → rejected). But there is **no edge function or API integration** that actually submits this data to US Customs.

3. **`customs_milestones` table** — Tracks the lifecycle of a filing (timestamps for each status change). Currently only populated manually or by hypothetical future integrations.

4. **`CustomsFilingPanel`** — A read-only display component on the shipment detail page that shows filing status, HTS codes, broker info, and milestones. No "Submit to Customs" action exists.

5. **No AES/ACE API integration** — The `e2open-sync` edge function handles carrier booking/tracking only. There is no connection to CBP's ACE (Automated Commercial Environment) system or any AES filing service.

### The gap

The entire flow is **data-in, no data-out**. Compliance fields are captured but never electronically transmitted. There is no "File AES" button, no API call to a customs broker or ACE portal, and no automated ITN receipt.

---

## How Electronic AES Filing Works

US exporters must file Electronic Export Information (EEI) via the **Automated Export System (AES)**, which is part of CBP's **ACE** portal. Direct ACE/AES API access requires certification as an approved filer. For most freight forwarders, the practical approach is to integrate with a **licensed AES filing service provider** that acts as a gateway:

- **Descartes CustomsInfo / AESDirect** — The original Census Bureau system, now operated by Descartes
- **Descartes OneView** — Full trade compliance platform with AES filing API
- **e2open Global Trade** — Already partially integrated in your platform
- **Expeditors / third-party broker APIs** — Some customs brokers offer filing APIs

---

## Recommended Integration Approach

Since you already have the `e2open-sync` edge function and the `customs_filings` table with all the required fields, the most practical path is to build an **AES filing edge function** that:

1. **Assembles the EEI/AES payload** from shipment + customs_filings data (exporter, consignee, HTS codes, vessel, ports)
2. **Submits to an AES filing provider API** (e.g., Descartes AESDirect API or similar)
3. **Receives the ITN** back and updates the `customs_filings` record
4. **Logs milestones** in `customs_milestones` (submitted, itn_received, accepted/rejected)
5. **Adds a "File AES" button** to the `CustomsFilingPanel` that triggers the submission

### What needs to be built

| Component | Work |
|-----------|------|
| **`submit-aes-filing` edge function** | Assembles EEI payload from `customs_filings` + `shipments` + `cargo` data, calls the AES provider API, updates filing status and ITN |
| **AES provider webhook handler** | Receives async responses (ITN, acceptance, rejection) and updates `customs_filings` + `customs_milestones` |
| **Auto-populate customs_filings** | When a shipment reaches "booked" status, automatically create a `customs_filings` draft record pre-filled from shipment data (exporter, consignee, ports, vessel, HTS from cargo) |
| **"File AES" button on CustomsFilingPanel** | Triggers the edge function submission, shows loading state, displays ITN when received |
| **Filing status tracking** | Real-time updates on the panel showing draft → submitted → itn_received → accepted |
| **Admin visibility** | Admin compliance page shows all pending/submitted filings across all shipments |

### API key requirement

You will need an API key from your chosen AES filing provider. This would be stored as a secret (e.g., `AES_PROVIDER_API_KEY`) and used by the edge function. Before we build this, you need to decide which AES filing service to integrate with.

### No database changes needed

The existing `customs_filings` and `customs_milestones` tables already have the right schema for this workflow. We just need the edge function + UI button + auto-population logic.

