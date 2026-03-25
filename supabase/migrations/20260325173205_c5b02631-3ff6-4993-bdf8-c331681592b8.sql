CREATE POLICY "Public can view carrier rates"
ON public.carrier_rates FOR SELECT
TO anon
USING (true);