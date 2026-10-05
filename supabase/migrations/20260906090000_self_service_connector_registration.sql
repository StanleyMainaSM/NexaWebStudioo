-- Migration: 20260906090000_self_service_connector_registration.sql
-- Description: Enables self-service Connector registration without Owner approval.
-- Connectors create their account directly, set their own password, optionally attach
-- a valid referring Connector, accept Connector Terms upon authentication, and access the portal.

-- 1. Helper function to check whether an email address is already registered in Auth or Profiles
CREATE OR REPLACE FUNCTION public.check_email_registered(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email text := lower(trim(p_email));
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = v_email
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(email) = v_email
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_email_registered(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_email_registered(text) TO anon, authenticated, service_role;

-- 2. Helper function to validate an optional referring Connector ID
CREATE OR REPLACE FUNCTION public.validate_connector_referral(p_referral text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_code text := upper(trim(p_referral));
  v_record RECORD;
BEGIN
  IF v_code IS NULL OR v_code = '' THEN
    RETURN jsonb_build_object('valid', true, 'avl_id', null, 'connector_name', null);
  END IF;

  SELECT cp.user_id, cp.avl_id, p.full_name
    INTO v_record
  FROM public.connector_profiles cp
  JOIN public.user_roles ur
    ON ur.user_id = cp.user_id
   AND ur.role = 'connector'
  LEFT JOIN public.profiles p
    ON p.id = cp.user_id
  WHERE UPPER(cp.avl_id) = v_code
    AND COALESCE(cp.is_active, false) = true
  LIMIT 1;

  IF v_record.user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', true,
      'avl_id', v_record.avl_id,
      'connector_name', COALESCE(v_record.full_name, 'Avelixa Connector')
    );
  ELSE
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'The referring Connector ID was not found or is inactive.'
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_connector_referral(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_connector_referral(text) TO anon, authenticated, service_role;

-- 3. Update handle_new_user trigger to handle direct self-service connector registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_registration_type text := NULLIF(BTRIM(new.raw_user_meta_data ->> 'registration_type'), '');
  v_full_name text := NULLIF(BTRIM(new.raw_user_meta_data ->> 'full_name'), '');
  v_phone text := NULLIF(BTRIM(new.raw_user_meta_data ->> 'phone'), '');
  v_national_id text := NULLIF(BTRIM(new.raw_user_meta_data ->> 'national_id'), '');
  v_county text := NULLIF(BTRIM(new.raw_user_meta_data ->> 'county'), '');
  v_town text := NULLIF(BTRIM(new.raw_user_meta_data ->> 'town'), '');
  v_connector_referral text := NULLIF(BTRIM(new.raw_user_meta_data ->> 'referring_connector_avl_id'), '');
  v_client_referral text := NULLIF(BTRIM(new.raw_user_meta_data ->> 'client_referral_avl_id'), '');
  v_referrer_id uuid := NULL;
BEGIN
  IF v_registration_type = 'connector' THEN
    -- Validate optional referring connector if provided
    IF v_connector_referral IS NOT NULL THEN
      SELECT cp.user_id
        INTO v_referrer_id
      FROM public.connector_profiles cp
      JOIN public.user_roles ur
        ON ur.user_id = cp.user_id
       AND ur.role = 'connector'
      WHERE UPPER(cp.avl_id) = UPPER(v_connector_referral)
        AND COALESCE(cp.is_active, false) = true
      LIMIT 1;

      IF v_referrer_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive Connector referral ID';
      END IF;
    END IF;

    -- 1. Create or update profile
    INSERT INTO public.profiles (
      id,
      email,
      full_name
    )
    VALUES (
      new.id,
      new.email,
      v_full_name
    )
    ON CONFLICT (id) DO UPDATE
    SET
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      updated_at = NOW();

    -- 2. Assign connector role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'connector')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- 3. Create active connector profile with terms not yet accepted
    INSERT INTO public.connector_profiles (
      user_id,
      is_active,
      commission_rate,
      terms_accepted_at,
      terms_version
    )
    VALUES (
      new.id,
      true,
      20.00,
      NULL,
      NULL
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      is_active = true,
      updated_at = NOW();

    -- 4. Record application in connector_applications for tracking, referrals, and Owner visibility
    INSERT INTO public.connector_applications (
      full_name,
      email,
      phone,
      national_id_secure,
      county,
      town,
      referring_connector_id,
      status,
      provisioning_status,
      provisioned_user_id,
      provisioned_at
    )
    VALUES (
      COALESCE(v_full_name, split_part(new.email, '@', 1)),
      LOWER(TRIM(new.email)),
      v_phone,
      v_national_id,
      v_county,
      v_town,
      v_referrer_id,
      'approved',
      'completed',
      new.id,
      NOW()
    );

  ELSE
    -- Client or standard account creation flow
    IF v_client_referral IS NOT NULL THEN
      SELECT cp.user_id
        INTO v_referrer_id
      FROM public.connector_profiles cp
      JOIN public.user_roles ur
        ON ur.user_id = cp.user_id
       AND ur.role = 'connector'
      WHERE LOWER(cp.avl_id) = LOWER(v_client_referral)
        AND COALESCE(cp.is_active, false) = true
      LIMIT 1;

      IF v_referrer_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive Connector referral link';
      END IF;
    END IF;

    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      client_referrer_connector_id
    )
    VALUES (
      new.id,
      new.email,
      v_full_name,
      v_referrer_id
    )
    ON CONFLICT (id) DO UPDATE
    SET
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      client_referrer_connector_id = COALESCE(v_referrer_id, public.profiles.client_referrer_connector_id),
      updated_at = NOW();

    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'client')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
