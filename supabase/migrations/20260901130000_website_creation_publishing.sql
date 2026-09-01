-- Establish the application-level publishing boundary for existing generated
-- Website Creation artifacts. WebsiteSpecification remains authoritative.

ALTER TABLE public.creation_generated_website_outputs
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS creation_generated_website_outputs_published_idx
  ON public.creation_generated_website_outputs(creation_project_id, published_at DESC)
  WHERE status = 'published';

-- A Creation Project has at most one published generated artifact at a time.
CREATE UNIQUE INDEX IF NOT EXISTS creation_generated_website_outputs_one_published_idx
  ON public.creation_generated_website_outputs(creation_project_id)
  WHERE status = 'published';

-- Publishing is deliberately not exposed through direct table writes. The
-- existing artifact RLS remains the read boundary; this function is the sole
-- authenticated mutation boundary for publication.
DROP FUNCTION IF EXISTS public.publish_creation_generated_output(UUID,TEXT);

CREATE OR REPLACE FUNCTION public.publish_creation_generated_output(
  p_creation_project_id UUID,
  p_output_identity TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_project_allowed BOOLEAN;
  v_project_specification JSONB;
  v_project_template_id UUID;
  v_latest_identity TEXT;
  v_latest_version TEXT;
  v_generation_state TEXT;
  v_artifact_project_id UUID;
  v_artifact_identity TEXT;
  v_artifact_version TEXT;
  v_artifact_specification JSONB;
  v_artifact_template_id UUID;
  v_artifact_status TEXT;
  v_published_at TIMESTAMPTZ;
  v_previous_published_identity TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NULLIF(BTRIM(p_output_identity), '') IS NULL THEN
    RAISE EXCEPTION 'Generated output identity is required';
  END IF;

  -- Keep publication authorization identical to the existing Creation
  -- generation authorization boundary.
  SELECT EXISTS (
    SELECT 1
    FROM public.creation_projects cp
    WHERE cp.id = p_creation_project_id
      AND (
        cp.client_id = auth.uid()
        OR cp.connector_id = auth.uid()
        OR (
          cp.operator_id = auth.uid()
          AND EXISTS (
            SELECT 1
            FROM public.creation_operator_access a
            WHERE a.operator_id = auth.uid()
              AND a.can_generate = true
          )
        )
        OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
      )
  ) INTO v_project_allowed;

  IF NOT v_project_allowed THEN
    RAISE EXCEPTION 'Creation publishing access denied';
  END IF;

  -- Lock the project first. This serializes publication against generation
  -- and against another publish request for the same project.
  SELECT
    cp.specification,
    cp.selected_template_id,
    cp.latest_generated_output_identity,
    cp.latest_generated_output_version,
    cp.generation_state
  INTO
    v_project_specification,
    v_project_template_id,
    v_latest_identity,
    v_latest_version,
    v_generation_state
  FROM public.creation_projects cp
  WHERE cp.id = p_creation_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Creation project not found';
  END IF;

  SELECT
    o.creation_project_id,
    o.output_identity,
    o.output_version,
    o.specification,
    o.template_id,
    o.status,
    o.published_at
  INTO
    v_artifact_project_id,
    v_artifact_identity,
    v_artifact_version,
    v_artifact_specification,
    v_artifact_template_id,
    v_artifact_status,
    v_published_at
  FROM public.creation_generated_website_outputs o
  WHERE o.id = p_output_identity
  FOR UPDATE;

  IF NOT FOUND OR v_artifact_project_id <> p_creation_project_id THEN
    RAISE EXCEPTION 'Generated website output not found';
  END IF;

  IF v_artifact_status NOT IN ('generated', 'published') THEN
    RAISE EXCEPTION 'Only successfully generated website outputs can be published';
  END IF;

  -- The artifact must still represent the exact current persisted
  -- specification and template. JSONB equality is appropriate here because
  -- generation stores the normalized specification snapshot.
  IF v_project_specification IS NULL
     OR v_artifact_specification IS DISTINCT FROM v_project_specification
     OR v_artifact_template_id IS DISTINCT FROM v_project_template_id
     OR v_latest_identity IS DISTINCT FROM v_artifact_identity
     OR v_latest_version IS DISTINCT FROM v_artifact_version
     OR v_generation_state IS DISTINCT FROM 'current'
  THEN
    RAISE EXCEPTION 'Generated website output is stale; regenerate before publishing';
  END IF;

  -- Idempotent publication of the same current artifact preserves its first
  -- publication timestamp and does not create a second artifact.
  IF v_artifact_status = 'published' THEN
    RETURN jsonb_build_object(
      'output_identity', v_artifact_identity,
      'output_version', v_artifact_version,
      'status', 'published',
      'published_at', v_published_at,
      'idempotent', true,
      'previous_published_output_identity', v_artifact_identity
    );
  END IF;

  SELECT o.output_identity
  INTO v_previous_published_identity
  FROM public.creation_generated_website_outputs o
  WHERE o.creation_project_id = p_creation_project_id
    AND o.status = 'published'
    AND o.id <> v_artifact_identity
  FOR UPDATE;

  -- Historical artifacts remain available. Only their publication status is
  -- changed when a newer artifact becomes the current published version.
  UPDATE public.creation_generated_website_outputs
  SET status = 'generated',
      updated_at = NOW()
  WHERE creation_project_id = p_creation_project_id
    AND status = 'published'
    AND id <> v_artifact_identity;

  UPDATE public.creation_generated_website_outputs
  SET status = 'published',
      published_at = NOW(),
      updated_at = NOW()
  WHERE id = v_artifact_identity;

  RETURN jsonb_build_object(
    'output_identity', v_artifact_identity,
    'output_version', v_artifact_version,
    'status', 'published',
    'published_at', NOW(),
    'idempotent', false,
    'previous_published_output_identity', v_previous_published_identity
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_creation_generated_output(UUID,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_creation_generated_output(UUID,TEXT) TO authenticated;
