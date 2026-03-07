-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  role TEXT DEFAULT 'shipper',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ports table
CREATE TABLE public.ports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'sea'
);
ALTER TABLE public.ports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ports are viewable by authenticated users" ON public.ports FOR SELECT TO authenticated USING (true);

-- Shipments table
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shipment_ref TEXT NOT NULL,
  shipment_type TEXT NOT NULL DEFAULT 'export',
  status TEXT NOT NULL DEFAULT 'draft',
  origin_port TEXT,
  destination_port TEXT,
  pickup_location TEXT,
  delivery_location TEXT,
  vessel TEXT,
  voyage TEXT,
  booking_ref TEXT,
  etd DATE,
  eta DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own shipments" ON public.shipments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own shipments" ON public.shipments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shipments" ON public.shipments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own shipments" ON public.shipments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cargo table
CREATE TABLE public.cargo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  commodity TEXT,
  hs_code TEXT,
  num_packages INT,
  package_type TEXT,
  gross_weight NUMERIC,
  volume NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cargo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage cargo through shipment" ON public.cargo FOR ALL
  USING (EXISTS (SELECT 1 FROM public.shipments WHERE shipments.id = cargo.shipment_id AND shipments.user_id = auth.uid()));

-- Containers table
CREATE TABLE public.containers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  container_type TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  container_number TEXT,
  seal_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage containers through shipment" ON public.containers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.shipments WHERE shipments.id = containers.shipment_id AND shipments.user_id = auth.uid()));

-- Shipment parties
CREATE TABLE public.shipment_parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shipment_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage parties through shipment" ON public.shipment_parties FOR ALL
  USING (EXISTS (SELECT 1 FROM public.shipments WHERE shipments.id = shipment_parties.shipment_id AND shipments.user_id = auth.uid()));

-- Quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own quotes" ON public.quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own quotes" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quotes" ON public.quotes FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tracking events
CREATE TABLE public.tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tracking through shipment" ON public.tracking_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.shipments WHERE shipments.id = tracking_events.shipment_id AND shipments.user_id = auth.uid()));
CREATE POLICY "Users can create tracking through shipment" ON public.tracking_events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.shipments WHERE shipments.id = tracking_events.shipment_id AND shipments.user_id = auth.uid()));

-- Generate shipment reference sequence
CREATE SEQUENCE IF NOT EXISTS shipment_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_shipment_ref()
RETURNS TRIGGER AS $$
BEGIN
  NEW.shipment_ref := 'SHP-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(nextval('shipment_ref_seq')::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_shipment_ref BEFORE INSERT ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.generate_shipment_ref();