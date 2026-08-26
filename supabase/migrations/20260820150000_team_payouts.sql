-- AVELIXA TEAM PAYOUTS
-- Creates the payout records used by Owner/Admin for Connector and Operator payments.

CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  recipient_id UUID NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,

  recipient_role TEXT NOT NULL
    CHECK (recipient_role IN ('connector', 'operator')),

  project_id UUID
    REFERENCES public.projects(id) ON DELETE SET NULL,

  commission_id UUID
    REFERENCES public.commissions(id) ON DELETE SET NULL,

  amount DECIMAL(12,2) NOT NULL
    CHECK (amount > 0),

  payment_method TEXT,
  reference_number TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),

  notes TEXT,

  paid_at TIMESTAMPTZ,

  created_by UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payouts_management" ON public.payouts;

CREATE POLICY "payouts_management"
ON public.payouts
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

DROP POLICY IF EXISTS "payouts_select_own" ON public.payouts;

CREATE POLICY "payouts_select_own"
ON public.payouts
FOR SELECT
TO authenticated
USING (
  recipient_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE INDEX IF NOT EXISTS idx_payouts_recipient_id
ON public.payouts(recipient_id);

CREATE INDEX IF NOT EXISTS idx_payouts_project_id
ON public.payouts(project_id);

CREATE INDEX IF NOT EXISTS idx_payouts_commission_id
ON public.payouts(commission_id);

CREATE INDEX IF NOT EXISTS idx_payouts_status
ON public.payouts(status);

CREATE INDEX IF NOT EXISTS idx_payouts_created_at
ON public.payouts(created_at DESC);

COMMENT ON TABLE public.payouts IS
'Avelixa payout records for Connector and Operator payments managed by Owner/Admin.';
