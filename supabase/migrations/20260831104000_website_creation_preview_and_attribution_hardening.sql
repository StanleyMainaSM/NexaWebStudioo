-- Secure preview sharing and platform-controlled attribution.
ALTER TABLE public.creation_projects
  ADD COLUMN IF NOT EXISTS public_preview_token UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS preview_enabled BOOLEAN NOT NULL DEFAULT false;

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

CREATE OR REPLACE FUNCTION public.consume_creation_generation(
  p_creation_project_id UUID,
  p_template_id UUID,
  p_requested_sections TEXT[],
  p_specification JSONB
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
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

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
        OR (cp.operator_id = auth.uid() AND EXISTS (SELECT 1 FROM public.creation_operator_access a WHERE a.operator_id = auth.uid() AND a.can_generate = true))
        OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
      )
  ) INTO v_project_allowed;
  IF NOT v_project_allowed THEN RAISE EXCEPTION 'Creation generation access denied'; END IF;

  SELECT attribution_enabled, public_preview_token INTO v_attribution_enabled, v_token
  FROM public.creation_projects
  WHERE id = p_creation_project_id
  FOR UPDATE;

  IF v_token IS NULL THEN
    v_token := gen_random_uuid();
  END IF;

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

  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'Template generation limit reached (% generations)', v_limit USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.creation_generation_usage
  SET generation_count = generation_count + 1, updated_at = NOW()
  WHERE user_id = auth.uid()
  RETURNING generation_count INTO v_used;

  UPDATE public.creation_projects
  SET selected_template_id = p_template_id,
      requested_sections = COALESCE(p_requested_sections, '{}'),
      specification = v_spec,
      public_preview_token = v_token,
      preview_enabled = true,
      status = 'preview',
      updated_at = NOW()
  WHERE id = p_creation_project_id;

  RETURN jsonb_build_object(
    'generation_count', v_used,
    'generation_limit', v_limit,
    'public_preview_token', v_token
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_creation_generation(UUID,UUID,TEXT[],JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_creation_generation(UUID,UUID,TEXT[],JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_creation_preview(p_preview_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_spec JSONB;
  v_attribution BOOLEAN;
BEGIN
  SELECT specification, attribution_enabled
  INTO v_spec, v_attribution
  FROM public.creation_projects
  WHERE public_preview_token = p_preview_token
    AND preview_enabled = true
    AND status IN ('preview','requested','in_development','review','deployed');

  IF v_spec IS NULL THEN
    RAISE EXCEPTION 'Preview not found or no longer public';
  END IF;

  v_spec := jsonb_set(v_spec, '{attribution,enabled}', to_jsonb(COALESCE(v_attribution, true)), true);
  v_spec := jsonb_set(v_spec, '{attribution,label}', '"Made with Avelixa"'::jsonb, true);
  RETURN v_spec;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_creation_preview(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_creation_preview(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.disable_creation_public_preview(p_creation_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT (
    private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
    OR EXISTS (SELECT 1 FROM public.creation_projects cp WHERE cp.id = p_creation_project_id AND cp.client_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.creation_projects cp WHERE cp.id = p_creation_project_id AND cp.connector_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Creation project access denied';
  END IF;
  UPDATE public.creation_projects SET preview_enabled = false, updated_at = NOW() WHERE id = p_creation_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.disable_creation_public_preview(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disable_creation_public_preview(UUID) TO authenticated;
