do $$
begin
  if to_regclass('public.call_sessions') is not null then
    begin
      alter publication supabase_realtime add table public.call_sessions;
    exception
      when duplicate_object then null;
    end;

    alter table public.call_sessions replica identity full;
  end if;
end $$;
