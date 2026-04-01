
ALTER TABLE public.commercial_schedule_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.port_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_cutoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read schedule queries" ON public.commercial_schedule_queries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read schedules" ON public.commercial_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read schedule legs" ON public.schedule_legs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read port schedules" ON public.port_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read vessel schedules" ON public.vessel_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read schedule places" ON public.schedule_places FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read schedule cutoffs" ON public.schedule_cutoffs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read schedule references" ON public.schedule_references FOR SELECT TO authenticated USING (true);
