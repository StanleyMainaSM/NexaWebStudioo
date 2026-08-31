-- Keep lead/business relationships authoritative instead of copying lead business data.
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
DECLARE v_id UUID; v_client UUID := p_client_id; v_connector UUID := p_connector_id; v_business_id UUID := p_business_id;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_type NOT IN ('website','web_app','mobile_app','custom_software') THEN RAISE EXCEPTION 'Invalid creation project type'; END IF;
  IF NULLIF(BTRIM(p_title), '') IS NULL THEN RAISE EXCEPTION 'Creation project title is required'; END IF;

  IF private.user_has_any_role(auth.uid(), ARRAY['owner','admin']) THEN
    NULL;
  ELSIF private.user_has_any_role(auth.uid(), ARRAY['client']) THEN
    v_client := auth.uid(); v_connector := NULL;
  ELSIF private.user_has_any_role(auth.uid(), ARRAY['connector']) THEN
    v_connector := auth.uid(); v_client := NULL;
  ELSE
    RAISE EXCEPTION 'Creation project access denied';
  END IF;

  IF p_lead_id IS NOT NULL THEN
    SELECT business_id INTO v_business_id FROM public.leads WHERE id = p_lead_id;
    IF NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.id = p_lead_id AND (l.connector_id = auth.uid() OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin']))) THEN
      RAISE EXCEPTION 'Lead access denied';
    END IF;
  END IF;

  IF v_business_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = v_business_id) THEN
    RAISE EXCEPTION 'Business reference not found';
  END IF;

  INSERT INTO public.creation_projects(type,title,client_id,connector_id,lead_id,business_id,project_id,business_info,requested_sections)
  VALUES(p_type,BTRIM(p_title),v_client,v_connector,p_lead_id,v_business_id,p_project_id,COALESCE(p_business_info,'{}'::jsonb),COALESCE(p_requested_sections,'{}'))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_creation_project(TEXT,TEXT,UUID,UUID,UUID,UUID,UUID,JSONB,TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_creation_project(TEXT,TEXT,UUID,UUID,UUID,UUID,UUID,JSONB,TEXT[]) TO authenticated;
