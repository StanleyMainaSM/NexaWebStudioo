-- Avelixa: complete Connector referral lifecycle only after the referred Connector
-- has completed the required onboarding. The original application referrer remains
-- authoritative; this migration does not backfill historical referrals.

CREATE OR REPLACE FUNCTION private.complete_connector_referral(p_connector_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_application public.connector_applications%ROWTYPE;
  v_referral_id uuid;
BEGIN
  IF p_connector_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_connector_id AND ur.role = 'connector'
  ) THEN RETURN NULL; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.connector_profiles cp
    WHERE cp.user_id = p_connector_id
      AND COALESCE(cp.is_active, false) = true
      AND cp.terms_accepted_at IS NOT NULL
      AND NULLIF(BTRIM(cp.terms_version), '') IS NOT NULL
  ) THEN RETURN NULL; END IF;

  SELECT ca.* INTO v_application
  FROM public.connector_applications ca
  WHERE ca.provisioned_user_id = p_connector_id
    AND ca.status = 'approved'
    AND ca.provisioning_status = 'completed'
    AND ca.referring_connector_id IS NOT NULL
  ORDER BY ca.provisioned_at DESC NULLS LAST, ca.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_application.referring_connector_id = p_connector_id THEN RETURN NULL; END IF;

  INSERT INTO public.referral_bonuses (referrer_id, referred_connector_id, amount, status)
  VALUES (v_application.referring_connector_id, p_connector_id, 0, 'approved')
  ON CONFLICT (referred_connector_id) DO NOTHING
  RETURNING id INTO v_referral_id;

  IF v_referral_id IS NULL THEN
    SELECT rb.id INTO v_referral_id
    FROM public.referral_bonuses rb
    WHERE rb.referred_connector_id = p_connector_id
    LIMIT 1;
  ELSE
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (
      p_connector_id,
      'connector_referral_completed',
      'referral_bonus',
      v_referral_id,
      jsonb_build_object(
        'referrer_id', v_application.referring_connector_id,
        'referred_connector_id', p_connector_id,
        'application_id', v_application.id,
        'onboarding_completed_at', now(),
        'monetary_reward_activated', false
      )
    );
  END IF;

  RETURN v_referral_id;
END;
$$;

REVOKE ALL ON FUNCTION private.complete_connector_referral(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.accept_connector_terms(p_terms_version text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT private.user_has_any_role(v_user_id, ARRAY['connector']) THEN RAISE EXCEPTION 'Connector role required'; END IF;
  IF NULLIF(BTRIM(p_terms_version), '') IS NULL THEN RAISE EXCEPTION 'Terms version is required'; END IF;

  UPDATE public.connector_profiles
  SET terms_accepted_at = NOW(), terms_version = BTRIM(p_terms_version), updated_at = NOW()
  WHERE user_id = v_user_id AND COALESCE(is_active, false) = true;

  IF NOT FOUND THEN RAISE EXCEPTION 'Active connector profile not found'; END IF;
  PERFORM private.complete_connector_referral(v_user_id);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_connector_terms(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_connector_terms(text) TO authenticated;

CREATE OR REPLACE FUNCTION private.sync_connector_application_provisioning_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE v_user_id uuid;
BEGIN
  IF NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.provisioned_user_id IS NULL THEN
    SELECT p.id INTO v_user_id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'connector'
    WHERE lower(p.email) = lower(NEW.email)
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      UPDATE public.connector_applications
      SET provisioning_status = 'completed',
          provisioned_user_id = v_user_id,
          provisioned_at = COALESCE(provisioned_at, NOW()),
          provisioning_error = NULL,
          updated_at = NOW()
      WHERE id = NEW.id AND provisioned_user_id IS NULL;

      UPDATE public.connector_provisioning_queue
      SET status = 'completed', user_id = v_user_id,
          completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE application_id = NEW.id AND status IN ('pending', 'processing');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_connector_application_provisioning_link() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_sync_connector_application_provisioning_link ON public.connector_applications;
CREATE TRIGGER trg_sync_connector_application_provisioning_link
AFTER INSERT OR UPDATE OF status ON public.connector_applications
FOR EACH ROW EXECUTE FUNCTION private.sync_connector_application_provisioning_link();

CREATE OR REPLACE FUNCTION private.complete_connector_referral_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF COALESCE(NEW.is_active, false) = true
     AND NEW.terms_accepted_at IS NOT NULL
     AND NULLIF(BTRIM(NEW.terms_version), '') IS NOT NULL THEN
    PERFORM private.complete_connector_referral(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.complete_connector_referral_from_profile() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_complete_connector_referral_onboarding ON public.connector_profiles;
CREATE TRIGGER trg_complete_connector_referral_onboarding
AFTER INSERT OR UPDATE OF is_active, terms_accepted_at, terms_version ON public.connector_profiles
FOR EACH ROW EXECUTE FUNCTION private.complete_connector_referral_from_profile();

CREATE INDEX IF NOT EXISTS referral_bonuses_referrer_id_idx ON public.referral_bonuses(referrer_id);

DROP POLICY IF EXISTS profiles_select_referred_connectors ON public.profiles;
CREATE POLICY profiles_select_referred_connectors
ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.referral_bonuses rb
  WHERE rb.referrer_id = (SELECT auth.uid())
    AND rb.referred_connector_id = profiles.id
));

COMMENT ON FUNCTION private.complete_connector_referral(uuid)
IS 'Creates exactly one successful referral record after the referred Connector has completed required onboarding; referrer comes only from connector_applications.referring_connector_id and no monetary reward is activated.';
