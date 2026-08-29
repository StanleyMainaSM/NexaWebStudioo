-- Correct the connector management function after the initial management migration.
-- Explicit table aliases prevent PL/pgSQL output-column/variable ambiguity.

CREATE OR REPLACE FUNCTION public.owner_manage_project_connector(
  p_project_id uuid,
  p_connector_id uuid,
  p_commission_rate numeric DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(
  project_id uuid,
  connector_id uuid,
  connector_name text,
  connector_email text,
  commission_rate numeric,
  commission_id uuid,
  commission_amount numeric,
  commission_status text,
  payout_id uuid,
  payout_status text,
  confirmation_status text,
  payment_reference text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_project public.projects;
  v_profile_rate numeric;
  v_rate numeric;
  v_commission public.commissions;
  v_payout public.payouts;
  v_payment_id uuid;
  v_payment_amount numeric;
  v_old_connector uuid;
  v_old_rate numeric;
  v_profile_old_rate numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_actor AND role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Owner/Admin authorization required';
  END IF;

  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;
  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF p_connector_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.connector_profiles cp
    JOIN public.user_roles ur ON ur.user_id = cp.user_id AND ur.role = 'connector'
    WHERE cp.user_id = p_connector_id AND cp.is_active = true
  ) THEN
    RAISE EXCEPTION 'Selected connector is not an active Connector account';
  END IF;

  SELECT c1.* INTO v_commission
  FROM public.commissions c1
  WHERE c1.project_id = p_project_id
  ORDER BY c1.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_commission.id IS NOT NULL THEN
    SELECT po1.* INTO v_payout
    FROM public.payouts po1
    WHERE po1.commission_id = v_commission.id
    ORDER BY po1.created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_commission.status IN ('paid','completed')
       OR COALESCE(v_payout.confirmation_status,'') IN ('sent','confirmed') THEN
      IF p_connector_id IS DISTINCT FROM v_commission.connector_id
         OR (p_commission_rate IS NOT NULL AND p_commission_rate IS DISTINCT FROM v_commission.commission_percentage) THEN
        RAISE EXCEPTION 'Commission is locked because payment has been sent or confirmed';
      END IF;
    END IF;
  END IF;

  SELECT cp.commission_rate INTO v_profile_rate
  FROM public.connector_profiles cp
  WHERE cp.user_id = p_connector_id AND cp.is_active = true
  LIMIT 1;

  IF p_connector_id IS NOT NULL AND v_profile_rate IS NULL THEN
    RAISE EXCEPTION 'Selected connector has no configured commission rate';
  END IF;

  IF p_commission_rate IS NOT NULL AND (p_commission_rate < 0 OR p_commission_rate > 100) THEN
    RAISE EXCEPTION 'Commission rate must be between 0 and 100 percent';
  END IF;

  v_rate := COALESCE(p_commission_rate, v_profile_rate);
  v_old_connector := v_project.connector_id;
  IF v_commission.id IS NOT NULL THEN
    v_old_rate := v_commission.commission_percentage;
  END IF;

  IF p_connector_id IS NOT NULL AND p_commission_rate IS NOT NULL THEN
    SELECT cp.commission_rate INTO v_profile_old_rate
    FROM public.connector_profiles cp
    WHERE cp.user_id = p_connector_id
    FOR UPDATE;

    UPDATE public.connector_profiles
    SET commission_rate = p_commission_rate,
        updated_at = now()
    WHERE user_id = p_connector_id;
  END IF;

  UPDATE public.projects
  SET connector_id = p_connector_id,
      updated_at = now()
  WHERE id = p_project_id;

  IF v_project.business_id IS NOT NULL THEN
    UPDATE public.leads
    SET connector_id = p_connector_id,
        updated_at = now()
    WHERE id = (
      SELECT l.id
      FROM public.leads l
      WHERE l.business_id = v_project.business_id
        AND l.status = 'won'
      ORDER BY l.created_at DESC
      LIMIT 1
    );
  END IF;

  SELECT pay.id, pay.amount
  INTO v_payment_id, v_payment_amount
  FROM public.payments pay
  JOIN public.invoices inv ON inv.id = pay.invoice_id
  WHERE inv.project_id = p_project_id
    AND lower(coalesce(pay.status,'')) IN ('paid','completed','verified')
  ORDER BY COALESCE(pay.payment_date,pay.created_at) DESC, pay.created_at DESC
  LIMIT 1;

  IF p_connector_id IS NULL THEN
    IF v_commission.id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot remove the connector while a commission exists';
    END IF;
  ELSIF v_payment_id IS NOT NULL THEN
    IF v_commission.id IS NULL THEN
      INSERT INTO public.commissions(
        connector_id, project_id, payment_id, eligible_amount,
        commission_percentage, amount, status, created_at, updated_at
      ) VALUES (
        p_connector_id, p_project_id, v_payment_id, v_payment_amount,
        v_rate, round(v_payment_amount * v_rate / 100.0, 2), 'pending', now(), now()
      )
      RETURNING * INTO v_commission;
    ELSE
      UPDATE public.commissions
      SET connector_id = p_connector_id,
          eligible_amount = v_payment_amount,
          commission_percentage = v_rate,
          amount = round(v_payment_amount * v_rate / 100.0, 2),
          updated_at = now()
      WHERE id = v_commission.id
      RETURNING * INTO v_commission;
    END IF;
  ELSIF v_commission.id IS NOT NULL AND p_connector_id IS NOT NULL THEN
    UPDATE public.commissions
    SET connector_id = p_connector_id,
        commission_percentage = v_rate,
        amount = round(eligible_amount * v_rate / 100.0, 2),
        updated_at = now()
    WHERE id = v_commission.id
    RETURNING * INTO v_commission;
  END IF;

  IF v_old_connector IS DISTINCT FROM p_connector_id THEN
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES (
      v_actor,
      'connector_assignment_changed',
      'project',
      p_project_id,
      jsonb_build_object('previous_connector_id', v_old_connector, 'new_connector_id', p_connector_id, 'reason', NULLIF(trim(COALESCE(p_reason,'')),''))
    );
  END IF;

  IF p_commission_rate IS NOT NULL AND v_profile_old_rate IS DISTINCT FROM p_commission_rate THEN
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES (
      v_actor,
      'connector_commission_rate_changed',
      'connector_profile',
      p_connector_id,
      jsonb_build_object('previous_rate', v_profile_old_rate, 'new_rate', p_commission_rate, 'project_id', p_project_id, 'reason', NULLIF(trim(COALESCE(p_reason,'')),''))
    );
  END IF;

  IF v_commission.id IS NOT NULL AND v_old_rate IS DISTINCT FROM v_commission.commission_percentage THEN
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES (
      v_actor,
      'commission_rate_changed',
      'commission',
      v_commission.id,
      jsonb_build_object('previous_rate', v_old_rate, 'new_rate', v_commission.commission_percentage, 'new_amount', v_commission.amount, 'reason', NULLIF(trim(COALESCE(p_reason,'')),''))
    );
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.connector_id,
    COALESCE(cp.full_name, cp.email, 'Connector')::text,
    cp.email::text,
    COALESCE(c.commission_percentage, profile.commission_rate, 0)::numeric,
    c.id,
    c.amount,
    c.status,
    po.id,
    po.status,
    po.confirmation_status,
    po.reference_number
  FROM public.projects p
  LEFT JOIN public.profiles cp ON cp.id = p.connector_id
  LEFT JOIN public.connector_profiles profile ON profile.user_id = p.connector_id
  LEFT JOIN LATERAL (
    SELECT c1.* FROM public.commissions c1
    WHERE c1.project_id = p.id
    ORDER BY c1.created_at DESC LIMIT 1
  ) c ON true
  LEFT JOIN LATERAL (
    SELECT po1.* FROM public.payouts po1
    WHERE po1.commission_id = c.id
    ORDER BY po1.created_at DESC LIMIT 1
  ) po ON true
  WHERE p.id = p_project_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_manage_project_connector(uuid,uuid,numeric,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.owner_manage_project_connector(uuid,uuid,numeric,text) TO authenticated;
