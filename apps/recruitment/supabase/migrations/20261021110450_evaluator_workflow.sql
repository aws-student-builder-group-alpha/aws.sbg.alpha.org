-- Private evaluation data never becomes a column on the applicant-readable snapshot.
alter table public.applications drop constraint applications_status_check;
alter table public.applications add constraint applications_status_check check(status in ('Submitted','Under Review','Withdrawn'));
alter table public.applications drop constraint applications_check;
alter table public.applications add constraint applications_withdrawal_check check(
  (status in ('Submitted','Under Review') and withdrawn_at is null and withdraw_mutation_id is null)
  or (status='Withdrawn' and withdrawn_at is not null and withdraw_mutation_id is not null));
alter table public.application_public_history drop constraint application_public_history_status_check;
alter table public.application_public_history add constraint application_public_history_status_check check(status in ('Submitted','Under Review','Withdrawn'));

create table public.evaluation_assignments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  generation integer not null check(generation>0),
  evaluator_id uuid not null references auth.users(id),
  assigned_by uuid not null references auth.users(id),
  reason text not null default '' check(char_length(reason)<=500),
  assigned_at timestamptz not null default clock_timestamp(),
  superseded_at timestamptz,
  unique(application_id,generation)
);
create unique index evaluation_one_current_assignment on public.evaluation_assignments(application_id) where superseded_at is null;
create index evaluation_assigned_user on public.evaluation_assignments(evaluator_id,application_id);
create index evaluation_assignment_actor on public.evaluation_assignments(assigned_by);
create table public.evaluation_reviews (
  assignment_id uuid primary key references public.evaluation_assignments(id) on delete cascade,
  recommendation text not null check(recommendation in ('Accepted','Waitlisted','Not Selected')),
  notes text not null default '' check(char_length(notes)<=5000),
  version integer not null check(version>0),
  updated_at timestamptz not null default clock_timestamp()
);
create table public.evaluation_review_history (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.evaluation_assignments(id) on delete cascade,
  version integer not null check(version>0),
  recommendation text not null check(recommendation in ('Accepted','Waitlisted','Not Selected')),
  notes text not null check(char_length(notes)<=5000),
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default clock_timestamp(),
  unique(assignment_id,version)
);
create index evaluation_review_actor on public.evaluation_review_history(actor_id);
create table public.evaluation_commands (
  actor_id uuid not null references auth.users(id),
  mutation_id uuid not null,
  application_id uuid not null references public.applications(id) on delete cascade,
  request_hash text not null check(char_length(request_hash)=64),
  result jsonb not null,
  primary key(actor_id,mutation_id)
);
create index evaluation_command_application on public.evaluation_commands(application_id);
alter table public.evaluation_assignments enable row level security;
alter table public.evaluation_reviews enable row level security;
alter table public.evaluation_review_history enable row level security;
alter table public.evaluation_commands enable row level security;
revoke all on public.evaluation_assignments,public.evaluation_reviews,public.evaluation_review_history,public.evaluation_commands from public,anon,authenticated;

create function private.evaluation_role() returns text
language plpgsql stable security definer set search_path='' as $$
declare staff_role text;
begin
  if not private.verified_google_user() then raise exception using errcode='42501',message='Verified staff identity required'; end if;
  select role into staff_role from public.staff_memberships where user_id=auth.uid() and status='active';
  if staff_role='administrator' then perform private.require_staff_admin();
  elsif staff_role is distinct from 'evaluator' then raise exception using errcode='42501',message='Active staff access required'; end if;
  return staff_role;
