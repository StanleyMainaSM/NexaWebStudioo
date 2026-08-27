ALTER TABLE public.connector_profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT;

CREATE OR REPLACE FUNCTION public.accept_connector_terms(p_terms_version TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT private.user_has_any_role(auth.uid(), ARRAY['connector']) THEN
    RAISE EXCEPTION 'Connector role required';
  END IF;

  IF NULLIF(BTRIM(p_terms_version), '') IS NULL THEN
    RAISE EXCEPTION 'Terms version is required';
  END IF;

  UPDATE public.connector_profiles
  SET
    terms_accepted_at = NOW(),
    terms_version = BTRIM(p_terms_version),
    updated_at = NOW()
  WHERE user_id = auth.uid()
    AND COALESCE(is_active, false) = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active connector profile not found';
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_connector_terms(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_connector_terms(TEXT) TO authenticated;

COMMENT ON FUNCTION public.accept_connector_terms(TEXT)
IS 'Records acceptance of the current Avelixa Connector Terms for an active connector.';
