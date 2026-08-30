drop trigger if exists trg_avelixa_project_workflow on public.projects;

create trigger trg_avelixa_project_workflow
after insert or update of status, progress, operator_id on public.projects
for each row
execute function private.notify_project_workflow();
