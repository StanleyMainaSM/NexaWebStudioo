-- Reconcile the protected preview-controls trigger with the trusted generation RPC.
-- Ordinary authenticated table updates remain blocked. Only the generation RPC
-- may perform its platform-controlled preview/lifecycle update, and only inside
-- the current transaction after authorization and quota checks have passed.

CREATE OR REPLACE FUNCTION public.protect_creation_project_preview_controls()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF private.user_has_any_role(auth.uid(), ARRAY['owner','admin']) THEN
    RETURN NEW;
  END IF;

  IF NEW.attribution_enabled IS DISTINCT FROM OLD.attribution_enabled
     OR NEW.public_preview_token IS DISTINCT FROM OLD.public_preview_token
     OR NEW.preview_enabled IS DISTINCT FROM OLD.preview_enabled
  THEN
    IF current_setting('avelixa.generation_preview_update', true) = 'v1' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Creation preview controls are protected';
  END IF;

  IF NEW.specification IS NOT NULL THEN
    NEW.specification := jsonb_set(
      jsonb_set(
        NEW.specification,
        '{attribution,enabled}',
        to_jsonb(OLD.attribution_enabled),
        true
      ),
      '{attribution,label}',
      '"Made with Avelixa"'::jsonb,
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_creation_project_preview_controls ON public.creation_projects;
CREATE TRIGGER protect_creation_project_preview_controls
BEFORE UPDATE ON public.creation_projects
FOR EACH ROW EXECUTE FUNCTION public.protect_creation_project_preview_controls();

DROP FUNCTION IF EXISTS public.consume_creation_generation(UUID,UUID,TEXT[],JSONB,TEXT,TEXT,TIMESTAMPTZ);

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

  INSERT INTO public.creation_generated_website_outputs (
    id, creation_project_id, output_identity, output_version,
    specification_identity, specification, template_id, generated_at,
    status, preview_path, updated_at
  ) VALUES (
    p_output_identity, p_creation_project_id, p_output_identity, p_output_version,
    p_output_version, v_spec, p_template_id, p_generated_at,
    'generated', '/preview/' || v_token::text || '/' || p_output_identity, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    output_version = EXCLUDED.output_version,
    specification_identity = EXCLUDED.specification_identity,
    specification = EXCLUDED.specification,
    template_id = EXCLUDED.template_id,
    generated_at = EXCLUDED.generated_at,
    status = 'generated',
    preview_path = EXCLUDED.preview_path,
    updated_at = NOW();

  -- This marker is transaction-local and is established only after every
  -- generation authorization and quota check has passed. It is not persistent,
  -- frontend-controlled, or a general-purpose security bypass.
  PERFORM set_config('avelixa.generation_preview_update', 'v1', true);

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
    'generated_output_id', p_output_identity,
    'generated_output_preview_path', '/preview/' || v_token::text || '/' || p_output_identity,
    'deduplicated', v_deduplicated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_creation_generation(UUID,UUID,TEXT[],JSONB,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_creation_generation(UUID,UUID,TEXT[],JSONB,TEXT,TEXT,TIMESTAMPTZ) TO authenticated;
