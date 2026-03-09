

## Streamline Login: Unified Login Page

### Current State
The platform has **3 separate login pages**:
- `/login` — Shipper portal
- `/admin/login` — Admin console
- `/trucking/login` — Carrier portal

All use the same authentication backend. The only difference is post-login routing and role validation. This is confusing for users who don't know which login page to use.

### Plan

**Replace the 3 login pages with a single unified login at `/login`** that automatically routes users to the correct portal based on their role after sign-in.

#### 1. Update Login page (`src/pages/Login.tsx`)
- After successful `signInWithPassword`, call `get_user_roles` RPC to fetch the user's roles
- Route based on role priority:
  - `admin` → `/admin`
  - `trucker` → `/trucking`
  - Any other role (ops_manager, sales, viewer) or no roles → `/dashboard`
- Keep the existing forgot-password flow
- Update the visual design to be portal-neutral (remove "Shipper Portal" branding, use generic "ALC Logistics" branding)

#### 2. Update gate components to redirect to unified `/login`
- `AdminGate.tsx`: Change redirect from `/admin/login` → `/login`
- `TruckingGate.tsx`: Change redirect from `/trucking/login` → `/login`
- `ProtectedRoute.tsx` and `RoleGate.tsx`: Already redirect to `/login` (no change)

#### 3. Update `ResetPassword.tsx`
- After password update, use the same role-based routing logic (already partially done)

#### 4. Clean up routes in `App.tsx`
- Remove `/admin/login` and `/trucking/login` routes
- Keep the old URLs temporarily redirecting to `/login` for bookmarked links (optional)

#### 5. Update `TruckingLogin.tsx` redirect
- Either delete the file or make it redirect to `/login`

#### 6. Update cross-references
- `SignUp.tsx` and marketing nav links already point to `/login` — no change needed
- `TruckingLogin.tsx` had a "Shipper login" link → no longer needed
- `AdminLogin.tsx` can be removed

### Files to modify
- `src/pages/Login.tsx` — Add role-based post-login routing, neutral branding
- `src/components/admin/AdminGate.tsx` — Redirect to `/login`
- `src/components/trucking/TruckingGate.tsx` — Redirect to `/login`
- `src/App.tsx` — Remove old login routes, add redirects
- `src/pages/ResetPassword.tsx` — Ensure consistent role routing (minor update)

### Files to remove (or convert to redirects)
- `src/pages/admin/AdminLogin.tsx`
- `src/pages/trucking/TruckingLogin.tsx`

