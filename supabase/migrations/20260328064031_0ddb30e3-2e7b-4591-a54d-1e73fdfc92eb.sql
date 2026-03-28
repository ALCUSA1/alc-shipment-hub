
CREATE OR REPLACE FUNCTION public.auto_create_customs_filing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _shipper record;
  _consignee record;
  _forwarder record;
  _hts_codes jsonb;
  _existing_count int;
  _mode_of_transport text;
  _vessel_name text;
  _voyage_number text;
  _carrier_name text;
  _port_of_export text;
  _port_of_unlading text;
  _method_of_transportation text;
  _has_dg boolean;
  _company_ein text;
BEGIN
  IF NEW.status = 'booked' AND (OLD IS NULL OR OLD.status <> 'booked') THEN
    SELECT count(*) INTO _existing_count
    FROM public.customs_filings
    WHERE shipment_id = NEW.id;

    IF _existing_count > 0 THEN
      RETURN NEW;
    END IF;

    -- Get shipper party with full details
    SELECT * INTO _shipper
    FROM public.shipment_parties
    WHERE shipment_id = NEW.id AND role = 'shipper'
    LIMIT 1;

    -- Get consignee party with full details
    SELECT * INTO _consignee
    FROM public.shipment_parties
    WHERE shipment_id = NEW.id AND role = 'consignee'
    LIMIT 1;

    -- Get forwarding agent
    SELECT * INTO _forwarder
    FROM public.shipment_parties
    WHERE shipment_id = NEW.id AND role IN ('freight_forwarder', 'forwarding_agent')
    LIMIT 1;

    -- Get company EIN
    IF NEW.company_id IS NOT NULL THEN
      SELECT ein INTO _company_ein FROM public.companies WHERE id = NEW.company_id;
    END IF;

    -- Check dangerous goods
    SELECT EXISTS (SELECT 1 FROM public.cargo WHERE shipment_id = NEW.id AND dangerous_goods = true)
    INTO _has_dg;

    -- Build HTS codes from cargo
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'code', COALESCE(c.hts_code, c.schedule_b, c.hs_code, ''),
      'description', COALESCE(c.commodity, ''),
      'quantity', COALESCE(c.num_packages, c.pieces),
      'value', c.total_value,
      'd_f', CASE WHEN c.country_of_origin IN ('US', 'USA') THEN 'D' ELSE 'F' END,
      'shipping_weight_kg', c.gross_weight,
      'vin_product_number', '',
      'export_info_code', '',
      'license_number', '',
      'license_code', ''
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
      _method_of_transportation := '40';
    ELSE
      _mode_of_transport := 'vessel';
      _vessel_name := NEW.vessel;
      _voyage_number := NEW.voyage;
      _carrier_name := NULL;
      _port_of_export := NEW.origin_port;
      _port_of_unlading := NEW.destination_port;
      _method_of_transportation := CASE WHEN NEW.container_type IS NOT NULL THEN '11' ELSE '10' END;
    END IF;

    INSERT INTO public.customs_filings (
      shipment_id, user_id, filing_type, status,
      exporter_name, exporter_ein, usppi_address, usppi_contact_name, usppi_phone, usppi_email,
      consignee_name, consignee_address, ultimate_consignee_type,
      country_of_destination, state_of_origin,
      port_of_export, port_of_unlading,
      vessel_name, voyage_number, export_date,
      mode_of_transport, carrier_name, carrier_identification_code,
      method_of_transportation, containerized, hazardous_materials,
      routed_export_transaction, related_parties,
      shipment_reference_number, filing_option,
      authorized_agent_name, authorized_agent_address, authorized_agent_ein,
      broker_name, broker_email,
      hts_codes
    ) VALUES (
      NEW.id, NEW.user_id, 'AES', 'draft',
      _shipper.company_name,
      COALESCE(_shipper.tax_id, _company_ein),
      CONCAT_WS(', ', _shipper.address, _shipper.city, _shipper.state, _shipper.postal_code, _shipper.country),
      _shipper.contact_name,
      _shipper.phone,
      _shipper.email,
      _consignee.company_name,
      CONCAT_WS(', ', _consignee.address, _consignee.city, _consignee.state, _consignee.postal_code, _consignee.country),
      'O',
      COALESCE(_consignee.country, NEW.destination_country),
      _shipper.state,
      _port_of_export, _port_of_unlading,
      _vessel_name, _voyage_number, NEW.etd,
      _mode_of_transport, _carrier_name, NULL,
      _method_of_transportation,
      CASE WHEN NEW.mode <> 'air' AND NEW.container_type IS NOT NULL THEN true ELSE false END,
      _has_dg,
      false, false,
      NEW.shipment_ref, '2',
      _forwarder.company_name,
      CONCAT_WS(', ', _forwarder.address, _forwarder.city, _forwarder.state, _forwarder.postal_code, _forwarder.country),
      _forwarder.tax_id,
      _forwarder.company_name,
      _forwarder.email,
      _hts_codes
    );
  END IF;

  RETURN NEW;
END;
$function$;
