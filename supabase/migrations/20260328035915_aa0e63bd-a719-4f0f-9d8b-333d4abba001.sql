CREATE OR REPLACE FUNCTION public.notify_on_partner_assignment()
RETURNS trigger AS $$
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
      COALESCE(NEW.company_name, 'Partner') || ' assigned as ' || COALESCE(NEW.role_type, NEW.role, 'partner') || ' on ' || COALESCE(_ship_ref, NEW.shipment_id::text),
      'partner_assignment',
      'info',
      jsonb_build_object('shipment_id', NEW.shipment_id, 'partner_id', NEW.partner_id, 'role_type', COALESCE(NEW.role_type, NEW.role))
    );
  END IF;

  INSERT INTO public.audit_log (table_name, record_id, action, user_id, new_data)
  VALUES (
    'shipment_parties',
    NEW.id,
    'PARTNER_ASSIGNED',
    COALESCE(NEW.assigned_by_user_id, auth.uid()),
    jsonb_build_object('partner_id', NEW.partner_id, 'name', NEW.company_name, 'role', COALESCE(NEW.role_type, NEW.role))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;