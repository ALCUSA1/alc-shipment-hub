
INSERT INTO public.alc_carriers (carrier_code, carrier_name, mode, status)
VALUES ('HLCU', 'Hapag-Lloyd', 'ocean', 'active')
ON CONFLICT (carrier_code) DO NOTHING;

INSERT INTO public.carrier_connections (
  carrier_id, environment, integration_type, base_url,
  auth_type, credential_key_name, api_key_header_name, status
)
SELECT id, 'production', 'rest_api', 'https://api.hlag.com/hlag/external/v1',
       'api_key', 'HLAG_CLIENT_ID', 'X-IBM-Client-Id', 'active'
FROM public.alc_carriers
WHERE carrier_code = 'HLCU'
  AND NOT EXISTS (
    SELECT 1 FROM public.carrier_connections cc
    JOIN public.alc_carriers c ON c.id = cc.carrier_id
    WHERE c.carrier_code = 'HLCU' AND cc.environment = 'production'
  );
