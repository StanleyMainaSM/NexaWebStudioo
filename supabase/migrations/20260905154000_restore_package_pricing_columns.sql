-- Restore the authoritative package pricing range columns required by the
-- existing packages table contract and customer-facing pricing experience.
-- Preserve all existing package rows and existing security policies.

alter table public.packages
  add column if not exists min_price numeric,
  add column if not exists max_price numeric;
