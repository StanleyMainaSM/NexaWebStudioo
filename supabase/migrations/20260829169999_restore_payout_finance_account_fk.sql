-- Restore the production payout -> finance account relationship after the
-- finance_accounts baseline exists and before Suit & Wear reconciliation runs.

DO $$
BEGIN
  ALTER TABLE public.payouts
    ADD CONSTRAINT payouts_finance_account_id_fkey
    FOREIGN KEY (finance_account_id) REFERENCES public.finance_accounts(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
