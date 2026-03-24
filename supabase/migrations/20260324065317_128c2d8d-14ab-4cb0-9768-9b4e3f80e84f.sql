
-- =============================================
-- MIGRATION: Safe views + lifecycle validation
-- =============================================

-- Shipment workspace view (security barrier)
CREATE OR REPLACE VIEW public.shipment_workspace_view WITH (security_barrier = true) AS
SELECT
  s.id,
  s.shipment_ref,
  s.company_id,
  s.customer_id,
  s.user_id,
  s.status,
  s.lifecycle_stage,
  s.shipment_type,
  s.mode,
  s.origin_port,
  s.destination_port,
  s.etd,
  s.eta,
  s.created_at,
  s.updated_at,
  c.company_name,
  -- Selected pricing summary
  po.recommended_sell_price,
  po.net_profit,
  po.net_margin_percent,
  po.true_total_cost,
  -- Document counts
  (SELECT count(*) FROM public.documents d WHERE d.shipment_id = s.id) AS doc_count,
  (SELECT count(*) FROM public.documents d WHERE d.shipment_id = s.id AND d.status = 'pending') AS pending_doc_count,
  -- Latest milestone
  (SELECT te.milestone FROM public.tracking_events te WHERE te.shipment_id = s.id ORDER BY te.created_at DESC LIMIT 1) AS latest_milestone
FROM public.shipments s
LEFT JOIN public.companies c ON c.id = s.company_id
LEFT JOIN public.pricing_scenarios ps ON ps.shipment_id = s.id AND ps.is_selected = true
LEFT JOIN public.pricing_outputs po ON po.pricing_scenario_id = ps.id;

-- Customer summary view
CREATE OR REPLACE VIEW public.customer_summary_view WITH (security_barrier = true) AS
SELECT
  c.id,
  c.company_name,
  c.company_type,
  c.status,
  c.user_id,
  c.created_at,
  (SELECT count(*) FROM public.shipments s WHERE s.customer_id = c.id) AS shipment_count,
  (SELECT count(*) FROM public.shipments s WHERE s.customer_id = c.id AND s.status IN ('in_transit', 'booked', 'arrived')) AS active_shipments
FROM public.companies c
WHERE c.company_type IN ('shipper', 'importer', 'exporter', 'customer');

-- Shipment lifecycle validation function
CREATE OR REPLACE FUNCTION public.validate_lifecycle_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _valid boolean := false;
BEGIN
  -- Skip if lifecycle_stage hasn't changed
  IF OLD.lifecycle_stage IS NOT DISTINCT FROM NEW.lifecycle_stage THEN
    RETURN NEW;
  END IF;

  -- Allow cancellation from any state
  IF NEW.lifecycle_stage = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Define allowed transitions
  CASE OLD.lifecycle_stage
    WHEN 'draft' THEN _valid := NEW.lifecycle_stage IN ('pending_pricing', 'cancelled');
    WHEN 'pending_pricing' THEN _valid := NEW.lifecycle_stage IN ('quote_ready', 'cancelled');
    WHEN 'quote_ready' THEN _valid := NEW.lifecycle_stage IN ('awaiting_approval', 'pending_pricing', 'cancelled');
    WHEN 'awaiting_approval' THEN _valid := NEW.lifecycle_stage IN ('booked', 'pending_pricing', 'cancelled');
    WHEN 'booked' THEN _valid := NEW.lifecycle_stage IN ('in_transit', 'cancelled');
    WHEN 'in_transit' THEN _valid := NEW.lifecycle_stage IN ('delivered', 'cancelled');
    WHEN 'delivered' THEN _valid := NEW.lifecycle_stage IN ('closed');
    ELSE _valid := false;
  END CASE;

  IF NOT _valid THEN
    RAISE EXCEPTION 'Invalid lifecycle transition from % to %', OLD.lifecycle_stage, NEW.lifecycle_stage;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply lifecycle validation trigger
DROP TRIGGER IF EXISTS trg_validate_lifecycle ON public.shipments;
CREATE TRIGGER trg_validate_lifecycle
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  WHEN (OLD.lifecycle_stage IS DISTINCT FROM NEW.lifecycle_stage)
  EXECUTE FUNCTION public.validate_lifecycle_transition();

-- Audit trigger for pricing scenarios
DROP TRIGGER IF EXISTS trg_audit_pricing_scenarios ON public.pricing_scenarios;
CREATE TRIGGER trg_audit_pricing_scenarios
  AFTER INSERT OR UPDATE ON public.pricing_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_fn();

-- Audit trigger for approvals
DROP TRIGGER IF EXISTS trg_audit_approvals ON public.approvals;
CREATE TRIGGER trg_audit_approvals
  AFTER INSERT OR UPDATE ON public.approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_fn();
