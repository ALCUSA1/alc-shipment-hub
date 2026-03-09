

## Plan: Real-Time Messaging Platform with Company Directory

### What We're Building
A platform-wide real-time messaging system where any company can discover and message any other company on the platform — customers, warehouses, truckers, carriers, shippers — with file attachments and an open directory for discovery.

### Database Schema

**1. `conversations` table** — represents a chat between two or more companies
- `id`, `created_at`, `updated_at`, `type` (direct | group), `title` (nullable, for group chats)

**2. `conversation_participants` table** — maps users/companies to conversations
- `id`, `conversation_id` → conversations, `user_id`, `company_name`, `joined_at`, `last_read_at`

**3. `messages` table** — individual messages with realtime enabled
- `id`, `conversation_id` → conversations, `sender_id`, `sender_name`, `content` (text), `attachments` (jsonb array of `{name, url, type}`), `created_at`
- Realtime enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages`

**4. `company_directory` view** — a read-only view over the `companies` table exposing `id, company_name, company_type, city, state, country, industry` for open discovery (no sensitive fields)

**5. Storage bucket** — `chat-attachments` (private) for file uploads in messages

**6. RLS Policies**
- Conversations: participants can SELECT; users can INSERT new ones
- Messages: participants of the conversation can SELECT and INSERT
- Participants: users can see conversations they belong to

### UI Components

**1. Messages Page (`/dashboard/messages`)**
- Left panel: conversation list with search, unread badges, last message preview
- Right panel: active chat with message bubbles, file attach button, real-time updates via Supabase Realtime channel subscription
- Top bar: "New Message" button that opens the company directory picker

**2. Company Directory Dialog**
- Searchable list of all companies on the platform (from `company_directory` view)
- Filter by type (customer, consignee, trucking, warehouse)
- Click to start a new conversation or open existing one

**3. Sidebar Integration**
- Add "Messages" nav item with `MessageSquare` icon under the Overview group
- Show unread count badge on the icon

### Technical Approach

- **Realtime**: Subscribe to `postgres_changes` on `messages` table filtered by conversation IDs the user participates in
- **Unread tracking**: Compare `last_read_at` on `conversation_participants` vs latest message `created_at`
- **File attachments**: Upload to `chat-attachments` storage bucket, store URLs in message `attachments` jsonb
- **New conversation**: Check if a direct conversation already exists between two users before creating a duplicate

### Files to Create/Modify
- **New**: `src/pages/Messages.tsx`, `src/components/messages/ConversationList.tsx`, `src/components/messages/ChatPanel.tsx`, `src/components/messages/CompanyDirectoryDialog.tsx`, `src/components/messages/MessageBubble.tsx`
- **Modify**: `src/App.tsx` (add route), `src/components/dashboard/AppSidebar.tsx` (add nav item)
- **Database**: 1 migration for tables, RLS, realtime, and storage bucket

