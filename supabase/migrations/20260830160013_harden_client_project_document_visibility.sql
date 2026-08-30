drop policy if exists "files_select_authorized" on public.project_files;

create policy "files_select_authorized"
on public.project_files
for select
using (
  private.user_has_any_role(auth.uid(), array['owner','admin'])
  or exists (
    select 1
    from public.projects p
    where p.id = project_files.project_id
      and (
        (
          p.client_id = auth.uid()
          and private.user_has_any_role(auth.uid(), array['client'])
          and coalesce(project_files.is_internal, false) = false
        )
        or (
          p.operator_id = auth.uid()
          and private.user_has_any_role(auth.uid(), array['operator'])
        )
        or (
          p.developer_id = auth.uid()
          and private.user_has_any_role(auth.uid(), array['developer'])
        )
        or (
          p.connector_id = auth.uid()
          and private.user_has_any_role(auth.uid(), array['connector'])
          and coalesce(project_files.is_internal, false) = false
        )
      )
  )
);
