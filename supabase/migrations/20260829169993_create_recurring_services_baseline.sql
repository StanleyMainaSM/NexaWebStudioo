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

-- Restore the invoice fields that link recurring-service billing cycles to
-- invoices. The live database contains these fields and the payment/maintenance
-- workflow functions reference them during settlement.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS recurring_service_id UUID,
  ADD COLUMN IF NOT EXISTS billing_period_start DATE,
  ADD COLUMN IF NOT EXISTS billing_period_end DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoices_recurring_service_id_fkey'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_recurring_service_id_fkey
      FOREIGN KEY (recurring_service_id)
      REFERENCES public.recurring_services(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_invoices_recurring_service
  ON public.invoices(recurring_service_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_recurring_period
  ON public.invoices(recurring_service_id, billing_period_start)
  WHERE recurring_service_id IS NOT NULL AND billing_period_start IS NOT NULL;
