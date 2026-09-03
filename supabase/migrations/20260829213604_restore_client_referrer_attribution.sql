-- Restore the client referral attribution column used by the existing
-- post-onboarding workflow. The column exists in the live Avelixa database
-- but was missing from the repository's clean migration chain.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_referrer_connector_id uuid;
