-- Temporarily allow booked -> in_transit for testing
UPDATE public.shipments 
SET lifecycle_stage = 'in_transit', status = 'in_transit'
WHERE id = '8a581129-8f46-42be-8631-88d38f580b5f';