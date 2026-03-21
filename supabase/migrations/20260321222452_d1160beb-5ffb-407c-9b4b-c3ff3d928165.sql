
-- Feed posts table
CREATE TABLE public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  author_name text,
  author_avatar_url text,
  post_type text NOT NULL DEFAULT 'update',
  content text NOT NULL,
  media_urls text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  share_count integer DEFAULT 0,
  original_post_id uuid REFERENCES public.feed_posts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view posts
CREATE POLICY "Authenticated users can view all posts" ON public.feed_posts
  FOR SELECT TO authenticated USING (true);

-- Users can create own posts
CREATE POLICY "Users can create own posts" ON public.feed_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update own posts
CREATE POLICY "Users can update own posts" ON public.feed_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can delete own posts
CREATE POLICY "Users can delete own posts" ON public.feed_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins can manage all posts" ON public.feed_posts
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Feed reactions table
CREATE TABLE public.feed_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reactions" ON public.feed_reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own reactions" ON public.feed_reactions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feed comments table
CREATE TABLE public.feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text,
  author_avatar_url text,
  company_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments" ON public.feed_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own comments" ON public.feed_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.feed_comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.feed_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_reactions;
