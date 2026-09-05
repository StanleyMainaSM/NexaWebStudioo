-- Restore the Connector application provisioning metadata that exists in the
-- live Avelixa database but was missing from the repository replay chain.
-- This baseline precedes the first repository migration that references
-- connector_applications.provisioning_status.

ALTER TABLE public.connector_applications
  ADD COLUMN IF NOT EXISTS provisioning_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS provisioned_user_id UUID,
  ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provisioning_error TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'connector_applications_provisioning_status_check'
      AND conrelid = 'public.connector_applications'::regclass
  ) THEN
    ALTER TABLE public.connector_applications
      ADD CONSTRAINT connector_applications_provisioning_status_check
      CHECK (
        provisioning_status = ANY (
          ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'connector_applications_provisioned_user_id_fkey'
      AND conrelid = 'public.connector_applications'::regclass
  ) THEN
    ALTER TABLE public.connector_applications
      ADD CONSTRAINT connector_applications_provisioned_user_id_fkey
      FOREIGN KEY (provisioned_user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS connector_applications_provisioned_user_id_idx
  ON public.connector_applications USING btree (provisioned_user_id);
