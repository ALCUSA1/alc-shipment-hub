ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS services text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS portfolio_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';