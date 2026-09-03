-- Restore the event triggers required by the existing payment/commission
-- workflow and add a database-level guard for Client creation references.
-- This is additive and preserves the existing production authorization model.

-- -------------------------------------------------------------------------
-- Website Creation: defense-in-depth guard for Client business references.
-- The creation RPC remains authoritative; this trigger prevents an unsafe
-- direct insert (including SECURITY DEFINER paths) from attaching a business
-- to a Client-owned creation.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_creation_project_business_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF NEW.business_id IS NOT NULL
     AND private.user_has_any_role(auth.uid(), ARRAY['client'])
     AND NOT private.user_has_any_role(auth.uid(), ARRAY['owner','admin'])
     AND NOT private.user_has_any_role(auth.uid(), ARRAY['connector'])
  THEN
    RAISE EXCEPTION 'Business reference is owner-managed';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_creation_project_business_reference() FROM PUBLIC;

DROP TRIGGER IF EXISTS guard_creation_project_business_reference
ON public.creation_projects;

CREATE TRIGGER guard_creation_project_business_reference
BEFORE INSERT OR UPDATE OF business_id
ON public.creation_projects
FOR EACH ROW
EXECUTE FUNCTION public.guard_creation_project_business_reference();

-- -------------------------------------------------------------------------
-- Payment -> commission and payment -> invoice/maintenance synchronization.
-- The existing trigger functions are authoritative; these triggers simply
-- restore their event wiring on the clean migration chain.
-- -------------------------------------------------------------------------

DROP TRIGGER IF EXISTS create_connector_commission_after_payment
ON public.payments;

CREATE TRIGGER create_connector_commission_after_payment
AFTER INSERT OR UPDATE OF status
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.create_connector_commission_for_payment();

DROP TRIGGER IF EXISTS sync_maintenance_subscription_after_payment
ON public.payments;

CREATE TRIGGER sync_maintenance_subscription_after_payment
AFTER INSERT OR UPDATE OF status
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_maintenance_subscription_after_payment();
