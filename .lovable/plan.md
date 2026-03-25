

## Recommendation: Unified Alerts & Reminders Hub

### Current State

Right now, alerts are scattered across the platform:
- **Rate Alerts** (`rate_alerts` table) — set from Rate Trends page and Carrier Rate Selector, threshold-based price alerts
- **Sailing Reminders** (`sailing_reminders` table) — set from Sailing Intelligence Board bell icon, date/price range with scheduled remind_at
- Both notify via in-app notifications + email, but there is **no single place** to view, manage, edit, or create all alerts

### What to Build

A dedicated **"My Alerts"** page accessible from the sidebar that unifies both alert types into one management hub.

### Page Structure

```text
┌─────────────────────────────────────────────┐
│  🔔 My Alerts                  [+ New Alert]│
├──────────┬──────────┬───────────────────────-│
│ All (12) │ Rate (5) │ Sailing (7)            │
├──────────┴──────────┴───────────────────────-│
│                                              │
│  ┌─ Rate Alert Card ───────────────────────┐ │
│  │ CNSHA → USLAX  |  40HC  |  < $2,500    │ │
│  │ Carrier: Any  |  Status: Active (green) │ │
│  │              [Edit] [Pause] [Delete]    │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─ Sailing Reminder Card ─────────────────┐ │
│  │ MSC — CNSHA → USLAX                    │ │
│  │ Dates: Mar 25 – Apr 8  |  $2k – $2.8k  │ │
│  │ Remind: Mar 28 9:00 AM | ✅ Triggered   │ │
│  │              [Edit] [Re-arm] [Delete]   │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  Empty state: "No alerts yet. Set rate or   │
│  sailing alerts to get notified."            │
└─────────────────────────────────────────────┘
```

### Key Features

1. **Tabbed view** — All / Rate Alerts / Sailing Reminders
2. **Create new** — "+ New Alert" button opens a choice between Rate Alert or Sailing Reminder, then the respective dialog
3. **Status indicators** — Active (green), Paused (gray), Triggered (blue), Expired (red)
4. **Quick actions** — Edit, Pause/Resume, Re-arm (for triggered reminders), Delete
5. **Filters** — by route, status, date range
6. **Alert history** — show triggered alerts with the notification that was sent

### Technical Plan

| Step | Details |
|------|---------|
| **New route** | `/alerts` — add to sidebar under existing nav items |
| **New page** | `src/pages/Alerts.tsx` — fetches from both `rate_alerts` and `sailing_reminders` tables |
| **Sidebar update** | Add "Alerts" item with bell icon + active count badge to `AppSidebar.tsx` |
| **Reuse existing dialogs** | `RateAlertDialog` for rate alerts, `SailingReminderButton` dialog extracted into standalone `SailingReminderDialog` |
| **Edit capability** | Add edit mode to both dialogs (currently create-only) |
| **Pause/Resume** | Toggle `is_active` on `rate_alerts`; add `is_active` column to `sailing_reminders` via migration |
| **Re-arm** | Reset `is_triggered` and set new `remind_at` for expired sailing reminders |
| **Route registration** | Add to `App.tsx` router |

### Why This Makes Sense

- Users currently have no way to see what alerts they've set without going back to the exact page where they created them
- A central hub lets users manage everything in one place — like how Google Flights shows "Tracked Prices"
- It naturally extends both existing systems without replacing them — the inline bell buttons and "Set Rate Alert" actions still work, they just feed into this central view

### No Database Schema Changes Required (except one small addition)

- Add `is_active` boolean column to `sailing_reminders` (defaulting to `true`) to support pause/resume

