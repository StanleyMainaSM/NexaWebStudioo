-- Finance summary reports remaining invoice balances, not full face value after partial receipts.
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

  SELECT coalesce(sum(greatest(i.amount - coalesce(paid.total,0),0)),0)
  INTO v_outstanding
  FROM public.invoices i
  LEFT JOIN LATERAL (
    SELECT sum(pay.amount) AS total
    FROM public.payments pay
    WHERE pay.invoice_id = i.id
      AND lower(coalesce(pay.status,'')) IN ('paid','completed','verified')
  ) paid ON true
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
