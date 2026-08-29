-- Preserve the commission's historical rate for finalized/pending project views.
-- The connector profile rate remains the source for new/configurable commissions,
-- while an existing commission's own percentage is authoritative for that transaction.

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
    COALESCE(cp.full_name, cp.email, 'Connector')::text,
    cp.email::text,
    COALESCE(c.commission_percentage, profile.commission_rate, 0)::numeric,
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
  WHERE p.id = p_project_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.owner_get_project_connector_finance(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.owner_get_project_connector_finance(uuid) TO authenticated;
