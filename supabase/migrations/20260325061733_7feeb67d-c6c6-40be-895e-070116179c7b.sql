
CREATE TABLE public.sailing_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  carrier text NOT NULL,
  origin_port text NOT NULL,
  destination_port text NOT NULL,
  container_type text,
  etd text,
  remind_at timestamptz NOT NULL,
  sailing_data jsonb,
  is_triggered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sailing_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders" ON public.sailing_reminders
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reminders" ON public.sailing_reminders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders" ON public.sailing_reminders
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own reminders" ON public.sailing_reminders
  FOR DELETE TO authenticated USING (user_id = auth.uid());
