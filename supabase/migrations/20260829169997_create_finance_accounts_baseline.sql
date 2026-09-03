-- Establish the finance account relation used by the existing finance
-- reconciliation and transaction migrations. The live application already
-- treats the primary finance account as an optional ledger destination.

CREATE TABLE IF NOT EXISTS public.finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'internal',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_accounts_primary_idx
  ON public.finance_accounts(is_primary)
  WHERE is_primary = true;

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_accounts_management" ON public.finance_accounts;
CREATE POLICY "finance_accounts_management"
ON public.finance_accounts
FOR ALL
TO authenticated
USING (private.user_has_any_role(auth.uid(), ARRAY['owner','admin']))
WITH CHECK (private.user_has_any_role(auth.uid(), ARRAY['owner','admin']));

DROP POLICY IF EXISTS "finance_accounts_select" ON public.finance_accounts;
CREATE POLICY "finance_accounts_select"
ON public.finance_accounts
FOR SELECT
TO authenticated
USING (private.user_has_any_role(auth.uid(), ARRAY['owner','admin']));
