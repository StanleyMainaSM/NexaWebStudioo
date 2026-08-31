-- Owner-controlled Operator access for the website creation foundation.
CREATE TABLE IF NOT EXISTS public.creation_operator_access (
  operator_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_generate BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.creation_operator_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage creation operator access" ON public.creation_operator_access;
CREATE POLICY "Owners manage creation operator access"
  ON public.creation_operator_access FOR ALL
  USING (private.user_has_any_role(auth.uid(), ARRAY['owner']))
  WITH CHECK (private.user_has_any_role(auth.uid(), ARRAY['owner']));

DROP POLICY IF EXISTS "Operators read own creation access" ON public.creation_operator_access;
CREATE POLICY "Operators read own creation access"
  ON public.creation_operator_access FOR SELECT
  USING (operator_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_creation_operator_access(
  p_operator_id UUID,
  p_can_view BOOLEAN,
  p_can_generate BOOLEAN,
  p_can_edit BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.user_has_any_role(auth.uid(), ARRAY['owner']) THEN
    RAISE EXCEPTION 'Owner authorization required';
  END IF;
  IF NOT private.user_has_any_role(p_operator_id, ARRAY['operator']) THEN
    RAISE EXCEPTION 'Target user must have Operator role';
  END IF;
  INSERT INTO public.creation_operator_access(operator_id,can_view,can_generate,can_edit,updated_by,updated_at)
  VALUES(p_operator_id,p_can_view,p_can_generate,p_can_edit,auth.uid(),NOW())
  ON CONFLICT(operator_id) DO UPDATE SET can_view=EXCLUDED.can_view,can_generate=EXCLUDED.can_generate,can_edit=EXCLUDED.can_edit,updated_by=EXCLUDED.updated_by,updated_at=NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.set_creation_operator_access(UUID,BOOLEAN,BOOLEAN,BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_creation_operator_access(UUID,BOOLEAN,BOOLEAN,BOOLEAN) TO authenticated;

-- Operators need an explicit owner grant before they can use the creation subsystem.
DROP POLICY IF EXISTS "Authorized users read creation projects" ON public.creation_projects;
CREATE POLICY "Authorized users read creation projects"
  ON public.creation_projects FOR SELECT
  USING (
    client_id = auth.uid()
    OR connector_id = auth.uid()
    OR (operator_id = auth.uid() AND EXISTS (SELECT 1 FROM public.creation_operator_access a WHERE a.operator_id = auth.uid() AND a.can_view = true))
    OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  );

DROP POLICY IF EXISTS "Authorized users update creation projects" ON public.creation_projects;
CREATE POLICY "Authorized users update creation projects"
  ON public.creation_projects FOR UPDATE
  USING (
    client_id = auth.uid()
    OR connector_id = auth.uid()
    OR (operator_id = auth.uid() AND EXISTS (SELECT 1 FROM public.creation_operator_access a WHERE a.operator_id = auth.uid() AND a.can_edit = true))
    OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  )
  WITH CHECK (
    client_id = auth.uid()
    OR connector_id = auth.uid()
    OR (operator_id = auth.uid() AND EXISTS (SELECT 1 FROM public.creation_operator_access a WHERE a.operator_id = auth.uid() AND a.can_edit = true))
    OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  );

-- Generation itself is server-authorized; Operators additionally need can_generate.
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
DECLARE v_limit INTEGER; v_used INTEGER; v_template_active BOOLEAN; v_project_allowed BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT is_active INTO v_template_active FROM public.website_templates WHERE id = p_template_id;
  IF COALESCE(v_template_active,false) = false THEN RAISE EXCEPTION 'Template is inactive or unavailable'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.creation_projects cp
    WHERE cp.id = p_creation_project_id AND (
      cp.client_id = auth.uid()
      OR cp.connector_id = auth.uid()
      OR (cp.operator_id = auth.uid() AND EXISTS (SELECT 1 FROM public.creation_operator_access a WHERE a.operator_id = auth.uid() AND a.can_generate = true))
      OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
    )
  ) INTO v_project_allowed;
  IF NOT v_project_allowed THEN RAISE EXCEPTION 'Creation generation access denied'; END IF;
  INSERT INTO public.creation_generation_entitlements(user_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
  INSERT INTO public.creation_generation_usage(user_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
  SELECT generation_limit INTO v_limit FROM public.creation_generation_entitlements WHERE user_id=auth.uid() FOR UPDATE;
  SELECT generation_count INTO v_used FROM public.creation_generation_usage WHERE user_id=auth.uid() FOR UPDATE;
  IF v_used >= v_limit THEN RAISE EXCEPTION 'Template generation limit reached (% generations)', v_limit USING ERRCODE='P0001'; END IF;
  UPDATE public.creation_generation_usage SET generation_count=generation_count+1,updated_at=NOW() WHERE user_id=auth.uid() RETURNING generation_count INTO v_used;
  UPDATE public.creation_projects SET selected_template_id=p_template_id,requested_sections=COALESCE(p_requested_sections,'{}'),specification=p_specification,status='preview',updated_at=NOW() WHERE id=p_creation_project_id;
  RETURN jsonb_build_object('generation_count',v_used,'generation_limit',v_limit);
END;
$$;
REVOKE ALL ON FUNCTION public.consume_creation_generation(UUID,UUID,TEXT[],JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_creation_generation(UUID,UUID,TEXT[],JSONB) TO authenticated;
