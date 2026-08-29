-- Avelixa client referral + self-onboarding integration.
-- Extends the existing profiles/businesses/leads/auth architecture only.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_referrer_connector_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_client_referrer_connector_id
  ON public.profiles (client_referrer_connector_id);

CREATE INDEX IF NOT EXISTS idx_leads_client_id
  ON public.leads (client_id);

CREATE UNIQUE INDEX IF NOT EXISTS leads_one_client_owned_lead_idx
  ON public.leads (client_id)
  WHERE client_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_avl_id text := NULLIF(BTRIM(new.raw_user_meta_data ->> 'client_referral_avl_id'), '');
  v_referrer_id uuid;
  v_full_name text := NULLIF(BTRIM(new.raw_user_meta_data ->> 'full_name'), '');
BEGIN
  IF v_avl_id IS NOT NULL THEN
    SELECT cp.user_id
      INTO v_referrer_id
    FROM public.connector_profiles cp
    JOIN public.user_roles ur
      ON ur.user_id = cp.user_id
     AND ur.role = 'connector'
    WHERE LOWER(cp.avl_id) = LOWER(v_avl_id)
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
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'client');

  RETURN new;
END;
$$;

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

DROP TRIGGER IF EXISTS trg_protect_client_referrer_attribution ON public.profiles;
CREATE TRIGGER trg_protect_client_referrer_attribution
BEFORE UPDATE OF client_referrer_connector_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION private.protect_client_referrer_attribution();

REVOKE ALL ON FUNCTION private.protect_client_referrer_attribution() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_client_referral_onboarding(
  p_business_name text,
  p_industry text,
  p_contact_name text,
  p_phone text,
  p_requirements text,
  p_estimated_budget numeric DEFAULT NULL,
  p_timeline text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

  IF NULLIF(BTRIM(p_business_name), '') IS NULL THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;

  IF NULLIF(BTRIM(p_requirements), '') IS NULL THEN
    RAISE EXCEPTION 'Project requirements are required';
  END IF;

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

REVOKE ALL ON FUNCTION public.complete_client_referral_onboarding(text,text,text,text,text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_client_referral_onboarding(text,text,text,text,text,numeric,text) TO authenticated;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can select own leads" ON public.leads;
CREATE POLICY "Clients can select own leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  client_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin'])
  OR (
    private.user_has_any_role(auth.uid(), ARRAY['connector'])
    AND connector_id = auth.uid()
  )
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can select businesses tied to own leads" ON public.businesses;
CREATE POLICY "Clients can select businesses tied to own leads"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.business_id = businesses.id
      AND l.client_id = auth.uid()
  )
  OR private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin'])
  OR (
    private.user_has_any_role(auth.uid(), ARRAY['connector'])
    AND EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.business_id = businesses.id
        AND l.connector_id = auth.uid()
    )
  )
);

COMMENT ON COLUMN public.profiles.client_referrer_connector_id IS
  'Write-once Connector attribution captured at Client Auth signup from a validated AVL referral.';

COMMENT ON COLUMN public.leads.client_id IS
  'Authenticated Client who owns this lead; populated by the Client onboarding RPC for referral-created leads.';
