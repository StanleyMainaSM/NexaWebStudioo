-- Persist the latest successful Website Creation generation metadata on the
-- existing Creation Project. WebsiteSpecification remains the content source
-- of truth; these fields only describe generated-output lifecycle state.

ALTER TABLE public.creation_projects
  ADD COLUMN IF NOT EXISTS latest_generated_output_identity TEXT,
  ADD COLUMN IF NOT EXISTS latest_generated_output_version TEXT,
  ADD COLUMN IF NOT EXISTS latest_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation_state TEXT NOT NULL DEFAULT 'never_generated',
  ADD COLUMN IF NOT EXISTS last_generation_error TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'creation_projects_generation_state_check'
      AND conrelid = 'public.creation_projects'::regclass
  ) THEN
    ALTER TABLE public.creation_projects
      ADD CONSTRAINT creation_projects_generation_state_check
      CHECK (generation_state IN ('never_generated', 'current', 'generation_failed'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS creation_projects_generated_identity_idx
  ON public.creation_projects(latest_generated_output_identity);

-- Replace the existing generation RPC so quota consumption and successful
-- generated-output metadata are committed atomically under the same project
-- authorization boundary.
DROP FUNCTION IF EXISTS public.consume_creation_generation(UUID,UUID,TEXT[],JSONB);

CREATE OR REPLACE FUNCTION public.consume_creation_generation(
  p_creation_project_id UUID,
  p_template_id UUID,
  p_requested_sections TEXT[],
  p_specification JSONB,
  p_output_identity TEXT,
  p_output_version TEXT,
  p_generated_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_limit INTEGER;
  v_used INTEGER;
  v_template_active BOOLEAN;
  v_project_allowed BOOLEAN;
  v_attribution_enabled BOOLEAN;
  v_token UUID;
  v_spec JSONB;
  v_latest_identity TEXT;
  v_deduplicated BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NULLIF(BTRIM(p_output_identity), '') IS NULL THEN RAISE EXCEPTION 'Generated output identity is required'; END IF;
  IF NULLIF(BTRIM(p_output_version), '') IS NULL THEN RAISE EXCEPTION 'Generated output version is required'; END IF;
  IF p_generated_at IS NULL THEN RAISE EXCEPTION 'Generated timestamp is required'; END IF;

  SELECT is_active INTO v_template_active
  FROM public.website_templates
  WHERE id = p_template_id;
  IF COALESCE(v_template_active, false) = false THEN RAISE EXCEPTION 'Template is inactive or unavailable'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.creation_projects cp
    WHERE cp.id = p_creation_project_id
      AND (
        cp.client_id = auth.uid()
        OR cp.connector_id = auth.uid()
        OR (cp.operator_id = auth.uid() AND EXISTS (
          SELECT 1 FROM public.creation_operator_access a
          WHERE a.operator_id = auth.uid() AND a.can_generate = true
        ))
        OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
      )
  ) INTO v_project_allowed;
  IF NOT v_project_allowed THEN RAISE EXCEPTION 'Creation generation access denied'; END IF;

  SELECT attribution_enabled, public_preview_token, latest_generated_output_identity
    INTO v_attribution_enabled, v_token, v_latest_identity
  FROM public.creation_projects
  WHERE id = p_creation_project_id
  FOR UPDATE;

  IF v_token IS NULL THEN v_token := gen_random_uuid(); END IF;

  v_spec := COALESCE(p_specification, '{}'::jsonb);
  v_spec := jsonb_set(v_spec, '{attribution,enabled}', to_jsonb(COALESCE(v_attribution_enabled, true)), true);
  v_spec := jsonb_set(v_spec, '{attribution,label}', '"Made with Avelixa"'::jsonb, true);

  INSERT INTO public.creation_generation_entitlements(user_id)
  VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.creation_generation_usage(user_id)
  VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;

  SELECT generation_limit INTO v_limit
  FROM public.creation_generation_entitlements
  WHERE user_id = auth.uid()
  FOR UPDATE;

  SELECT generation_count INTO v_used
  FROM public.creation_generation_usage
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF v_latest_identity IS DISTINCT FROM p_output_identity THEN
    IF v_used >= v_limit THEN
      RAISE EXCEPTION 'Template generation limit reached (% generations)', v_limit USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.creation_generation_usage
    SET generation_count = generation_count + 1, updated_at = NOW()
    WHERE user_id = auth.uid()
    RETURNING generation_count INTO v_used;
  ELSE
    v_deduplicated := true;
  END IF;

  UPDATE public.creation_projects
  SET selected_template_id = p_template_id,
      requested_sections = COALESCE(p_requested_sections, '{}'),
      specification = v_spec,
      public_preview_token = v_token,
      preview_enabled = true,
      generation_state = 'current',
      latest_generated_output_identity = p_output_identity,
      latest_generated_output_version = p_output_version,
      latest_generated_at = p_generated_at,
      last_generation_error = NULL,
      status = 'preview',
      updated_at = NOW()
  WHERE id = p_creation_project_id;

  RETURN jsonb_build_object(
    'generation_count', v_used,
    'generation_limit', v_limit,
    'public_preview_token', v_token,
    'latest_generated_output_identity', p_output_identity,
    'latest_generated_output_version', p_output_version,
    'latest_generated_at', p_generated_at,
    'generation_state', 'current',
    'deduplicated', v_deduplicated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_creation_generation(UUID,UUID,TEXT[],JSONB,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_creation_generation(UUID,UUID,TEXT[],JSONB,TEXT,TEXT,TIMESTAMPTZ) TO authenticated;

-- A failed attempt only records the failure state. It never overwrites the
-- latest successful identity/version/timestamp.
CREATE OR REPLACE FUNCTION public.mark_creation_generation_failed(
  p_creation_project_id UUID,
  p_error TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_project_allowed BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.creation_projects cp
    WHERE cp.id = p_creation_project_id
      AND (
        cp.client_id = auth.uid()
        OR cp.connector_id = auth.uid()
        OR (cp.operator_id = auth.uid() AND EXISTS (
          SELECT 1 FROM public.creation_operator_access a
          WHERE a.operator_id = auth.uid() AND a.can_generate = true
        ))
        OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
      )
  ) INTO v_project_allowed;

  IF NOT v_project_allowed THEN RAISE EXCEPTION 'Creation generation access denied'; END IF;

  UPDATE public.creation_projects
  SET generation_state = 'generation_failed',
      last_generation_error = LEFT(COALESCE(NULLIF(BTRIM(p_error), ''), 'Website generation failed.'), 1000),
      updated_at = NOW()
  WHERE id = p_creation_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_creation_generation_failed(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_creation_generation_failed(UUID,TEXT) TO authenticated;
