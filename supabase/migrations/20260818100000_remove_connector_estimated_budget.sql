-- ============================================================
-- AVELIXA: REMOVE CONNECTOR ESTIMATED BUDGET
-- ============================================================
--
-- Connector lead submissions must not determine or provide
-- the official project price.
--
-- The correct Avelixa flow is:
--
-- Connector submits lead
--        ↓
-- Admin reviews/contact business
--        ↓
-- Admin determines final project price
--        ↓
-- Project is created
--        ↓
-- Connector commission is calculated from final project price
--
-- This migration removes the old seven-argument RPC and
-- replaces it with a six-argument version without
-- p_estimated_budget.
-- ============================================================

DROP FUNCTION IF EXISTS public.submit_connector_lead(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  DECIMAL
);

CREATE OR REPLACE FUNCTION public.submit_connector_lead(
  p_business_name TEXT,
  p_industry TEXT DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_requirements TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_business_id UUID;
  v_lead_id UUID;
BEGIN
  -- ----------------------------------------------------------
  -- Authentication
  -- ----------------------------------------------------------

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- ----------------------------------------------------------
  -- Connector authorization
  -- ----------------------------------------------------------

  IF NOT private.user_has_any_role(
    auth.uid(),
    ARRAY['connector']
  ) THEN
    RAISE EXCEPTION 'Connector role required';
  END IF;

  -- ----------------------------------------------------------
  -- Input validation
  -- ----------------------------------------------------------

  IF NULLIF(BTRIM(p_business_name), '') IS NULL THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;

  IF NULLIF(BTRIM(p_contact_name), '') IS NULL THEN
    RAISE EXCEPTION 'Contact name is required';
  END IF;

  IF NULLIF(BTRIM(p_email), '') IS NULL THEN
    RAISE EXCEPTION 'Contact email is required';
  END IF;

  IF NULLIF(BTRIM(p_requirements), '') IS NULL THEN
    RAISE EXCEPTION 'Requirements are required';
  END IF;

  -- ----------------------------------------------------------
  -- Create business
  -- ----------------------------------------------------------

  INSERT INTO public.businesses (
    name,
    industry,
    contact_name,
    email,
    phone
  )
  VALUES (
    BTRIM(p_business_name),
    NULLIF(BTRIM(p_industry), ''),
    BTRIM(p_contact_name),
    LOWER(BTRIM(p_email)),
    NULLIF(BTRIM(p_phone), '')
  )
  RETURNING id INTO v_business_id;

  -- ----------------------------------------------------------
  -- Create lead
  -- ----------------------------------------------------------
  --
  -- No project price or estimated budget is supplied by the
  -- connector. Pricing is determined later by Admin.
  -- ----------------------------------------------------------

  INSERT INTO public.leads (
    business_id,
    connector_id,
    title,
    requirements,
    status
  )
  VALUES (
    v_business_id,
    auth.uid(),
    'Lead from ' || BTRIM(p_business_name),
    BTRIM(p_requirements),
    'pending'
  )
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

REVOKE ALL
ON FUNCTION public.submit_connector_lead(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.submit_connector_lead(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
)
TO authenticated;

COMMENT ON FUNCTION public.submit_connector_lead(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
)
IS 'Securely creates a business and connector-owned lead. Project pricing is determined later by Avelixa Admin.';