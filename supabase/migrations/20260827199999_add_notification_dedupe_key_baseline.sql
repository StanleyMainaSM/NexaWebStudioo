-- The notification dedupe migration immediately after this point expects the
-- column to exist. Production already has it; this reconciles fresh local resets.
alter table if exists public.notifications
  add column if not exists dedupe_key text;
