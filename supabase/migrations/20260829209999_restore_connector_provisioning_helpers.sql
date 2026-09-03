-- Restore the private connector-provisioning helpers used by the existing
-- provisioning scheduler hardening migration. These functions already exist
-- in the live Avelixa database but were missing from the repository replay chain.

CREATE OR REPLACE FUNCTION private.queue_connector_provisioning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.connector_provisioning_queue (application_id)
    VALUES (NEW.id)
    ON CONFLICT (application_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.mark_connector_provisioning_completed(
  p_application_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  UPDATE public.connector_applications
  SET provisioning_status='completed',
      provisioned_user_id=p_user_id,
      provisioned_at=now(),
      provisioning_error=NULL,
      updated_at=now()
  WHERE id=p_application_id;
END;
$function$;
