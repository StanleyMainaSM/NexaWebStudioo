-- Expose only the currently published generated artifact through the existing
-- public preview-token boundary. WebsiteSpecification on creation_projects remains
-- the editable source; the published artifact snapshot is the public content source.

CREATE OR REPLACE FUNCTION public.get_public_creation_website(
  p_preview_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_preview_token IS NULL THEN
    RAISE EXCEPTION 'Published website not found';
  END IF;

  SELECT jsonb_build_object(
    'output_identity', o.output_identity,
    'output_version', o.output_version,
    'generated_at', o.generated_at,
    'published_at', o.published_at,
    'specification', jsonb_set(
      jsonb_set(
        o.specification,
        '{attribution,enabled}',
        to_jsonb(COALESCE(cp.attribution_enabled, true)),
        true
      ),
      '{attribution,label}',
      '"Made with Avelixa"'::jsonb,
      true
    )
  )
  INTO v_result
  FROM public.creation_generated_website_outputs o
  JOIN public.creation_projects cp ON cp.id = o.creation_project_id
  WHERE cp.public_preview_token = p_preview_token
    AND cp.preview_enabled = true
    AND o.status = 'published'
    AND o.published_at IS NOT NULL
  LIMIT 1;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Published website not found';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_creation_website(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_creation_website(UUID) TO anon, authenticated;
