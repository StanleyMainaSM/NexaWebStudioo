-- Restore the automation event ledger used by the existing Avelixa workflow
-- triggers and private automation logging helper.

CREATE TABLE IF NOT EXISTS public.automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  actor_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_events_management_select" ON public.automation_events;
CREATE POLICY "automation_events_management_select"
ON public.automation_events
FOR SELECT
TO authenticated
USING (private.user_has_any_role(auth.uid(), ARRAY['owner','admin']));

CREATE OR REPLACE FUNCTION private.log_avelixa_automation_event(
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_actor_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.automation_events(event_type,entity_type,entity_id,actor_id,payload)
  VALUES(p_event_type,p_entity_type,p_entity_id,p_actor_id,COALESCE(p_payload,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
