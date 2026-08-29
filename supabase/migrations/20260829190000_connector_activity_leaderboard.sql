-- Connector Activity, Leaderboard & Achievement Summary
-- Server-side aggregation only. No new CRM, lead, referral, commission, or achievement tables.

create or replace function private.get_connector_activity_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_user_id and ur.role = 'connector'
  ) then
    raise exception 'Connector role required';
  end if;

  if not exists (
    select 1 from public.connector_profiles cp
    where cp.user_id = v_user_id and coalesce(cp.is_active, false) = true
  ) then
    raise exception 'Active connector profile required';
  end if;

  with active_connectors as (
    select cp.user_id as connector_id,
           coalesce(nullif(btrim(p.full_name), ''), 'Connector') as connector_name
    from public.connector_profiles cp
    left join public.profiles p on p.id = cp.user_id
    where coalesce(cp.is_active, false) = true
      and exists (
        select 1 from public.user_roles ur
        where ur.user_id = cp.user_id and ur.role = 'connector'
      )
  ),
  lead_stats as (
    select l.connector_id,
           count(*)::integer as leads_submitted,
           count(*) filter (where lower(coalesce(l.status, '')) = 'qualified')::integer as qualified_leads,
           count(*) filter (where l.created_at >= now() - interval '30 days')::integer as recent_leads,
           count(*) filter (where l.created_at >= date_trunc('month', now()) and lower(coalesce(l.status, '')) = 'qualified')::integer as monthly_qualified_leads
    from public.leads l
    where l.connector_id is not null
    group by l.connector_id
  ),
  project_stats as (
    select p.connector_id,
           count(*)::integer as projects_generated,
           count(*) filter (where p.created_at >= now() - interval '30 days')::integer as recent_projects
    from public.projects p
    where p.connector_id is not null
    group by p.connector_id
  ),
  referral_stats as (
    select rb.referrer_id as connector_id,
           count(*)::integer as successful_referrals
    from public.referral_bonuses rb
    group by rb.referrer_id
  ),
  commission_stats as (
    select c.connector_id,
           coalesce(sum(c.amount) filter (where lower(coalesce(c.status, '')) not in ('cancelled', 'void')), 0)::numeric as commission_earned
    from public.commissions c
    where c.connector_id is not null
    group by c.connector_id
  ),
  metrics as (
    select ac.connector_id,
           ac.connector_name,
           coalesce(ls.leads_submitted, 0) as leads_submitted,
           coalesce(ls.qualified_leads, 0) as qualified_leads,
           coalesce(ps.projects_generated, 0) as projects_generated,
           coalesce(rs.successful_referrals, 0) as successful_referrals,
           coalesce(cs.commission_earned, 0)::numeric as commission_earned,
           coalesce(ls.recent_leads, 0) as recent_leads,
           coalesce(ps.recent_projects, 0) as recent_projects,
           coalesce(ls.monthly_qualified_leads, 0) as monthly_qualified_leads
    from active_connectors ac
    left join lead_stats ls on ls.connector_id = ac.connector_id
    left join project_stats ps on ps.connector_id = ac.connector_id
    left join referral_stats rs on rs.connector_id = ac.connector_id
    left join commission_stats cs on cs.connector_id = ac.connector_id
  ),
  ranked as (
    select m.*,
           row_number() over (
             order by m.projects_generated desc,
                      m.qualified_leads desc,
                      m.leads_submitted desc,
                      m.successful_referrals desc,
                      m.connector_name asc,
                      m.connector_id asc
           )::integer as rank
    from metrics m
  ),
  me as (
    select * from ranked where connector_id = v_user_id
  ),
  leaderboard_rows as (
    select r.rank,
           r.connector_id,
           r.connector_name,
           r.leads_submitted,
           r.qualified_leads,
           r.projects_generated,
           r.successful_referrals,
           case when r.connector_id = v_user_id then r.commission_earned else null end as commission_earned,
           r.connector_id = v_user_id as is_current
    from ranked r
    where r.rank <= 10 or r.connector_id = v_user_id
    order by r.rank
  )
  select jsonb_build_object(
    'activity', jsonb_build_object(
      'leads_submitted', me.leads_submitted,
      'qualified_leads', me.qualified_leads,
      'projects_generated', me.projects_generated,
      'successful_referrals', me.successful_referrals,
      'commission_earned', me.commission_earned
    ),
    'rank', me.rank,
    'recognition_labels', (
      select jsonb_agg(label order by priority)
      from (
        select 'Top Connector'::text as label, 1 as priority where me.rank = 1
        union all select 'Project Generator', 2 where me.projects_generated >= 1
        union all select 'Lead Hunter', 3 where me.qualified_leads >= 5
        union all select 'Rising Connector', 4 where (me.recent_leads + me.recent_projects) >= 3 and me.projects_generated = 0 and me.qualified_leads < 5
        union all select 'Active Connector', 5 where (me.recent_leads + me.recent_projects) >= 1 and me.projects_generated = 0 and me.qualified_leads < 5
        union all select 'New Connector', 6 where me.leads_submitted = 0 and me.projects_generated = 0 and me.successful_referrals = 0
      ) labels
    ),
    'monthly_challenge', jsonb_build_object(
      'target', 5,
      'progress', me.monthly_qualified_leads,
      'remaining', greatest(5 - me.monthly_qualified_leads, 0),
      'percentage', least(100, floor((me.monthly_qualified_leads::numeric / 5) * 100))::integer
    ),
    'achievements', jsonb_build_array(
      jsonb_build_object('key','first_lead','title','First Lead','category','Lead Hunter','target',1,'progress',least(me.leads_submitted,1),'unlocked',me.leads_submitted >= 1),
      jsonb_build_object('key','five_leads','title','5 Leads','category','Lead Hunter','target',5,'progress',least(me.leads_submitted,5),'unlocked',me.leads_submitted >= 5),
      jsonb_build_object('key','ten_leads','title','10 Leads','category','Lead Hunter','target',10,'progress',least(me.leads_submitted,10),'unlocked',me.leads_submitted >= 10),
      jsonb_build_object('key','twenty_five_leads','title','25 Leads','category','Lead Hunter','target',25,'progress',least(me.leads_submitted,25),'unlocked',me.leads_submitted >= 25),
      jsonb_build_object('key','first_qualified','title','First Qualified Lead','category','Growth','target',1,'progress',least(me.qualified_leads,1),'unlocked',me.qualified_leads >= 1),
      jsonb_build_object('key','first_project','title','First Project','category','Project Generator','target',1,'progress',least(me.projects_generated,1),'unlocked',me.projects_generated >= 1),
      jsonb_build_object('key','three_projects','title','3 Projects','category','Project Generator','target',3,'progress',least(me.projects_generated,3),'unlocked',me.projects_generated >= 3),
      jsonb_build_object('key','five_projects','title','5 Projects','category','Project Generator','target',5,'progress',least(me.projects_generated,5),'unlocked',me.projects_generated >= 5),
      jsonb_build_object('key','ten_projects','title','10 Projects','category','Project Generator','target',10,'progress',least(me.projects_generated,10),'unlocked',me.projects_generated >= 10),
      jsonb_build_object('key','first_referral','title','First Successful Referral','category','Connector Recruiter','target',1,'progress',least(me.successful_referrals,1),'unlocked',me.successful_referrals >= 1),
      jsonb_build_object('key','three_referrals','title','3 Successful Referrals','category','Connector Recruiter','target',3,'progress',least(me.successful_referrals,3),'unlocked',me.successful_referrals >= 3),
      jsonb_build_object('key','five_referrals','title','5 Successful Referrals','category','Connector Recruiter','target',5,'progress',least(me.successful_referrals,5),'unlocked',me.successful_referrals >= 5)
    ),
    'leaderboard', coalesce((select jsonb_agg(to_jsonb(lr) order by lr.rank) from leaderboard_rows lr), '[]'::jsonb)
  ) into v_result
  from me;

  if v_result is null then
    raise exception 'Active connector profile required';
  end if;

  return v_result;
end;
$$;

revoke execute on function private.get_connector_activity_summary() from public, anon, authenticated;

create or replace function public.get_connector_activity_summary()
returns jsonb
language sql
set search_path = ''
as $$
  select private.get_connector_activity_summary();
$$;

revoke execute on function public.get_connector_activity_summary() from public, anon;
grant execute on function public.get_connector_activity_summary() to authenticated;
