
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Brand assets are publicly readable" ON storage.objects;
CREATE POLICY "Brand assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Admins can upload brand assets" ON storage.objects;
CREATE POLICY "Admins can upload brand assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'brand-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update brand assets" ON storage.objects;
CREATE POLICY "Admins can update brand assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'brand-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete brand assets" ON storage.objects;
CREATE POLICY "Admins can delete brand assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'brand-assets' AND public.has_role(auth.uid(), 'admin'));
