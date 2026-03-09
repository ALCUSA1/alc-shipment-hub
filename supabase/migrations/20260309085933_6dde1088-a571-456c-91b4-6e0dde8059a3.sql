
-- Create shipment-documents storage bucket (private, authenticated access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('shipment-documents', 'shipment-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload to their own folder
CREATE POLICY "Users can upload shipment documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shipment-documents');

-- RLS: Users can view their own uploads
CREATE POLICY "Users can view shipment documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'shipment-documents');

-- RLS: Users can update their own uploads
CREATE POLICY "Users can update shipment documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'shipment-documents');

-- RLS: Users can delete their own uploads
CREATE POLICY "Users can delete shipment documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shipment-documents');
