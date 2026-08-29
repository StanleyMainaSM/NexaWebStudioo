-- Fix Owner connector commission configuration so project-specific rates are authoritative.
-- The connector profile rate remains the global default; configuring one project must not mutate it.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS connector_commission_rate numeric(5,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_connector_commission_rate_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_connector_commission_rate_check
      CHECK (connector_commission_rate IS NULL OR (connector_commission_rate >= 0 AND connector_commission_rate <= 100));
  END IF;
END;
$$;

-- Preserve the existing finalized Suit & Wear snapshot while backfilling only projects
-- that already have a commission snapshot and no project-level configuration yet.
UPDATE public.projects p
SET connector_commission_rate = c.commission_percentage,
    updated_at = now()
FROM public.commissions c
WHERE c.project_id = p.id
  AND p.connector_commission_rate IS NULL
  AND c.commission_percentage IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_connector_commission_for_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
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

  SELECT id
  INTO v_commission_id
  FROM public.commissions
  WHERE payment_id = NEW.id
  LIMIT 1;

  IF v_commission_id IS NULL THEN
    INSERT INTO public.commissions(
      connector_id,
      project_id,
      payment_id,
      eligible_amount,
      commission_percentage,
      amount,
      status,
      payment_method,
      payment_reference,
      verification_message,
      created_at,
      updated_at
    )
    VALUES(
      v_connector_id,
      v_project_id,
      NEW.id,
      NEW.amount,
      v_rate,
      round(NEW.amount * v_rate / 100.0, 2),
      'pending',
      NEW.payment_method,
      NEW.reference_number,
      NEW.verification_message,
      now(),
      now()
    );
  ELSE
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
    WHERE id = v_commission_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.owner_manage_project_connector(uuid,uuid,numeric,text);

CREATE FUNCTION public.owner_manage_project_connector(
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
  v_old_project_rate numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_actor
      AND role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Owner/Admin authorization required';
  END IF;

  SELECT *
  INTO v_project
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  SELECT c1.*
  INTO v_commission
  FROM public.commissions c1
  WHERE c1.project_id = p_project_id
  ORDER BY c1.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_commission.id IS NOT NULL THEN
    SELECT po1.*
    INTO v_payout
    FROM public.payouts po1
    WHERE po1.commission_id = v_commission.id
    ORDER BY po1.created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_commission.status IN ('paid','completed')
       OR COALESCE(v_payout.confirmation_status,'') IN ('sent','confirmed')
       OR COALESCE(v_payout.status,'') IN ('paid','completed') THEN
      IF p_connector_id IS DISTINCT FROM v_commission.connector_id
         OR (p_commission_rate IS NOT NULL AND p_commission_rate IS DISTINCT FROM v_commission.commission_percentage) THEN
        RAISE EXCEPTION 'Commission is locked because payment has been sent or confirmed';
      END IF;
    END IF;
  END IF;

  IF p_connector_id IS NULL THEN
    IF v_commission.id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot remove the connector while a commission exists';
    END IF;
    RAISE EXCEPTION 'A Connector must be selected for commission configuration';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.connector_profiles cp
    JOIN public.user_roles ur
      ON ur.user_id = cp.user_id
     AND ur.role = 'connector'
    WHERE cp.user_id = p_connector_id
      AND cp.is_active = true
  ) THEN
    RAISE EXCEPTION 'Selected connector is not an active Connector account';
  END IF;

  SELECT cp.commission_rate
  INTO v_profile_rate
  FROM public.connector_profiles cp
  WHERE cp.user_id = p_connector_id
    AND cp.is_active = true
  LIMIT 1;

  IF p_commission_rate IS NOT NULL
     AND (p_commission_rate < 0 OR p_commission_rate > 100) THEN
    RAISE EXCEPTION 'Commission rate must be between 0 and 100 percent';
  END IF;

  v_old_connector := v_project.connector_id;
  v_old_project_rate := v_project.connector_commission_rate;
  IF v_commission.id IS NOT NULL THEN
    v_old_rate := v_commission.commission_percentage;
  END IF;

  -- A commission snapshot is authoritative once it exists. For a project without
  -- a commission yet, persist the configured rate on the project so the later
  -- payment trigger uses this project-specific value instead of the global default.
  v_rate := COALESCE(
    p_commission_rate,
    CASE WHEN v_commission.id IS NOT NULL THEN v_commission.commission_percentage END,
    v_project.connector_commission_rate,
    v_profile_rate
  );

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'Selected connector has no configured commission rate';
  END IF;

  UPDATE public.projects
  SET connector_id = p_connector_id,
      connector_commission_rate = v_rate,
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

  IF v_payment_id IS NOT NULL THEN
    IF v_commission.id IS NULL THEN
      INSERT INTO public.commissions(
        connector_id,
        project_id,
        payment_id,
        eligible_amount,
        commission_percentage,
        amount,
        status,
        created_at,
        updated_at
      )
      VALUES(
        p_connector_id,
        p_project_id,
        v_payment_id,
        v_payment_amount,
        v_rate,
        round(v_payment_amount * v_rate / 100.0, 2),
        'pending',
        now(),
        now()
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
  ELSIF v_commission.id IS NOT NULL THEN
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
    VALUES(
      v_actor,
      'connector_assignment_changed',
      'project',
      p_project_id,
      jsonb_build_object(
        'previous_connector_id', v_old_connector,
        'new_connector_id', p_connector_id,
        'reason', NULLIF(trim(COALESCE(p_reason,'')),'')
      )
    );
  END IF;

  IF v_old_project_rate IS DISTINCT FROM v_rate THEN
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES(
      v_actor,
      'connector_project_commission_rate_changed',
      'project',
      p_project_id,
      jsonb_build_object(
        'previous_rate', v_old_project_rate,
        'new_rate', v_rate,
        'commission_id', v_commission.id,
        'new_amount', v_commission.amount,
        'reason', NULLIF(trim(COALESCE(p_reason,'')),'')
      )
    );
  END IF;

  IF v_commission.id IS NOT NULL
     AND v_old_rate IS DISTINCT FROM v_commission.commission_percentage THEN
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES(
      v_actor,
      'commission_rate_changed',
      'commission',
      v_commission.id,
      jsonb_build_object(
        'previous_rate', v_old_rate,
        'new_rate', v_commission.commission_percentage,
        'new_amount', v_commission.amount,
        'reason', NULLIF(trim(COALESCE(p_reason,'')),'')
      )
    );
  END IF;

  IF NULLIF(trim(COALESCE(p_reason,'')),'') IS NOT NULL
     AND v_old_connector IS NOT DISTINCT FROM p_connector_id
     AND v_old_project_rate IS NOT DISTINCT FROM v_rate
     AND (v_commission.id IS NULL OR v_old_rate IS NOT DISTINCT FROM v_commission.commission_percentage) THEN
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES(
      v_actor,
      'connector_commission_configuration_note',
      'project',
      p_project_id,
      jsonb_build_object('reason', trim(p_reason))
    );
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.connector_id,
    COALESCE(cp.full_name, cp.email, 'Connector')::text,
    cp.email::text,
    COALESCE(c.commission_percentage, p.connector_commission_rate, profile.commission_rate, 0)::numeric,
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
    SELECT c1.*
    FROM public.commissions c1
    WHERE c1.project_id = p.id
    ORDER BY c1.created_at DESC
    LIMIT 1
  ) c ON true
  LEFT JOIN LATERAL (
    SELECT po1.*
    FROM public.payouts po1
    WHERE po1.commission_id = c.id
    ORDER BY po1.created_at DESC
    LIMIT 1
  ) po ON true
  WHERE p.id = p_project_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_manage_project_connector(uuid,uuid,numeric,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.owner_manage_project_connector(uuid,uuid,numeric,text) TO authenticated;

DROP FUNCTION IF EXISTS public.owner_get_project_connector_finance(uuid);

CREATE FUNCTION public.owner_get_project_connector_finance(p_project_id uuid)
RETURNS TABLE(
  connector_id uuid,
  connector_name text,
  connector_email text,
  commission_rate numeric,
  eligible_payment_amount numeric,
  commission_id uuid,
  commission_amount numeric,
  commission_status text,
  payout_id uuid,
  payout_amount numeric,
  payout_status text,
  confirmation_status text,
  payment_reference text,
  sent_at timestamptz,
  confirmed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Owner/Admin authorization required';
  END IF;

  RETURN QUERY
  SELECT
    p.connector_id,
    COALESCE(cp.full_name, cp.email, 'Connector')::text,
    cp.email::text,
    COALESCE(c.commission_percentage, p.connector_commission_rate, profile.commission_rate, 0)::numeric,
    COALESCE(pay.amount, 0)::numeric,
    c.id,
    c.amount,
    c.status,
    po.id,
    po.amount,
    po.status,
    po.confirmation_status,
    po.reference_number,
    po.sent_at,
    po.confirmed_at
  FROM public.projects p
  LEFT JOIN public.profiles cp ON cp.id = p.connector_id
  LEFT JOIN public.connector_profiles profile ON profile.user_id = p.connector_id
  LEFT JOIN LATERAL (
    SELECT c1.*
    FROM public.commissions c1
    WHERE c1.project_id = p.id
    ORDER BY c1.created_at DESC
    LIMIT 1
  ) c ON true
  LEFT JOIN LATERAL (
    SELECT po1.*
    FROM public.payouts po1
    WHERE po1.commission_id = c.id
    ORDER BY po1.created_at DESC
    LIMIT 1
  ) po ON true
  LEFT JOIN LATERAL (
    SELECT pay1.amount
    FROM public.payments pay1
    JOIN public.invoices inv1 ON inv1.id = pay1.invoice_id
    WHERE inv1.project_id = p.id
      AND lower(coalesce(pay1.status,'')) IN ('paid','completed','verified')
    ORDER BY COALESCE(pay1.payment_date,pay1.created_at) DESC, pay1.created_at DESC
    LIMIT 1
  ) pay ON true
  WHERE p.id = p_project_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_get_project_connector_finance(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.owner_get_project_connector_finance(uuid) TO authenticated;

COMMENT ON COLUMN public.projects.connector_commission_rate IS 'Project-specific connector commission rate snapshot/configuration. connector_profiles.commission_rate remains the connector default.';
