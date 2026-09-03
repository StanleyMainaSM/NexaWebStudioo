-- Restore the notification helper required by the post-production
-- workflow migrations. The clean repository replay has the notification table,
-- but not this production helper definition.

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS notification_type text,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE OR REPLACE FUNCTION private.create_avelixa_notification(
  p_user_id uuid,
  p_title text,
  p_content text,
  p_link text,
  p_notification_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb,
  p_dedupe_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_user_id IS NULL OR NULLIF(BTRIM(p_title), '') IS NULL OR NULLIF(BTRIM(p_content), '') IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    title,
    content,
    link,
    is_read,
    notification_type,
    entity_type,
    entity_id,
    metadata,
    dedupe_key
  )
  VALUES (
    p_user_id,
    p_title,
    p_content,
    p_link,
    false,
    p_notification_type,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb),
    p_dedupe_key
  )
  ON CONFLICT (dedupe_key) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION private.create_avelixa_notification(uuid, text, text, text, text, text, uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.create_avelixa_notification(uuid, text, text, text, text, text, uuid, jsonb, text) TO authenticated;
