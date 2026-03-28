UPDATE shipments 
SET lifecycle_stage = 'quote_ready', 
    status = 'quote_ready', 
    etd = '2026-02-28'
WHERE id = '8a581129-8f46-42be-8631-88d38f580b5f';