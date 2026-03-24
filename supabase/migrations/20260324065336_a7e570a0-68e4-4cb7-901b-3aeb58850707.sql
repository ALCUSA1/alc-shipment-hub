
-- Fix security definer views by recreating with security_invoker
DROP VIEW IF EXISTS public.shipment_workspace_view;
DROP VIEW IF EXISTS public.customer_summary_view;

CREATE VIEW public.shipment_workspace_view WITH (security_invoker = true) AS
SELECT
  s.id, s.shipment_ref, s.company_id, s.customer_id, s.user_id,
  s.status, s.lifecycle_stage, s.shipment_type, s.mode,
  s.origin_port, s.destination_port, s.etd, s.eta,
  s.created_at, s.updated_at,
  c.company_name,
  po.recommended_sell_price, po.net_profit, po.net_margin_percent, po.true_total_cost,
  (SELECT count(*) FROM public.documents d WHERE d.shipment_id = s.id) AS doc_count,
  (SELECT count(*) FROM public.documents d WHERE d.shipment_id = s.id AND d.status = 'pending') AS pending_doc_count,
  (SELECT te.milestone FROM public.tracking_events te WHERE te.shipment_id = s.id ORDER BY te.created_at DESC LIMIT 1) AS latest_milestone
FROM public.shipments s
LEFT JOIN public.companies c ON c.id = s.company_id
LEFT JOIN public.pricing_scenarios ps ON ps.shipment_id = s.id AND ps.is_selected = true
LEFT JOIN public.pricing_outputs po ON po.pricing_scenario_id = ps.id;

CREATE VIEW public.customer_summary_view WITH (security_invoker = true) AS
SELECT
  c.id, c.company_name, c.company_type, c.status, c.user_id, c.created_at,
  (SELECT count(*) FROM public.shipments s WHERE s.customer_id = c.id) AS shipment_count,
  (SELECT count(*) FROM public.shipments s WHERE s.customer_id = c.id AND s.status IN ('in_transit', 'booked', 'arrived')) AS active_shipments
FROM public.companies c
WHERE c.company_type IN ('shipper', 'importer', 'exporter', 'customer');
