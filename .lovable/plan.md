

## Role-Aware Signup with Admin Validation

### Problem
Currently, the signup page creates a generic user with no role. There is no way for someone to indicate they are a carrier, shipper, or warehouse operator during registration. More importantly, there is no validation — anyone could claim any role. In a real logistics operation, a shipper should not be able to masquerade as a carrier.

### Design

**Self-service signup with requested role + admin approval workflow.**

Users sign up and select what type of account they want. Their request goes into a "pending" state. An admin reviews and approves/rejects the request before the user gets portal access.

### Database Changes

**1. New `signup_requests` table** to hold pending role requests:

```sql
CREATE TABLE public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role app_role NOT NULL,
  company_name text,
  company_type text, -- e.g. 'trucking_company', 'shipper', 'warehouse'
  notes text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests" ON public.signup_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Users can insert their own requests
CREATE POLICY "Users can insert own requests" ON public.signup_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Admins can manage all requests
CREATE POLICY "Admins can manage all requests" ON public.signup_requests
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
```

### Frontend Changes

**2. Update Signup Page (`src/pages/SignUp.tsx`)**
- Add a role selector: "I am a..." with options: **Shipper**, **Carrier (Trucking)**, **Warehouse Operator**
- Add a company name field
- After successful auth signup, insert a row into `signup_requests` with `status = 'pending'`
- Show confirmation: "Your account is pending approval. You'll receive an email once approved."
- Store `requested_role` in user metadata so the profile trigger can reference it

**3. Create Pending Approval Page (`src/pages/PendingApproval.tsx`)**
- Shown when a user logs in but has no roles and has a pending signup request
- Displays: "Your account is under review. We'll notify you once approved."
- Option to log out

**4. Update Login routing (`src/pages/Login.tsx` / `src/lib/role-routing.ts`)**
- After login, if user has no roles, check `signup_requests` for their status
- If `pending` → redirect to `/pending-approval`
- If `rejected` → show rejection message
- If no request exists → redirect to `/dashboard` (legacy users without roles)

**5. Admin Approval UI (`src/pages/admin/AdminUsers.tsx`)**
- Add a new tab or section: "Pending Approvals"
- Show list of pending `signup_requests` with: name, email, requested role, company name, date
- Actions per request: **Approve** (assigns role to `user_roles` table, updates status) or **Reject** (with optional reason)
- Approval calls an edge function that assigns the role and sends a notification

**6. New Edge Function: `approve-signup` (`supabase/functions/approve-signup/index.ts`)**
- Accepts: `request_id`, `action` (approve/reject), optional `rejection_reason`
- Verifies caller is admin
- If approved: inserts into `user_roles`, updates `signup_requests.status = 'approved'`
- If rejected: updates status to `rejected` with reason

### User Flow

```text
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Sign Up    │────▶│ Verify Email │────▶│  Log In       │
│ (pick role) │     │              │     │               │
└─────────────┘     └──────────────┘     └───────┬───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │ Has roles?    │
                                          └───┬───────┬───┘
                                          Yes │       │ No
                                    ┌─────▼──┐  ┌────▼─────────┐
                                    │ Portal │  │ /pending-    │
                                    │ (role- │  │  approval    │
                                    │  based)│  │              │
                                    └────────┘  └──────────────┘
                                                       ▲
                                                Admin approves
                                                       │
                                          ┌────────────┴───┐
                                          │ Admin Console  │
                                          │ Reviews &      │
                                          │ Approves/      │
                                          │ Rejects        │
                                          └────────────────┘
```

### Files to Create
- `src/pages/PendingApproval.tsx` — waiting screen for unapproved users
- `supabase/functions/approve-signup/index.ts` — admin approval edge function

### Files to Modify
- `src/pages/SignUp.tsx` — add role selector, company name, insert signup request
- `src/lib/role-routing.ts` — check signup request status for users with no roles
- `src/pages/admin/AdminUsers.tsx` — add pending approvals section
- `src/App.tsx` — add `/pending-approval` route

### Migration
- Create `signup_requests` table with RLS policies

