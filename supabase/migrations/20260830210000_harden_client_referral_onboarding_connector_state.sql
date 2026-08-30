-- AVELIXA CLIENT REFERRAL ONBOARDING HARDENING
-- Do not create a Connector-owned Client lead when the attributed Connector
-- is no longer an active Connector account at onboarding time.

CREATE OR REPLACE FUNCTION public.complete_client_referral_onboarding(
  p_business_name text,
  p_industry text,
  p_contact_name text,
  p_phone text,
  p_requirements text,
  p_estimated_budget numeric DEFAULT NULL::numeric,
  p_timeline text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_client_id uuid := auth.uid();
  v_connector_id uuid;
  v_email text;
  v_business_id uuid;
  v_lead_id uuid;
  v_requirements text;
BEGIN
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_client_id
      AND ur.role = 'client'
  ) THEN
    RAISE EXCEPTION 'Client role required';
  END IF;

  SELECT p.client_referrer_connector_id, p.email
    INTO v_connector_id, v_email
  FROM public.profiles p
  WHERE p.id = v_client_id;

  IF v_connector_id IS NULL THEN
    RAISE EXCEPTION 'This account is not attributed to a Connector referral';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.connector_profiles cp
    JOIN public.user_roles ur
      ON ur.user_id = cp.user_id
     AND ur.role = 'connector'
    WHERE cp.user_id = v_connector_id
      AND cp.is_active = true
  ) THEN
    RAISE EXCEPTION 'The Connector who referred this account is no longer active';
  END IF;

  IF NULLIF(BTRIM(p_business_name), '') IS NULL THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;

  IF NULLIF(BTRIM(p_requirements), '') IS NULL THEN
    RAISE EXCEPTION 'Project requirements are required';
  END IF;

  -- Idempotent retry: the existing client-owned lead is the source of truth.
  SELECT l.id
    INTO v_lead_id
  FROM public.leads l
  WHERE l.client_id = v_client_id
  ORDER BY l.created_at ASC
  LIMIT 1;

  IF v_lead_id IS NOT NULL THEN
    RETURN v_lead_id;
  END IF;

  v_requirements := BTRIM(p_requirements);
  IF NULLIF(BTRIM(p_timeline), '') IS NOT NULL THEN
    v_requirements := v_requirements || E'\n\nTimeline: ' || BTRIM(p_timeline);
  END IF;

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
    NULLIF(BTRIM(p_contact_name), ''),
    v_email,
    NULLIF(BTRIM(p_phone), '')
  )
  RETURNING id INTO v_business_id;

  BEGIN
    INSERT INTO public.leads (
      business_id,
      client_id,
      connector_id,
      title,
      requirements,
      estimated_budget,
      status
    )
    VALUES (
      v_business_id,
      v_client_id,
      v_connector_id,
      'Client referral — ' || BTRIM(p_business_name),
      v_requirements,
      p_estimated_budget,
      'pending'
    )
    RETURNING id INTO v_lead_id;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT l.id
        INTO v_lead_id
      FROM public.leads l
      WHERE l.client_id = v_client_id
      ORDER BY l.created_at ASC
      LIMIT 1;

      IF v_lead_id IS NULL THEN
        RAISE;
      END IF;
  END;

  RETURN v_lead_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_client_referral_onboarding(
  text, text, text, text, text, numeric, text
) FROM anon;

GRANT EXECUTE ON FUNCTION public.complete_client_referral_onboarding(
  text, text, text, text, text, numeric, text
) TO authenticated;
