-- AVELIXA CLIENT PORTAL ACCESS
-- Add the minimal RLS policies needed for client-facing project files and notifications.

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Clients can view files for their projects" ON public.project_files;
  CREATE POLICY "Clients can view files for their projects"
    ON public.project_files
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_files.project_id
          AND (
            p.client_id = auth.uid()
            OR private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin'])
            OR (
              private.user_has_any_role(auth.uid(), ARRAY['operator', 'developer'])
              AND p.developer_id = auth.uid()
            )
            OR (
              private.user_has_any_role(auth.uid(), ARRAY['connector'])
              AND p.connector_id = auth.uid()
            )
          )
      )
    );
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Clients can upload files for their projects" ON public.project_files;
  CREATE POLICY "Clients can upload files for their projects"
    ON public.project_files
    FOR INSERT
    TO authenticated
    WITH CHECK (
      uploaded_by = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_files.project_id
          AND p.client_id = auth.uid()
      )
    );
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
  CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN others THEN NULL;
END $$;
