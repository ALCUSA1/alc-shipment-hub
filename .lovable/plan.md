

# US Port Terminal Schedule API Integration

## The Reality of Terminal-Level APIs

Unlike carrier APIs (Evergreen), US port terminals do **not** have a single unified API. Each terminal operator runs its own system. Here is what is available for your target ports:

### Available Data Sources

| Port Complex | Terminal Operator | API Access | How to Get It |
|---|---|---|---|
| **LA** | APM Terminals (Pier 400) | REST API with vessel schedule, container events, import availability | Sign up at `developer.apmterminals.com` — free tier available |
| **Long Beach** | LBCT | APIs available for drayage/vessel data | Contact LBCT directly |
| **Long Beach** | SSA Terminals (Pier A/C/E/J) | Web portal, no public API | Scrape or manual |
| **NY/NJ** | APM Terminals (Port Elizabeth) | Same API store as LA | Same `developer.apmterminals.com` account |
| **NY/NJ** | Maher Terminals | Web portal only | Scrape or manual |
| **Houston** | Port Houston (Barbours Cut / Bayport) | Lynx API — vessel schedule, booking, container status | Request access at `porthouston.com/toolbox/container-terminals/data-integration/` |
| **Savannah** | GPA Garden City Terminal | WebAccess portal — vessel schedule is public HTML | Scrape `gaports.com` or contact GPA for API access |

### Recommended Approach: Two-Layer Strategy

**Layer 1 — APM Terminals API (immediate, covers LA + NY/NJ)**
- Free developer account at `developer.apmterminals.com`
- Provides: Terminal Vessel Schedule, Import Availability, Container Event History
- Covers APM-operated terminals in LA (Pier 400) and NY/NJ (Port Elizabeth)

**Layer 2 — Port Houston Lynx API (apply for access)**
- Request API credentials from Port Houston
- Provides: vessel schedule, container tracking, booking inquiry
- Requires approval (typically 1-2 weeks)

**Layer 3 — Savannah GPA (scrape or request)**
- Public vessel schedule HTML at `gaports.com`
- Can be scraped on a schedule using Firecrawl or a simple edge function
- Contact GPA for formal API access

## What I Would Build

### Database (new table)
- `terminal_schedules` — stores normalized terminal vessel call data (terminal code, vessel name/IMO, berth, ETA, ATA, ETD, ATD, begin receive date, cutoff date, carrier, service)
- Links to existing `ports` table via UN/LOCODE

### Edge Functions
1. `terminal-schedule-apm` — polls APM Terminals API for LA and NY/NJ vessel schedules, normalizes into `terminal_schedules`
2. `terminal-schedule-houston` — polls Port Houston Lynx API for Barbours Cut and Bayport schedules
3. `terminal-schedule-scrape` — uses Firecrawl to scrape Savannah GPA vessel schedule page, parses into `terminal_schedules`

### UI
- Add "Terminal Schedule" tab to existing Commercial Schedules page
- Show vessel calls by terminal with berth assignments, receive windows, and cutoff dates
- Filter by port, terminal, date range

## Immediate Next Steps for You

1. **APM Terminals**: Go to `https://developer.apmterminals.com` → Sign up → Get API key → Share the key with me
2. **Port Houston**: Go to `https://porthouston.com/toolbox/container-terminals/data-integration/` → Request API Access → They will provide credentials
3. **Savannah GPA**: I can start scraping the public vessel schedule immediately, or you can contact GPA for formal API access

Once you have at least the APM Terminals API key, I will build the full integration pipeline.

