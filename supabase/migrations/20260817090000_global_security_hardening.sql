-- ============================================================
-- AVELIXA GLOBAL SECURITY HARDENING
-- Migration: 20260817090000_global_security_hardening.sql
--
-- Consolidates portal authorization into one security layer.
-- Existing data is preserved.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS private;

-- ============================================================
-- 1. SECURITY HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION private.user_has_any_role(
  p_user_id UUID,
  p_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = ANY (p_roles)
  );
$$;

REVOKE ALL ON FUNCTION private.user_has_any_role(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.user_has_any_role(UUID, TEXT[]) TO authenticated;

-- ============================================================
-- 2. ENABLE RLS EVERYWHERE
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. REMOVE CONFLICTING OLD POLICIES
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );
  END LOOP;
END $$;

-- ============================================================
-- 4. PROFILES
-- ============================================================

CREATE POLICY "profiles_select_self_or_management"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "profiles_insert_self"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
);

CREATE POLICY "profiles_update_self"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
);

-- ============================================================
-- 5. USER ROLES
-- ============================================================

CREATE POLICY "user_roles_select_self_or_owner"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner'])
);

CREATE POLICY "user_roles_owner_manage"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner'])
);

CREATE OR REPLACE FUNCTION private.protect_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.role = 'owner'
     AND NOT private.user_has_any_role(auth.uid(), ARRAY['owner'])
  THEN
    RAISE EXCEPTION 'Only an existing owner can assign the owner role';
  END IF;

  IF TG_OP = 'DELETE'
     AND OLD.role = 'owner'
     AND NOT private.user_has_any_role(auth.uid(), ARRAY['owner'])
  THEN
    RAISE EXCEPTION 'Only an existing owner can remove the owner role';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS protect_owner_role_trigger
ON public.user_roles;

CREATE TRIGGER protect_owner_role_trigger
BEFORE INSERT OR UPDATE OR DELETE
ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION private.protect_owner_role();

-- ============================================================
-- 6. PROJECTS
-- ============================================================

CREATE POLICY "projects_select_authorized"
ON public.projects
FOR SELECT
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  OR (
    client_id = auth.uid()
    AND private.user_has_any_role(auth.uid(), ARRAY['client'])
  )
  OR (
    operator_id = auth.uid()
    AND private.user_has_any_role(auth.uid(), ARRAY['operator'])
  )
  OR (
    developer_id = auth.uid()
    AND private.user_has_any_role(auth.uid(), ARRAY['developer'])
  )
  OR (
    connector_id = auth.uid()
    AND private.user_has_any_role(auth.uid(), ARRAY['connector'])
  )
);

CREATE POLICY "projects_management_insert"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "projects_management_update"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "projects_operator_update"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  operator_id = auth.uid()
  AND private.user_has_any_role(auth.uid(), ARRAY['operator'])
)
WITH CHECK (
  operator_id = auth.uid()
  AND private.user_has_any_role(auth.uid(), ARRAY['operator'])
);

CREATE POLICY "projects_management_delete"
ON public.projects
FOR DELETE
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- Operators cannot alter ownership, financial or assignment fields.
CREATE OR REPLACE FUNCTION private.protect_operator_project_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF private.user_has_any_role(auth.uid(), ARRAY['operator'])
     AND NOT private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  THEN
    IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
      RAISE EXCEPTION 'Operators cannot change project client';
    END IF;

    IF NEW.operator_id IS DISTINCT FROM OLD.operator_id THEN
      RAISE EXCEPTION 'Operators cannot change project assignment';
    END IF;

    IF NEW.developer_id IS DISTINCT FROM OLD.developer_id THEN
      RAISE EXCEPTION 'Operators cannot change developer assignment';
    END IF;

    IF NEW.connector_id IS DISTINCT FROM OLD.connector_id THEN
      RAISE EXCEPTION 'Operators cannot change connector assignment';
    END IF;

    IF NEW.price IS DISTINCT FROM OLD.price THEN
      RAISE EXCEPTION 'Operators cannot change project price';
    END IF;

    IF NEW.operator_payment IS DISTINCT FROM OLD.operator_payment THEN
      RAISE EXCEPTION 'Operators cannot change operator payment';
    END IF;

    IF NEW.business_id IS DISTINCT FROM OLD.business_id THEN
      RAISE EXCEPTION 'Operators cannot change project business';
    END IF;

    IF NEW.package_id IS DISTINCT FROM OLD.package_id THEN
      RAISE EXCEPTION 'Operators cannot change project package';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_operator_project_fields_trigger
ON public.projects;

CREATE TRIGGER protect_operator_project_fields_trigger
BEFORE UPDATE
ON public.projects
FOR EACH ROW
EXECUTE FUNCTION private.protect_operator_project_fields();

-- ============================================================
-- 7. PROJECT TASKS
-- ============================================================

