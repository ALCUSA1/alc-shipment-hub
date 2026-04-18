
The user wants to block signups from free/personal email providers (gmail, hotmail, outlook, yahoo, etc.) to reduce fraud and enforce business email usage. This is a common B2B SaaS pattern.

**Approach:** Defense in depth — block at both layers:
1. **Client-side** (`SignUp.tsx` + `StartShipmentModal.tsx`): Inline validation with friendly error before calling Supabase. Fast feedback, no wasted auth calls.
2. **Server-side** (DB trigger on `auth.users` via `handle_new_user` or a dedicated `before insert` validation): Authoritative — prevents bypass via direct API calls.

**Free email blocklist:** Maintain a curated list of ~40 common providers (gmail, yahoo, hotmail, outlook, live, msn, aol, icloud, me, mac, protonmail, proton, gmx, mail, yandex, zoho, tutanota, fastmail, hey, qq, 163, 126, naver, hanmail, daum, web.de, t-online.de, free.fr, orange.fr, libero.it, hushmail, inbox, rediffmail, ymail, rocketmail, etc.).

Store the list in a small DB table `blocked_email_domains` (admin-editable later) rather than hardcoding — so admins can add/remove without code changes. Seed it with the initial list.

**Plan**
