
ALTER TABLE public.sailing_reminders
  ADD COLUMN date_from date,
  ADD COLUMN date_to date,
  ADD COLUMN price_min numeric,
  ADD COLUMN price_max numeric,
  ADD COLUMN email_sent boolean NOT NULL DEFAULT false;
