

## Making Spark More Enticing

Spark already has strong bones — feed, directory, marketplace, events, reviews, partnerships. The gap is **engagement polish and discoverability**. Here's what to add:

### 1. Spark Landing/Welcome Banner
Replace the plain "Sparkles + Spark" header with a dynamic welcome section when on "My Page" tab:
- Gradient banner with stats: "X companies in network · Y active RFQs · Z upcoming events"
- Quick-action buttons: "Post Update", "Browse RFQs", "Find Partners"
- Animated entrance with framer-motion

### 2. Trending/Activity Sidebar Widget
Add a "Trending on Spark" card to the right sidebar showing:
- Latest 3 RFQs with origin → destination routes
- Upcoming event count
- "Hot" posts (most liked in last 7 days)
This gives the page life even when a user's own feed is empty.

### 3. Empty State Upgrades
Current empty states are bland gray icons. Upgrade to:
- Illustrated empty states with actionable CTAs ("Create your first RFQ", "Post your first update")
- Animated icons with subtle pulse/bounce

### 4. Post Engagement Enhancements
- Add emoji reactions beyond just "like" (🔥 fire, ⚡ insightful, 👏 congrats) as quick-reaction buttons
- Show reaction counts with small emoji icons
- Add a "Bookmark" button to save posts

### 5. Company Profile Completeness Prompt
When viewing your own page with incomplete profile, show a "Complete your profile" progress bar:
- Checks: avatar, tagline, about, services, cover photo
- Links directly to the account/edit page
- Disappears once all fields are filled

### 6. Visual Polish
- Add subtle gradient borders on active tab pills
- Pulse animation on the "Publish" button when composer has content
- Stagger card entrance animations more dramatically in directory/marketplace
- Add a subtle confetti or sparkle micro-animation when a post is published

### Technical Approach
- All changes in `src/pages/Spark.tsx`
- Uses existing framer-motion, Lucide icons, and design tokens
- New sidebar widgets query existing tables (rfq_posts, spark_events, feed_reactions)
- No new database tables or migrations needed
- No new dependencies