CREATE POLICY "tasks_select_authorized"
ON public.project_tasks
FOR SELECT
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  OR (
    assigned_to = auth.uid()
    AND private.user_has_any_role(auth.uid(), ARRAY['operator','developer'])
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_tasks.project_id
        AND (
          p.operator_id = auth.uid()
          OR p.developer_id = auth.uid()
        )
    )
  )
);

CREATE POLICY "tasks_management_insert"
ON public.project_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "tasks_management_update"
ON public.project_tasks
FOR UPDATE
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "tasks_assignee_update"
ON public.project_tasks
FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_tasks.project_id
      AND (
        p.operator_id = auth.uid()
        OR p.developer_id = auth.uid()
      )
  )
)
WITH CHECK (
  assigned_to = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_tasks.project_id
      AND (
        p.operator_id = auth.uid()
        OR p.developer_id = auth.uid()
      )
  )
);

CREATE POLICY "tasks_management_delete"
ON public.project_tasks
FOR DELETE
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 8. PROJECT FILES
-- ============================================================

CREATE POLICY "files_select_authorized"
ON public.project_files
FOR SELECT
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_files.project_id
      AND (
        (p.client_id = auth.uid() AND private.user_has_any_role(auth.uid(), ARRAY['client']))
        OR
        (p.operator_id = auth.uid() AND private.user_has_any_role(auth.uid(), ARRAY['operator']))
        OR
        (p.developer_id = auth.uid() AND private.user_has_any_role(auth.uid(), ARRAY['developer']))
        OR
        (p.connector_id = auth.uid() AND private.user_has_any_role(auth.uid(), ARRAY['connector']))
      )
  )
);

CREATE POLICY "files_insert_authorized"
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
        )
        OR
        (
          p.operator_id = auth.uid()
          AND private.user_has_any_role(auth.uid(), ARRAY['operator'])
        )
        OR
        (
          private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
        )
      )
  )
);

CREATE POLICY "files_management_update"
ON public.project_files
FOR UPDATE
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "files_management_delete"
ON public.project_files
FOR DELETE
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 9. MESSAGES
-- ============================================================

CREATE POLICY "messages_select_authorized"
ON public.messages
FOR SELECT
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  OR (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = messages.project_id
        AND (
          p.client_id = auth.uid()
          OR p.operator_id = auth.uid()
          OR p.developer_id = auth.uid()
          OR p.connector_id = auth.uid()
        )
    )
  )
  OR (
    recipient_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = messages.project_id
        AND (
          p.client_id = auth.uid()
          OR p.operator_id = auth.uid()
          OR p.developer_id = auth.uid()
          OR p.connector_id = auth.uid()
        )
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = messages.project_id
      AND (
        p.client_id = auth.uid()
        OR p.operator_id = auth.uid()
        OR p.developer_id = auth.uid()
        OR p.connector_id = auth.uid()
      )
      AND messages.is_internal = false
  )
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = messages.project_id
      AND (
        p.operator_id = auth.uid()
        OR p.developer_id = auth.uid()
      )
      AND messages.is_internal = true
  )
);

CREATE POLICY "messages_insert_authorized"
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
        (
          p.client_id = auth.uid()
          AND messages.is_internal = false
        )
        OR
        (
          p.operator_id = auth.uid()
        )
        OR
        (
          p.developer_id = auth.uid()
        )
        OR
        (
          p.connector_id = auth.uid()
          AND messages.is_internal = false
        )
        OR
        private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
      )
  )
);

CREATE POLICY "messages_update_own"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  sender_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "messages_delete_own"
ON public.messages
FOR DELETE
TO authenticated
USING (
  sender_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 10. INVOICES
-- ============================================================

CREATE POLICY "invoices_select_authorized"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  client_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "invoices_management_insert"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "invoices_management_update"
ON public.invoices
FOR UPDATE
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "invoices_management_delete"
ON public.invoices
FOR DELETE
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 11. PAYMENTS
-- ============================================================

CREATE POLICY "payments_select_authorized"
ON public.payments
FOR SELECT
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  OR EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.id = payments.invoice_id
      AND i.client_id = auth.uid()
  )
);

CREATE POLICY "payments_management"
ON public.payments
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================

CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "notifications_insert_management"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- ============================================================
-- 13. NOTIFICATION PREFERENCES
-- ============================================================

CREATE POLICY "notification_preferences_own"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert_own"
ON public.notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_update_own"
ON public.notification_preferences
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 14. CONNECTOR APPLICATIONS
-- ============================================================

CREATE POLICY "connector_applications_public_insert"
ON public.connector_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND rejection_reason IS NULL
  AND admin_notes IS NULL
);

CREATE POLICY "connector_applications_management_select"
ON public.connector_applications
FOR SELECT
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "connector_applications_management_update"
ON public.connector_applications
FOR UPDATE
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 15. CONNECTOR PROFILES
-- ============================================================

CREATE POLICY "connector_profiles_select_own"
ON public.connector_profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "connector_profiles_management"
ON public.connector_profiles
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 16. LEADS
-- ============================================================

