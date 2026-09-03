-- Restore payout reconciliation fields used by the existing commission-payment workflow.
-- The production payouts table already contains these fields; this baseline makes
-- the clean repository replay structurally equivalent before dependent functions/data run.

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS payout_type text NOT NULL DEFAULT 'team_payment',
  ADD COLUMN IF NOT EXISTS finance_account_id uuid;
