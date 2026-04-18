-- ────────────────────────────────────────────────────────────────────
-- Universal reference resolver: map ANY carrier/customer-side reference
-- (booking #, MBL, HBL, container #, invoice #, PO #, customer ref, etc.)
-- back to the ALC shipment_ref / shipment_id.
-- ────────────────────────────────────────────────────────────────────

-- 1. Backfill shipment_references from existing shipments columns
INSERT INTO public.shipment_references (shipment_id, reference_type, reference_value, is_primary)
SELECT id, 'shipment_ref', shipment_ref, true
FROM public.shipments
WHERE shipment_ref IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.shipment_references (shipment_id, reference_type, reference_value, is_primary)
SELECT id, 'carrier_booking_number', booking_ref, false
FROM public.shipments
WHERE booking_ref IS NOT NULL AND booking_ref <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.shipment_references sr
    WHERE sr.shipment_id = shipments.id
      AND sr.reference_type = 'carrier_booking_number'
      AND sr.reference_value = shipments.booking_ref
  );

INSERT INTO public.shipment_references (shipment_id, reference_type, reference_value, is_primary)
SELECT id, 'customer_reference', customer_reference, false
FROM public.shipments
WHERE customer_reference IS NOT NULL AND customer_reference <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.shipment_references sr
    WHERE sr.shipment_id = shipments.id
      AND sr.reference_type = 'customer_reference'
      AND sr.reference_value = shipments.customer_reference
  );

-- Backfill BL numbers from transport_documents if present
INSERT INTO public.shipment_references (shipment_id, reference_type, reference_value, is_primary)
SELECT td.shipment_id, 'bill_of_lading', td.transport_document_reference, false
FROM public.transport_documents td
WHERE td.shipment_id IS NOT NULL
  AND td.transport_document_reference IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.shipment_references sr
    WHERE sr.shipment_id = td.shipment_id
      AND sr.reference_type = 'bill_of_lading'
      AND sr.reference_value = td.transport_document_reference
  );

-- Backfill container numbers from containers table
INSERT INTO public.shipment_references (shipment_id, reference_type, reference_value, is_primary)
SELECT c.shipment_id, 'container_number', c.container_number, false
FROM public.containers c
WHERE c.shipment_id IS NOT NULL
  AND c.container_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.shipment_references sr
    WHERE sr.shipment_id = c.shipment_id
      AND sr.reference_type = 'container_number'
      AND sr.reference_value = c.container_number
  );

-- 2. Add case-insensitive index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sr_value_lower
  ON public.shipment_references (lower(reference_value));

-- 3. Resolver function: case-insensitive, partial-match aware
CREATE OR REPLACE FUNCTION public.resolve_shipment_reference(_query text)
RETURNS TABLE (
  shipment_id uuid,
  shipment_ref text,
  reference_type text,
  reference_value text,
  match_type text,
  origin_port text,
  destination_port text,
  status text,
  carrier_code text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (SELECT lower(trim(_query)) AS needle),
  exact_matches AS (
    SELECT
      s.id AS shipment_id,
      s.shipment_ref,
      sr.reference_type,
      sr.reference_value,
      'exact' AS match_type,
      s.origin_port,
      s.destination_port,
      s.status,
      ac.carrier_code
    FROM public.shipment_references sr
    JOIN public.shipments s ON s.id = sr.shipment_id
    LEFT JOIN public.alc_carriers ac ON ac.id = s.alc_carrier_id
    WHERE lower(sr.reference_value) = (SELECT needle FROM q)
      AND public.can_view_shipment(s.id)
  ),
  prefix_matches AS (
    SELECT
      s.id AS shipment_id,
      s.shipment_ref,
      sr.reference_type,
      sr.reference_value,
      'prefix' AS match_type,
      s.origin_port,
      s.destination_port,
      s.status,
      ac.carrier_code
    FROM public.shipment_references sr
    JOIN public.shipments s ON s.id = sr.shipment_id
    LEFT JOIN public.alc_carriers ac ON ac.id = s.alc_carrier_id
    WHERE lower(sr.reference_value) LIKE (SELECT needle FROM q) || '%'
      AND lower(sr.reference_value) <> (SELECT needle FROM q)
      AND public.can_view_shipment(s.id)
    LIMIT 20
  )
  SELECT * FROM exact_matches
  UNION ALL
  SELECT * FROM prefix_matches
  WHERE NOT EXISTS (SELECT 1 FROM exact_matches)
  LIMIT 25
$$;

-- 4. Trigger: keep shipment_references in sync when shipments.booking_ref / customer_reference change
CREATE OR REPLACE FUNCTION public.sync_shipment_refs_from_shipments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- shipment_ref always present
  IF NEW.shipment_ref IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.shipment_ref IS DISTINCT FROM NEW.shipment_ref) THEN
    INSERT INTO public.shipment_references (shipment_id, reference_type, reference_value, is_primary)
    VALUES (NEW.id, 'shipment_ref', NEW.shipment_ref, true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.booking_ref IS NOT NULL AND NEW.booking_ref <> '' AND (TG_OP = 'INSERT' OR OLD.booking_ref IS DISTINCT FROM NEW.booking_ref) THEN
    INSERT INTO public.shipment_references (shipment_id, reference_type, reference_value, is_primary, carrier_id)
    VALUES (NEW.id, 'carrier_booking_number', NEW.booking_ref, false, NEW.alc_carrier_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.customer_reference IS NOT NULL AND NEW.customer_reference <> '' AND (TG_OP = 'INSERT' OR OLD.customer_reference IS DISTINCT FROM NEW.customer_reference) THEN
    INSERT INTO public.shipment_references (shipment_id, reference_type, reference_value, is_primary)
    VALUES (NEW.id, 'customer_reference', NEW.customer_reference, false)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_shipment_refs_trg ON public.shipments;
CREATE TRIGGER sync_shipment_refs_trg
  AFTER INSERT OR UPDATE OF shipment_ref, booking_ref, customer_reference, alc_carrier_id
  ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_shipment_refs_from_shipments();

-- 5. Add unique index to prevent duplicate refs per shipment
CREATE UNIQUE INDEX IF NOT EXISTS idx_sr_unique_per_shipment
  ON public.shipment_references (shipment_id, reference_type, reference_value);