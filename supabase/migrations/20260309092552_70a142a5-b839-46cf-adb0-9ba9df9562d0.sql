
-- Create a trigger function that auto-creates a draft customs_filing when shipment status changes to 'booked'
CREATE OR REPLACE FUNCTION public.auto_create_customs_filing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _shipper_name text;
  _consignee_name text;
  _consignee_address text;
  _hts_codes jsonb;
  _existing_count int;
BEGIN
  -- Only trigger when status changes TO 'booked'
  IF NEW.status = 'booked' AND (OLD IS NULL OR OLD.status <> 'booked') THEN
    -- Check if a customs filing already exists for this shipment
    SELECT count(*) INTO _existing_count
    FROM public.customs_filings
    WHERE shipment_id = NEW.id;

    IF _existing_count > 0 THEN
      RETURN NEW;
    END IF;

    -- Get shipper name from shipment_parties
    SELECT name INTO _shipper_name
    FROM public.shipment_parties
    WHERE shipment_id = NEW.id AND role = 'shipper'
    LIMIT 1;

    -- Get consignee info from shipment_parties
    SELECT name, address INTO _consignee_name, _consignee_address
    FROM public.shipment_parties
    WHERE shipment_id = NEW.id AND role = 'consignee'
    LIMIT 1;

    -- Build HTS codes from cargo
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'code', COALESCE(c.hts_code, c.schedule_b, c.hs_code, ''),
      'description', COALESCE(c.commodity, ''),
      'quantity', c.num_packages,
      'value', c.total_value
    )), '[]'::jsonb) INTO _hts_codes
    FROM public.cargo c
    WHERE c.shipment_id = NEW.id
      AND (c.hts_code IS NOT NULL OR c.hs_code IS NOT NULL OR c.schedule_b IS NOT NULL);

    -- Insert the draft filing
    INSERT INTO public.customs_filings (
      shipment_id, user_id, filing_type, status,
      exporter_name, consignee_name, consignee_address,
      country_of_destination, port_of_export, port_of_unlading,
      vessel_name, voyage_number, export_date,
      mode_of_transport, hts_codes
    ) VALUES (
      NEW.id, NEW.user_id, 'AES', 'draft',
      _shipper_name, _consignee_name, _consignee_address,
      NULL, NEW.origin_port, NEW.destination_port,
      NEW.vessel, NEW.voyage, NEW.etd,
      'vessel', _hts_codes
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on shipments table
CREATE TRIGGER trg_auto_customs_filing
  AFTER UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_customs_filing();
