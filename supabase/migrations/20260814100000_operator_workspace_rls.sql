-- AVELIXA OPERATOR WORKSPACE FOUNDATION
-- Adds operator assignment fields and aligns RLS with the Operator portal.
-- Does not delete existing projects, messages, tasks, or files.

-- ============================================================
-- 1. EXTEND PROJECTS FOR OPERATOR WORKFLOW
-- ============================================================

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS operator_id UUID
REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS operator_payment DECIMAL(10,2);

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS progress_note TEXT;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- Keep progress between 0 and 100.
DO $$
BEGIN
ALTER TABLE public.projects
ADD CONSTRAINT projects_progress_check
CHECK (progress >= 0 AND progress <= 100);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;

-- Keep project priority predictable.
DO $$
BEGIN
ALTER TABLE public.projects
ADD CONSTRAINT projects_priority_check
CHECK (priority IN ('low', 'medium', 'high'));
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_operator_id
ON public.projects(operator_id);

-- ============================================================
-- 2. OPERATOR PROJECT ACCESS
-- ============================================================

DROP POLICY IF EXISTS "Operators can select assigned projects"
ON public.projects;

CREATE POLICY "Operators can select assigned projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
operator_id = auth.uid()
AND private.user_has_any_role(
auth.uid(),
ARRAY['operator']
)
);

-- Operators can update projects assigned to them.
-- This supports progress, progress_note, updated_at and status changes.
DROP POLICY IF EXISTS "Operators can update assigned projects"
ON public.projects;

CREATE POLICY "Operators can update assigned projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
operator_id = auth.uid()
AND private.user_has_any_role(
auth.uid(),
ARRAY['operator']
)
)
WITH CHECK (
operator_id = auth.uid()
AND private.user_has_any_role(
auth.uid(),
ARRAY['operator']
)
);

-- ============================================================
-- 3. PROJECT TASK STATUS ALIGNMENT
-- ============================================================

-- The React Operator workspace currently uses:
-- pending, in_progress, completed, blocked.
--------------------------------------------

-- Replace the original Phase C constraint:
-- todo, in_progress, review, done.

DO $$
DECLARE
constraint_name TEXT;
BEGIN
SELECT c.conname
INTO constraint_name
FROM pg_constraint c
JOIN pg_class t
ON c.conrelid = t.oid
JOIN pg_namespace n
ON t.relnamespace = n.oid
WHERE t.relname = 'project_tasks'
AND n.nspname = 'public'
AND c.contype = 'c'
AND pg_get_constraintdef(c.oid) ILIKE '%status%'
LIMIT 1;

IF constraint_name IS NOT NULL THEN
EXECUTE
'ALTER TABLE public.project_tasks DROP CONSTRAINT '
|| quote_ident(constraint_name);
END IF;

