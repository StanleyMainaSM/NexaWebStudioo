-- ============================================================
-- AVELIXA WEBSITE CREATION FOUNDATION
-- Creation Projects, data-driven templates, usage entitlements,
-- server-side generation and role-aware access control.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.website_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  visual_style TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  typography JSONB NOT NULL DEFAULT '{}'::jsonb,
  color_direction JSONB NOT NULL DEFAULT '{}'::jsonb,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_protected BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creation_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'website' CHECK (type IN ('website', 'web_app', 'mobile_app', 'custom_software')),
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  connector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  business_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_sections TEXT[] NOT NULL DEFAULT '{}',
  selected_template_id UUID REFERENCES public.website_templates(id) ON DELETE SET NULL,
  specification JSONB,
  attribution_enabled BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'preview', 'requested', 'in_development', 'review', 'deployed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creation_generation_entitlements (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  generation_limit INTEGER NOT NULL DEFAULT 5 CHECK (generation_limit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creation_generation_usage (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  generation_count INTEGER NOT NULL DEFAULT 0 CHECK (generation_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS creation_projects_client_idx ON public.creation_projects(client_id);
CREATE INDEX IF NOT EXISTS creation_projects_connector_idx ON public.creation_projects(connector_id);
CREATE INDEX IF NOT EXISTS creation_projects_operator_idx ON public.creation_projects(operator_id);
CREATE INDEX IF NOT EXISTS creation_projects_lead_idx ON public.creation_projects(lead_id);
CREATE INDEX IF NOT EXISTS creation_projects_business_idx ON public.creation_projects(business_id);
CREATE INDEX IF NOT EXISTS creation_projects_template_idx ON public.creation_projects(selected_template_id);

