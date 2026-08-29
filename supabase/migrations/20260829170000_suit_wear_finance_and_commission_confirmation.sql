-- Suit & Wear finance reconciliation and two-sided connector commission confirmation.
-- Safe to replay: all data operations are idempotent and scoped to this project.

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS confirmation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES public.profiles(id);

ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_confirmation_status_check;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_confirmation_status_check
  CHECK (confirmation_status IN ('pending','sent','confirmed','rejected'));

CREATE INDEX IF NOT EXISTS payouts_commission_id_idx ON public.payouts(commission_id);
CREATE UNIQUE INDEX IF NOT EXISTS payouts_commission_unique_idx
  ON public.payouts(commission_id) WHERE commission_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.owner_mark_connector_commission_sent(
  p_commission_id uuid,
  p_payment_method text,
  p_reference text
)
RETURNS public.payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_commission public.commissions;
  v_payout public.payouts;
  v_owner uuid := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_owner AND role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Only Owner/Admin can send connector commission payments';
  END IF;

  SELECT * INTO v_commission
  FROM public.commissions
  WHERE id = p_commission_id
  FOR UPDATE;

  IF v_commission.id IS NULL THEN RAISE EXCEPTION 'Commission not found'; END IF;
  IF v_commission.connector_id IS NULL THEN RAISE EXCEPTION 'Commission has no connector'; END IF;
  IF v_commission.amount <= 0 THEN RAISE EXCEPTION 'Commission amount must be greater than zero'; END IF;

  INSERT INTO public.payouts (
    recipient_id, recipient_role, project_id, commission_id, amount,
    payment_method, reference_number, status, notes, paid_at,
    created_by, payout_type, confirmation_status, sent_at, sent_by
  ) VALUES (
    v_commission.connector_id, 'connector', v_commission.project_id,
    v_commission.id, v_commission.amount, p_payment_method,
    p_reference, 'processing', 'Commission payment sent; awaiting connector confirmation.',
    NULL, v_owner, 'connector_commission', 'sent', now(), v_owner
  )
  ON CONFLICT (commission_id) DO UPDATE
  SET payment_method = excluded.payment_method,
      reference_number = excluded.reference_number,
      status = CASE WHEN public.payouts.confirmation_status = 'confirmed'
        THEN public.payouts.status ELSE 'processing' END,
      notes = CASE WHEN public.payouts.confirmation_status = 'confirmed'
        THEN public.payouts.notes ELSE excluded.notes END,
      sent_at = COALESCE(public.payouts.sent_at, excluded.sent_at),
      sent_by = COALESCE(public.payouts.sent_by, excluded.sent_by),
      updated_at = now()
  RETURNING * INTO v_payout;

  IF v_payout.confirmation_status <> 'confirmed' THEN
    UPDATE public.commissions
    SET status = 'approved',
        payment_method = p_payment_method,
        payment_reference = p_reference,
        verification_message = 'Payment sent by Owner/Admin; awaiting connector confirmation.',
        updated_at = now()
    WHERE id = v_commission.id;
  END IF;

  RETURN v_payout;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_mark_connector_commission_sent(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.owner_mark_connector_commission_sent(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.connector_confirm_commission_received(p_payout_id uuid)
RETURNS public.payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payout public.payouts;
  v_user uuid := auth.uid();
BEGIN
  SELECT * INTO v_payout
  FROM public.payouts
  WHERE id = p_payout_id
    AND recipient_id = v_user
    AND recipient_role = 'connector'
  FOR UPDATE;

  IF v_payout.id IS NULL THEN
    RAISE EXCEPTION 'Commission payout not found or not assigned to the authenticated connector';
  END IF;
  IF v_payout.confirmation_status = 'confirmed' THEN RETURN v_payout; END IF;
  IF v_payout.confirmation_status <> 'sent' THEN
    RAISE EXCEPTION 'This commission payment has not been marked as sent';
  END IF;

  UPDATE public.payouts
  SET status = 'paid',
      confirmation_status = 'confirmed',
      paid_at = now(),
      confirmed_at = now(),
      confirmed_by = v_user,
      updated_at = now()
  WHERE id = v_payout.id
  RETURNING * INTO v_payout;

  UPDATE public.commissions
  SET status = 'paid',
      paid_at = v_payout.paid_at,
      payment_method = v_payout.payment_method,
      payment_reference = v_payout.reference_number,
      verification_message = 'Connector confirmed receipt of the commission payment.',
      updated_at = now()
  WHERE id = v_payout.commission_id;

  RETURN v_payout;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.connector_confirm_commission_received(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.connector_confirm_commission_received(uuid) TO authenticated;

-- If the existing Owner Finance action writes commissions.status='paid' directly,
-- turn that action into a secure "payment sent" transition. A confirmed payout
-- remains paid and is never downgraded.
CREATE OR REPLACE FUNCTION public.intercept_direct_connector_commission_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_payout public.payouts;
  v_reference text;
BEGIN
  IF NEW.status <> 'paid' OR OLD.status = 'paid' THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_actor AND role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Only Owner/Admin can initiate connector commission payments';
  END IF;

  SELECT * INTO v_payout
  FROM public.payouts
  WHERE commission_id = NEW.id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_payout.id IS NOT NULL AND v_payout.confirmation_status = 'confirmed' THEN
    RETURN NEW;
  END IF;

  v_reference := COALESCE(NULLIF(trim(NEW.payment_reference), ''), 'AVL-COM-' || upper(substr(NEW.id::text,1,8)));

  IF v_payout.id IS NULL THEN
    INSERT INTO public.payouts (
      recipient_id, recipient_role, project_id, commission_id, amount,
      payment_method, reference_number, status, notes, created_by,
      payout_type, confirmation_status, sent_at, sent_by
    ) VALUES (
      NEW.connector_id, 'connector', NEW.project_id, NEW.id, NEW.amount,
      COALESCE(NEW.payment_method, 'Avelixa internal transfer'), v_reference,
      'processing', 'Payment sent by Owner/Admin; awaiting connector confirmation.',
      v_actor, 'connector_commission', 'sent', now(), v_actor
    );
  ELSE
    UPDATE public.payouts
    SET amount = NEW.amount,
        payment_method = COALESCE(NEW.payment_method, payment_method),
        reference_number = v_reference,
        status = 'processing',
        notes = 'Payment sent by Owner/Admin; awaiting connector confirmation.',
        confirmation_status = 'sent',
        sent_at = COALESCE(sent_at, now()),
        sent_by = COALESCE(sent_by, v_actor),
        updated_at = now()
    WHERE id = v_payout.id;
  END IF;

  NEW.status := 'approved';
  NEW.paid_at := NULL;
  NEW.payment_reference := v_reference;
  NEW.payment_method := COALESCE(NEW.payment_method, 'Avelixa internal transfer');
  NEW.verification_message := 'Payment sent by Owner/Admin; awaiting connector confirmation.';
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS commissions_direct_payment_workflow ON public.commissions;
CREATE TRIGGER commissions_direct_payment_workflow
BEFORE UPDATE OF status ON public.commissions
FOR EACH ROW
EXECUTE FUNCTION public.intercept_direct_connector_commission_payment();

REVOKE EXECUTE ON FUNCTION public.intercept_direct_connector_commission_payment() FROM public, anon, authenticated;

-- Existing Suit & Wear demo contact/timeline.
UPDATE public.businesses
SET contact_name = 'James Mwangi',
    email = 'contact@suitandwear.example',
    phone = '+254 700 000 000',
    updated_at = now()
WHERE lower(name) = lower('Suit & Wear');

UPDATE public.leads
SET created_at = '2026-08-15 09:00:00+03',
    status = 'won',
    estimated_budget = 20000,
    updated_at = now()
WHERE business_id = (
  SELECT id FROM public.businesses
  WHERE lower(name)=lower('Suit & Wear')
  ORDER BY created_at ASC LIMIT 1
)
AND connector_id = '45ab9ac2-10ee-452b-87f6-2f1caa38adf4';

UPDATE public.projects
SET price = 20000,
    status = 'completed',
    progress = 100,
    operator_payment = 1500,
    operator_payment_status = 'paid',
    operator_paid_at = COALESCE(operator_paid_at, now()),
    operator_payment_method = COALESCE(operator_payment_method, 'Avelixa internal payment'),
    operator_payment_reference = COALESCE(operator_payment_reference, 'AVL-OP-SW-0001'),
    operator_payment_verification = COALESCE(operator_payment_verification, 'Recorded as paid for the completed Suit & Wear project.'),
    updated_at = now()
WHERE id = '00ab22be-5c66-4499-b803-d5a3c8b81780';

UPDATE public.invoices
SET amount=20000,status='paid',client_id=null,updated_at=now()
WHERE id='a83c4743-f1d7-4f44-b6b2-5beb6139ce8d';

UPDATE public.payments
SET amount=20000,
    status='completed',
    payment_method=COALESCE(payment_method,'Avelixa recorded client payment'),
    reference_number=COALESCE(reference_number,'AVL-CLIENT-SW-0001'),
    payment_date=COALESCE(payment_date,now()),
    verification_message=COALESCE(verification_message,'Completed client payment recorded for Suit & Wear.'),
    finance_account_id=COALESCE(finance_account_id,(SELECT id FROM public.finance_accounts WHERE is_primary=true ORDER BY created_at ASC LIMIT 1))
WHERE id='35c301e5-bb7e-452e-87b7-161a42982b34';

DELETE FROM public.commissions c
WHERE c.project_id='00ab22be-5c66-4499-b803-d5a3c8b81780'
AND c.id <> '49974f5c-e891-4c14-8c1c-97369aa3f89e';

UPDATE public.commissions
SET connector_id='45ab9ac2-10ee-452b-87f6-2f1caa38adf4',
    project_id='00ab22be-5c66-4499-b803-d5a3c8b81780',
    payment_id='35c301e5-bb7e-452e-87b7-161a42982b34',
    eligible_amount=20000,
    commission_percentage=20,
    amount=4000,
    status='paid',
    paid_at=now(),
    payment_method='Avelixa internal transfer',
    payment_reference='AVL-COM-SW-0001',
    verification_message='Connector payment confirmed for Suit & Wear.',
    updated_at=now()
WHERE id='49974f5c-e891-4c14-8c1c-97369aa3f89e';

INSERT INTO public.payouts (
  recipient_id,recipient_role,project_id,commission_id,amount,payment_method,
  reference_number,status,notes,paid_at,created_by,payout_type,finance_account_id,
  confirmation_status,sent_at,sent_by,confirmed_at,confirmed_by
)
SELECT
  '45ab9ac2-10ee-452b-87f6-2f1caa38adf4','connector',
  '00ab22be-5c66-4499-b803-d5a3c8b81780','49974f5c-e891-4c14-8c1c-97369aa3f89e',
  4000,'Avelixa internal transfer','AVL-COM-SW-0001','paid',
  'Suit & Wear commission payment sent and confirmed by connector.',now(),owner.id,
  'connector_commission',fa.id,'confirmed',now(),owner.id,now(),
  '45ab9ac2-10ee-452b-87f6-2f1caa38adf4'
FROM public.profiles owner
JOIN public.user_roles owner_role ON owner_role.user_id=owner.id AND owner_role.role='owner'
LEFT JOIN public.finance_accounts fa ON fa.is_primary=true
WHERE NOT EXISTS (SELECT 1 FROM public.payouts WHERE commission_id='49974f5c-e891-4c14-8c1c-97369aa3f89e')
ORDER BY owner.created_at ASC LIMIT 1;

INSERT INTO public.finance_transactions (
  transaction_type,project_id,amount,status,verification_status,payment_date,
  payment_method,reference_number,description,created_by,verified_by,verified_at,
  finance_account_id,verification_message
)
SELECT 'client_payment','00ab22be-5c66-4499-b803-d5a3c8b81780',20000,'paid','verified',now(),
  'Avelixa recorded client payment','AVL-CLIENT-SW-0001','Suit & Wear client payment received.',
  owner.id,owner.id,now(),fa.id,'Reconciled from completed Suit & Wear invoice payment.'
FROM public.profiles owner
JOIN public.user_roles ur ON ur.user_id=owner.id AND ur.role='owner'
LEFT JOIN public.finance_accounts fa ON fa.is_primary=true
WHERE NOT EXISTS (SELECT 1 FROM public.finance_transactions ft WHERE ft.project_id='00ab22be-5c66-4499-b803-d5a3c8b81780' AND ft.transaction_type='client_payment');

INSERT INTO public.finance_transactions (
  transaction_type,project_id,amount,status,verification_status,payment_date,
  payment_method,reference_number,description,created_by,verified_by,verified_at,
  finance_account_id,verification_message
)
SELECT 'operator_payment','00ab22be-5c66-4499-b803-d5a3c8b81780',1500,'paid','verified',now(),
  'Avelixa internal payment','AVL-OP-SW-0001','Suit & Wear operator payment recorded as paid.',
  owner.id,owner.id,now(),fa.id,'Recorded against the completed Suit & Wear project.'
FROM public.profiles owner
JOIN public.user_roles ur ON ur.user_id=owner.id AND ur.role='owner'
LEFT JOIN public.finance_accounts fa ON fa.is_primary=true
WHERE NOT EXISTS (SELECT 1 FROM public.finance_transactions ft WHERE ft.project_id='00ab22be-5c66-4499-b803-d5a3c8b81780' AND ft.transaction_type='operator_payment');

INSERT INTO public.finance_transactions (
  transaction_type,project_id,connector_id,amount,status,verification_status,payment_date,
  payment_method,reference_number,description,created_by,verified_by,verified_at,
  finance_account_id,verification_message
)
SELECT 'connector_commission','00ab22be-5c66-4499-b803-d5a3c8b81780',
  '45ab9ac2-10ee-452b-87f6-2f1caa38adf4',4000,'paid','verified',now(),
  'Avelixa internal transfer','AVL-COM-SW-0001','Suit & Wear connector commission paid and confirmed.',
  owner.id,owner.id,now(),fa.id,'Commission is 20% of the KSh 20,000 completed client payment.'
FROM public.profiles owner
JOIN public.user_roles ur ON ur.user_id=owner.id AND ur.role='owner'
LEFT JOIN public.finance_accounts fa ON fa.is_primary=true
WHERE NOT EXISTS (SELECT 1 FROM public.finance_transactions ft WHERE ft.project_id='00ab22be-5c66-4499-b803-d5a3c8b81780' AND ft.transaction_type='connector_commission');

INSERT INTO public.financial_records(record_type,category,description,amount,reference_id,reference_number,record_date,status,created_by)
SELECT 'revenue','client_payment','Suit & Wear client payment received.',20000,
  '35c301e5-bb7e-452e-87b7-161a42982b34','AVL-CLIENT-SW-0001',current_date,'recorded',owner.id
FROM public.profiles owner JOIN public.user_roles ur ON ur.user_id=owner.id AND ur.role='owner'
WHERE NOT EXISTS (SELECT 1 FROM public.financial_records WHERE reference_id='35c301e5-bb7e-452e-87b7-161a42982b34');

INSERT INTO public.financial_records(record_type,category,description,amount,reference_id,reference_number,record_date,status,created_by)
SELECT 'operator_payment','operator_payment','Suit & Wear operator payment.',1500,
  '00ab22be-5c66-4499-b803-d5a3c8b81780','AVL-OP-SW-0001',current_date,'recorded',owner.id
FROM public.profiles owner JOIN public.user_roles ur ON ur.user_id=owner.id AND ur.role='owner'
WHERE NOT EXISTS (SELECT 1 FROM public.financial_records WHERE reference_number='AVL-OP-SW-0001');

INSERT INTO public.financial_records(record_type,category,description,amount,reference_id,reference_number,record_date,status,created_by)
SELECT 'connector_commission','connector_commission','Suit & Wear connector commission paid.',4000,
  '49974f5c-e891-4c14-8c1c-97369aa3f89e','AVL-COM-SW-0001',current_date,'recorded',owner.id
FROM public.profiles owner JOIN public.user_roles ur ON ur.user_id=owner.id AND ur.role='owner'
WHERE NOT EXISTS (SELECT 1 FROM public.financial_records WHERE reference_number='AVL-COM-SW-0001');
