

## Provider Decisions

| Capability | Provider | Status |
|-----------|----------|--------|
| **Container Tracking** | Terminal49 | ✅ Integrated — awaiting API key |
| **AES / Customs Filing** | ZeusLogics | ✅ Integrated — awaiting API key |
| **Direct Carrier APIs** | Maersk, CMA CGM, MSC, Hapag-Lloyd | Fallback (optional) |

## Architecture

### Tracking (Terminal49 → Direct Carrier fallback)
- `track-shipment`: Terminal49 first (100+ carriers via unified API), falls back to direct carrier APIs
- `carrier-sync`: Terminal49 for booking sync, cutoffs, documents; falls back to direct carrier endpoints
- `aes-webhook`: Dual-purpose — handles both ZeusLogics AES responses AND Terminal49 container event webhooks

### Customs Filing (ZeusLogics)
- `submit-aes-filing`: Assembles EEI payload from customs_filings data, submits to ZeusLogics ACE/AES API
- Webhook URL is automatically passed to ZeusLogics on submission for async ITN/acceptance/rejection callbacks

### Secrets Required
- `TERMINAL49_API_KEY` — from Terminal49 dashboard
- `ZEUSLOGICS_API_KEY` — from ZeusLogics account
- `ZEUSLOGICS_WEBHOOK_SECRET` (optional) — for webhook signature validation
- `TERMINAL49_WEBHOOK_SECRET` (optional) — for webhook signature validation

### Fallback Chain
```
Tracking: Terminal49 → Direct Carrier API → Manual entry
AES Filing: ZeusLogics → Manual filing via AESDirect
```

### What stays the same
- All existing database tables, RLS policies, and tracking_events schema
- The milestone-to-status mapping logic
- The AI summary and smart banners (they consume the same data regardless of source)
- The bulk tracking cron mode
- Auto-create customs filing trigger on booking
