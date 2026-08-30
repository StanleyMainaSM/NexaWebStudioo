-- Reconcile the local migration baseline with the notification-preferences table
-- already required by the global security hardening migration immediately after it.
-- Production already contains this table; IF NOT EXISTS keeps this migration safe there.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  project_updates boolean NOT NULL DEFAULT true,
  invoice_notifications boolean NOT NULL DEFAULT true,
  document_notifications boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  push_notifications boolean NOT NULL DEFAULT true,
  CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id)
);
