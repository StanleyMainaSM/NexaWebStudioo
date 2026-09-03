-- Restore the notification helper required by the operational notification
-- triggers. The clean repository migration chain must define this helper before
-- any trigger invokes it.

CREATE OR REPLACE FUNCTION private.create_avelixa_notification(
  p_user_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_link TEXT DEFAULT NULL,
  p_notification_type TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_dedupe_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    title,
    content,
    link,
    notification_type,
    entity_type,
    entity_id,
    metadata,
    dedupe_key,
    is_read,
    created_at
  )
  VALUES (
    p_user_id,
    p_title,
    p_content,
    p_link,
    p_notification_type,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb),
    p_dedupe_key,
    false,
    now()
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION private.create_avelixa_notification(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,JSONB,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.create_avelixa_notification(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,JSONB,TEXT) TO authenticated;
