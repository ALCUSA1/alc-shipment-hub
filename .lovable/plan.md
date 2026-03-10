

## Plan: Persistent Chat Drawer — Always-Available Messaging Without Leaving Your Page

### The Problem
Right now, Messages is a full-page route (`/dashboard/messages`). When you click it, your current work disappears. If you're reviewing a shipment detail and a customer messages you, you have to navigate away, respond, then navigate back. That breaks your workflow.

### Solution: Floating Chat Drawer

A **persistent, collapsible chat panel** that lives in the `DashboardLayout` — available on every page without navigating away.

**How it works:**

1. **Chat Icon Button** — A floating button (bottom-right corner or in the top header bar next to the notification bell) shows total unread count. Click to expand/collapse the chat drawer.

2. **Chat Drawer** — A slide-out panel (right side, ~380px wide) that overlays the current page content. Contains:
   - The conversation list (with Internal/External tabs, exactly as built)
   - The chat panel (message thread + input)
   - A "Pop Out" button to go full-screen (`/dashboard/messages`) if the user wants the full view

3. **Always Present** — The drawer component lives in `DashboardLayout`, not in a specific route. It renders on every dashboard page — shipments, quotes, trucking, etc.

4. **Non-Disruptive** — The drawer slides over content rather than pushing it. Users can open it, reply to a message, close it, and they're exactly where they were. No page navigation, no lost context.

5. **Keep Full Page Too** — The `/dashboard/messages` route remains for users who want a dedicated full-screen messaging experience. The sidebar link opens the full page; the floating button opens the drawer.

### Technical Approach

**New Components:**
- **`ChatDrawer.tsx`** — A sheet/drawer component wrapping the existing `ConversationList` and `ChatPanel` components. Uses the `Sheet` component from the UI library (slides from the right).
- **`ChatFloatingButton.tsx`** — Floating action button with unread badge. Placed in the `DashboardLayout` header or as a fixed-position button.

**Modified Files:**
- **`DashboardLayout.tsx`** — Add `ChatDrawer` and `ChatFloatingButton` as siblings to the main content area. Manage open/close state here.
- **`Messages.tsx`** — Stays as-is for the full-page experience. No changes needed.

**State Management:**
- Drawer open/close state lives in `DashboardLayout`
- Conversation data queries are shared (same React Query keys) — opening the drawer doesn't re-fetch if the full page already loaded data, and vice versa
- Unread count query runs independently to keep the badge updated

**Layout Structure:**
```text
┌──────────────────────────────────────────────┐
│  Sidebar  │  Header  [🔔] [💬 3]            │
│           │──────────────────────┬───────────│
│           │                     │ Chat      │
│           │  Current Page       │ Drawer    │
│           │  (Shipment Detail,  │ (slides   │
│           │   Quotes, etc.)     │  in/out)  │
│           │                     │           │
│           │                     │           │
└──────────────────────────────────────────────┘
```

### What This Achieves
- You're on Shipment Detail reviewing SHP-2026-014 → message comes in → click the chat icon → drawer slides open → reply → close → you're still on SHP-2026-014
- Unread badge always visible so you never miss a message
- No workflow disruption, no page navigation for quick replies
- Full-page Messages still available when you want the immersive view

