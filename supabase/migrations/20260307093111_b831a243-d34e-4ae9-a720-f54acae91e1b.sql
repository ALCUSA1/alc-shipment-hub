-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'ops_manager', 'sales', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user's roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- RLS: users can view their own roles; admins can view all
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- RLS: only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: only admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));