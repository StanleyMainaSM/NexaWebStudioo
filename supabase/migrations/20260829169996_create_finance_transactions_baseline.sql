-- Restore the finance transaction ledger used by the existing finance
-- reconciliation workflow. The production application already has this table;
-- this repository baseline makes the clean migration chain structurally complete.

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  connector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  due_date DATE,
  payment_date TIMESTAMPTZ,
  payment_method TEXT,
  reference_number TEXT,
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finance_account_id UUID,
  verification_message TEXT
);

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage finance transactions" ON public.finance_transactions;
CREATE POLICY "Owners can manage finance transactions"
ON public.finance_transactions
FOR ALL
TO authenticated
USING (private.user_has_any_role(auth.uid(), ARRAY['owner']))
WITH CHECK (private.user_has_any_role(auth.uid(), ARRAY['owner']));
