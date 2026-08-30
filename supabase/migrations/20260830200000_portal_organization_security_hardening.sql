-- AVELIXA PORTAL ORGANIZATION + SECURITY HARDENING
-- Keep one invoice notification trigger and prevent client uploads from marking files internal.

DROP TRIGGER IF EXISTS trg_notify_invoice_workflow_change ON public.invoices;
DROP TRIGGER IF EXISTS trg_avelixa_invoice_workflow ON public.invoices;

CREATE OR REPLACE FUNCTION private.notify_invoice_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_event text;
  v_title text;
  v_content text;
  v_dedupe_key text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'invoice_created';
    v_title := 'New invoice available';
    v_content := format(
      'A new invoice of KSh %s is available. Due date: %s.',
      NEW.amount,
      coalesce(to_char(NEW.due_date, 'DD Mon YYYY'), 'not specified')
    );
    v_dedupe_key := 'invoice_created:' || NEW.id::text || ':' || coalesce(NEW.client_id::text, 'none');
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_event := 'invoice_status_changed';
    v_title := 'Invoice status updated';
    v_content := format(
      'Invoice %s is now %s.',
      left(NEW.id::text, 8),
      replace(initcap(coalesce(NEW.status, 'unknown')), '_', ' ')
    );
    v_dedupe_key := 'invoice_status_changed:' || NEW.id::text || ':' || coalesce(NEW.status, 'unknown') || ':' || coalesce(NEW.client_id::text, 'none');
  ELSE
    RETURN NEW;
  END IF;

  PERFORM private.log_avelixa_automation_event(
    v_event,
    'invoice',
    NEW.id,
    auth.uid(),
    jsonb_build_object(
      'client_id', NEW.client_id,
      'project_id', NEW.project_id,
      'amount', NEW.amount,
      'status', NEW.status
    )
  );

  IF NEW.client_id IS NOT NULL THEN
    PERFORM private.create_avelixa_notification(
      NEW.client_id,
      v_title,
      v_content,
      '/portal/invoices/' || NEW.id::text,
      v_event,
      'invoice',
      NEW.id,
      jsonb_build_object(
        'project_id', NEW.project_id,
        'amount', NEW.amount,
        'status', NEW.status
      ),
      v_dedupe_key
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_avelixa_invoice_workflow
AFTER INSERT OR UPDATE OF status ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION private.notify_invoice_workflow();

DROP POLICY IF EXISTS files_insert_authorized ON public.project_files;

CREATE POLICY files_insert_authorized
ON public.project_files
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_files.project_id
      AND (
        (
          p.client_id = auth.uid()
          AND private.user_has_any_role(auth.uid(), ARRAY['client'])
          AND coalesce(project_files.is_internal, false) = false
        )
        OR (
          p.operator_id = auth.uid()
          AND private.user_has_any_role(auth.uid(), ARRAY['operator'])
        )
        OR (
          p.developer_id = auth.uid()
          AND private.user_has_any_role(auth.uid(), ARRAY['developer'])
        )
        OR private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin'])
      )
  )
);
