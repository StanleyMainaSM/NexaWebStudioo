-- Restore the operator payment columns required by the existing project
-- finance reconciliation migrations. These columns are additive and safe to
-- apply to databases that already contain them.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS operator_payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS operator_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS operator_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS operator_payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS operator_payment_verification TEXT;
