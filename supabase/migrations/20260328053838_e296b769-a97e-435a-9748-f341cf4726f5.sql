CREATE OR REPLACE FUNCTION public.auto_create_customs_filing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _shipper_name text;
  _consignee_name text;
  _consignee_address text;
  _hts_codes jsonb;
  _existing_count int;
  _mode_of_transport text;
  _vessel_name text;
  _voyage_number text;
  _carrier_name text;
  _port_of_export text;
  _port_of_unlading text;
BEGIN
  IF NEW.status = 'booked' AND (OLD IS NULL OR OLD.status <> 'booked') THEN
    SELECT count(*) INTO _existing_count
    FROM public.customs_filings
    WHERE shipment_id = NEW.id;

    IF _existing_count > 0 THEN
      RETURN NEW;
    END IF;

    SELECT company_name INTO _shipper_name
    FROM public.shipment_parties
    WHERE shipment_id = NEW.id AND role = 'shipper'
    LIMIT 1;

    SELECT company_name, address INTO _consignee_name, _consignee_address
    FROM public.shipment_parties
    WHERE shipment_id = NEW.id AND role = 'consignee'
    LIMIT 1;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'code', COALESCE(c.hts_code, c.schedule_b, c.hs_code, ''),
      'description', COALESCE(c.commodity, ''),
      'quantity', c.num_packages,
      'value', c.total_value
    )), '[]'::jsonb) INTO _hts_codes
    FROM public.cargo c
    WHERE c.shipment_id = NEW.id
      AND (c.hts_code IS NOT NULL OR c.hs_code IS NOT NULL OR c.schedule_b IS NOT NULL);

    IF NEW.mode = 'air' THEN
      _mode_of_transport := 'air';
      _vessel_name := NEW.airline;
      _voyage_number := NEW.flight_number;
      _carrier_name := NEW.airline;
      _port_of_export := COALESCE(NEW.airport_of_departure, NEW.origin_port);
      _port_of_unlading := COALESCE(NEW.airport_of_destination, NEW.destination_port);
    ELSE
      _mode_of_transport := 'vessel';
      _vessel_name := NEW.vessel;
      _voyage_number := NEW.voyage;
      _carrier_name := NULL;
      _port_of_export := NEW.origin_port;
      _port_of_unlading := NEW.destination_port;
    END IF;

    INSERT INTO public.customs_filings (
      shipment_id, user_id, filing_type, status,
      exporter_name, consignee_name, consignee_address,
      country_of_destination, port_of_export, port_of_unlading,
      vessel_name, voyage_number, export_date,
      mode_of_transport, hts_codes, carrier_name
    ) VALUES (
      NEW.id, NEW.user_id, 'AES', 'draft',
      _shipper_name, _consignee_name, _consignee_address,
      NULL, _port_of_export, _port_of_unlading,
      _vessel_name, _voyage_number, NEW.etd,
      _mode_of_transport, _hts_codes, _carrier_name
    );
  END IF;

  RETURN NEW;
END;
$function$;