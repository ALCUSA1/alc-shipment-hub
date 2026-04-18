UPDATE public.carrier_connections
SET
  base_url = 'https://qaews.switch-hub.com',
  oauth_token_url = 'https://qaews.switch-hub.com/server/sol/eauth/oauth2/v1.0/token',
  token_scope = NULL,                  -- scope is set per-call (TNT vs DCSA_CS)
  access_token_encrypted = NULL,       -- invalidate any cached token
  token_expires_at = NULL,
  updated_at = now()
WHERE carrier_id = (SELECT id FROM public.alc_carriers WHERE carrier_code = 'EGLV')
  AND environment = 'production';