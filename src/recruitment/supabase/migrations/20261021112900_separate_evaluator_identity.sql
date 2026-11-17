-- Preserve separate staff/applicant identities, including accounts granted staff after submission.
create or replace function public.manage_evaluation(p_request jsonb) returns jsonb
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
  if action='assign' and target=a.owner_id then raise exception using errcode='22023',message='Choose an evaluator separate from the applicant account'; end if;
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
