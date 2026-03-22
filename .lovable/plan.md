

# Spark: Inter-Company Connectivity Features

## Overview
Add four major features to the Spark platform to enable companies to discover, connect, transact, and build trust with each other.

## New Database Tables

### 1. `partnership_requests`
Tracks connection requests between companies (like LinkedIn connections).
- `id`, `requester_company_id`, `target_company_id`, `requester_user_id`, `status` (pending/accepted/declined), `message`, `created_at`, `responded_at`

### 2. `rfq_posts`
Marketplace for Request for Quotes where companies post logistics needs and others can bid.
- `id`, `user_id`, `company_id`, `company_name`, `title`, `description`, `origin`, `destination`, `cargo_type`, `container_type`, `deadline`, `status` (open/closed/awarded), `awarded_to`, `created_at`

### 3. `rfq_bids`
Responses/bids on RFQ posts.
- `id`, `rfq_id`, `bidder_user_id`, `bidder_company_id`, `bidder_company_name`, `amount`, `currency`, `transit_days`, `notes`, `status` (submitted/accepted/rejected), `created_at`

### 4. `company_reviews`
Post-transaction trust scores and reviews.
- `id`, `reviewer_user_id`, `reviewer_company_id`, `reviewed_company_id`, `rating` (1-5), `title`, `content`, `transaction_type`, `created_at`

### 5. `spark_events`
Events, webinars, trade shows, and announcements.
- `id`, `user_id`, `company_id`, `company_name`, `title`, `description`, `event_type` (webinar/trade_show/announcement/networking), `event_date`, `location`, `is_virtual`, `rsvp_link`, `created_at`

### 6. `spark_event_rsvps`
RSVP tracking for events.
- `id`, `event_id`, `user_id`, `company_name`, `created_at`

All tables will have RLS policies allowing authenticated users to read, and owners to manage their own records.

## UI Changes (all in `src/pages/Spark.tsx`)

### Tab Structure Update
Add new tabs to the main Spark navigation alongside "My Page" and "Explore":
- **Marketplace** — RFQ board
- **Events** — Event & announcement board

### Feature 1: Partnership Requests
- **On other company pages**: Replace the static "Connect" button in `BrandHero` with a functional partnership request system (Send Request / Pending / Connected states)
- **On own page sidebar**: Add a "Partners" card showing accepted connections count and avatars
- **Connection badge**: Show "Partner" badge on connected company cards in the directory

### Feature 2: RFQ Marketplace
- New `MarketplaceTab` component with:
  - Post RFQ form (origin, destination, cargo type, container type, deadline, description)
  - Filterable/searchable list of open RFQs
  - Bid submission dialog with amount, transit days, and notes
  - RFQ detail view showing all bids (visible to poster only)
  - Status management (open/closed/awarded)

### Feature 3: Company Reviews & Ratings
- **On company profile sidebar**: Add "Reviews" card showing average rating (stars) and review count
- **Review form**: Dialog to submit a rating (1-5 stars), title, content, and transaction type
- **Reviews list**: Chronological display of reviews with reviewer company info
- Only allow reviews from companies that are partners (accepted partnership)

### Feature 4: Event & Announcement Board
- New `EventsTab` component with:
  - Create event form (title, description, type, date, location, virtual toggle, RSVP link)
  - Card grid of upcoming events sorted by date
  - RSVP button with attendee count
  - Filter by event type
  - On company profile: show upcoming events from that company in sidebar

## Technical Details

- **6 new database tables** via migration with appropriate RLS policies
- **All UI components** built inline in `Spark.tsx` following existing patterns (motion animations, Card components, Avatar, Badge)
- **Realtime**: Add `partnership_requests` and `rfq_posts` to supabase_realtime publication for live updates
- **No new files** needed — extends the existing Spark page architecture

