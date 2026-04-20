
-- Trigger function: prevent non-admins from inserting into user_roles
-- Allows the very first row (bootstrap) and service_role; otherwise requires caller to be an admin.
CREATE OR REPLACE FUNCTION public.guard_user_roles_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_count int;
  _caller uuid;
BEGIN
  -- Always allow service_role (server-side seeding / admin tools)
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  _caller := auth.uid();

  -- If table has no admin rows yet, allow bootstrap (single first admin)
  SELECT count(*) INTO _admin_count FROM public.user_roles WHERE role = 'admin';
  IF _admin_count = 0 THEN
    RETURN NEW;
  END IF;

  -- Otherwise, only existing admins can add roles
  IF _caller IS NULL OR NOT public.has_role(_caller, 'admin') THEN
    RAISE EXCEPTION 'Only administrators can assign user roles'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_roles_insert_trg ON public.user_roles;
CREATE TRIGGER guard_user_roles_insert_trg
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_roles_insert();
