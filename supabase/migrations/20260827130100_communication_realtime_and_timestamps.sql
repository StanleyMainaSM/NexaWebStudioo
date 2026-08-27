CREATE OR REPLACE FUNCTION private.touch_direct_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.direct_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS direct_messages_touch_conversation ON public.direct_messages;
CREATE TRIGGER direct_messages_touch_conversation
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION private.touch_direct_conversation();

DROP POLICY IF EXISTS communication_realtime_user_calls_insert ON realtime.messages;
CREATE POLICY communication_realtime_user_calls_insert
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  (
    realtime.topic() LIKE 'user_calls:%'
    AND realtime.messages.extension = 'broadcast'
    AND EXISTS (
      SELECT 1
      FROM public.call_sessions cs
      WHERE cs.id::text = realtime.messages.payload ->> 'call_id'
        AND cs.callee_id::text = split_part(realtime.topic(), ':', 2)
        AND cs.caller_id = (SELECT auth.uid())
    )
  )
  OR (
    realtime.topic() LIKE 'call:%'
    AND realtime.messages.extension = 'broadcast'
    AND EXISTS (
      SELECT 1 FROM public.call_sessions cs
      WHERE cs.id::text = split_part(realtime.topic(), ':', 2)
        AND (cs.caller_id = (SELECT auth.uid()) OR cs.callee_id = (SELECT auth.uid()))
    )
  )
);