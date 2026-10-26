-- Avelixa client receipt workflow: additive, atomic and role-checked.
-- Prepared only; this migration is NOT applied to production.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS management_receipt_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS payments_management_receipt_key_uidx
  ON public.payments(management_receipt_key)
  WHERE management_receipt_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.owner_record_project_client_payment(
  p_project_id uuid,
  p_amount numeric,
  p_receipt_key uuid,
  p_payment_method text DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_payment_date timestamptz DEFAULT now()
)
RETURNS TABLE(payment_id uuid, invoice_id uuid, total_received numeric, outstanding_balance numeric, payment_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project public.projects%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_received numeric(12,2);
  v_due numeric(12,2);
  v_new_total numeric(12,2);
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Only authorized Owner/Admin users can record client receipts'
      USING ERRCODE = '42501';
  END IF;
  IF p_project_id IS NULL OR p_receipt_key IS NULL
     OR p_amount IS NULL OR p_amount <= 0
     OR p_amount <> round(p_amount, 2)
     OR p_payment_date IS NULL THEN
    RAISE EXCEPTION 'A project, idempotency key, valid positive amount and payment date are required'
      USING ERRCODE = '22023';
  END IF;

  -- Serializes concurrent receipts for this project and prevents overpayment.
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  v_due := COALESCE(v_project.price, 0)::numeric(12,2);
  IF v_due <= 0 THEN RAISE EXCEPTION 'Set a valid project amount before recording receipts'; END IF;

  SELECT * INTO v_payment FROM public.payments
    WHERE management_receipt_key = p_receipt_key;
  IF FOUND THEN
    IF v_payment.invoice_id IS NULL THEN RAISE EXCEPTION 'Receipt idempotency conflict'; END IF;
    SELECT * INTO v_invoice FROM public.invoices WHERE id = v_payment.invoice_id;
    SELECT COALESCE(sum(amount),0)::numeric(12,2) INTO v_received
      FROM public.payments WHERE invoice_id = v_invoice.id
      AND lower(COALESCE(status,'')) IN ('paid','completed','verified');
    RETURN QUERY SELECT v_payment.id, v_invoice.id, v_received,
      greatest(v_invoice.amount - v_received,0)::numeric(12,2),
      CASE WHEN v_received >= v_invoice.amount THEN 'paid' ELSE 'partial' END;
    RETURN;
  END IF;

  SELECT * INTO v_invoice FROM public.invoices
    WHERE project_id = p_project_id
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.invoices(project_id, client_id, amount, status)
    VALUES (v_project.id, v_project.client_id, v_due, 'unpaid')
    RETURNING * INTO v_invoice;
  ELSE
    -- Invoice amount is authoritative when already established.
    v_due := v_invoice.amount::numeric(12,2);
  END IF;

  SELECT COALESCE(sum(amount),0)::numeric(12,2) INTO v_received
    FROM public.payments WHERE invoice_id = v_invoice.id
    AND lower(COALESCE(status,'')) IN ('paid','completed','verified');
  IF p_amount > v_due - v_received THEN
    RAISE EXCEPTION 'Payment exceeds the outstanding balance of %', greatest(v_due-v_received,0)
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.payments(
    invoice_id, amount, payment_method, reference_number, status, payment_date,
    management_receipt_key
  ) VALUES (
    v_invoice.id, p_amount, NULLIF(trim(p_payment_method), ''),
    NULLIF(trim(p_reference_number), ''), 'paid', p_payment_date, p_receipt_key
  ) RETURNING * INTO v_payment;

  v_new_total := v_received + p_amount;
  UPDATE public.invoices SET
    status = CASE WHEN v_new_total >= v_due THEN 'paid' ELSE 'unpaid' END,
    updated_at = now()
  WHERE id = v_invoice.id;

  RETURN QUERY SELECT v_payment.id, v_invoice.id, v_new_total,
    greatest(v_due-v_new_total,0)::numeric(12,2),
    CASE WHEN v_new_total >= v_due THEN 'paid' ELSE 'partial' END;
END;
$$;

REVOKE ALL ON FUNCTION public.owner_record_project_client_payment(uuid,numeric,uuid,text,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_record_project_client_payment(uuid,numeric,uuid,text,text,timestamptz) TO authenticated;
