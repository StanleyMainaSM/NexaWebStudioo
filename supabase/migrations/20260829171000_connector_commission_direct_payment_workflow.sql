-- Convert the existing Owner/Admin commission "mark paid" action into the
-- first half of the two-sided payout workflow. A confirmed payout remains paid.

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
    WHERE user_id=v_actor AND role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Only Owner/Admin can initiate connector commission payments';
  END IF;

  SELECT * INTO v_payout
  FROM public.payouts
  WHERE commission_id=NEW.id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_payout.id IS NOT NULL AND v_payout.confirmation_status='confirmed' THEN
    RETURN NEW;
  END IF;

  v_reference := COALESCE(
    NULLIF(trim(NEW.payment_reference),''),
    'AVL-COM-'||upper(substr(NEW.id::text,1,8))
  );

  IF v_payout.id IS NULL THEN
    INSERT INTO public.payouts(
      recipient_id,recipient_role,project_id,commission_id,amount,
      payment_method,reference_number,status,notes,created_by,payout_type,
      confirmation_status,sent_at,sent_by
    ) VALUES (
      NEW.connector_id,'connector',NEW.project_id,NEW.id,NEW.amount,
      COALESCE(NEW.payment_method,'Avelixa internal transfer'),v_reference,
      'processing','Payment sent by Owner/Admin; awaiting connector confirmation.',
      v_actor,'connector_commission','sent',now(),v_actor
    );
  ELSE
    UPDATE public.payouts
    SET amount=NEW.amount,
        payment_method=COALESCE(NEW.payment_method,payment_method),
        reference_number=v_reference,
        status='processing',
        notes='Payment sent by Owner/Admin; awaiting connector confirmation.',
        confirmation_status='sent',
        sent_at=COALESCE(sent_at,now()),
        sent_by=COALESCE(sent_by,v_actor),
        updated_at=now()
    WHERE id=v_payout.id;
  END IF;

  NEW.status := 'approved';
  NEW.paid_at := NULL;
  NEW.payment_reference := v_reference;
  NEW.payment_method := COALESCE(NEW.payment_method,'Avelixa internal transfer');
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

REVOKE EXECUTE ON FUNCTION public.intercept_direct_connector_commission_payment() FROM public,anon,authenticated;
