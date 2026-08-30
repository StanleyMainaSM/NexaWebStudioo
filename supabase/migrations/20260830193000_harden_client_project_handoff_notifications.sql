create or replace function private.notify_project_workflow()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  v_event text;
  v_title text;
  v_content text;
  v_link text;
  v_admin_id uuid;
  v_user_id uuid;
begin
  if tg_op = 'INSERT' then
    v_event := 'project_created';
    v_title := 'New project created';
    v_content := format('Project "%s" has been created.', new.title);
  else
    if old.status is distinct from new.status and new.status = 'review' then
      v_event := 'project_submitted_for_review';
      v_title := 'Project submitted for review';
      v_content := format('Project "%s" has been submitted for Admin review.', new.title);
    elsif old.status is distinct from new.status and new.status in ('completed', 'complete') then
      v_event := 'project_completed';
      v_title := 'Project completed';
      v_content := format('Project "%s" has been marked completed.', new.title);
    elsif old.status is distinct from new.status then
      v_event := 'project_status_changed';
      v_title := 'Project status updated';
      v_content := format('Project "%s" status changed to %s.', new.title, coalesce(new.status, 'unknown'));
    elsif old.progress is distinct from new.progress then
      v_event := 'project_progress_updated';
      v_title := 'Project progress updated';
      v_content := format('Project "%s" progress is now %s%%.', new.title, coalesce(new.progress, 0));
    else
      v_event := null;
    end if;
  end if;

  v_link := '/portal/projects/' || new.id::text;

  if v_event is not null then
    perform private.log_avelixa_automation_event(
      v_event,
      'project',
      new.id,
      auth.uid(),
      jsonb_build_object('status', new.status, 'progress', new.progress)
    );

    for v_user_id in
      select distinct x.user_id
      from (
        select new.client_id as user_id
        union all select new.operator_id
        union all select new.connector_id
        union all select new.developer_id
      ) x
      where x.user_id is not null
    loop
      perform private.create_avelixa_notification(
        v_user_id,
        v_title,
        v_content,
        v_link,
        v_event,
        'project',
        new.id,
        jsonb_build_object('status', new.status, 'progress', new.progress),
        format('%s:%s:%s', v_event, new.id, coalesce(new.updated_at::text, now()::text))
      );
    end loop;

    if v_event in ('project_created', 'project_submitted_for_review', 'project_status_changed', 'project_completed') then
      for v_admin_id in
        select distinct ur.user_id
        from public.user_roles ur
        where ur.role in ('owner', 'admin')
      loop
        perform private.create_avelixa_notification(
          v_admin_id,
          v_title,
          v_content,
          v_link,
          v_event,
          'project',
          new.id,
          jsonb_build_object('status', new.status, 'progress', new.progress),
          format('%s:management:%s:%s', v_event, new.id, coalesce(new.updated_at::text, now()::text))
        );
      end loop;
    end if;
  end if;

  if tg_op = 'UPDATE' and old.operator_id is distinct from new.operator_id and new.operator_id is not null then
    perform private.create_avelixa_notification(
      new.operator_id,
      'Project assigned to you',
      format('You have been assigned to project "%s".', new.title),
      '/portal/operator',
      'project_assigned',
      'project',
      new.id,
      jsonb_build_object('project_id', new.id, 'operator_id', new.operator_id),
      format('project_assigned:%s:%s', new.id, new.operator_id)
    );
  end if;

  return new;
end;
$function$;

-- The public trigger duplicated client/project notifications already emitted by
-- private.notify_project_workflow. Keep one authoritative notification path.
drop trigger if exists trg_notify_project_workflow_change on public.projects;
drop function if exists public.notify_project_workflow_change();
