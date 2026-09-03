-- Restore the existing recurring-services table required by Avelixa's
-- maintenance/finance schema on a clean repository database.
--
-- The production object is intentionally restored without adding new RLS
-- behavior here; later migrations remain responsible for any security policy.

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
