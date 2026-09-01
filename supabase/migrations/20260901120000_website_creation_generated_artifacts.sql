-- Persist each successful generated WebsiteSpecification as an addressable artifact.
-- WebsiteSpecification on creation_projects remains the authoritative current source;
-- the artifact stores the validated generated snapshot so historical output versions
-- remain reproducible after later specification edits.

CREATE TABLE IF NOT EXISTS public.creation_generated_website_outputs (
  id TEXT PRIMARY KEY,
  creation_project_id UUID NOT NULL REFERENCES public.creation_projects(id) ON DELETE CASCADE,
  output_identity TEXT NOT NULL,
  output_version TEXT NOT NULL,
  specification_identity TEXT NOT NULL,
  specification JSONB NOT NULL,
  template_id UUID NOT NULL REFERENCES public.website_templates(id),
  generated_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated',
  preview_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT creation_generated_website_outputs_status_check
    CHECK (status IN ('draft', 'generated', 'published')),
  CONSTRAINT creation_generated_website_outputs_identity_project_unique
    UNIQUE (creation_project_id, output_identity),
  CONSTRAINT creation_generated_website_outputs_id_identity_check
    CHECK (id = output_identity)
);

CREATE INDEX IF NOT EXISTS creation_generated_website_outputs_project_idx
  ON public.creation_generated_website_outputs(creation_project_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS creation_generated_website_outputs_version_idx
  ON public.creation_generated_website_outputs(output_version);

ALTER TABLE public.creation_generated_website_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creation_generated_website_outputs_select_authorized" ON public.creation_generated_website_outputs;
CREATE POLICY "creation_generated_website_outputs_select_authorized"
  ON public.creation_generated_website_outputs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.creation_projects cp
      WHERE cp.id = creation_project_id
        AND (
          cp.client_id = (SELECT auth.uid())
          OR cp.connector_id = (SELECT auth.uid())
          OR cp.operator_id = (SELECT auth.uid())
          OR private.user_has_any_role((SELECT auth.uid()), ARRAY['owner','admin'])
        )
    )
  );

DROP POLICY IF EXISTS "creation_generated_website_outputs_insert_denied" ON public.creation_generated_website_outputs;
CREATE POLICY "creation_generated_website_outputs_insert_denied"
  ON public.creation_generated_website_outputs
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "creation_generated_website_outputs_update_denied" ON public.creation_generated_website_outputs;
CREATE POLICY "creation_generated_website_outputs_update_denied"
  ON public.creation_generated_website_outputs
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "creation_generated_website_outputs_delete_denied" ON public.creation_generated_website_outputs;
CREATE POLICY "creation_generated_website_outputs_delete_denied"
  ON public.creation_generated_website_outputs
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE ALL ON TABLE public.creation_generated_website_outputs FROM anon, authenticated;
GRANT SELECT ON TABLE public.creation_generated_website_outputs TO authenticated;

-- The existing generation RPC remains the single authenticated generation boundary.
-- It now persists the successful generated snapshot and only then advances the
-- Creation Project lifecycle metadata, inside the same transaction.
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
    'generated', NULL, NOW()
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
    'deduplicated', v_deduplicated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_creation_generation(UUID,UUID,TEXT[],JSONB,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_creation_generation(UUID,UUID,TEXT[],JSONB,TEXT,TEXT,TIMESTAMPTZ) TO authenticated;

-- Public preview can address a specific generated artifact without exposing
-- project metadata. The project token remains the public authorization secret.
DROP FUNCTION IF EXISTS public.get_public_creation_preview(UUID);

CREATE OR REPLACE FUNCTION public.get_public_creation_preview(
  p_preview_token UUID,
  p_output_identity TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_spec JSONB;
  v_attribution BOOLEAN;
BEGIN
  IF p_output_identity IS NULL THEN
    SELECT specification, attribution_enabled
      INTO v_spec, v_attribution
    FROM public.creation_projects
    WHERE public_preview_token = p_preview_token
      AND preview_enabled = true
      AND status IN ('preview','requested','in_development','review','deployed');
  ELSE
    SELECT o.specification, cp.attribution_enabled
      INTO v_spec, v_attribution
    FROM public.creation_generated_website_outputs o
    JOIN public.creation_projects cp ON cp.id = o.creation_project_id
    WHERE cp.public_preview_token = p_preview_token
      AND cp.preview_enabled = true
      AND cp.status IN ('preview','requested','in_development','review','deployed')
      AND o.id = p_output_identity
      AND o.status IN ('generated','published');
  END IF;

  IF v_spec IS NULL THEN RAISE EXCEPTION 'Preview not found or no longer public'; END IF;
  v_spec := jsonb_set(v_spec, '{attribution,enabled}', to_jsonb(COALESCE(v_attribution,true)), true);
  v_spec := jsonb_set(v_spec, '{attribution,label}', '"Made with Avelixa"'::jsonb, true);
  RETURN v_spec;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_creation_preview(UUID,TEXT) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_creation_preview(UUID,TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_creation_preview(UUID,TEXT) TO authenticated;
