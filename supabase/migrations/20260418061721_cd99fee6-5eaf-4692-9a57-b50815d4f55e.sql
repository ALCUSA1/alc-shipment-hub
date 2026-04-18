
-- ============================================================
-- 1. COMPANIES: remove broad authenticated SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view company directory" ON public.companies;

-- Allow members of a company (via company_members) to view it, in addition to owners and admins.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='company_members') THEN
    EXECUTE $p$
      CREATE POLICY "Members can view their companies"
      ON public.companies
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = companies.id
            AND cm.user_id = auth.uid()
        )
      )
    $p$;
  END IF;
END$$;

-- ============================================================
-- 2. TRANSPORT DOCUMENTS family: restrict "Service role manages" policies to service_role
-- ============================================================
DROP POLICY IF EXISTS "Service role manages transport_documents" ON public.transport_documents;
CREATE POLICY "Service role manages transport_documents"
  ON public.transport_documents FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages td_charges" ON public.transport_document_charges;
CREATE POLICY "Service role manages td_charges"
  ON public.transport_document_charges FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages td_equipments" ON public.transport_document_equipments;
CREATE POLICY "Service role manages td_equipments"
  ON public.transport_document_equipments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages td_consignment_items" ON public.transport_document_consignment_items;
CREATE POLICY "Service role manages td_consignment_items"
  ON public.transport_document_consignment_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages td_instructions" ON public.transport_document_instructions;
CREATE POLICY "Service role manages td_instructions"
  ON public.transport_document_instructions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages shipping_instructions" ON public.shipping_instructions;
CREATE POLICY "Service role manages shipping_instructions"
  ON public.shipping_instructions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 3. SURRENDER tables: replace permissive policies with ownership checks
-- Use can_view_shipment(shipment_id) for SELECT and require ownership for INSERT/UPDATE.
-- ============================================================

-- surrender_requests
DROP POLICY IF EXISTS "Authenticated users can view surrender_requests" ON public.surrender_requests;
DROP POLICY IF EXISTS "Authenticated users can insert surrender_requests" ON public.surrender_requests;
DROP POLICY IF EXISTS "Authenticated users can update surrender_requests" ON public.surrender_requests;

CREATE POLICY "Users view surrender_requests for their shipments"
  ON public.surrender_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (shipment_id IS NOT NULL AND public.can_view_shipment(shipment_id))
  );

CREATE POLICY "Users insert surrender_requests for their shipments"
  ON public.surrender_requests FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (shipment_id IS NOT NULL AND public.can_view_shipment(shipment_id))
  );

CREATE POLICY "Users update surrender_requests for their shipments"
  ON public.surrender_requests FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (shipment_id IS NOT NULL AND public.can_view_shipment(shipment_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (shipment_id IS NOT NULL AND public.can_view_shipment(shipment_id))
  );

-- surrender_responses
DROP POLICY IF EXISTS "Authenticated users can view surrender_responses" ON public.surrender_responses;
DROP POLICY IF EXISTS "Authenticated users can insert surrender_responses" ON public.surrender_responses;

CREATE POLICY "Users view surrender_responses for their shipments"
  ON public.surrender_responses FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.surrender_requests sr
      WHERE sr.id = surrender_responses.surrender_request_id
        AND sr.shipment_id IS NOT NULL
        AND public.can_view_shipment(sr.shipment_id)
    )
  );

CREATE POLICY "Users insert surrender_responses for their shipments"
  ON public.surrender_responses FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.surrender_requests sr
      WHERE sr.id = surrender_responses.surrender_request_id
        AND sr.shipment_id IS NOT NULL
        AND public.can_view_shipment(sr.shipment_id)
    )
  );

-- surrender_errors
DROP POLICY IF EXISTS "Authenticated users can view surrender_errors" ON public.surrender_errors;
DROP POLICY IF EXISTS "Authenticated users can insert surrender_errors" ON public.surrender_errors;

CREATE POLICY "Users view surrender_errors for their shipments"
  ON public.surrender_errors FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.surrender_requests sr
      WHERE sr.id = surrender_errors.surrender_request_id
        AND sr.shipment_id IS NOT NULL
        AND public.can_view_shipment(sr.shipment_id)
    )
  );

CREATE POLICY "Users insert surrender_errors for their shipments"
  ON public.surrender_errors FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.surrender_requests sr
      WHERE sr.id = surrender_errors.surrender_request_id
        AND sr.shipment_id IS NOT NULL
        AND public.can_view_shipment(sr.shipment_id)
    )
  );

-- surrender_endorsement_chain
DROP POLICY IF EXISTS "Authenticated users can view surrender_endorsement_chain" ON public.surrender_endorsement_chain;
DROP POLICY IF EXISTS "Authenticated users can insert surrender_endorsement_chain" ON public.surrender_endorsement_chain;

CREATE POLICY "Users view surrender_endorsement_chain for their shipments"
  ON public.surrender_endorsement_chain FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.surrender_requests sr
      WHERE sr.id = surrender_endorsement_chain.surrender_request_id
        AND sr.shipment_id IS NOT NULL
        AND public.can_view_shipment(sr.shipment_id)
    )
  );

CREATE POLICY "Users insert surrender_endorsement_chain for their shipments"
  ON public.surrender_endorsement_chain FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.surrender_requests sr
      WHERE sr.id = surrender_endorsement_chain.surrender_request_id
        AND sr.shipment_id IS NOT NULL
        AND public.can_view_shipment(sr.shipment_id)
    )
  );
