-- ============================================================
-- AVELIXA: SECURE CONNECTOR LEAD SUBMISSION
-- ============================================================
--
-- The secure submit_connector_lead() function is implemented
-- by the later connector portal migration:
--
-- 20260817110000_connector_portal.sql
--
-- This migration intentionally contains no duplicate function
-- definition because PostgreSQL cannot change an existing
-- function's return type with CREATE OR REPLACE FUNCTION.
--
-- The canonical function returns UUID (lead_id).
-- ============================================================

DO $$
BEGIN
  NULL;
END;
$$;
