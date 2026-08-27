-- Realtime authorizes a private Broadcast channel by running an INSERT policy check
-- during subscription. The actual incoming-call message must remain restricted to
-- the caller/callee call session, but the subscription probe does not have call_id.
-- Allow only that probe shape; the existing restrictive policy continues to govern
-- real call notifications.

DROP POLICY IF EXISTS communication_realtime_user_calls_subscription ON realtime.messages;

CREATE POLICY communication_realtime_user_calls_subscription
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'user_calls:%'
  AND realtime.messages.extension = 'broadcast'
  AND COALESCE(NOT (realtime.messages.payload ? 'call_id'), true)
);