ALTER TABLE public.project_tasks
ADD CONSTRAINT project_tasks_status_check
CHECK (
status IN (
'pending',
'in_progress',
'completed',
'blocked'
)
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. PROJECT TASK RLS
-- ============================================================

ALTER TABLE public.project_tasks
ENABLE ROW LEVEL SECURITY;

-- Operators can see tasks assigned to them.
DROP POLICY IF EXISTS "Operators can view assigned tasks"
ON public.project_tasks;

CREATE POLICY "Operators can view assigned tasks"
ON public.project_tasks
FOR SELECT
TO authenticated
USING (
assigned_to = auth.uid()
AND private.user_has_any_role(
auth.uid(),
ARRAY['operator']
)
);

-- Operators can update tasks assigned to them.
DROP POLICY IF EXISTS "Operators can update assigned tasks"
ON public.project_tasks;

CREATE POLICY "Operators can update assigned tasks"
ON public.project_tasks
FOR UPDATE
TO authenticated
USING (
assigned_to = auth.uid()
AND private.user_has_any_role(
auth.uid(),
ARRAY['operator']
)
)
WITH CHECK (
assigned_to = auth.uid()
AND private.user_has_any_role(
auth.uid(),
ARRAY['operator']
)
);

-- Admins and owners can see all project tasks.
DROP POLICY IF EXISTS "Admins can view project tasks"
ON public.project_tasks;

CREATE POLICY "Admins can view project tasks"
ON public.project_tasks
FOR SELECT
TO authenticated
USING (
private.user_has_any_role(
auth.uid(),
ARRAY['owner', 'admin']
)
);

-- Admins and owners can create tasks.
DROP POLICY IF EXISTS "Admins can create project tasks"
ON public.project_tasks;

CREATE POLICY "Admins can create project tasks"
ON public.project_tasks
FOR INSERT
TO authenticated
WITH CHECK (
private.user_has_any_role(
auth.uid(),
ARRAY['owner', 'admin']
)
);

-- Admins and owners can update tasks.
DROP POLICY IF EXISTS "Admins can update project tasks"
ON public.project_tasks;

CREATE POLICY "Admins can update project tasks"
ON public.project_tasks
FOR UPDATE
TO authenticated
USING (
private.user_has_any_role(
auth.uid(),
ARRAY['owner', 'admin']
)
)
WITH CHECK (
private.user_has_any_role(
auth.uid(),
ARRAY['owner', 'admin']
)
);

-- Admins and owners can delete tasks.
DROP POLICY IF EXISTS "Admins can delete project tasks"
ON public.project_tasks;

CREATE POLICY "Admins can delete project tasks"
ON public.project_tasks
FOR DELETE
TO authenticated
USING (
private.user_has_any_role(
auth.uid(),
ARRAY['owner', 'admin']
)
);

-- ============================================================
-- 5. PROJECT FILE ACCESS
-- ============================================================

ALTER TABLE public.project_files
ENABLE ROW LEVEL SECURITY;

-- Operators can view files attached to projects assigned to them.
DROP POLICY IF EXISTS "Operators can view assigned project files"
ON public.project_files;

CREATE POLICY "Operators can view assigned project files"
ON public.project_files
FOR SELECT
TO authenticated
USING (
EXISTS (
SELECT 1
FROM public.projects p
WHERE p.id = project_files.project_id
AND p.operator_id = auth.uid()
AND private.user_has_any_role(
auth.uid(),
ARRAY['operator']
)
)
);

-- Admins and owners can view all project files.
DROP POLICY IF EXISTS "Admins can view project files"
ON public.project_files;

CREATE POLICY "Admins can view project files"
ON public.project_files
FOR SELECT
TO authenticated
USING (
private.user_has_any_role(
auth.uid(),
ARRAY['owner', 'admin']
)
);

-- Operators may upload files to projects assigned to them.
DROP POLICY IF EXISTS "Operators can upload assigned project files"
ON public.project_files;

CREATE POLICY "Operators can upload assigned project files"
ON public.project_files
FOR INSERT
TO authenticated
WITH CHECK (
uploaded_by = auth.uid()
AND EXISTS (
SELECT 1
FROM public.projects p
WHERE p.id = project_files.project_id
AND p.operator_id = auth.uid()
AND private.user_has_any_role(
auth.uid(),
ARRAY['operator']
)
)
);

-- ============================================================
-- 6. PROJECT MESSAGES
-- ============================================================

ALTER TABLE public.messages
ENABLE ROW LEVEL SECURITY;

-- Operators can view messages belonging to projects assigned to them.
DROP POLICY IF EXISTS "Operators can view assigned project messages"
ON public.messages;

CREATE POLICY "Operators can view assigned project messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
EXISTS (
SELECT 1
FROM public.projects p
WHERE p.id = messages.project_id
AND p.operator_id = auth.uid()
AND private.user_has_any_role(
auth.uid(),
ARRAY['operator']
)
)
);

-- Operators can send messages to their assigned project's client.
DROP POLICY IF EXISTS "Operators can send assigned project messages"
ON public.messages;

CREATE POLICY "Operators can send assigned project messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
sender_id = auth.uid()
AND EXISTS (
SELECT 1
FROM public.projects p
WHERE p.id = messages.project_id
AND p.operator_id = auth.uid()
AND private.user_has_any_role(
auth.uid(),
ARRAY['operator']
)
)
);

-- ============================================================
-- 7. AUDIT LOG ACCESS FOR OPERATORS
-- ============================================================

ALTER TABLE public.audit_logs
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators can view assigned project activity"
ON public.audit_logs;

CREATE POLICY "Operators can view assigned project activity"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
user_id = auth.uid()
OR (
entity_type = 'project'
AND EXISTS (
SELECT 1
FROM public.projects p
WHERE p.id = audit_logs.entity_id
AND p.operator_id = auth.uid()
)
)
);

-- Operators need to create their own project activity.
DROP POLICY IF EXISTS "Operators can create own project activity"
ON public.audit_logs;

CREATE POLICY "Operators can create own project activity"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
user_id = auth.uid()
AND private.user_has_any_role(
auth.uid(),
ARRAY['operator']
)
);

-- ============================================================
-- 8. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to
ON public.project_tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id
ON public.project_tasks(project_id);

CREATE INDEX IF NOT EXISTS idx_project_files_project_id
ON public.project_files(project_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id
ON public.audit_logs(entity_id);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_id
ON public.messages(recipient_id);

-- ============================================================
-- END OPERATOR WORKSPACE FOUNDATION
-- ============================================================
