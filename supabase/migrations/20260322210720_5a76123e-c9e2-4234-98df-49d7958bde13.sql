
-- Partnership requests
CREATE TABLE public.partnership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  target_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (requester_company_id, target_company_id)
);

ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view partnerships" ON public.partnership_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create partnership requests" ON public.partnership_requests FOR INSERT TO authenticated WITH CHECK (requester_user_id = auth.uid());
CREATE POLICY "Requester or target can update" ON public.partnership_requests FOR UPDATE TO authenticated USING (
  requester_user_id = auth.uid() OR target_company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);
CREATE POLICY "Requester can delete" ON public.partnership_requests FOR DELETE TO authenticated USING (requester_user_id = auth.uid());

-- RFQ posts
CREATE TABLE public.rfq_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name text,
  title text NOT NULL,
  description text,
  origin text,
  destination text,
  cargo_type text,
  container_type text,
  deadline timestamptz,
  status text NOT NULL DEFAULT 'open',
  awarded_to uuid REFERENCES public.companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rfq_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view rfqs" ON public.rfq_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create rfqs" ON public.rfq_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners can update rfqs" ON public.rfq_posts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners can delete rfqs" ON public.rfq_posts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RFQ bids
CREATE TABLE public.rfq_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfq_posts(id) ON DELETE CASCADE,
  bidder_user_id uuid NOT NULL,
  bidder_company_id uuid REFERENCES public.companies(id),
  bidder_company_name text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  transit_days integer,
  notes text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rfq_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RFQ poster and bidder can view bids" ON public.rfq_bids FOR SELECT TO authenticated USING (
  bidder_user_id = auth.uid() OR rfq_id IN (SELECT id FROM public.rfq_posts WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create bids" ON public.rfq_bids FOR INSERT TO authenticated WITH CHECK (bidder_user_id = auth.uid());
CREATE POLICY "Bidder can update own bid" ON public.rfq_bids FOR UPDATE TO authenticated USING (bidder_user_id = auth.uid());

-- Company reviews
CREATE TABLE public.company_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_user_id uuid NOT NULL,
  reviewer_company_id uuid REFERENCES public.companies(id),
  reviewed_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  transaction_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view reviews" ON public.company_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create reviews" ON public.company_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_user_id = auth.uid());
CREATE POLICY "Reviewers can update own reviews" ON public.company_reviews FOR UPDATE TO authenticated USING (reviewer_user_id = auth.uid());
CREATE POLICY "Reviewers can delete own reviews" ON public.company_reviews FOR DELETE TO authenticated USING (reviewer_user_id = auth.uid());

-- Spark events
CREATE TABLE public.spark_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name text,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'announcement',
  event_date timestamptz,
  location text,
  is_virtual boolean NOT NULL DEFAULT false,
  rsvp_link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spark_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view events" ON public.spark_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create events" ON public.spark_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners can update events" ON public.spark_events FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners can delete events" ON public.spark_events FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Spark event RSVPs
CREATE TABLE public.spark_event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.spark_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  company_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.spark_event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view rsvps" ON public.spark_event_rsvps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can rsvp" ON public.spark_event_rsvps FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove rsvp" ON public.spark_event_rsvps FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.partnership_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rfq_posts;
