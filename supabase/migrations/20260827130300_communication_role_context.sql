CREATE OR REPLACE FUNCTION public.find_communication_recipient(p_identifier TEXT)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  role_context TEXT,
  connector_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized TEXT := upper(trim(p_identifier));
BEGIN
  IF auth.uid() IS NULL OR normalized = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    CASE
      WHEN upper(COALESCE(cp.avl_id, '')) = normalized THEN 'connector'
      ELSE private.communication_primary_role(p.id)
    END,
    cp.avl_id
  FROM public.profiles p
  LEFT JOIN public.connector_profiles cp ON cp.user_id = p.id
  WHERE p.id <> auth.uid()
    AND (
      p.id::text = trim(p_identifier)
      OR upper(COALESCE(cp.avl_id, '')) = normalized
    )
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = p.id
        AND ur.role IN ('owner','admin','connector','operator','developer','client')
    )
  LIMIT 1;
END;
$$;