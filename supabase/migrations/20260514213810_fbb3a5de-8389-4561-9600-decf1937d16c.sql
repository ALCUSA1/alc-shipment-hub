
-- Lock down email queue helper functions from public/anon execute (admin/service-role only)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- Add stable search_path to functions flagged by linter (security hardening)
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- Backfill required documents for any already-booked shipments missing placeholders
INSERT INTO public.documents (shipment_id, user_id, doc_type, status, file_url)
SELECT s.id, s.user_id, dr.document_type, 'pending', ''
FROM public.shipments s
JOIN public.document_requirements dr
  ON dr.is_mandatory = true
 AND dr.required_at_stage = 'booked'
 AND (
       (dr.shipment_type IS NOT NULL AND dr.shipment_type = COALESCE(s.shipment_type, s.mode))
       OR dr.shipment_type IS NULL
     )
WHERE s.lifecycle_stage IN ('booked','in_transit','delivered','closed')
  AND NOT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.shipment_id = s.id AND d.doc_type = dr.document_type
  );
