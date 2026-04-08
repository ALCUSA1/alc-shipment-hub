

# Remove Signup Approval Process — Direct Role Assignment

## Summary

Remove the entire signup approval workflow. When users register, they get their role assigned immediately and can access the platform right after email verification. No admin review, no waiting screen.

## Changes

### 1. New Edge Function: `assign-signup-role`
- Accepts `user_id` and `role` (validated against allowed signup roles: `viewer`, `forwarder`, `trucker`, `warehouse`)
- Uses `service_role` key to insert directly into `user_roles` table (bypasses RLS)
- Called immediately after `supabase.auth.signUp()` succeeds

### 2. Update `src/pages/SignUp.tsx`
- Replace `signup_requests` insert with a call to `assign-signup-role` edge function
- Change success message from "Your account will be reviewed" to "Check your email to verify, then log in"
- Remove the "reviewed by our team" text at the bottom

### 3. Update `src/components/marketing/StartShipmentModal.tsx`
- Replace `signup_requests` insert with same `assign-signup-role` call (role = `viewer`)
- Update toast message to remove approval language

### 4. Update `src/lib/role-routing.ts`
- Remove the `signup_requests` check that redirects to `/pending-approval`
- Users with no roles simply go to `/dashboard`

### 5. Update `src/App.tsx`
- Remove the `/pending-approval` route

### 6. Keep but don't use
- `PendingApproval.tsx` — file stays (no harm), just unlinked from routing
- `signup_requests` table — historical data preserved, just stop writing to it
- `approve-signup` edge function — kept for potential manual admin use
- `PendingApprovalsPanel.tsx` — admin can still see old requests

## Flow After Changes

```text
User signs up → Role assigned instantly → Email verification → Login → Routed to correct portal
```

