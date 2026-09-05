-- Restore the notification email queue baseline that exists in the live Avelixa
-- database but was missing from the repository replay chain. This migration
-- must precede migrations that attach security/redaction behavior to the queue.

CREATE TABLE IF NOT EXISTS public.notification_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_email_queue_status_check
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  CONSTRAINT notification_email_queue_notification_uidx
    UNIQUE (notification_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_email_queue_user_id
  ON public.notification_email_queue(user_id);

CREATE INDEX IF NOT EXISTS notification_email_queue_pending_idx
  ON public.notification_email_queue(status, next_attempt_at, created_at);

ALTER TABLE public.notification_email_queue ENABLE ROW LEVEL SECURITY;
