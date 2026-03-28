

## Plan: Return User to Booking After Login

### Problem
When an unauthenticated user clicks "Book Now" on a rate, they're redirected to `/login`. After login, they're sent to their default dashboard — losing the rate they wanted to book.

### Changes

**1. `src/components/rate-search/RateResultsPanel.tsx`**
- Before redirecting to `/login`, save the full rate selection object to `sessionStorage` under key `pendingBooking`
- Pass a `returnTo` query param: `navigate("/login?returnTo=/rates")`

**2. `src/pages/Login.tsx`**
- Import `useSearchParams` to read `returnTo` query param
- After successful login, if `returnTo` exists, navigate there instead of the role-based route
- This brings user back to `/rates`

**3. `src/pages/RateSearch.tsx`**
- On mount, check if user is authenticated AND `sessionStorage` has `pendingBooking`
- If yes, retrieve the stored rate selection, call `createShipmentDraft()`, then redirect to `/dashboard/shipments/:id/workspace`
- Clear `sessionStorage` after processing
- Show a brief loading state during this auto-booking

### Result Flow
1. User clicks "Book Now" → rate saved to sessionStorage → redirect to `/login?returnTo=/rates`
2. User logs in → redirected to `/rates` (not dashboard)
3. Rate search page detects pending booking → auto-creates shipment draft → redirects to workspace
4. User continues booking seamlessly