end;
$$;
create function private.evaluation_access(p_application_id uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare staff_role text:=private.evaluation_role();
begin
  if staff_role='administrator' then
    if not exists(select 1 from public.applications where id=p_application_id) then raise exception using errcode='P0002',message='Application unavailable'; end if;
  elsif not exists(select 1 from public.evaluation_assignments s join public.applications a on a.id=s.application_id
    where s.application_id=p_application_id and s.evaluator_id=auth.uid() and s.superseded_at is null and a.status='Under Review') then
    raise exception using errcode='42501',message='This assignment is no longer available';
  end if;
  return staff_role;
end;
$$;
create function private.evaluation_person(p_user_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',id,'email',email) from auth.users where id=p_user_id;
$$;
create function private.evaluation_assignment_json(s public.evaluation_assignments) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_build_object('id',s.id,'generation',s.generation,'evaluator',private.evaluation_person(s.evaluator_id),'assignedAt',s.assigned_at);
$$;

create function public.evaluation_list(p_offset integer default 0,p_search text default '') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare staff_role text:=private.evaluation_role(); page jsonb;
begin
  if p_offset is null or p_offset<0 or p_offset>100000 or p_search is null or char_length(p_search)>100 then raise exception using errcode='22023',message='Invalid list request'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t."submittedAt" desc,t.id desc),'[]'::jsonb) into page from (
    select a.id,a.reference,a.data->'profile'->>'fullName' as name,a.data->>'opportunityId' as "opportunityId",
      a.status,a.version,a.submitted_at as "submittedAt",
      case when s.id is null then null else private.evaluation_assignment_json(s) end as assignment,
      r.recommendation,coalesce(r.version,0) as "reviewVersion"
    from public.applications a left join public.evaluation_assignments s on s.application_id=a.id and s.superseded_at is null
    left join public.evaluation_reviews r on r.assignment_id=s.id
    where (staff_role='administrator' or (s.evaluator_id=auth.uid() and a.status='Under Review'))
      and (p_search='' or position(lower(p_search) in lower(a.reference||' '||a.email||' '||coalesce(a.data->'profile'->>'fullName','')))>0)
    order by a.submitted_at desc,a.id desc limit 26 offset p_offset
  ) t;
  return jsonb_build_object('role',staff_role,'items',(select coalesce(jsonb_agg(v order by n),'[]'::jsonb) from jsonb_array_elements(page) with ordinality t(v,n) where n<=25),
    'nextOffset',case when jsonb_array_length(page)>25 then p_offset+25 else null end,
    'evaluators',case when staff_role='administrator' then coalesce((select jsonb_agg(private.evaluation_person(s.user_id) order by u.email,s.user_id)
      from public.staff_memberships s join auth.users u on u.id=s.user_id where s.role='evaluator' and s.status='active'
      and u.email_confirmed_at is not null and exists(select 1 from auth.identities i where i.user_id=s.user_id and i.provider='google')),'[]'::jsonb) else '[]'::jsonb end);
end;
$$;
create function public.evaluation_detail(p_application_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare staff_role text:=private.evaluation_access(p_application_id); a public.applications; s public.evaluation_assignments; r public.evaluation_reviews;
begin
  select * into strict a from public.applications where id=p_application_id;
  select * into s from public.evaluation_assignments where application_id=a.id and superseded_at is null;
  select * into r from public.evaluation_reviews where assignment_id=s.id;
  return jsonb_build_object('role',staff_role,'application',private.application_json(a),
    'assignment',case when s.id is null then null else private.evaluation_assignment_json(s) end,
    'review',case when r.assignment_id is null then null else jsonb_build_object('version',r.version,'recommendation',r.recommendation,'notes',r.notes,'updatedAt',r.updated_at) end,
    'canEdit',a.status in ('Submitted','Under Review'));
end;
$$;
create function public.evaluation_history(p_application_id uuid,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare staff_role text:=private.evaluation_access(p_application_id); page jsonb;
begin
  if p_offset is null or p_offset<0 or p_offset>100000 then raise exception using errcode='22023',message='Invalid history request'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t."createdAt" desc,t.id desc),'[]'::jsonb) into page from (
    select h.id,'review'::text as kind,s.generation,private.evaluation_person(s.evaluator_id) as evaluator,
      private.evaluation_person(h.actor_id) as actor,h.created_at as "createdAt",null::text as reason,h.recommendation,h.notes,h.version as "reviewVersion"
    from public.evaluation_review_history h join public.evaluation_assignments s on s.id=h.assignment_id
    join public.evaluation_reviews r on r.assignment_id=s.id
    where s.application_id=p_application_id and (staff_role='administrator' or (s.superseded_at is not null and h.version=r.version))
    union all
    select s.id,'assignment',s.generation,private.evaluation_person(s.evaluator_id),private.evaluation_person(s.assigned_by),s.assigned_at,s.reason,null,null,null
    from public.evaluation_assignments s where s.application_id=p_application_id and staff_role='administrator'
    order by "createdAt" desc,id desc limit 26 offset p_offset
  ) t;
  return jsonb_build_object('items',(select coalesce(jsonb_agg(v order by n),'[]'::jsonb) from jsonb_array_elements(page) with ordinality t(v,n) where n<=25),
    'nextOffset',case when jsonb_array_length(page)>25 then p_offset+25 else null end);
end;
$$;

create function public.manage_evaluation(p_request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); staff_role text; action text; app_id uuid; mutation uuid; target uuid; expected_assignment uuid;
  expected integer; current_review integer; generation integer; changed_at timestamptz; request_hash text;
  a public.applications; s public.evaluation_assignments; r public.evaluation_reviews; receipt public.evaluation_commands;
  result jsonb; keys text[];
