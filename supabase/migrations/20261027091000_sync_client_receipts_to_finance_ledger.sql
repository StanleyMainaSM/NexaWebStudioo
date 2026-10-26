-- Keep the existing Finance V2 ledger synchronized with authoritative client payment rows.
-- Summary totals continue to aggregate public.payments only; ledger mirrors are display-only
-- and must never be added to those totals a second time.
ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS source_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS finance_transactions_source_payment_uidx
  ON public.finance_transactions(source_payment_id)
  WHERE source_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_client_payment_to_finance_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT * INTO v_invoice FROM public.invoices WHERE id = NEW.invoice_id;
  END IF;

  INSERT INTO public.finance_transactions(
    transaction_type, client_id, project_id, connector_id, admin_id,
    amount, status, verification_status, payment_date, payment_method,
    reference_number, description, created_by, source_payment_id
  )
  SELECT
    'client_payment',
    v_invoice.client_id,
    v_invoice.project_id,
    pr.connector_id,
    auth.uid(),
    NEW.amount,
    COALESCE(NEW.status,'pending'),
    CASE WHEN lower(COALESCE(NEW.status,'')) IN ('paid','completed','verified')
      THEN 'verified' ELSE 'unverified' END,
    NEW.payment_date,
    NEW.payment_method,
    NEW.reference_number,
    'Client receipt mirrored from authoritative payments record.',
    auth.uid(),
    NEW.id
  FROM (SELECT 1) seed
  LEFT JOIN public.projects pr ON pr.id = v_invoice.project_id
  ON CONFLICT (source_payment_id) WHERE source_payment_id IS NOT NULL
  DO UPDATE SET
    amount = EXCLUDED.amount,
    status = EXCLUDED.status,
    verification_status = EXCLUDED.verification_status,
    payment_date = EXCLUDED.payment_date,
    payment_method = EXCLUDED.payment_method,
    reference_number = EXCLUDED.reference_number,
    updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_client_payment_to_finance_ledger() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_client_payment_to_finance_ledger ON public.payments;
CREATE TRIGGER trg_sync_client_payment_to_finance_ledger
AFTER INSERT OR UPDATE OF amount, status, payment_date, payment_method, reference_number, invoice_id
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_client_payment_to_finance_ledger();
