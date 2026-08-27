-- Allow notification triggers to safely use ON CONFLICT (dedupe_key).
-- The partial unique index permits multiple NULL dedupe keys while enforcing
-- uniqueness for generated notification deduplication keys.
create unique index if not exists notifications_dedupe_key_unique_idx
on public.notifications (dedupe_key)
where dedupe_key is not null;
