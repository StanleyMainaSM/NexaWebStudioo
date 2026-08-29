-- Avelixa: expose a narrowly scoped, database-owned recruitment summary for the
-- authenticated Connector. This extends the existing referral architecture and
-- does not create a second referral or reward system.

CREATE OR REPLACE FUNCTION private.get_connector_recruitment_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_user_id
      AND ur.role = 'connector'
  ) THEN
    RAISE EXCEPTION 'Connector role required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.connector_profiles cp
    WHERE cp.user_id = v_user_id
      AND COALESCE(cp.is_active, false) = true
  ) THEN
    RAISE EXCEPTION 'Active connector profile required';
  END IF;

  WITH referred AS (
    SELECT
      ca.id,
      ca.full_name,
      ca.status,
      ca.created_at,
      ca.provisioned_user_id,
      ca.provisioning_status,
      EXISTS (
        SELECT 1
        FROM public.connector_profiles cp
        WHERE cp.user_id = ca.provisioned_user_id
          AND COALESCE(cp.is_active, false) = true
          AND cp.terms_accepted_at IS NOT NULL
          AND NULLIF(BTRIM(cp.terms_version), '') IS NOT NULL
      ) AS is_active,
      EXISTS (
        SELECT 1
        FROM public.referral_bonuses rb
        WHERE rb.referrer_id = v_user_id
          AND rb.referred_connector_id = ca.provisioned_user_id
      ) AS is_successful
    FROM public.connector_applications ca
    WHERE ca.referring_connector_id = v_user_id
  )
  SELECT jsonb_build_object(
    'invited_count', (SELECT COUNT(*) FROM referred),
    'applied_count', (SELECT COUNT(*) FROM referred WHERE status = 'pending'),
    'approved_count', (SELECT COUNT(*) FROM referred WHERE status = 'approved'),
    'active_count', (SELECT COUNT(*) FROM referred WHERE is_active),
    'successful_referral_count', (SELECT COUNT(*) FROM referred WHERE is_successful),
    'applications', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'full_name', r.full_name,
          'status', CASE
            WHEN r.is_successful THEN 'successful'
            WHEN r.is_active THEN 'active'
            WHEN r.status = 'approved' THEN 'approved'
            ELSE 'applied'
          END,
          'created_at', r.created_at
        )
        ORDER BY r.created_at DESC
      )
      FROM referred r
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION private.get_connector_recruitment_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_connector_recruitment_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_connector_recruitment_summary()
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.get_connector_recruitment_summary();
$$;

REVOKE ALL ON FUNCTION public.get_connector_recruitment_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_connector_recruitment_summary() TO authenticated;

COMMENT ON FUNCTION public.get_connector_recruitment_summary()
IS 'Returns only the authenticated Connector caller''s referral recruitment summary and non-sensitive applicant status data; it does not create or modify referral records.';
