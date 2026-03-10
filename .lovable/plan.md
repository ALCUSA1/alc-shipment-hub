

## Plan: Internal vs External Messaging Channels

### Current State
The messaging system treats all conversations identically — there's no distinction between messaging a colleague within your company and messaging someone at a different company. The directory shows all users in a flat list.

### Design Proposal

**Two-tab conversation model**: Split the conversation list and directory into **Internal** (same company) and **External** (cross-company) channels.

### How It Works

**1. Conversation List — Two Tabs**
- Add "Internal" and "External" tabs at the top of the `ConversationList` sidebar
- **Internal**: Shows conversations where the other participant has the same `company_name` as you
- **External**: Shows conversations where the other participant has a different `company_name`
- Each tab shows its own unread count badge

**2. Company Directory — Context-Aware**
- When on the Internal tab and clicking "New Message", the directory only shows teammates (same `company_name`)
- When on the External tab, the directory only shows users from other companies
- Internal directory shows user names + roles (e.g., "Jane Smith · Operations Manager")
- External directory shows user names + company names (e.g., "John Doe · Acme Logistics")

**3. Visual Differentiation**
- Internal conversations get a subtle team/people icon indicator
- External conversations get a building/globe icon indicator
- Chat header shows "Internal" or "External" label badge next to the contact name
- External chats show the company name under the contact name in the header

**4. Conversation Metadata**
- Add a `scope` column (`internal` | `external`) to the `conversations` table
- Set automatically when creating a conversation based on whether the participants share a `company_name`
- This makes filtering fast and avoids re-computing on every load

### Database Changes
One migration:
- `ALTER TABLE conversations ADD COLUMN scope text NOT NULL DEFAULT 'external'`
- Backfill existing conversations by checking participant company names

### File Changes
- **`ConversationList.tsx`**: Add Internal/External tabs, filter conversations by `scope`
- **`CompanyDirectoryDialog.tsx`**: Accept a `scope` prop to filter the directory accordingly
- **`ChatPanel.tsx`**: Show scope badge and company name in header for external chats
- **`Messages.tsx`**: Track active tab state, pass scope to directory and conversation list, set scope when creating new conversations
- **Migration**: Add `scope` column to `conversations`

### UX Flow
1. User opens Messages — sees two tabs: **Internal** | **External**
2. Clicks "Internal" → sees only conversations with teammates → "New Message" shows only teammates
3. Clicks "External" → sees only cross-company conversations → "New Message" shows only external contacts
4. Conversation scope is locked at creation time and displayed in the chat header

