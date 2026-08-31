-- Harden creation-project ownership/reference integrity.
-- Non-owner users may edit creation content, but cannot transfer the
-- creation to another Client/Connector/Operator/Lead/Project/Business.

CREATE OR REPLACE FUNCTION public.protect_creation_project_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF private.user_has_any_role(auth.uid(), ARRAY['owner','admin']) THEN
    RETURN NEW;
  END IF;

  IF NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.connector_id IS DISTINCT FROM OLD.connector_id
     OR NEW.operator_id IS DISTINCT FROM OLD.operator_id
     OR NEW.lead_id IS DISTINCT FROM OLD.lead_id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.business_id IS DISTINCT FROM OLD.business_id
  THEN
    RAISE EXCEPTION 'Creation project ownership references are protected';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_creation_project_relationships() FROM PUBLIC;

DROP TRIGGER IF EXISTS protect_creation_project_relationships ON public.creation_projects;
CREATE TRIGGER protect_creation_project_relationships
BEFORE UPDATE ON public.creation_projects
FOR EACH ROW EXECUTE FUNCTION public.protect_creation_project_relationships();

-- Non-owner creation requests cannot attach arbitrary CRM/Project records.
-- Lead-driven Connector creations remain authoritative through lead.business_id.
CREATE OR REPLACE FUNCTION public.create_creation_project(
  p_type TEXT DEFAULT 'website',
  p_title TEXT DEFAULT 'Website Preview',
  p_client_id UUID DEFAULT NULL,
  p_connector_id UUID DEFAULT NULL,
  p_lead_id UUID DEFAULT NULL,
  p_business_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_business_info JSONB DEFAULT '{}'::jsonb,
  p_requested_sections TEXT[] DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_id UUID;
  v_client UUID := p_client_id;
  v_connector UUID := p_connector_id;
  v_business_id UUID := p_business_id;
  v_is_owner_admin BOOLEAN := private.user_has_any_role(auth.uid(), ARRAY['owner','admin']);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_type NOT IN ('website','web_app','mobile_app','custom_software') THEN RAISE EXCEPTION 'Invalid creation project type'; END IF;
  IF NULLIF(BTRIM(p_title), '') IS NULL THEN RAISE EXCEPTION 'Creation project title is required'; END IF;

  IF v_is_owner_admin THEN
    NULL;
  ELSIF private.user_has_any_role(auth.uid(), ARRAY['client']) THEN
    v_client := auth.uid();
    v_connector := NULL;
    IF p_business_id IS NOT NULL THEN
      RAISE EXCEPTION 'Business reference is owner-managed';
    END IF;
    IF p_project_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = p_project_id AND p.client_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Project reference access denied';
    END IF;
  ELSIF private.user_has_any_role(auth.uid(), ARRAY['connector']) THEN
    v_connector := auth.uid();
    v_client := NULL;
    IF p_business_id IS NOT NULL AND p_lead_id IS NULL THEN
      RAISE EXCEPTION 'Business reference must come from an authorized lead';
    END IF;
    IF p_project_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = p_project_id AND p.connector_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Project reference access denied';
    END IF;
  ELSE
    RAISE EXCEPTION 'Creation project access denied';
  END IF;

  IF p_lead_id IS NOT NULL THEN
    SELECT business_id INTO v_business_id
    FROM public.leads
    WHERE id = p_lead_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = p_lead_id
        AND (l.connector_id = auth.uid() OR v_is_owner_admin)
    ) THEN
      RAISE EXCEPTION 'Lead access denied';
    END IF;
  END IF;

  IF v_business_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = v_business_id
  ) THEN
    RAISE EXCEPTION 'Business reference not found';
  END IF;

  INSERT INTO public.creation_projects (
    type, title, client_id, connector_id, lead_id, business_id, project_id,
    business_info, requested_sections
  ) VALUES (
    p_type, BTRIM(p_title), v_client, v_connector, p_lead_id, v_business_id,
    p_project_id, COALESCE(p_business_info, '{}'::jsonb), COALESCE(p_requested_sections, '{}')
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_creation_project(TEXT,TEXT,UUID,UUID,UUID,UUID,UUID,JSONB,TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_creation_project(TEXT,TEXT,UUID,UUID,UUID,UUID,UUID,JSONB,TEXT[]) TO authenticated;
