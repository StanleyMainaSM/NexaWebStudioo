-- Avelixa communication system: direct messaging + authenticated call history/signaling

CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.direct_conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direct_conversation_id UUID REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  admin_conversation_id UUID REFERENCES public.admin_conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice','video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','accepted','declined','missed','ended','failed')),
  started_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT call_sessions_one_context CHECK (
    (direct_conversation_id IS NOT NULL AND admin_conversation_id IS NULL)
    OR (direct_conversation_id IS NULL AND admin_conversation_id IS NOT NULL)
  ),
  CONSTRAINT call_sessions_distinct_users CHECK (caller_id <> callee_id)
);

CREATE INDEX IF NOT EXISTS direct_conversation_participants_user_idx
  ON public.direct_conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS direct_messages_conversation_created_idx
  ON public.direct_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS call_sessions_caller_idx
  ON public.call_sessions(caller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS call_sessions_callee_idx
  ON public.call_sessions(callee_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.communication_primary_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id
  ORDER BY CASE ur.role
    WHEN 'owner' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'connector' THEN 3
    WHEN 'operator' THEN 4
    WHEN 'developer' THEN 5
    WHEN 'client' THEN 6
    ELSE 99
  END
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.communication_primary_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.communication_primary_role(UUID) TO authenticated;

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
    private.communication_primary_role(p.id),
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

REVOKE ALL ON FUNCTION public.find_communication_recipient(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_communication_recipient(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(p_recipient_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  conversation_id UUID;
  recipient_exists BOOLEAN;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  IF p_recipient_id IS NULL OR p_recipient_id = current_user_id THEN
    RAISE EXCEPTION 'A valid different recipient is required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_recipient_id
      AND ur.role IN ('owner','admin','connector','operator','developer','client')
  ) INTO recipient_exists;

  IF NOT recipient_exists THEN
    RAISE EXCEPTION 'The selected Avelixa user is not available';
  END IF;

  SELECT dc.id
  INTO conversation_id
  FROM public.direct_conversations dc
  WHERE dc.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.direct_conversation_participants dcp
      WHERE dcp.conversation_id = dc.id AND dcp.user_id = current_user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.direct_conversation_participants dcp
      WHERE dcp.conversation_id = dc.id AND dcp.user_id = p_recipient_id
    )
    AND (
      SELECT count(*) FROM public.direct_conversation_participants dcp
      WHERE dcp.conversation_id = dc.id
    ) = 2
  ORDER BY dc.updated_at DESC
  LIMIT 1;

  IF conversation_id IS NOT NULL THEN
    RETURN conversation_id;
  END IF;

  INSERT INTO public.direct_conversations (created_by)
  VALUES (current_user_id)
  RETURNING id INTO conversation_id;

  INSERT INTO public.direct_conversation_participants (conversation_id, user_id, role_context)
  VALUES
    (conversation_id, current_user_id, private.communication_primary_role(current_user_id)),
    (conversation_id, p_recipient_id, private.communication_primary_role(p_recipient_id));

  RETURN conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID) TO authenticated;

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.direct_conversations, public.direct_conversation_participants, public.direct_messages, public.call_sessions FROM anon;
GRANT SELECT ON TABLE public.direct_conversations, public.direct_conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.direct_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.call_sessions TO authenticated;

DROP POLICY IF EXISTS direct_conversations_select_participant ON public.direct_conversations;
CREATE POLICY direct_conversations_select_participant
ON public.direct_conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.direct_conversation_participants dcp
    WHERE dcp.conversation_id = direct_conversations.id
      AND dcp.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS direct_conversation_participants_select_self ON public.direct_conversation_participants;
CREATE POLICY direct_conversation_participants_select_self
ON public.direct_conversation_participants FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.direct_conversation_participants own
    WHERE own.conversation_id = direct_conversation_participants.conversation_id
      AND own.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS direct_messages_select_participant ON public.direct_messages;
CREATE POLICY direct_messages_select_participant
ON public.direct_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.direct_conversation_participants dcp
    WHERE dcp.conversation_id = direct_messages.conversation_id
      AND dcp.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS direct_messages_insert_participant ON public.direct_messages;
CREATE POLICY direct_messages_insert_participant
ON public.direct_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.direct_conversation_participants dcp
    WHERE dcp.conversation_id = direct_messages.conversation_id
      AND dcp.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS direct_messages_update_read_status ON public.direct_messages;
CREATE POLICY direct_messages_update_read_status
ON public.direct_messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.direct_conversation_participants dcp
    WHERE dcp.conversation_id = direct_messages.conversation_id
      AND dcp.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.direct_conversation_participants dcp
    WHERE dcp.conversation_id = direct_messages.conversation_id
      AND dcp.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS call_sessions_select_participant ON public.call_sessions;
CREATE POLICY call_sessions_select_participant
ON public.call_sessions FOR SELECT TO authenticated
USING (caller_id = (SELECT auth.uid()) OR callee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS call_sessions_insert_caller ON public.call_sessions;
CREATE POLICY call_sessions_insert_caller
ON public.call_sessions FOR INSERT TO authenticated
WITH CHECK (
  caller_id = (SELECT auth.uid())
  AND (
    (
      direct_conversation_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.direct_conversation_participants dcp
        WHERE dcp.conversation_id = call_sessions.direct_conversation_id
          AND dcp.user_id = caller_id
      )
      AND EXISTS (
        SELECT 1 FROM public.direct_conversation_participants dcp
        WHERE dcp.conversation_id = call_sessions.direct_conversation_id
          AND dcp.user_id = callee_id
      )
    )
    OR
    (
      admin_conversation_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.admin_conversations ac
        WHERE ac.id = call_sessions.admin_conversation_id
          AND ((ac.user_id = caller_id AND ac.admin_id = callee_id)
            OR (ac.admin_id = caller_id AND ac.user_id = callee_id))
      )
    )
  )
);

DROP POLICY IF EXISTS call_sessions_update_participant ON public.call_sessions;
CREATE POLICY call_sessions_update_participant
ON public.call_sessions FOR UPDATE TO authenticated
USING (caller_id = (SELECT auth.uid()) OR callee_id = (SELECT auth.uid()))
WITH CHECK (caller_id = (SELECT auth.uid()) OR callee_id = (SELECT auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

DROP POLICY IF EXISTS communication_realtime_user_calls_select ON realtime.messages;
CREATE POLICY communication_realtime_user_calls_select
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() = 'user_calls:' || (SELECT auth.uid())::text
  OR (
    realtime.topic() LIKE 'call:%'
    AND EXISTS (
      SELECT 1 FROM public.call_sessions cs
      WHERE cs.id::text = split_part(realtime.topic(), ':', 2)
        AND (cs.caller_id = (SELECT auth.uid()) OR cs.callee_id = (SELECT auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS communication_realtime_user_calls_insert ON realtime.messages;
CREATE POLICY communication_realtime_user_calls_insert
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() = 'user_calls:' || (SELECT auth.uid())::text
  OR (
    realtime.topic() LIKE 'call:%'
    AND EXISTS (
      SELECT 1 FROM public.call_sessions cs
      WHERE cs.id::text = split_part(realtime.topic(), ':', 2)
        AND (cs.caller_id = (SELECT auth.uid()) OR cs.callee_id = (SELECT auth.uid()))
    )
  )
);
