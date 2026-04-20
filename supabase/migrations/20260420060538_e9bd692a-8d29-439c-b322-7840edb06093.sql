
-- 1) Drop broad "authenticated users can read" policies on transport document tables
DO $$
DECLARE
  t text;
  p text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'transport_document_charges',
    'transport_document_consignment_items',
    'transport_document_equipments',
    'transport_document_instructions',
    'shipping_instructions'
  ]
  LOOP
    FOR p IN
      SELECT polname
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = t
        AND pol.polcmd = 'r'
        AND pg_get_expr(pol.polqual, pol.polrelid) = 'true'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);
    END LOOP;
  END LOOP;
END$$;

-- 2) Restrict hlag_live_events SELECT policy to authenticated users only
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT polname
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'hlag_live_events' AND pol.polcmd = 'r'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.hlag_live_events', p.polname);
  END LOOP;
END$$;

CREATE POLICY "Authenticated users can view live events for their shipments"
ON public.hlag_live_events
FOR SELECT
TO authenticated
USING (shipment_id IS NULL OR public.can_view_shipment(shipment_id));

-- 3) Tighten realtime.messages policy: restrict spark-feed to authenticated users
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT polname
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'realtime' AND c.relname = 'messages'
      AND pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%spark-feed%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', p.polname);
  END LOOP;
END$$;

CREATE POLICY "Authenticated can subscribe to spark-feed"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = 'spark-feed' AND auth.uid() IS NOT NULL)
);