begin
  -- Shared order with staff grants: authority lock, applicant account, application, assignment/review.
  perform pg_advisory_xact_lock(20261019,1);
  staff_role:=private.evaluation_role();
  if jsonb_typeof(p_request) is distinct from 'object' or octet_length(p_request::text)>32768 then raise exception using errcode='22023',message='Invalid evaluation request'; end if;
  action:=p_request->>'action';
  select array_agg(k order by k) into keys from jsonb_object_keys(p_request) k;
  if action='assign' and staff_role='administrator' then
    if keys is distinct from array['action','applicationId','evaluatorId','expectedApplicationVersion','expectedAssignmentId','mutationId','reason'] then raise exception using errcode='22023',message='Invalid assignment request'; end if;
    if jsonb_typeof(p_request->'reason') is distinct from 'string' or char_length(p_request->>'reason')>500
      or jsonb_typeof(p_request->'expectedApplicationVersion') is distinct from 'number' then raise exception using errcode='22023',message='Invalid assignment fields'; end if;
    expected:=(p_request->>'expectedApplicationVersion')::integer;
    if expected<1 then raise exception using errcode='22023',message='Invalid application revision'; end if;
    target:=(p_request->>'evaluatorId')::uuid;
    expected_assignment:=(p_request->>'expectedAssignmentId')::uuid;
    if target is null or (jsonb_typeof(p_request->'expectedAssignmentId') not in ('string','null')) then raise exception using errcode='22023',message='Invalid assignment'; end if;
  elsif action='save_review' and staff_role='evaluator' then
    if keys is distinct from array['action','applicationId','assignmentId','expectedVersion','mutationId','notes','recommendation'] then raise exception using errcode='22023',message='Invalid recommendation request'; end if;
    if jsonb_typeof(p_request->'notes') is distinct from 'string' or char_length(p_request->>'notes')>5000
      or jsonb_typeof(p_request->'expectedVersion') is distinct from 'number'
      or coalesce(p_request->>'recommendation','') not in ('Accepted','Waitlisted','Not Selected') then raise exception using errcode='22023',message='Invalid recommendation fields'; end if;
    expected:=(p_request->>'expectedVersion')::integer;
    if expected<0 or expected>=2147483647 then raise exception using errcode='22023',message='Invalid review revision'; end if;
    expected_assignment:=(p_request->>'assignmentId')::uuid;
    if expected_assignment is null then raise exception using errcode='22023',message='Assignment required'; end if;
  else raise exception using errcode='42501',message='This staff role cannot perform that operation'; end if;
  app_id:=(p_request->>'applicationId')::uuid; mutation:=(p_request->>'mutationId')::uuid;
  if app_id is null or mutation is null then raise exception using errcode='22023',message='Application and operation required'; end if;
  perform 1 from auth.users where id=(select owner_id from public.applications where id=app_id) for update;
  select * into a from public.applications where id=app_id for update;
  if not found then
    if staff_role='evaluator' then raise exception using errcode='42501',message='This assignment is no longer available'; end if;
    raise exception using errcode='P0002',message='Application unavailable';
  end if;
  select * into s from public.evaluation_assignments where application_id=app_id and superseded_at is null for update;
  if staff_role='evaluator' and (s.id is null or s.evaluator_id<>actor or s.id<>expected_assignment or a.status<>'Under Review') then
    raise exception using errcode='42501',message='This assignment is no longer available'; end if;
  if a.status not in ('Submitted','Under Review') then raise exception using errcode='PT409',message='This application is read-only'; end if;
  request_hash:=encode(sha256(convert_to(p_request::text,'UTF8')),'hex');
  select * into receipt from public.evaluation_commands where actor_id=actor and mutation_id=mutation;
  if found then
    if receipt.request_hash<>request_hash or receipt.application_id<>app_id then raise exception using errcode='22023',message='Operation identifier reused'; end if;
    return receipt.result;
  end if;
  changed_at:=clock_timestamp();
  if action='assign' then
    if a.version<>expected or s.id is distinct from expected_assignment then raise exception using errcode='PT409',message='Assignment changed in another session'; end if;
    if not exists(select 1 from public.staff_memberships m join auth.users u on u.id=m.user_id
      where m.user_id=target and m.role='evaluator' and m.status='active' and u.email_confirmed_at is not null
      and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')) then
      raise exception using errcode='22023',message='Choose an active evaluator'; end if;
    if s.id is null or s.evaluator_id<>target then
      if s.id is not null and char_length(btrim(p_request->>'reason'))=0 then raise exception using errcode='22023',message='Reassignment reason required'; end if;
      select coalesce(max(e.generation),0)+1 into generation from public.evaluation_assignments e where e.application_id=app_id;
      update public.evaluation_assignments set superseded_at=changed_at where id=s.id;
      insert into public.evaluation_assignments(application_id,generation,evaluator_id,assigned_by,reason,assigned_at)
        values(app_id,generation,target,actor,btrim(p_request->>'reason'),changed_at) returning * into s;
    end if;
    if a.status='Submitted' then
      update public.applications set status='Under Review',version=version+1 where id=app_id returning * into a;
      insert into public.application_public_history(application_id,version,status,created_at) values(a.id,a.version,a.status,changed_at);
    end if;
    select * into r from public.evaluation_reviews where assignment_id=s.id;
    current_review:=coalesce(r.version,0);
  else
    select * into r from public.evaluation_reviews where assignment_id=s.id for update;
    current_review:=coalesce(r.version,0);
    if current_review<>expected then raise exception using errcode='PT409',message='Recommendation changed in another session'; end if;
    insert into public.evaluation_reviews(assignment_id,recommendation,notes,version,updated_at)
      values(s.id,p_request->>'recommendation',p_request->>'notes',current_review+1,changed_at)
      on conflict(assignment_id) do update set recommendation=excluded.recommendation,notes=excluded.notes,version=excluded.version,updated_at=excluded.updated_at;
    current_review:=current_review+1;
    insert into public.evaluation_review_history(assignment_id,version,recommendation,notes,actor_id,created_at)
      values(s.id,current_review,p_request->>'recommendation',p_request->>'notes',actor,changed_at);
  end if;
  result:=jsonb_build_object('applicationId',app_id,'applicationVersion',a.version,'status',a.status,
    'assignmentId',s.id,'generation',s.generation,'reviewVersion',current_review,'updatedAt',changed_at);
  insert into public.evaluation_commands(actor_id,mutation_id,application_id,request_hash,result) values(actor,mutation,app_id,request_hash,result);
  return result;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode='22023',message='Invalid evaluation identifiers or revisions';
end;
$$;

create or replace function private.keep_application_snapshot() returns trigger
language plpgsql set search_path='' as $$
begin
  if (new.id,new.owner_id,new.reference,new.email,new.data,new.privacy_version,new.consented_at,new.source_draft_version,new.submit_mutation_id,new.submitted_at)
    is distinct from (old.id,old.owner_id,old.reference,old.email,old.data,old.privacy_version,old.consented_at,old.source_draft_version,old.submit_mutation_id,old.submitted_at)
    or new.version<>old.version+1 or not (
      (old.status='Submitted' and new.status in ('Under Review','Withdrawn')) or (old.status='Under Review' and new.status='Withdrawn')) then
    raise exception using errcode='42501',message='Submitted answers are immutable'; end if;
  return new;
end;
$$;
create or replace function public.withdraw_applicant_application(p_expected_version integer,p_mutation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_applicant(); a public.applications;
begin
  if p_expected_version is null or p_expected_version<1 or p_mutation_id is null then raise exception using errcode='22023',message='Invalid withdrawal request'; end if;
  select * into a from public.applications where owner_id=actor for update;
  if not found then raise exception using errcode='P0002',message='No submitted application'; end if;
  if a.status='Withdrawn' then return private.application_json(a); end if;
  if a.status not in ('Submitted','Under Review') or a.version<>p_expected_version then raise exception using errcode='PT409',message='Application changed'; end if;
  update public.applications set status='Withdrawn',version=version+1,withdrawn_at=clock_timestamp(),withdraw_mutation_id=p_mutation_id where id=a.id returning * into a;
  insert into public.application_public_history(application_id,version,status,created_at) values(a.id,a.version,a.status,a.withdrawn_at);
  return private.application_json(a);
end;
$$;
revoke all on function private.evaluation_role(),private.evaluation_access(uuid),private.evaluation_person(uuid),private.evaluation_assignment_json(public.evaluation_assignments) from public,anon,authenticated;
revoke all on function public.evaluation_list(integer,text),public.evaluation_detail(uuid),public.evaluation_history(uuid,integer),public.manage_evaluation(jsonb) from public,anon;
grant execute on function public.evaluation_list(integer,text),public.evaluation_detail(uuid),public.evaluation_history(uuid,integer),public.manage_evaluation(jsonb) to authenticated;
