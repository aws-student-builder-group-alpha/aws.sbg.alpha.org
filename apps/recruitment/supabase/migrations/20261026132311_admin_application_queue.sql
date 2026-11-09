-- One read snapshot supplies the bounded page and counts for all matching rows.
-- No table privileges, applicant records, workflow commands or intake settings change.
create function public.admin_application_queue(p_offset integer default 0,p_filters jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  search text; state text; filter_track text; opportunity text; assignment text; review text; filters jsonb; result jsonb;
begin
  perform private.require_staff_admin();
  if p_offset is null or p_offset<0 or p_offset>100000 or jsonb_typeof(p_filters) is distinct from 'object' or octet_length(p_filters::text)>2048 then
    raise exception using errcode='22023',message='Invalid application queue request'; end if;
  if exists(select 1 from jsonb_each(p_filters) f where f.key not in ('search','status','track','opportunityId','assignment','review') or jsonb_typeof(f.value)<>'string') then
    raise exception using errcode='22023',message='Invalid application queue filters'; end if;
  search:=coalesce(p_filters->>'search',''); state:=coalesce(p_filters->>'status','all'); filter_track:=coalesce(p_filters->>'track','all');
  opportunity:=coalesce(p_filters->>'opportunityId',''); assignment:=coalesce(p_filters->>'assignment','all'); review:=coalesce(p_filters->>'review','all');
  if char_length(search)>100 or state not in ('all','Submitted','Under Review','Accepted','Waitlisted','Not Selected','Withdrawn')
    or filter_track not in ('all','CORE_TEAM','COMMITTEE') or assignment not in ('all','assigned','unassigned') or review not in ('all','saved','missing')
    or (opportunity<>'' and not exists(select 1 from public.draft_opportunities d where d.id=opportunity and (filter_track='all' or d.track=filter_track))) then
    raise exception using errcode='22023',message='Invalid status, track, opportunity, assignment or review filter'; end if;
  filters:=jsonb_build_object('search',search,'status',state,'track',filter_track,'opportunityId',opportunity,'assignment',assignment,'review',review);
  with matching as materialized (
    select a.id,a.reference,a.data->'profile'->>'fullName' as name,a.data->>'opportunityId' as "opportunityId",
      a.status,a.version,a.submitted_at as "submittedAt",
      case when s.id is null then null else private.evaluation_assignment_json(s) end as assignment,
      r.recommendation,coalesce(r.version,0) as "reviewVersion"
    from public.applications a join public.draft_opportunities d on d.id=a.data->>'opportunityId'
    left join public.evaluation_assignments s on s.application_id=a.id and s.superseded_at is null
    left join public.evaluation_reviews r on r.assignment_id=s.id
    where (search='' or position(lower(search) in lower(a.reference||' '||a.email||' '||coalesce(a.data->'profile'->>'fullName','')))>0)
      and (state='all' or a.status=state) and (filter_track='all' or d.track=filter_track) and (opportunity='' or d.id=opportunity)
      and (assignment='all' or assignment='assigned' and s.id is not null or assignment='unassigned' and s.id is null)
      and (review='all' or review='saved' and r.assignment_id is not null or review='missing' and r.assignment_id is null)
  ), stats as (
    select count(*)::integer as total,jsonb_build_object(
      'Submitted',count(*) filter(where status='Submitted'),'Under Review',count(*) filter(where status='Under Review'),
      'Accepted',count(*) filter(where status='Accepted'),'Waitlisted',count(*) filter(where status='Waitlisted'),
      'Not Selected',count(*) filter(where status='Not Selected'),'Withdrawn',count(*) filter(where status='Withdrawn')) as counts
    from matching
  )
  select jsonb_build_object('role','administrator',
    'items',(select coalesce(jsonb_agg(to_jsonb(page) order by page."submittedAt" desc,page.id desc),'[]') from (select * from matching order by "submittedAt" desc,id desc limit 25 offset p_offset) page),
    'nextOffset',case when p_offset+25<stats.total then p_offset+25 else null end,
    'queue',jsonb_build_object('filters',filters,'total',stats.total,'statusCounts',stats.counts),
    'evaluators',coalesce((select jsonb_agg(private.evaluation_person(s.user_id) order by u.email,s.user_id)
      from public.staff_memberships s join auth.users u on u.id=s.user_id where s.role='evaluator' and s.status='active'
      and u.email_confirmed_at is not null and exists(select 1 from auth.identities i where i.user_id=s.user_id and i.provider='google')),'[]'))
    into result from stats;
  return result;
end;
$$;
revoke all on function public.admin_application_queue(integer,jsonb) from public,anon;
grant execute on function public.admin_application_queue(integer,jsonb) to authenticated;
