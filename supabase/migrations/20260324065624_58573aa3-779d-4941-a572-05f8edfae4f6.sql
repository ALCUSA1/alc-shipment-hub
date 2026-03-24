
-- =============================================
-- Lifecycle automation triggers
-- =============================================

-- 1. Auto-create milestones on lifecycle_stage change
CREATE OR REPLACE FUNCTION public.auto_create_milestone_on_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _milestone text;
BEGIN
  IF OLD.lifecycle_stage IS NOT DISTINCT FROM NEW.lifecycle_stage THEN
    RETURN NEW;
  END IF;

  -- Map lifecycle_stage to milestone type
  CASE NEW.lifecycle_stage
    WHEN 'pending_pricing' THEN _milestone := 'pricing_requested';
    WHEN 'quote_ready' THEN _milestone := 'pricing_completed';
    WHEN 'awaiting_approval' THEN _milestone := 'quote_submitted';
    WHEN 'booked' THEN _milestone := 'booking_confirmed';
    WHEN 'in_transit' THEN _milestone := 'departed';
    WHEN 'delivered' THEN _milestone := 'delivered';
    WHEN 'closed' THEN _milestone := 'closed';
    WHEN 'cancelled' THEN _milestone := 'cancelled';
    ELSE _milestone := NULL;
  END CASE;

  IF _milestone IS NOT NULL THEN
    INSERT INTO public.tracking_events (shipment_id, milestone, location, status, created_at)
    VALUES (NEW.id, _milestone, NULL, 'completed', now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_milestone ON public.shipments;
CREATE TRIGGER trg_auto_milestone
  AFTER UPDATE ON public.shipments
  FOR EACH ROW
  WHEN (OLD.lifecycle_stage IS DISTINCT FROM NEW.lifecycle_stage)
  EXECUTE FUNCTION public.auto_create_milestone_on_lifecycle();

-- 2. Auto-create notifications on lifecycle_stage change
CREATE OR REPLACE FUNCTION public.auto_notify_on_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _title text;
  _message text;
  _severity text := 'info';
  _type text := 'shipment_lifecycle';
  _ref text;
BEGIN
  IF OLD.lifecycle_stage IS NOT DISTINCT FROM NEW.lifecycle_stage THEN
    RETURN NEW;
  END IF;

  _ref := COALESCE(NEW.shipment_ref, NEW.id::text);

  CASE NEW.lifecycle_stage
    WHEN 'pending_pricing' THEN
      _title := 'Pricing Required';
      _message := 'Shipment ' || _ref || ' needs pricing';
      _severity := 'warning';
    WHEN 'quote_ready' THEN
      _title := 'Quote Ready';
      _message := 'Quote is ready for shipment ' || _ref;
    WHEN 'awaiting_approval' THEN
      _title := 'Approval Pending';
      _message := 'Quote for shipment ' || _ref || ' awaits approval';
      _severity := 'warning';
    WHEN 'booked' THEN
      _title := 'Shipment Booked';
      _message := 'Shipment ' || _ref || ' has been booked';
    WHEN 'in_transit' THEN
      _title := 'Shipment In Transit';
      _message := 'Shipment ' || _ref || ' is now in transit';
    WHEN 'delivered' THEN
      _title := 'Shipment Delivered';
      _message := 'Shipment ' || _ref || ' has been delivered';
    WHEN 'cancelled' THEN
      _title := 'Shipment Cancelled';
      _message := 'Shipment ' || _ref || ' has been cancelled';
      _severity := 'critical';
    ELSE
      RETURN NEW;
  END CASE;

  -- Notify shipment owner
  INSERT INTO public.notifications (user_id, title, message, type, severity, metadata)
  VALUES (
    NEW.user_id,
    _title,
    _message,
    _type,
    _severity,
    jsonb_build_object('shipment_id', NEW.id, 'shipment_ref', _ref, 'lifecycle_stage', NEW.lifecycle_stage)
  );

  -- Notify assigned ops user if different
  IF NEW.assigned_ops_user_id IS NOT NULL AND NEW.assigned_ops_user_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, severity, metadata)
    VALUES (
      NEW.assigned_ops_user_id,
      _title,
      _message,
      _type,
      _severity,
      jsonb_build_object('shipment_id', NEW.id, 'shipment_ref', _ref, 'lifecycle_stage', NEW.lifecycle_stage)
    );
  END IF;

  -- Notify pricing user on pricing-related transitions
  IF NEW.lifecycle_stage IN ('pending_pricing', 'quote_ready') 
     AND NEW.assigned_pricing_user_id IS NOT NULL 
     AND NEW.assigned_pricing_user_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, severity, metadata)
    VALUES (
      NEW.assigned_pricing_user_id,
      _title,
      _message,
      _type,
      _severity,
      jsonb_build_object('shipment_id', NEW.id, 'shipment_ref', _ref, 'lifecycle_stage', NEW.lifecycle_stage)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_notify_lifecycle ON public.shipments;
CREATE TRIGGER trg_auto_notify_lifecycle
  AFTER UPDATE ON public.shipments
  FOR EACH ROW
  WHEN (OLD.lifecycle_stage IS DISTINCT FROM NEW.lifecycle_stage)
  EXECUTE FUNCTION public.auto_notify_on_lifecycle();

-- 3. Auto-create tasks on lifecycle transitions
CREATE OR REPLACE FUNCTION public.auto_create_tasks_on_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref text;
BEGIN
  IF OLD.lifecycle_stage IS NOT DISTINCT FROM NEW.lifecycle_stage THEN
    RETURN NEW;
  END IF;

  _ref := COALESCE(NEW.shipment_ref, NEW.id::text);

  -- Only create tasks if company_id is set
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  CASE NEW.lifecycle_stage
    WHEN 'pending_pricing' THEN
      INSERT INTO public.tasks (company_id, shipment_id, title, assigned_to_role, priority, created_by_system)
      VALUES (NEW.company_id, NEW.id, 'Prepare quote for ' || _ref, 'pricing_manager', 'high', true);

    WHEN 'awaiting_approval' THEN
      INSERT INTO public.tasks (company_id, shipment_id, title, assigned_to_role, priority, created_by_system)
      VALUES (NEW.company_id, NEW.id, 'Review pricing exception for ' || _ref, 'admin', 'high', true);

    WHEN 'booked' THEN
      INSERT INTO public.tasks (company_id, shipment_id, title, assigned_to_role, priority, created_by_system)
      VALUES
        (NEW.company_id, NEW.id, 'Confirm partner assignments for ' || _ref, 'operations_manager', 'normal', true),
        (NEW.company_id, NEW.id, 'Collect required documents for ' || _ref, 'operations_manager', 'high', true),
        (NEW.company_id, NEW.id, 'Confirm pickup schedule for ' || _ref, 'operations_manager', 'normal', true);

    WHEN 'delivered' THEN
      INSERT INTO public.tasks (company_id, shipment_id, title, assigned_to_role, priority, created_by_system)
      VALUES
        (NEW.company_id, NEW.id, 'Close out shipment ' || _ref, 'operations_manager', 'normal', true),
        (NEW.company_id, NEW.id, 'Review invoice/payment for ' || _ref, 'finance_user', 'normal', true);

    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_tasks_lifecycle ON public.shipments;
CREATE TRIGGER trg_auto_tasks_lifecycle
  AFTER UPDATE ON public.shipments
  FOR EACH ROW
  WHEN (OLD.lifecycle_stage IS DISTINCT FROM NEW.lifecycle_stage)
  EXECUTE FUNCTION public.auto_create_tasks_on_lifecycle();

-- 4. Auto-create document requirement placeholders on booking
CREATE OR REPLACE FUNCTION public.auto_request_documents_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req record;
  _has_customs boolean;
  _has_insurance boolean;
  _has_dg boolean;
BEGIN
  IF NEW.lifecycle_stage <> 'booked' OR OLD.lifecycle_stage = 'booked' THEN
    RETURN NEW;
  END IF;

  -- Check service flags from shipment_services
  SELECT 
    COALESCE(ss.customs_clearance, false),
    COALESCE(ss.insurance, false),
    false -- dangerous_goods from cargo
  INTO _has_customs, _has_insurance, _has_dg
  FROM public.shipment_services ss
  WHERE ss.shipment_id = NEW.id
  LIMIT 1;

  -- Check dangerous goods from cargo
  SELECT EXISTS (SELECT 1 FROM public.cargo WHERE shipment_id = NEW.id AND dangerous_goods = true)
  INTO _has_dg;

  -- Create document placeholders from requirements
  FOR _req IN
    SELECT dr.document_type FROM public.document_requirements dr
    WHERE dr.is_mandatory = true
      AND dr.required_at_stage = 'booked'
      AND (
        (dr.shipment_type IS NOT NULL AND dr.shipment_type = COALESCE(NEW.shipment_type, NEW.mode))
        OR (dr.service_flag = 'customs_clearance' AND _has_customs)
        OR (dr.service_flag = 'insurance' AND _has_insurance)
        OR (dr.service_flag = 'dangerous_goods' AND _has_dg)
      )
  LOOP
    -- Only insert if doc doesn't already exist for this shipment
    INSERT INTO public.documents (shipment_id, user_id, doc_type, status, file_url)
    SELECT NEW.id, NEW.user_id, _req.document_type, 'pending', ''
    WHERE NOT EXISTS (
      SELECT 1 FROM public.documents WHERE shipment_id = NEW.id AND doc_type = _req.document_type
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_docs_on_booking ON public.shipments;
CREATE TRIGGER trg_auto_docs_on_booking
  AFTER UPDATE ON public.shipments
  FOR EACH ROW
  WHEN (NEW.lifecycle_stage = 'booked' AND OLD.lifecycle_stage IS DISTINCT FROM 'booked')
  EXECUTE FUNCTION public.auto_request_documents_on_booking();

-- 5. Auto-create activity log on lifecycle change (supplement existing audit trigger)
CREATE OR REPLACE FUNCTION public.log_lifecycle_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.lifecycle_stage IS NOT DISTINCT FROM NEW.lifecycle_stage THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.audit_log (table_name, record_id, action, user_id, old_data, new_data, changed_fields)
  VALUES (
    'shipments',
    NEW.id,
    'LIFECYCLE_TRANSITION',
    COALESCE(auth.uid(), NEW.user_id),
    jsonb_build_object('lifecycle_stage', OLD.lifecycle_stage, 'status', OLD.status),
    jsonb_build_object('lifecycle_stage', NEW.lifecycle_stage, 'status', NEW.status),
    ARRAY['lifecycle_stage']
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_lifecycle ON public.shipments;
CREATE TRIGGER trg_log_lifecycle
  AFTER UPDATE ON public.shipments
  FOR EACH ROW
  WHEN (OLD.lifecycle_stage IS DISTINCT FROM NEW.lifecycle_stage)
  EXECUTE FUNCTION public.log_lifecycle_change();

-- 6. Auto-notify on partner assignment
CREATE OR REPLACE FUNCTION public.notify_on_partner_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ship_ref text;
  _ship_user uuid;
BEGIN
  SELECT shipment_ref, user_id INTO _ship_ref, _ship_user
  FROM public.shipments WHERE id = NEW.shipment_id;

  IF _ship_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, severity, metadata)
    VALUES (
      _ship_user,
      'Partner Assigned',
      COALESCE(NEW.name, 'Partner') || ' assigned as ' || COALESCE(NEW.role_type, NEW.role, 'partner') || ' on ' || COALESCE(_ship_ref, NEW.shipment_id::text),
      'partner_assignment',
      'info',
      jsonb_build_object('shipment_id', NEW.shipment_id, 'partner_id', NEW.partner_id, 'role_type', COALESCE(NEW.role_type, NEW.role))
    );
  END IF;

  -- Activity log
  INSERT INTO public.audit_log (table_name, record_id, action, user_id, new_data)
  VALUES (
    'shipment_parties',
    NEW.id,
    'PARTNER_ASSIGNED',
    COALESCE(NEW.assigned_by_user_id, auth.uid()),
    jsonb_build_object('partner_id', NEW.partner_id, 'name', NEW.name, 'role', COALESCE(NEW.role_type, NEW.role))
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_partner_assign ON public.shipment_parties;
CREATE TRIGGER trg_notify_partner_assign
  AFTER INSERT ON public.shipment_parties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_partner_assignment();
