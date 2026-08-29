-- Keep Client referral attribution immutable for authenticated callers.
-- Auth-trigger and trusted server-side execution has no caller JWT and remains able to write it.

CREATE OR REPLACE FUNCTION private.protect_client_referrer_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.client_referrer_connector_id IS DISTINCT FROM NEW.client_referrer_connector_id
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.role IN ('owner', 'admin')
     ) THEN
    RAISE EXCEPTION 'Client referral attribution cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_client_referrer_attribution() FROM PUBLIC, anon, authenticated;
