-- Restore the payment reconciliation fields required by the existing
-- Suit & Wear finance migration. These additive columns are safe for
-- databases that already contain them.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS verification_message TEXT,
  ADD COLUMN IF NOT EXISTS finance_account_id UUID REFERENCES public.finance_accounts(id);
