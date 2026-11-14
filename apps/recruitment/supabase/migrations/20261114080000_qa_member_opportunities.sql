-- QA: third application track. Existing application snapshots and capacities remain intact.
alter table public.draft_opportunities drop constraint draft_opportunities_track_check;
alter table public.draft_opportunities add constraint draft_opportunities_track_check check(track in ('CORE_TEAM','COMMITTEE','MEMBER'));
insert into public.draft_opportunities(id,track) values('general-member','MEMBER');
alter table public.opportunity_capacities alter column capacity drop not null;
alter table public.opportunity_capacities add constraint unlimited_general_member_only check(capacity is not null or opportunity_id='general-member');
insert into public.opportunity_capacities(opportunity_id,capacity) values('general-member',null);

-- The existing serialized acceptance comparison skips a NULL maximum; its
-- account/application/capacity locks, authority, receipts and history are unchanged.
create or replace function public.valid_draft_payload(p jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare
  item record;
  expected text[] := array['profile','track','opportunityId','answers','resumeUrl','portfolioUrl','accuracy','processingConsent','updatesConsent','stage'];
  profile_keys text[] := array['fullName','preferredName','mobile','university','otherUniversity','campus','program','programLevel','year','yearExplanation','enrolled','availability','experience'];
  question_keys text[] := array['motivation','collaboration','availability','pathway','scenario'];
  limits jsonb := '{"fullName":120,"preferredName":60,"mobile":32,"university":160,"otherUniversity":160,"campus":120,"program":160,"programLevel":20,"year":10,"yearExplanation":160,"experience":2000}';
  k text;
begin
  if p ? 'formVersion' then
    if p->'formVersion' is distinct from '2'::jsonb or octet_length(p::text)>65536
      or jsonb_typeof(p->'scenarioReviewedOpportunityId') is distinct from 'string' then return false; end if;
    if p->>'scenarioReviewedOpportunityId'<>'' and not exists(select 1 from public.draft_opportunities where id=p->>'scenarioReviewedOpportunityId') then return false; end if;
    p := p - 'formVersion' - 'scenarioReviewedOpportunityId';
  end if;
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text) > 65536 then return false; end if;
  if not p ?& expected or exists(select 1 from jsonb_object_keys(p) x where not x = any(expected)) then return false; end if;
  if jsonb_typeof(p->'profile') is distinct from 'object' or jsonb_typeof(p->'answers') is distinct from 'object' then return false; end if;
  if not (p->'profile') ?& profile_keys or exists(select 1 from jsonb_object_keys(p->'profile') x where not x = any(profile_keys)) then return false; end if;
  if not (p->'answers') ?& question_keys or exists(select 1 from jsonb_object_keys(p->'answers') x where not x = any(question_keys)) then return false; end if;
  for item in select * from jsonb_each_text(limits) loop
    if jsonb_typeof(p->'profile'->item.key) is distinct from 'string' or char_length(p->'profile'->>item.key) > item.value::int then return false; end if;
  end loop;
  if jsonb_typeof(p->'profile'->'enrolled') is distinct from 'boolean' then return false; end if;
  if (p->'profile'->>'programLevel') not in ('','undergraduate','postgraduate','other') or (p->'profile'->>'year') not in ('','1','2','3','4','5','6+','other') then return false; end if;
  if jsonb_typeof(p->'profile'->'availability') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p->'profile'->'availability') > 7 then return false; end if;
  if exists(select 1 from jsonb_array_elements(p->'profile'->'availability') d where jsonb_typeof(d) <> 'string' or d #>> '{}' not in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')) then return false; end if;
  if (select count(*) from jsonb_array_elements(p->'profile'->'availability')) <> (select count(distinct d) from jsonb_array_elements(p->'profile'->'availability') d) then return false; end if;
  foreach k in array question_keys loop
    if jsonb_typeof(p->'answers'->k) is distinct from 'string' or char_length(p->'answers'->>k) > 10000 then return false; end if;
  end loop;
  foreach k in array array['resumeUrl','portfolioUrl'] loop
    if jsonb_typeof(p->k) is distinct from 'string' or char_length(p->>k) > 2048 then return false; end if;
    if p->>k <> '' and ((p->>k) !~* '^https://[^/[:space:]@?#]+([/?#][^[:space:]]*)?$' or (p->>k) ~ '[\\]') then return false; end if;
  end loop;
  foreach k in array array['accuracy','processingConsent','updatesConsent'] loop
    if jsonb_typeof(p->k) is distinct from 'boolean' then return false; end if;
  end loop;
  if p->>'processingConsent' <> 'true' then return false; end if;
  if jsonb_typeof(p->'stage') is distinct from 'number' or p->>'stage' !~ '^[0-5]$' then return false; end if;
  if jsonb_typeof(p->'track') is distinct from 'string' or p->>'track' not in ('CORE_TEAM','COMMITTEE','MEMBER') or jsonb_typeof(p->'opportunityId') is distinct from 'string' then return false; end if;
  -- Catalog IDs are seeded from the approved repository catalog below.
  if p->>'opportunityId' <> '' and not exists(select 1 from public.draft_opportunities o where o.id = p->>'opportunityId' and o.track = p->>'track') then return false; end if;
  return true;
end;
$$;

create or replace function public.admin_application_queue(p_offset integer default 0,p_filters jsonb default '{}') returns jsonb
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
    or filter_track not in ('all','CORE_TEAM','COMMITTEE','MEMBER') or assignment not in ('all','assigned','unassigned') or review not in ('all','saved','missing')
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

create or replace function public.admin_application_export(p_filters jsonb default '{}') returns jsonb
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
    or filter_track not in ('all','CORE_TEAM','COMMITTEE','MEMBER') or assignment not in ('all','assigned','unassigned') or review not in ('all','saved','missing')
    or (opportunity<>'' and not exists(select 1 from public.draft_opportunities d where d.id=opportunity and (filter_track='all' or d.track=filter_track))) then
    raise exception using errcode='22023',message='Invalid status, track, opportunity, assignment or review filter'; end if;
  filters:=jsonb_build_object('search',search,'status',state,'track',filter_track,'opportunityId',opportunity,'assignment',assignment,'review',review);
  with matching as materialized (
    select a.id,a.submitted_at,jsonb_build_object(
      'reference',a.reference,'email',a.email,'status',a.status,'submittedAt',a.submitted_at,'withdrawnAt',a.withdrawn_at,
      'formVersion',coalesce((a.data->>'formVersion')::int,1),'profile',a.data->'profile','track',a.data->>'track','opportunityId',a.data->>'opportunityId','answers',a.data->'answers',
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

create or replace function private.valid_draft_payload_v1(p jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare
  item record;
  expected text[] := array['profile','track','opportunityId','answers','resumeUrl','portfolioUrl','accuracy','processingConsent','updatesConsent','stage'];
  profile_keys text[] := array['fullName','preferredName','mobile','university','otherUniversity','campus','program','programLevel','year','yearExplanation','enrolled','availability','experience'];
  question_keys text[] := array['motivation','collaboration','availability','pathway','scenario'];
  limits jsonb := '{"fullName":120,"preferredName":60,"mobile":32,"university":160,"otherUniversity":160,"campus":120,"program":160,"programLevel":20,"year":10,"yearExplanation":160,"experience":2000}';
  k text;
begin
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text) > 65536 then return false; end if;
  if not p ?& expected or exists(select 1 from jsonb_object_keys(p) x where not x = any(expected)) then return false; end if;
  if jsonb_typeof(p->'profile') is distinct from 'object' or jsonb_typeof(p->'answers') is distinct from 'object' then return false; end if;
  if not (p->'profile') ?& profile_keys or exists(select 1 from jsonb_object_keys(p->'profile') x where not x = any(profile_keys)) then return false; end if;
  if not (p->'answers') ?& question_keys or exists(select 1 from jsonb_object_keys(p->'answers') x where not x = any(question_keys)) then return false; end if;
  for item in select * from jsonb_each_text(limits) loop
    if jsonb_typeof(p->'profile'->item.key) is distinct from 'string' or char_length(p->'profile'->>item.key) > item.value::int then return false; end if;
  end loop;
  if jsonb_typeof(p->'profile'->'enrolled') is distinct from 'boolean' then return false; end if;
  if (p->'profile'->>'programLevel') not in ('','undergraduate','postgraduate','other') or (p->'profile'->>'year') not in ('','1','2','3','4','5','6+','other') then return false; end if;
  if jsonb_typeof(p->'profile'->'availability') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p->'profile'->'availability') > 7 then return false; end if;
  if exists(select 1 from jsonb_array_elements(p->'profile'->'availability') d where jsonb_typeof(d) <> 'string' or d #>> '{}' not in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')) then return false; end if;
  if (select count(*) from jsonb_array_elements(p->'profile'->'availability')) <> (select count(distinct d) from jsonb_array_elements(p->'profile'->'availability') d) then return false; end if;
  foreach k in array question_keys loop
    if jsonb_typeof(p->'answers'->k) is distinct from 'string' or char_length(p->'answers'->>k) > 10000 then return false; end if;
  end loop;
  foreach k in array array['resumeUrl','portfolioUrl'] loop
    if jsonb_typeof(p->k) is distinct from 'string' or char_length(p->>k) > 2048 then return false; end if;
    if p->>k <> '' and ((p->>k) !~* '^https://[^/[:space:]@?#]+([/?#][^[:space:]]*)?$' or (p->>k) ~ '[\\]') then return false; end if;
  end loop;
  foreach k in array array['accuracy','processingConsent','updatesConsent'] loop
    if jsonb_typeof(p->k) is distinct from 'boolean' then return false; end if;
  end loop;
  if p->>'processingConsent' <> 'true' then return false; end if;
  if jsonb_typeof(p->'stage') is distinct from 'number' or p->>'stage' !~ '^[0-5]$' then return false; end if;
  if jsonb_typeof(p->'track') is distinct from 'string' or p->>'track' not in ('CORE_TEAM','COMMITTEE','MEMBER') or jsonb_typeof(p->'opportunityId') is distinct from 'string' then return false; end if;
  -- Catalog IDs are seeded from the approved repository catalog below.
  if p->>'opportunityId' <> '' and not exists(select 1 from public.draft_opportunities o where o.id = p->>'opportunityId' and o.track = p->>'track') then return false; end if;
  return true;
end;
$$;
-- Public aggregate only. No direct application/capacity table grants are added.
create function public.opportunity_availability() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('updatedAt',statement_timestamp(),'items',coalesce(jsonb_agg(
    jsonb_build_object('id',c.opportunity_id,'capacity',c.capacity,'remaining',
      case when c.capacity is null then null else greatest(0,c.capacity-coalesce(a.accepted,0)) end)
    order by c.opportunity_id),'[]'::jsonb))
  from public.opportunity_capacities c
  left join (select data->>'opportunityId' as id,count(*)::integer as accepted
    from public.applications where status='Accepted' group by data->>'opportunityId') a on a.id=c.opportunity_id;
$$;
revoke all on function public.opportunity_availability() from public;
grant execute on function public.opportunity_availability() to anon,authenticated;
