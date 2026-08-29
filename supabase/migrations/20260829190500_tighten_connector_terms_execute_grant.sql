REVOKE EXECUTE ON FUNCTION public.accept_connector_terms(text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.accept_connector_terms(text) TO authenticated;
