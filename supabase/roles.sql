-- Local Supabase bootstrap for extensions required by the existing migration chain.
-- pg_cron is enabled here because it must exist before migrations that manage
-- Avelixa's scheduled communication cleanup job are applied.
create extension if not exists pg_cron with schema pg_catalog;
