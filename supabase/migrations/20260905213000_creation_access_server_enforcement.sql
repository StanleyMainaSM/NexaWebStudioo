-- AVELIXA — SERVER ENFORCEMENT FOR WEBSITE/TEMPLATE CREATION ACCESS
-- Normal Supabase portal authentication remains independent from this gate.
-- Creation access is a separate, session-bound authorization boundary.

CREATE OR REPLACE FUNCTION private.verify_portal_access_password(p_portal text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, extensions, pg_temp
AS $$
DECLARE
  v_portal text := lower(trim(p_portal));
  v_password text := coalesce(p_password, '');
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_password_hash text;
BEGIN
  IF v_user_id IS NULL OR v_portal NOT IN ('client','operator','connector','admin','owner','creation') THEN
    RETURN false;
  END IF;
  IF NOT private.portal_access_role_allowed(v_user_id, v_portal) THEN
    RETURN false;
  END IF;
  BEGIN
    v_session_id := (auth.jwt() ->> 'session_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  IF v_session_id IS NULL THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM auth.sessions s
    WHERE s.id = v_session_id
      AND s.user_id = v_user_id
      AND coalesce(s.not_after, 'infinity'::timestamptz) > now()
  ) THEN
    RETURN false;
  END IF;

  SELECT pap.password_hash
    INTO v_password_hash
    FROM private.portal_access_passwords pap
   WHERE pap.portal = v_portal;

  IF v_password_hash IS NULL OR crypt(v_password, v_password_hash) <> v_password_hash THEN
    RETURN false;
  END IF;

  INSERT INTO private.portal_access_unlocks(user_id, portal, session_id, unlocked_at, expires_at)
  VALUES (v_user_id, v_portal, v_session_id, now(), now() + interval '8 hours')
  ON CONFLICT (user_id, portal, session_id)
  DO UPDATE SET unlocked_at = now(), expires_at = now() + interval '8 hours';
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION private.has_portal_access(p_portal text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, extensions, pg_temp
AS $$
DECLARE
  v_portal text := lower(trim(p_portal));
  v_user_id uuid := auth.uid();
  v_session_id uuid;
BEGIN
  IF v_user_id IS NULL OR v_portal NOT IN ('client','operator','connector','admin','owner','creation') THEN
    RETURN false;
  END IF;
  IF NOT private.portal_access_role_allowed(v_user_id, v_portal) THEN
    RETURN false;
  END IF;
  BEGIN
    v_session_id := (auth.jwt() ->> 'session_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  IF v_session_id IS NULL THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM auth.sessions s
    WHERE s.id = v_session_id
      AND s.user_id = v_user_id
      AND coalesce(s.not_after, 'infinity'::timestamptz) > now()
  ) THEN
    RETURN false;
  END IF;

  DELETE FROM private.portal_access_unlocks WHERE expires_at <= now();
  RETURN EXISTS (
    SELECT 1
    FROM private.portal_access_unlocks u
    WHERE u.user_id = v_user_id
      AND u.portal = v_portal
      AND u.session_id = v_session_id
      AND u.expires_at > now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_portal_access_password(p_portal text, p_password text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, extensions, pg_temp
AS $$ SELECT private.verify_portal_access_password(p_portal, p_password); $$;

CREATE OR REPLACE FUNCTION public.has_portal_access(p_portal text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, extensions, pg_temp
AS $$ SELECT private.has_portal_access(p_portal); $$;

-- Direct table access is still allowed only for an authenticated user who has
-- both the normal creation role authorization and the dedicated creation unlock.
DROP POLICY IF EXISTS "Authorized users read creation projects" ON public.creation_projects;
CREATE POLICY "Authorized users read creation projects"
  ON public.creation_projects FOR SELECT
  USING (
    private.has_portal_access('creation')
    AND (
      client_id = auth.uid()
      OR connector_id = auth.uid()
      OR operator_id = auth.uid()
      OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
    )
  );

DROP POLICY IF EXISTS "Authorized users update creation projects" ON public.creation_projects;
CREATE POLICY "Authorized users update creation projects"
  ON public.creation_projects FOR UPDATE
  USING (
    private.has_portal_access('creation')
    AND (
      client_id = auth.uid()
      OR connector_id = auth.uid()
      OR operator_id = auth.uid()
      OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
    )
  )
  WITH CHECK (
    private.has_portal_access('creation')
    AND (
      client_id = auth.uid()
      OR connector_id = auth.uid()
      OR operator_id = auth.uid()
      OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
    )
  );

DROP POLICY IF EXISTS "Users read own creation entitlement" ON public.creation_generation_entitlements;
CREATE POLICY "Users read own creation entitlement"
  ON public.creation_generation_entitlements FOR SELECT
  USING (
    private.has_portal_access('creation')
    AND (user_id = auth.uid() OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin']))
  );

DROP POLICY IF EXISTS "Users read own creation usage" ON public.creation_generation_usage;
CREATE POLICY "Users read own creation usage"
  ON public.creation_generation_usage FOR SELECT
  USING (
    private.has_portal_access('creation')
    AND (user_id = auth.uid() OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin']))
  );

-- SECURITY DEFINER RPCs do not rely on caller RLS, so enforce the same boundary
-- at the actual creation-project mutation point. Trusted internal migrations
-- without an authenticated caller remain unaffected.
CREATE OR REPLACE FUNCTION private.enforce_creation_access_on_project_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, extensions, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT private.has_portal_access('creation') THEN
    RAISE EXCEPTION 'Website and template creation access required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_creation_access_on_project_mutation ON public.creation_projects;
CREATE TRIGGER enforce_creation_access_on_project_mutation
BEFORE INSERT OR UPDATE ON public.creation_projects
FOR EACH ROW EXECUTE FUNCTION private.enforce_creation_access_on_project_mutation();

-- Generated artifacts are the mutation boundary used by generation and
-- publishing. Public preview reads remain unaffected; authenticated writes
-- require the same dedicated creation unlock.
CREATE OR REPLACE FUNCTION private.enforce_creation_access_on_output_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, extensions, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT private.has_portal_access('creation') THEN
    RAISE EXCEPTION 'Website and template creation access required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_creation_access_on_output_mutation ON public.creation_generated_website_outputs;
CREATE TRIGGER enforce_creation_access_on_output_mutation
BEFORE INSERT OR UPDATE ON public.creation_generated_website_outputs
FOR EACH ROW EXECUTE FUNCTION private.enforce_creation_access_on_output_mutation();

CREATE OR REPLACE FUNCTION public.get_creation_generation_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT private.has_portal_access('creation') THEN
    RAISE EXCEPTION 'Website and template creation access required';
  END IF;
  INSERT INTO public.creation_generation_entitlements(user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  INSERT INTO public.creation_generation_usage(user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  SELECT generation_limit INTO v_limit FROM public.creation_generation_entitlements WHERE user_id = auth.uid();
  SELECT generation_count INTO v_used FROM public.creation_generation_usage WHERE user_id = auth.uid();
  RETURN jsonb_build_object('plan','free','used',v_used,'limit',v_limit,'remaining',GREATEST(v_limit-v_used,0));
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_creation_access_on_project_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enforce_creation_access_on_output_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.verify_portal_access_password(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.has_portal_access(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_portal_access_password(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_portal_access(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creation_generation_status() TO authenticated;

COMMENT ON FUNCTION public.has_portal_access(text) IS 'Server-side, Supabase-session-bound access assertion for legacy portals and the dedicated website/template creation gate.';
