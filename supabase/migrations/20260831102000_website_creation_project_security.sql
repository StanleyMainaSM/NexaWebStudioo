-- Prevent clients/connectors/operators from rewriting ownership/access fields through UPDATE.
CREATE OR REPLACE FUNCTION public.protect_creation_project_access_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF private.user_has_any_role(auth.uid(), ARRAY['owner','admin']) THEN
    RETURN NEW;
  END IF;
  IF NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.connector_id IS DISTINCT FROM OLD.connector_id
     OR NEW.operator_id IS DISTINCT FROM OLD.operator_id
     OR NEW.lead_id IS DISTINCT FROM OLD.lead_id
     OR NEW.business_id IS DISTINCT FROM OLD.business_id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
  THEN
    RAISE EXCEPTION 'Creation project access fields are protected';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_creation_project_access_fields ON public.creation_projects;
CREATE TRIGGER protect_creation_project_access_fields
BEFORE UPDATE ON public.creation_projects
FOR EACH ROW EXECUTE FUNCTION public.protect_creation_project_access_fields();

CREATE OR REPLACE FUNCTION public.assign_creation_project_operator(
  p_creation_project_id UUID,
  p_operator_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.user_has_any_role(auth.uid(), ARRAY['owner','admin']) THEN
    RAISE EXCEPTION 'Owner or Admin authorization required';
  END IF;
  IF NOT private.user_has_any_role(p_operator_id, ARRAY['operator']) THEN
    RAISE EXCEPTION 'Target user must have Operator role';
  END IF;
  UPDATE public.creation_projects SET operator_id = p_operator_id, updated_at = NOW() WHERE id = p_creation_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Creation project not found'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_creation_project_operator(UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_creation_project_operator(UUID,UUID) TO authenticated;
