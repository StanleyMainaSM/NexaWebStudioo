-- AVELIXA CLIENT SECURITY FOUNDATION
-- Add RLS policies so clients can only access their own projects, messages, invoices, and profile data.
-- Existing role-based functionality for owner/admin/operator/developer/connector is preserved.
-- This migration assumes the operator role check was introduced by the earlier phase_c migration.

-- Ensure RLS is enabled on the relevant tables.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create a private helper for centralized role checks without exposing user_roles to broad reads.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.user_has_any_role(p_user_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    WHERE ur.user_id = p_user_id
      AND ur.role = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION private.get_my_roles()
RETURNS TABLE (role TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT ur.role
  FROM public.user_roles AS ur
  WHERE ur.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS TABLE (role TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT role
  FROM private.get_my_roles();
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON FUNCTION private.user_has_any_role(UUID, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_my_roles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_roles() FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

-- Add indexes for the RLS predicates and joins used by the policies.
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects (client_id);
CREATE INDEX IF NOT EXISTS idx_projects_developer_id ON public.projects (developer_id);
CREATE INDEX IF NOT EXISTS idx_projects_connector_id ON public.projects (connector_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages (project_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices (client_id);

-- Profiles: allow self access and owner/admin access; prevent clients from editing other users' profiles.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
  CREATE POLICY "Profiles are viewable by self or owners/admins"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = id
      OR private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin'])
    );
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
  CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
  CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN others THEN NULL;
END $$;

-- Projects: clients can only view their own projects; clients cannot modify project ownership or management fields.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Clients can select own projects" ON public.projects;
  CREATE POLICY "Clients can select own projects"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (
      client_id = auth.uid()
      OR private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin'])
      OR (
        private.user_has_any_role(auth.uid(), ARRAY['operator', 'developer'])
        AND developer_id = auth.uid()
      )
      OR (
        private.user_has_any_role(auth.uid(), ARRAY['connector'])
        AND connector_id = auth.uid()
      )
    );
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Owners and admins can update projects" ON public.projects;
  CREATE POLICY "Owners and admins can update projects"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin']))
    WITH CHECK (private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin']));
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Owners and admins can delete projects" ON public.projects;
  CREATE POLICY "Owners and admins can delete projects"
    ON public.projects
    FOR DELETE
    TO authenticated
    USING (private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin']));
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Owners and admins can insert projects" ON public.projects;
  CREATE POLICY "Owners and admins can insert projects"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin']));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Messages: clients can only access messages related to projects they own.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Clients can select own project messages" ON public.messages;
  CREATE POLICY "Clients can select own project messages"
    ON public.messages
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = messages.project_id
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
  DROP POLICY IF EXISTS "Clients can insert messages to own projects" ON public.messages;
  CREATE POLICY "Clients can insert messages to own projects"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
      sender_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = messages.project_id
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
  DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
  CREATE POLICY "Users can update their own messages"
    ON public.messages
    FOR UPDATE
    TO authenticated
    USING (
      sender_id = auth.uid()
      OR private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin'])
    )
    WITH CHECK (
      sender_id = auth.uid()
      OR private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin'])
    );
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
  CREATE POLICY "Users can delete their own messages"
    ON public.messages
    FOR DELETE
    TO authenticated
    USING (
      sender_id = auth.uid()
      OR private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin'])
    );
EXCEPTION WHEN others THEN NULL;
END $$;

-- Invoices: clients can only view their own invoices; no client can modify company financial records.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Clients can select own invoices" ON public.invoices;
  CREATE POLICY "Clients can select own invoices"
    ON public.invoices
    FOR SELECT
    TO authenticated
    USING (
      client_id = auth.uid()
      OR private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin'])
    );
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Owners and admins can manage invoices" ON public.invoices;
  CREATE POLICY "Owners and admins can manage invoices"
    ON public.invoices
    FOR INSERT
    TO authenticated
    WITH CHECK (private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin']));
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Owners and admins can update invoices" ON public.invoices;
  CREATE POLICY "Owners and admins can update invoices"
    ON public.invoices
    FOR UPDATE
    TO authenticated
    USING (private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin']))
    WITH CHECK (private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin']));
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Owners and admins can delete invoices" ON public.invoices;
  CREATE POLICY "Owners and admins can delete invoices"
    ON public.invoices
    FOR DELETE
    TO authenticated
    USING (private.user_has_any_role(auth.uid(), ARRAY['owner', 'admin']));
EXCEPTION WHEN others THEN NULL;
END $$;
