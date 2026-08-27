-- Make the conflict target used by communication notification triggers
-- unambiguous. A regular unique index still permits multiple NULL values,
-- while ON CONFLICT (dedupe_key) can resolve the target without a predicate.
drop index if exists public.notifications_dedupe_key_unique_idx;
drop index if exists public.notifications_dedupe_key_uidx;
create unique index notifications_dedupe_key_uidx
  on public.notifications (dedupe_key);
