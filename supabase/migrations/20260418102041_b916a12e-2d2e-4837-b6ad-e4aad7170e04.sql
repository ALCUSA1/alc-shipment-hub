-- Update handle_new_user trigger to also auto-assign role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _requested_role text;
BEGIN
  -- Insert profile (existing behavior)
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  -- Auto-assign role from signup metadata
  _requested_role := NEW.raw_user_meta_data ->> 'requested_role';

  IF _requested_role IN ('viewer', 'forwarder', 'trucker', 'warehouse', 'driver') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _requested_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();