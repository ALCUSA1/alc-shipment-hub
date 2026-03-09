
-- Add air-specific columns to shipments
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS airline text,
  ADD COLUMN IF NOT EXISTS flight_number text,
  ADD COLUMN IF NOT EXISTS mawb_number text,
  ADD COLUMN IF NOT EXISTS hawb_number text,
  ADD COLUMN IF NOT EXISTS airport_of_departure text,
  ADD COLUMN IF NOT EXISTS airport_of_destination text,
  ADD COLUMN IF NOT EXISTS iata_code_origin text,
  ADD COLUMN IF NOT EXISTS iata_code_destination text,
  ADD COLUMN IF NOT EXISTS aircraft_type text,
  ADD COLUMN IF NOT EXISTS routing_and_destination text,
  ADD COLUMN IF NOT EXISTS handling_information text,
  ADD COLUMN IF NOT EXISTS accounting_information text,
  ADD COLUMN IF NOT EXISTS chargeable_weight numeric,
  ADD COLUMN IF NOT EXISTS rate_class text,
  ADD COLUMN IF NOT EXISTS commodity_item_number text,
  ADD COLUMN IF NOT EXISTS nature_and_quantity text,
  ADD COLUMN IF NOT EXISTS declared_value_for_carriage numeric,
  ADD COLUMN IF NOT EXISTS declared_value_for_customs numeric,
  ADD COLUMN IF NOT EXISTS sci text;

-- Add air-specific cargo fields
ALTER TABLE public.cargo
  ADD COLUMN IF NOT EXISTS chargeable_weight numeric,
  ADD COLUMN IF NOT EXISTS rate_class text,
  ADD COLUMN IF NOT EXISTS pieces integer;

-- Add mode column to carrier_rates
ALTER TABLE public.carrier_rates
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'ocean';

-- Seed major IATA airports into ports table
INSERT INTO public.ports (code, name, country, type) VALUES
  ('JFK', 'John F. Kennedy Intl', 'US', 'air'),
  ('LAX', 'Los Angeles Intl', 'US', 'air'),
  ('ORD', 'O''Hare Intl', 'US', 'air'),
  ('MIA', 'Miami Intl', 'US', 'air'),
  ('ATL', 'Hartsfield-Jackson Atlanta Intl', 'US', 'air'),
  ('DFW', 'Dallas/Fort Worth Intl', 'US', 'air'),
  ('SFO', 'San Francisco Intl', 'US', 'air'),
  ('IAH', 'George Bush Intercontinental', 'US', 'air'),
  ('EWR', 'Newark Liberty Intl', 'US', 'air'),
  ('SEA', 'Seattle-Tacoma Intl', 'US', 'air'),
  ('ANC', 'Ted Stevens Anchorage Intl', 'US', 'air'),
  ('LHR', 'London Heathrow', 'GB', 'air'),
  ('FRA', 'Frankfurt Main', 'DE', 'air'),
  ('CDG', 'Paris Charles de Gaulle', 'FR', 'air'),
  ('AMS', 'Amsterdam Schiphol', 'NL', 'air'),
  ('DXB', 'Dubai Intl', 'AE', 'air'),
  ('SIN', 'Singapore Changi', 'SG', 'air'),
  ('HKG', 'Hong Kong Intl', 'HK', 'air'),
  ('PVG', 'Shanghai Pudong Intl', 'CN', 'air'),
  ('NRT', 'Tokyo Narita Intl', 'JP', 'air'),
  ('ICN', 'Seoul Incheon Intl', 'KR', 'air'),
  ('SYD', 'Sydney Kingsford Smith', 'AU', 'air'),
  ('GRU', 'São Paulo Guarulhos', 'BR', 'air'),
  ('MEX', 'Mexico City Intl', 'MX', 'air'),
  ('DOH', 'Hamad Intl', 'QA', 'air'),
  ('IST', 'Istanbul Intl', 'TR', 'air'),
  ('BOM', 'Chhatrapati Shivaji Maharaj Intl', 'IN', 'air'),
  ('DEL', 'Indira Gandhi Intl', 'IN', 'air'),
  ('BKK', 'Suvarnabhumi', 'TH', 'air'),
  ('KUL', 'Kuala Lumpur Intl', 'MY', 'air'),
  ('TPE', 'Taiwan Taoyuan Intl', 'TW', 'air'),
  ('CGK', 'Soekarno-Hatta Intl', 'ID', 'air'),
  ('JNB', 'OR Tambo Intl', 'ZA', 'air'),
  ('NBO', 'Jomo Kenyatta Intl', 'KE', 'air'),
  ('ADD', 'Bole Intl', 'ET', 'air'),
  ('LUX', 'Luxembourg Findel', 'LU', 'air'),
  ('LEJ', 'Leipzig/Halle', 'DE', 'air'),
  ('MXP', 'Milan Malpensa', 'IT', 'air'),
  ('MAD', 'Adolfo Suárez Madrid-Barajas', 'ES', 'air'),
  ('YYZ', 'Toronto Pearson Intl', 'CA', 'air')
ON CONFLICT (code) DO NOTHING;
