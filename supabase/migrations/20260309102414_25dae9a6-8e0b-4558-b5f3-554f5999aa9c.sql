
-- Audit log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  user_id uuid,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_audit_log_record ON public.audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_user ON public.audit_log (user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log (created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can see all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can see audit logs for their own shipments
CREATE POLICY "Users can view own audit logs"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _old jsonb;
  _new jsonb;
  _changed text[];
  _key text;
BEGIN
  -- Try to get user_id from the record or from auth context
  _user_id := COALESCE(
    CASE WHEN TG_OP = 'DELETE' THEN (OLD).user_id ELSE (NEW).user_id END,
    auth.uid()
  );

  IF TG_OP = 'INSERT' THEN
    _old := NULL;
    _new := to_jsonb(NEW);
    _changed := ARRAY(SELECT jsonb_object_keys(_new));
  ELSIF TG_OP = 'UPDATE' THEN
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    -- Find changed fields
    _changed := ARRAY(
      SELECT key FROM jsonb_each(_new)
      WHERE _old->key IS DISTINCT FROM _new->key
        AND key NOT IN ('updated_at', 'created_at')
    );
    -- Skip if nothing meaningful changed
    IF array_length(_changed, 1) IS NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    _old := to_jsonb(OLD);
    _new := NULL;
    _changed := NULL;
  END IF;

  INSERT INTO public.audit_log (table_name, record_id, action, user_id, old_data, new_data, changed_fields)
  VALUES (
    TG_TABLE_NAME,
    COALESCE((NEW).id, (OLD).id),
    TG_OP,
    _user_id,
    _old,
    _new,
    _changed
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Attach audit triggers to key tables
CREATE TRIGGER audit_shipments
  AFTER INSERT OR UPDATE OR DELETE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_customs_filings
  AFTER INSERT OR UPDATE OR DELETE ON public.customs_filings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_quotes
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_shipment_amendments
  AFTER INSERT OR UPDATE OR DELETE ON public.shipment_amendments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
