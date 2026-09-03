-- Restore the existing recurring-services table required by Avelixa's
-- maintenance/finance schema on a clean repository database.

CREATE TABLE IF NOT EXISTS public.recurring_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id),
  business_id UUID REFERENCES public.businesses(id),
  project_id UUID REFERENCES public.projects(id),
  name TEXT,
  amount NUMERIC,
  status TEXT DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.recurring_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recurring_services_management ON public.recurring_services;
CREATE POLICY recurring_services_management
ON public.recurring_services
FOR ALL
TO authenticated
USING (private.user_has_any_role(auth.uid(), ARRAY['owner','admin']))
WITH CHECK (private.user_has_any_role(auth.uid(), ARRAY['owner','admin']));

DROP POLICY IF EXISTS recurring_services_select_client ON public.recurring_services;
CREATE POLICY recurring_services_select_client
ON public.recurring_services
FOR SELECT
TO authenticated
USING (
  client_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);