CREATE POLICY "leads_select_own"
ON public.leads
FOR SELECT
TO authenticated
USING (
  connector_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "leads_insert_own"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  connector_id = auth.uid()
  AND private.user_has_any_role(auth.uid(), ARRAY['connector'])
);

CREATE POLICY "leads_management"
ON public.leads
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 17. BUSINESSES
-- ============================================================

CREATE POLICY "businesses_select_authorized"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  OR EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.business_id = businesses.id
      AND l.connector_id = auth.uid()
  )
);

CREATE POLICY "businesses_management"
ON public.businesses
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 18. COMMISSIONS
-- ============================================================

CREATE POLICY "commissions_select_own"
ON public.commissions
FOR SELECT
TO authenticated
USING (
  connector_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "commissions_management"
ON public.commissions
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 19. REFERRAL BONUSES
-- ============================================================

CREATE POLICY "referral_bonuses_select_own"
ON public.referral_bonuses
FOR SELECT
TO authenticated
USING (
  referrer_id = auth.uid()
  OR referred_connector_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "referral_bonuses_management"
ON public.referral_bonuses
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 20. MAINTENANCE
-- ============================================================

CREATE POLICY "maintenance_plans_public_select"
ON public.maintenance_plans
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "maintenance_plans_management"
ON public.maintenance_plans
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "maintenance_subscriptions_select"
ON public.maintenance_subscriptions
FOR SELECT
TO authenticated
USING (
  client_id = auth.uid()
  OR private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

CREATE POLICY "maintenance_subscriptions_management"
ON public.maintenance_subscriptions
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 21. PACKAGES
-- ============================================================

CREATE POLICY "packages_public_active_select"
ON public.packages
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "packages_management"
ON public.packages
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 22. PORTFOLIO
-- ============================================================

CREATE POLICY "portfolio_public_select"
ON public.portfolio_items
FOR SELECT
TO anon, authenticated
USING (is_published = true);

CREATE POLICY "portfolio_management"
ON public.portfolio_items
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 23. REVIEWS
-- ============================================================

CREATE POLICY "reviews_public_select"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

CREATE POLICY "reviews_own_insert"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = auth.uid()
  AND private.user_has_any_role(auth.uid(), ARRAY['client'])
);

CREATE POLICY "reviews_management"
ON public.reviews
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 24. TESTIMONIALS
-- ============================================================

CREATE POLICY "testimonials_public_select"
ON public.testimonials
FOR SELECT
TO anon, authenticated
USING (
  is_public = true
);

CREATE POLICY "testimonials_public_insert"
ON public.testimonials
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (stars >= 4 AND is_public = true)
  OR
  (stars <= 3 AND is_public = false)
);

-- ============================================================
-- 25. CONVERSATIONS
-- ============================================================

CREATE POLICY "conversations_select_authorized"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = conversations.project_id
      AND (
        p.client_id = auth.uid()
        OR p.operator_id = auth.uid()
        OR p.developer_id = auth.uid()
        OR p.connector_id = auth.uid()
      )
  )
);

CREATE POLICY "conversations_management"
ON public.conversations
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 26. SETTINGS
-- ============================================================

CREATE POLICY "settings_management"
ON public.settings
FOR ALL
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
);

-- ============================================================
-- 27. AUDIT LOGS
-- ============================================================

CREATE POLICY "audit_logs_management_select"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
  OR user_id = auth.uid()
);

CREATE POLICY "audit_logs_insert_own"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

CREATE OR REPLACE FUNCTION private.prevent_audit_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable';
END;
$$;

DROP TRIGGER IF EXISTS prevent_audit_update
ON public.audit_logs;

CREATE TRIGGER prevent_audit_update
BEFORE UPDATE OR DELETE
ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION private.prevent_audit_modification();

-- ============================================================
-- 28. PRIVATE SCHEMA
-- ============================================================

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

REVOKE ALL ON FUNCTION private.protect_owner_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.protect_operator_project_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.prevent_audit_modification() FROM PUBLIC;

-- ============================================================
-- 29. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_security
ON public.user_roles(user_id, role);

CREATE INDEX IF NOT EXISTS idx_projects_client_security
ON public.projects(client_id);

CREATE INDEX IF NOT EXISTS idx_projects_operator_security
ON public.projects(operator_id);

CREATE INDEX IF NOT EXISTS idx_projects_developer_security
ON public.projects(developer_id);

CREATE INDEX IF NOT EXISTS idx_projects_connector_security
ON public.projects(connector_id);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project_security
ON public.project_tasks(project_id);

CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_security
ON public.project_tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_project_files_project_security
ON public.project_files(project_id);

CREATE INDEX IF NOT EXISTS idx_messages_project_security
ON public.messages(project_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_security
ON public.messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_security
ON public.messages(recipient_id);

CREATE INDEX IF NOT EXISTS idx_invoices_client_security
ON public.invoices(client_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_security
ON public.payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_security
ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_security
ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_security
ON public.audit_logs(entity_type, entity_id);

-- ============================================================
-- END GLOBAL SECURITY HARDENING
-- ============================================================
