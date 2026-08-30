-- AVELIXA FINANCE HANDOFF HARDENING
-- Keep client payment verification authoritative and make payment -> commission creation idempotent.

DROP INDEX IF EXISTS public.commissions_payment_id_unique_idx;

CREATE OR REPLACE FUNCTION public.create_connector_commission_for_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_project_id uuid;
  v_connector_id uuid;
  v_rate numeric(10,2);
  v_commission_id uuid;
BEGIN
  IF NEW.status NOT IN ('paid','verified','completed') OR NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT i.project_id
  INTO v_project_id
  FROM public.invoices i
  WHERE i.id = NEW.invoice_id;

  IF v_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.connector_id, p.connector_commission_rate
  INTO v_connector_id, v_rate
  FROM public.projects p
  WHERE p.id = v_project_id;

  IF v_connector_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_rate IS NULL THEN
    SELECT cp.commission_rate
    INTO v_rate
    FROM public.connector_profiles cp
    WHERE cp.user_id = v_connector_id
      AND cp.is_active = true
    LIMIT 1;
  END IF;

  IF v_rate IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.commissions (
    connector_id, project_id, payment_id, eligible_amount,
    commission_percentage, amount, status, payment_method,
    payment_reference, verification_message, created_at, updated_at
  )
  VALUES (
    v_connector_id, v_project_id, NEW.id, NEW.amount,
    v_rate, round(NEW.amount * v_rate / 100.0, 2), 'pending',
    NEW.payment_method, NEW.reference_number, NEW.verification_message,
    now(), now()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_commission_id;

  IF v_commission_id IS NULL THEN
    UPDATE public.commissions
    SET connector_id = v_connector_id,
        project_id = v_project_id,
        eligible_amount = NEW.amount,
        commission_percentage = v_rate,
        amount = round(NEW.amount * v_rate / 100.0, 2),
        payment_method = NEW.payment_method,
        payment_reference = NEW.reference_number,
        verification_message = NEW.verification_message,
        updated_at = now()
    WHERE payment_id = NEW.id
    RETURNING id INTO v_commission_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_invoice_payment(
  p_payment_id uuid,
  p_status text,
  p_verification_message text DEFAULT NULL
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_catalog'
AS $$
DECLARE
  v_payment public.payments;
  v_invoice public.invoices;
  v_status text := lower(trim(coalesce(p_status, '')));
BEGIN
  IF NOT private.user_has_any_role(auth.uid(), array['owner','admin']) THEN
    RAISE EXCEPTION 'Owner or Admin role required';
  END IF;

  IF v_status NOT IN ('completed', 'failed') THEN
    RAISE EXCEPTION 'Payment status must be completed or failed';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending payments can be verified';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = v_payment.invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found for payment';
  END IF;

  IF v_status = 'completed' AND v_invoice.status NOT IN ('unpaid', 'overdue') THEN
    RAISE EXCEPTION 'Invoice is no longer awaiting payment verification';
  END IF;

  IF v_status = 'completed' AND EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.invoice_id = v_payment.invoice_id
      AND p.id <> v_payment.id
      AND p.status IN ('completed', 'paid', 'successful', 'success')
  ) THEN
    RAISE EXCEPTION 'Another completed payment already exists for this invoice';
  END IF;

  IF v_status = 'completed' AND v_payment.amount <> v_invoice.amount THEN
    RAISE EXCEPTION 'Payment amount does not match the invoice amount';
  END IF;

  UPDATE public.payments
  SET status = v_status,
      payment_date = CASE WHEN v_status = 'completed' THEN now() ELSE payment_date END,
      verification_message = coalesce(
        nullif(trim(p_verification_message), ''),
        CASE
          WHEN v_status = 'completed' THEN 'Payment verified by Owner/Admin.'
          ELSE 'Payment rejected by Owner/Admin.'
        END
      )
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  IF v_status = 'failed' THEN
    PERFORM private.create_avelixa_notification(
      v_invoice.client_id,
      'Payment verification failed',
      format(
        'Your payment submission for invoice %s could not be verified. %s',
        v_invoice.id::text,
        coalesce(v_payment.verification_message, 'Please contact Avelixa support.')
      ),
      '/portal/invoices/' || v_invoice.id::text,
      'payment_verification_failed',
      'payment',
      p_payment_id,
      jsonb_build_object('invoice_id', v_invoice.id, 'payment_id', p_payment_id),
      'payment_verification_failed:' || p_payment_id
    );
  END IF;

  INSERT INTO public.automation_events(event_type, entity_type, entity_id, actor_id, payload)
  VALUES (
    CASE WHEN v_status = 'completed' THEN 'payment_verified' ELSE 'payment_rejected' END,
    'payment',
    p_payment_id,
    auth.uid(),
    jsonb_build_object('invoice_id', v_invoice.id, 'status', v_status, 'amount', v_payment.amount)
  );

  RETURN v_payment;
END;
$$;
