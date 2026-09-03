-- Restore commission reconciliation fields that exist in the production commissions table.
-- These fields are required by the Owner/Admin commission-payment workflow.

ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS verification_message text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_reference text;
