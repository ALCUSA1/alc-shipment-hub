

## Plan: Fix Messaging to Include Internal Company Members

### Problem
The Company Directory currently queries the `companies` table and filters out `c.user_id !== currentUserId`, which means:
1. You cannot message anyone within your own company
2. The directory only shows one entry per company (the owner), not individual team members

### Root Cause
The current data model ties each `companies` row to a single `user_id`. There is no multi-user-per-organization concept. The directory filter intentionally excludes your own records, preventing internal messaging.

### Solution
Restructure the Company Directory to show **all platform users** (from the `profiles` table), grouped or labeled by their company. This way you can message both:
- **Internal colleagues** — other users with the same `company_name` in their profile
- **External contacts** — users from other companies

### Changes

**1. `CompanyDirectoryDialog.tsx` — Query profiles instead of companies**
- Query the `profiles` table for `user_id, full_name, company_name`
- Remove the `c.user_id !== currentUserId` filter (keep self-exclusion but allow same-company users)
- Display each user as `Full Name · Company Name` instead of just company name
- Keep search filtering across both name and company
- Show a "Same Company" badge for users sharing your company name

**2. `Messages.tsx` — Update `handleSelectCompany` signature**
- Adapt the handler to accept profile-based data (`user_id`, `full_name`, `company_name`) instead of company-based data
- The conversation creation logic (duplicate check, participant insertion) stays the same since it already works with `user_id`

**3. `ConversationList.tsx` — Show person name instead of just company**
- Update the `otherName` field to prefer `full_name` over `company_name` so conversations show who you're actually talking to

**4. No database changes needed** — The `profiles` table already has an RLS policy allowing all authenticated users to view profiles (`Authenticated users can view profiles for messaging`).

### Technical Notes
- The `profiles` table is already publicly readable by authenticated users via existing RLS
- `conversation_participants` already stores `company_name` — we'll also store the user's `full_name` for display
- No migration required

