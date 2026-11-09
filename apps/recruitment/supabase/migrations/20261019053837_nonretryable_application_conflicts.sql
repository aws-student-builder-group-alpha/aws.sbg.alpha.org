-- Business conflicts are final HTTP 409 responses, not retryable serialization failures.
-- PostgREST can retry custom 40001 exceptions indefinitely. Preserve all authority,
-- locking, idempotency, history, function signatures, and existing execution grants.

create or replace function public.manage_staff_access(p_request jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  target uuid;
  before public.staff_memberships;
  changed public.staff_memberships;
  operation text := p_request->>'action';
  next_role text := p_request->>'role';
  next_status text;
  expected integer;
  mutation uuid;
  reason text := btrim(p_request->>'reason');
  prior public.staff_access_history;
  result jsonb;
begin
  -- One transaction order protects current authority and the last administrator.
  perform pg_advisory_xact_lock(20261019, 1);
  perform private.require_staff_admin();
  if jsonb_typeof(p_request) is distinct from 'object' or octet_length(p_request::text) > 4096
    or not p_request ?& array['action','email','targetId','role','expectedVersion','mutationId','reason']
    or exists(select 1 from jsonb_object_keys(p_request) k where k not in ('action','email','targetId','role','expectedVersion','mutationId','reason'))
    or exists(select 1 from jsonb_each(p_request) e where e.key <> 'expectedVersion' and jsonb_typeof(e.value) <> 'string')
    or operation not in ('grant','change_role','suspend','reactivate','revoke','restore')
    or next_role not in ('administrator','evaluator')
    or reason is null or char_length(reason) not between 1 and 500
    or jsonb_typeof(p_request->'expectedVersion') <> 'number'
    or p_request->>'expectedVersion' !~ '^[0-9]{1,9}$'
    or p_request->>'mutationId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then raise exception using errcode = '22023', message = 'Invalid staff change'; end if;
  expected := (p_request->>'expectedVersion')::integer;
  mutation := (p_request->>'mutationId')::uuid;
  select * into prior from public.staff_access_history where actor_id = actor and mutation_id = mutation;
  if found then
    if prior.request <> p_request then raise exception using errcode = '22023', message = 'Operation identifier reused'; end if;
    return prior.result;
  end if;
  if operation = 'grant' then
    if expected <> 0 or p_request->>'targetId' <> '' or char_length(p_request->>'email') not between 3 and 254 then
      raise exception using errcode = '22023', message = 'Invalid grant';
    end if;
    select u.id into target from auth.users u
      where lower(u.email) = lower(btrim(p_request->>'email')) and u.email_confirmed_at is not null
      and exists(select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google');
    if target is null then raise exception using errcode = 'P0002', message = 'Google account must sign in first'; end if;
  else
    if p_request->>'targetId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or p_request->>'email' <> '' then
      raise exception using errcode = '22023', message = 'Invalid target';
    end if;
    target := (p_request->>'targetId')::uuid;
  end if;
  if target = actor then raise exception using errcode = '42501', message = 'Self changes are not allowed'; end if;
  -- Draft saves take the same per-account lock before checking staff exclusion.
  perform 1 from auth.users where id = target for update;
  select * into before from public.staff_memberships where user_id = target for update;
  if operation = 'grant' then
    if found then raise exception using errcode = 'PT409', message = 'Account already has a staff record'; end if;
    next_status := 'active';
  else
    if not found or before.version <> expected then raise exception using errcode = 'PT409', message = 'Staff access changed'; end if;
    if operation <> 'change_role' and next_role <> before.role then raise exception using errcode = '22023', message = 'Role cannot change with status'; end if;
    case operation
      when 'change_role' then
        if before.status <> 'active' or next_role = before.role then raise exception using errcode = '22023', message = 'Invalid role change'; end if;
        next_status := before.status;
      when 'suspend' then
        if before.status <> 'active' then raise exception using errcode = '22023', message = 'Only active staff can be suspended'; end if;
        next_status := 'suspended';
      when 'reactivate' then
        if before.status <> 'suspended' then raise exception using errcode = '22023', message = 'Only suspended staff can be reactivated'; end if;
        next_status := 'active';
      when 'revoke' then
        if before.status = 'revoked' then raise exception using errcode = '22023', message = 'Access is already revoked'; end if;
        next_status := 'revoked';
      when 'restore' then
        if before.status <> 'revoked' then raise exception using errcode = '22023', message = 'Only revoked access can be restored'; end if;
        next_status := 'active';
    end case;
    if before.role = 'administrator' and before.status = 'active' and (next_role <> 'administrator' or next_status <> 'active')
      and (select count(*) from public.staff_memberships where role = 'administrator' and status = 'active') <= 1 then
      raise exception using errcode = '23514', message = 'An active administrator must remain';
    end if;
  end if;
  insert into public.staff_memberships(user_id, role, status) values(target, next_role, next_status)
    on conflict(user_id) do update set role = excluded.role, status = excluded.status,
      version = public.staff_memberships.version + 1, updated_at = clock_timestamp()
    returning * into changed;
  result := private.staff_member_json(changed);
  insert into public.staff_access_history(actor_id,target_id,action,previous_role,previous_status,new_role,new_status,reason,target_version,mutation_id,request,result)
    values(actor,target,operation,before.role,before.status,changed.role,changed.status,reason,changed.version,mutation,p_request,result);
  return result;
end;
$$;

create or replace function public.save_applicant_draft(p_data jsonb, p_expected_version integer, p_mutation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_email text;
  draft public.applicant_drafts;
begin
  if actor is null or not private.verified_google_user() then
    raise exception using errcode = '42501', message = 'Verified Google identity required';
  end if;
  select email into actor_email from auth.users where id = actor for update;
  if public.is_staff_account() then raise exception using errcode = '42501', message = 'Staff accounts cannot use applicant drafts'; end if;
  if p_data is null or p_expected_version is null or p_expected_version < 0 or p_expected_version = 2147483647 or p_mutation_id is null or not public.valid_draft_payload(p_data) then
    raise exception using errcode = '22023', message = 'Invalid draft';
  end if;
  if p_expected_version = 0 then
    insert into public.applicant_drafts(owner_id,email,data,last_mutation_id)
      values(actor,actor_email,p_data,p_mutation_id) on conflict(owner_id) do nothing;
  end if;
  select * into draft from public.applicant_drafts where owner_id = actor for update;
  if not found then raise exception using errcode = 'PT409', message = 'Draft changed'; end if;
  if draft.last_mutation_id = p_mutation_id then
    if draft.data <> p_data then raise exception using errcode = '22023', message = 'Mutation identifier reused'; end if;
    return to_jsonb(draft);
  end if;
  if draft.version <> p_expected_version then raise exception using errcode = 'PT409', message = 'Draft changed'; end if;
  update public.applicant_drafts set data=p_data, email=actor_email, version=version+1, last_mutation_id=p_mutation_id, updated_at=clock_timestamp()
    where owner_id=actor returning * into draft;
  return to_jsonb(draft);
end;
$$;
