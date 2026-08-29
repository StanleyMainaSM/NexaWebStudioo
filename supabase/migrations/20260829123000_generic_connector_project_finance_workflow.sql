-- Generic connector -> project -> payment -> commission -> payout -> confirmation -> finance support.
-- No Suit & Wear-specific identifiers or amounts are used here.

CREATE OR REPLACE FUNCTION public.set_project_connector_from_won_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_connector uuid;
BEGIN
  IF NEW.connector_id IS NOT NULL OR NEW.business_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT l.connector_id INTO v_connector
  FROM public.leads l
  WHERE l.business_id = NEW.business_id
    AND l.status = 'won'
    AND l.connector_id IS NOT NULL
  ORDER BY l.created_at DESC
  LIMIT 1;

  IF v_connector IS NOT NULL THEN
    NEW.connector_id := v_connector;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_project_connector_from_won_lead ON public.projects;
CREATE TRIGGER trg_set_project_connector_from_won_lead
BEFORE INSERT OR UPDATE OF business_id, connector_id ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_project_connector_from_won_lead();

REVOKE EXECUTE ON FUNCTION public.set_project_connector_from_won_lead() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.owner_get_project_connector_finance(p_project_id uuid)
RETURNS TABLE(
  connector_id uuid,
  connector_name text,
  connector_email text,
  commission_rate numeric,
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
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Owner/Admin authorization required';
  END IF;

  RETURN QUERY
  SELECT
    p.connector_id,
    coalesce(cp.full_name, cp.email, 'Connector')::text,
    cp.email::text,
    coalesce(profile.commission_rate, c.commission_percentage, 0)::numeric,
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
    WHERE po1.project_id = p.id
      AND po1.payout_type = 'connector_commission'
    ORDER BY po1.created_at DESC
    LIMIT 1
  ) po ON true
  WHERE p.id = p_project_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_get_project_connector_finance(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.owner_get_project_connector_finance(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_get_finance_summary()
RETURNS TABLE(
  revenue_received numeric,
  total_client_payments numeric,
  operator_costs numeric,
  connector_commissions_earned numeric,
  connector_payouts_paid numeric,
  remaining_margin numeric,
  outstanding_invoices numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_revenue numeric := 0;
  v_operator numeric := 0;
  v_commissions numeric := 0;
  v_payouts numeric := 0;
  v_total_payments numeric := 0;
  v_outstanding numeric := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'Owner/Admin authorization required';
  END IF;

  SELECT
    coalesce(sum(CASE WHEN lower(coalesce(p.status,'')) IN ('paid','completed','verified') THEN p.amount ELSE 0 END),0),
    coalesce(sum(p.amount),0)
  INTO v_revenue, v_total_payments
  FROM public.payments p;

  SELECT coalesce(sum(
    CASE
      WHEN coalesce(op.payout_total,0) > 0 THEN op.payout_total
      WHEN lower(coalesce(pr.operator_payment_status,'')) IN ('paid','completed','verified') THEN coalesce(pr.operator_payment,0)
      ELSE 0
    END
  ),0)
  INTO v_operator
  FROM public.projects pr
  LEFT JOIN LATERAL (
    SELECT coalesce(sum(po.amount),0) AS payout_total
    FROM public.payouts po
    WHERE po.project_id = pr.id
      AND po.payout_type = 'operator_payment'
      AND lower(coalesce(po.status,'')) IN ('paid','completed')
  ) op ON true;

  SELECT coalesce(sum(c.amount),0)
  INTO v_commissions
  FROM public.commissions c
  WHERE lower(coalesce(c.status,'')) NOT IN ('cancelled','canceled','rejected','void');

  SELECT coalesce(sum(po.amount),0)
  INTO v_payouts
  FROM public.payouts po
  WHERE po.payout_type = 'connector_commission'
    AND lower(coalesce(po.status,'')) IN ('paid','completed');

  SELECT coalesce(sum(i.amount),0)
  INTO v_outstanding
  FROM public.invoices i
  WHERE lower(coalesce(i.status,'')) NOT IN ('paid','completed');

  RETURN QUERY SELECT
    v_revenue,
    v_total_payments,
    v_operator,
    v_commissions,
    v_payouts,
    v_revenue - v_operator - v_commissions,
    v_outstanding;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_get_finance_summary() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.owner_get_finance_summary() TO authenticated;

-- Ensure a connector commission can never have more than one payout.
CREATE UNIQUE INDEX IF NOT EXISTS payouts_commission_unique_idx
ON public.payouts(commission_id)
WHERE commission_id IS NOT NULL;
