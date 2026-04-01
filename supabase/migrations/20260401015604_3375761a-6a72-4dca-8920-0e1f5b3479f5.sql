
DELETE FROM public.carrier_event_mappings
  WHERE carrier_id = (SELECT id FROM public.alc_carriers WHERE carrier_code = 'EGLV' LIMIT 1)
  AND message_family = 'tracking';

DO $$
DECLARE
  _cid uuid;
BEGIN
  SELECT id INTO _cid FROM public.alc_carriers WHERE carrier_code = 'EGLV' LIMIT 1;
  IF _cid IS NULL THEN RETURN; END IF;

  INSERT INTO public.carrier_event_mappings (carrier_id, message_family, event_scope, external_code, external_name, internal_code, internal_name, event_classifier_code, internal_classifier, status_category, active) VALUES
  (_cid,'tracking','shipment','DEPA','Departed','departed','Vessel Departed','ACT','actual','departed',true),
  (_cid,'tracking','shipment','DEPA','Departed (Planned)','departed','Vessel Departed','PLN','planned','departed',true),
  (_cid,'tracking','shipment','ARRI','Arrived','arrived','Vessel Arrived','ACT','actual','arrived',true),
  (_cid,'tracking','shipment','ARRI','Arrived (Planned)','arrived','Vessel Arrived','PLN','planned','arrived',true),
  (_cid,'tracking','shipment','ARRI','Arrived (Estimated)','arrived','Vessel Arrived','EST','estimated','arrived',true),
  (_cid,'tracking','equipment','LOAD','Loaded on Vessel','loaded','Container Loaded','ACT','actual','departed',true),
  (_cid,'tracking','equipment','LOAD','Loaded on Vessel (Planned)','loaded','Container Loaded','PLN','planned','departed',true),
  (_cid,'tracking','equipment','DISC','Discharged from Vessel','discharged','Container Discharged','ACT','actual','discharged',true),
  (_cid,'tracking','equipment','DISC','Discharged from Vessel (Planned)','discharged','Container Discharged','PLN','planned','discharged',true),
  (_cid,'tracking','equipment','GTIN','Gate In','gate_in','Gate In at Terminal','ACT','actual','gate_activity',true),
  (_cid,'tracking','equipment','GTOT','Gate Out','gate_out','Gate Out from Terminal','ACT','actual','gate_activity',true),
  (_cid,'tracking','equipment','GTIN','Gate In (Planned)','gate_in','Gate In at Terminal','PLN','planned','gate_activity',true),
  (_cid,'tracking','equipment','GTOT','Gate Out (Planned)','gate_out','Gate Out from Terminal','PLN','planned','gate_activity',true),
  (_cid,'tracking','equipment','RCEF','Rail Car Received','rail_received','Rail Car Received','ACT','actual','in_transit',true),
  (_cid,'tracking','equipment','RCDI','Rail Departed Intermodal','rail_departed','Rail Departed','ACT','actual','in_transit',true),
  (_cid,'tracking','equipment','AVPU','Empty Available for Pickup','empty_available','Empty Available for Pickup','ACT','actual','gate_activity',true),
  (_cid,'tracking','equipment','RTRN','Empty Returned','empty_returned','Empty Container Returned','ACT','actual','gate_activity',true),
  (_cid,'tracking','shipment','TSLB','Transshipment Load','transshipment_load','Transshipment Loaded','ACT','actual','in_transit',true),
  (_cid,'tracking','shipment','TSDC','Transshipment Discharge','transshipment_discharge','Transshipment Discharged','ACT','actual','in_transit',true),
  (_cid,'tracking','equipment','DLVR','Delivered','delivered','Cargo Delivered','ACT','actual','delivered',true),
  (_cid,'tracking','shipment','BKCF','Booking Confirmed','booking_confirmed','Booking Confirmed','ACT','actual','booked',true),
  (_cid,'tracking','equipment','CUST','Customs Release','customs_release','Customs Released','ACT','actual','arrived',true),
  (_cid,'tracking','equipment','CUSI','Customs Inspection','customs_inspection','Customs Inspection','ACT','actual','arrived',true),
  (_cid,'tracking','equipment','STUF','Container Stuffed','stuffed','Container Stuffed','ACT','actual','gate_activity',true),
  (_cid,'tracking','equipment','STRP','Container Stripped','stripped','Container Stripped','ACT','actual','gate_activity',true);
END $$;
