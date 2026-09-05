-- Restore the backend-only Connector provisioning queue that exists in the
-- live Avelixa database but was missing from the repository replay chain.
-- This baseline precedes the first migration that creates provisioning helpers,
-- triggers, or hardening that depend on the queue.

CREATE TABLE IF NOT EXISTS public.connector_provisioning_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  activation_url TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT connector_provisioning_queue_pkey PRIMARY KEY (id),
  CONSTRAINT connector_provisioning_queue_application_id_key UNIQUE (application_id),
  CONSTRAINT connector_provisioning_queue_application_id_fkey
    FOREIGN KEY (application_id)
    REFERENCES public.connector_applications(id)
    ON DELETE CASCADE,
  CONSTRAINT connector_provisioning_queue_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,
  CONSTRAINT connector_provisioning_queue_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]))
);

CREATE INDEX IF NOT EXISTS connector_provisioning_queue_user_id_idx
  ON public.connector_provisioning_queue USING btree (user_id);

ALTER TABLE public.connector_provisioning_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.connector_provisioning_queue FROM anon, authenticated, public;
GRANT ALL ON TABLE public.connector_provisioning_queue TO postgres, service_role;
