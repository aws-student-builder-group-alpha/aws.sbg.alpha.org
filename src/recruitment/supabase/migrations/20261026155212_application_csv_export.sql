-- A single read snapshot supplies the complete filtered allowlisted export.
-- No table grants, stored files, applicant data or workflow settings change.
create function public.admin_application_export(p_filters jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  search text; state text; filter_track text; opportunity text; assignment text; review text; filters jsonb; result jsonb;
begin
  perform private.require_staff_admin();
  if jsonb_typeof(p_filters) is distinct from 'object' or octet_length(p_filters::text)>2048 then
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
    select a.id,a.submitted_at,jsonb_build_object(
      'reference',a.reference,'email',a.email,'status',a.status,'submittedAt',a.submitted_at,'withdrawnAt',a.withdrawn_at,
      'profile',a.data->'profile','track',a.data->>'track','opportunityId',a.data->>'opportunityId','answers',a.data->'answers',
      'accuracy',a.data->'accuracy','processingConsent',a.data->'processingConsent','updatesConsent',a.data->'updatesConsent') as row
    from public.applications a join public.draft_opportunities d on d.id=a.data->>'opportunityId'
    left join public.evaluation_assignments s on s.application_id=a.id and s.superseded_at is null
    left join public.evaluation_reviews r on r.assignment_id=s.id
    where (search='' or position(lower(search) in lower(a.reference||' '||a.email||' '||coalesce(a.data->'profile'->>'fullName','')))>0)
      and (state='all' or a.status=state) and (filter_track='all' or d.track=filter_track) and (opportunity='' or d.id=opportunity)
      and (assignment='all' or assignment='assigned' and s.id is not null or assignment='unassigned' and s.id is null)
      and (review='all' or review='saved' and r.assignment_id is not null or review='missing' and r.assignment_id is null)
  ), stats as (
    select count(*) as total,coalesce(sum(octet_length(row::text)+1),0) as bytes from matching
  )
  select case when stats.bytes>67108864 then null else jsonb_build_object(
    'filters',filters,'generatedAt',statement_timestamp(),'total',stats.total,
    'rows',(select coalesce(jsonb_agg(row order by submitted_at desc,id desc),'[]'::jsonb) from matching)) end into result from stats;
  if result is null then raise exception using errcode='PT413',message='Export is too large; narrow the queue filters'; end if;
  return result;
end;
$$;
revoke all on function public.admin_application_export(jsonb) from public,anon;
grant execute on function public.admin_application_export(jsonb) to authenticated;