ALTER TABLE public.website_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creation_generation_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creation_generation_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active templates are publicly readable" ON public.website_templates;
CREATE POLICY "Active templates are publicly readable"
  ON public.website_templates FOR SELECT
  USING (is_active = true OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin']));

DROP POLICY IF EXISTS "Owners manage protected templates" ON public.website_templates;
CREATE POLICY "Owners manage protected templates"
  ON public.website_templates FOR ALL
  USING (private.user_has_any_role(auth.uid(), ARRAY['owner']))
  WITH CHECK (private.user_has_any_role(auth.uid(), ARRAY['owner']));

DROP POLICY IF EXISTS "Authorized users read creation projects" ON public.creation_projects;
CREATE POLICY "Authorized users read creation projects"
  ON public.creation_projects FOR SELECT
  USING (
    client_id = auth.uid()
    OR connector_id = auth.uid()
    OR operator_id = auth.uid()
    OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  );

DROP POLICY IF EXISTS "Authorized users update creation projects" ON public.creation_projects;
CREATE POLICY "Authorized users update creation projects"
  ON public.creation_projects FOR UPDATE
  USING (
    client_id = auth.uid()
    OR connector_id = auth.uid()
    OR operator_id = auth.uid()
    OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  )
  WITH CHECK (
    client_id = auth.uid()
    OR connector_id = auth.uid()
    OR operator_id = auth.uid()
    OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  );

DROP POLICY IF EXISTS "Users read own creation entitlement" ON public.creation_generation_entitlements;
CREATE POLICY "Users read own creation entitlement"
  ON public.creation_generation_entitlements FOR SELECT
  USING (user_id = auth.uid() OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin']));

DROP POLICY IF EXISTS "Users read own creation usage" ON public.creation_generation_usage;
CREATE POLICY "Users read own creation usage"
  ON public.creation_generation_usage FOR SELECT
  USING (user_id = auth.uid() OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin']));

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
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_type NOT IN ('website','web_app','mobile_app','custom_software') THEN RAISE EXCEPTION 'Invalid creation project type'; END IF;
  IF NULLIF(BTRIM(p_title), '') IS NULL THEN RAISE EXCEPTION 'Creation project title is required'; END IF;

  IF private.user_has_any_role(auth.uid(), ARRAY['owner','admin']) THEN
    NULL;
  ELSIF private.user_has_any_role(auth.uid(), ARRAY['client']) THEN
    v_client := auth.uid();
    v_connector := NULL;
  ELSIF private.user_has_any_role(auth.uid(), ARRAY['connector']) THEN
    v_connector := auth.uid();
    v_client := NULL;
  ELSIF private.user_has_any_role(auth.uid(), ARRAY['operator']) THEN
    RAISE EXCEPTION 'Operators must use an assigned creation project';
  ELSE
    RAISE EXCEPTION 'Creation project access denied';
  END IF;

  IF p_lead_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = p_lead_id
        AND (l.connector_id = auth.uid() OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin']))
    ) THEN
      RAISE EXCEPTION 'Lead access denied';
    END IF;
  END IF;

  INSERT INTO public.creation_projects (
    type, title, client_id, connector_id, lead_id, business_id, project_id,
    business_info, requested_sections
  ) VALUES (
    p_type, BTRIM(p_title), v_client, v_connector, p_lead_id, p_business_id, p_project_id,
    COALESCE(p_business_info, '{}'::jsonb), COALESCE(p_requested_sections, '{}')
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_creation_project(TEXT,TEXT,UUID,UUID,UUID,UUID,UUID,JSONB,TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_creation_project(TEXT,TEXT,UUID,UUID,UUID,UUID,UUID,JSONB,TEXT[]) TO authenticated;

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
        OR cp.operator_id = auth.uid()
        OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
      )
  ) INTO v_project_allowed;
  IF NOT v_project_allowed THEN RAISE EXCEPTION 'Creation project access denied'; END IF;

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
      specification = p_specification,
      status = 'preview',
      updated_at = NOW()
  WHERE id = p_creation_project_id;

  RETURN jsonb_build_object('generation_count', v_used, 'generation_limit', v_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_creation_generation(UUID,UUID,TEXT[],JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_creation_generation(UUID,UUID,TEXT[],JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_creation_generation_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE v_limit INTEGER; v_used INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.creation_generation_entitlements(user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  INSERT INTO public.creation_generation_usage(user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  SELECT generation_limit INTO v_limit FROM public.creation_generation_entitlements WHERE user_id = auth.uid();
  SELECT generation_count INTO v_used FROM public.creation_generation_usage WHERE user_id = auth.uid();
  RETURN jsonb_build_object('plan','free','used',v_used,'limit',v_limit,'remaining',GREATEST(v_limit-v_used,0));
END;
$$;

REVOKE ALL ON FUNCTION public.get_creation_generation_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creation_generation_status() TO authenticated;

-- Keep timestamps current without changing existing application triggers.
CREATE OR REPLACE FUNCTION public.touch_website_creation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS website_templates_updated_at ON public.website_templates;
CREATE TRIGGER website_templates_updated_at BEFORE UPDATE ON public.website_templates FOR EACH ROW EXECUTE FUNCTION public.touch_website_creation_updated_at();
DROP TRIGGER IF EXISTS creation_projects_updated_at ON public.creation_projects;
CREATE TRIGGER creation_projects_updated_at BEFORE UPDATE ON public.creation_projects FOR EACH ROW EXECUTE FUNCTION public.touch_website_creation_updated_at();
DROP TRIGGER IF EXISTS creation_entitlements_updated_at ON public.creation_generation_entitlements;
CREATE TRIGGER creation_entitlements_updated_at BEFORE UPDATE ON public.creation_generation_entitlements FOR EACH ROW EXECUTE FUNCTION public.touch_website_creation_updated_at();

-- Five initial, data-driven templates. JSON keeps the studio extensible.
INSERT INTO public.website_templates (slug,name,description,categories,visual_style,sections,typography,color_direction,layout,preview)
VALUES
('modern-business','Modern Business','Confident, spacious business presentation for professional service companies.','{business,services,professional}','editorial-modern','["hero","about","services","testimonials","contact","footer"]','{"heading":"bold-sans","body":"clean-sans"}','{"primary":"#111827","accent":"#7c3aed","surface":"#f8fafc"}','{"container":"wide","hero":"split","cards":"soft"}','{"label":"Modern Business","image":"gradient-business"}'),
('premium-minimal','Premium Minimal','Refined minimal layout for premium brands, consultants and studios.','{premium,consulting,studio,professional}','premium-minimal','["navbar","hero","about","services","gallery","contact","footer"]','{"heading":"serif-display","body":"modern-sans"}','{"primary":"#171717","accent":"#c59d5f","surface":"#faf9f6"}','{"container":"narrow","hero":"centered","cards":"bordered"}','{"label":"Premium Minimal","image":"neutral-editorial"}'),
('local-commerce','Local Commerce','Warm, conversion-focused layout for shops, restaurants and local businesses.','{retail,restaurant,local,commerce}','warm-commerce','["navbar","hero","products","services","gallery","location","contact","footer"]','{"heading":"friendly-sans","body":"readable-sans"}','{"primary":"#172018","accent":"#ea7a2d","surface":"#fffaf4"}','{"container":"wide","hero":"image-left","cards":"rounded"}','{"label":"Local Commerce","image":"warm-storefront"}'),
('creative-studio','Creative Studio','Bold visual system for agencies, photographers, creatives and modern portfolios.','{creative,agency,portfolio,photography}','creative-bold','["navbar","hero","about","services","gallery","testimonials","contact","footer"]','{"heading":"display-sans","body":"geometric-sans"}','{"primary":"#0b1020","accent":"#22d3ee","surface":"#111827"}','{"container":"wide","hero":"immersive","cards":"glass"}','{"label":"Creative Studio","image":"creative-grid"}'),
('trusted-community','Trusted Community','Friendly, accessible layout for schools, churches, nonprofits and community organizations.','{education,church,nonprofit,community}','trusted-community','["navbar","hero","about","services","testimonials","faq","location","contact","footer"]','{"heading":"humanist-sans","body":"humanist-sans"}','{"primary":"#17324d","accent":"#2f8f83","surface":"#f4f8f7"}','{"container":"standard","hero":"centered","cards":"soft"}','{"label":"Trusted Community","image":"community"}')
ON CONFLICT (slug) DO NOTHING;
