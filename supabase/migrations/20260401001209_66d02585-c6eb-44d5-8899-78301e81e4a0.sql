
-- Add OAuth token columns to carrier_connections
ALTER TABLE public.carrier_connections
  ADD COLUMN IF NOT EXISTS oauth_token_url text,
  ADD COLUMN IF NOT EXISTS oauth_client_id text,
  ADD COLUMN IF NOT EXISTS oauth_client_secret_key_name text,
  ADD COLUMN IF NOT EXISTS access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS token_scope text,
  ADD COLUMN IF NOT EXISTS api_key_header_name text DEFAULT 'X-API-Key';

CREATE INDEX IF NOT EXISTS idx_carrier_connections_carrier_env
  ON public.carrier_connections (carrier_id, environment);
