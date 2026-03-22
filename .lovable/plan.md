

## Remove Portal from Sidebar

The user correctly identifies that the Portal page duplicates information already available through the Shipments, Quotes, Documents, and Accounting pages. The Portal should be removed from the sidebar navigation.

### Changes

1. **Remove "Portal" from sidebar navigation** (`src/components/dashboard/AppSidebar.tsx`)
   - Delete the `{ title: "Portal", url: "/dashboard/portal", icon: Globe }` entry from the Overview nav group
   - Remove the unused `Globe` icon import

2. **Keep the route and page intact** — The `/dashboard/portal` route and `CustomerPortal.tsx` page will remain in the codebase but simply won't be linked from the sidebar. This avoids breaking any external links or bookmarks.

### What stays accessible where
- **Shipments tracking** → Shipments page (already has search, filters, status badges, detail links)
- **Quotes** → Quotes page
- **Documents** → Documents page
- **Payments/Invoices** → Accounting page

