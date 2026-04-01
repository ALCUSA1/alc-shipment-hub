UPDATE public.carrier_connections 
SET oauth_client_secret_key_name = 'EVERGREEN_CLIENT_SECRET',
    status = 'active',
    updated_at = now()
WHERE id = 'de2b44a6-fb9c-43d9-a2df-008d85b59a0a';