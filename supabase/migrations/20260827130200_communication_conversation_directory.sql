CREATE OR REPLACE FUNCTION public.list_direct_conversations()
RETURNS TABLE (
  conversation_id UUID,
  other_user_id UUID,
  other_full_name TEXT,
  other_email TEXT,
  other_role TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    dc.id,
    other.id,
    other.full_name,
    other.email,
    dcp_other.role_context,
    dc.updated_at
  FROM public.direct_conversations dc
  JOIN public.direct_conversation_participants mine
    ON mine.conversation_id = dc.id
   AND mine.user_id = (SELECT auth.uid())
  JOIN public.direct_conversation_participants dcp_other
    ON dcp_other.conversation_id = dc.id
   AND dcp_other.user_id <> (SELECT auth.uid())
  JOIN public.profiles other
    ON other.id = dcp_other.user_id
  WHERE dc.status = 'active'
  ORDER BY dc.updated_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_direct_conversations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_direct_conversations() TO authenticated;