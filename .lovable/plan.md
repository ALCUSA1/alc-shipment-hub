

# Cogoport Feature Analysis — Workspace, Onboarding & User Management

## What the Screenshots Show

### 1. Workspace Switcher
- Users can belong to multiple organizations
- A workspace selector lets them switch between "Personal Workspace" and company workspaces
- Clean modal/page showing available workspaces

### 2. Organization Onboarding
- Post-signup flow to register a company
- Fields: Company Name, Country, Registration Number, Referral Code (optional)
- Organization type selection: **Importer/Exporter** (take logistics services) vs **Service Provider** (provide logistics services)
- "Skip for now" option — users can explore before committing
- Pending requests view for users joining existing orgs

### 3. User Profile & Management
- Personal info section with username, email, phone
- Password & Security section (change/reset password)
- Clean profile layout with sidebar navigation

## What Your Platform Already Has
- **SignUp page**: Collects name, email, password, company name, and role (Shipper/Forwarder/Carrier/Driver/Warehouse)
- **Account page**: Full profile with company details, FMC licensing, insurance, billing — very comprehensive
- **Auth system**: Email-based auth with role assignment and admin approval flow

## What We Can Implement

### A. Organization Onboarding Wizard (High Value)
A dedicated post-signup onboarding flow that guides new users through company setup step-by-step, rather than dumping them into the full Account page. Steps:
1. Company basics (name, country, registration number)
2. Organization type (maps to existing role system)
3. Optional referral code
4. Confirmation → redirect to dashboard

**Scope**: New `src/pages/Onboarding.tsx` page, triggered after first login when company profile is incomplete.

### B. Workspace Switcher
Allow users associated with multiple companies to switch context. Useful for forwarders managing multiple client accounts or users with both personal and company workspaces.

**Scope**: New workspace concept would require a `user_workspaces` table linking users to multiple companies, plus a switcher component in the sidebar. This is a larger architectural change.

### C. Enhanced Profile Page
Add a cleaner profile section with:
- Separate "Personal Information" card (name, email, phone)
- "Password & Security" card (change/reset password UI)
- Currently the Account page has this but it's buried in tabs

**Scope**: Refactor existing Account page layout.

## Recommendation

Features A (Onboarding Wizard) and C (Enhanced Profile) are practical to build now. Feature B (Workspace Switcher) requires significant schema changes and is better suited for a later phase.

### Implementation Plan

**Step 1 — Onboarding Page**
- Create `src/pages/Onboarding.tsx` with a clean, centered card layout
- Fields: Company Name, Country (reuse CountrySelector), Registration Number, Organization Type toggle
- On submit: upsert into `companies` table, then redirect to dashboard
- Add route in `App.tsx`, trigger redirect from `ProtectedRoute` when profile incomplete

**Step 2 — Profile Cleanup**
- Add a dedicated "Personal Information" section at the top of Account page
- Add a "Password & Security" card with change password functionality using `supabase.auth.updateUser`
- Keep existing company/compliance tabs but improve the layout hierarchy

**Step 3 — Skip for Now Flow**
- Allow users to skip onboarding and land on dashboard with a banner prompting them to complete setup
- Reuse existing `DashboardActionBanners` component

### Technical Details

| Feature | Files | DB Changes |
|---------|-------|-----------|
| Onboarding page | New `Onboarding.tsx`, edit `App.tsx`, edit `ProtectedRoute.tsx` | None — uses existing `companies` + `profiles` tables |
| Profile cleanup | Edit `Account.tsx` | None |
| Skip flow | Edit `DashboardActionBanners.tsx` | None |

No database migrations needed — all features work with existing schema.

