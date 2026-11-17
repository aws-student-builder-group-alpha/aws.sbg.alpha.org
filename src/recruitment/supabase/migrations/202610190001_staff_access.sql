-- Staff management uses user-scoped RPCs. No privileged Auth key belongs in the app.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.staff_memberships (
  user_id uuid primary key references auth.users(id),
  role text not null check (role in ('administrator','evaluator')),
  status text not null check (status in ('active','suspended','revoked')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.staff_memberships enable row level security;
revoke all on public.staff_memberships from public, anon, authenticated;
grant select on public.staff_memberships to authenticated;
create policy own_staff_membership on public.staff_memberships for select to authenticated
  using ((select auth.uid()) = user_id);

create table public.staff_access_history (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  target_id uuid not null references auth.users(id),
  action text not null check (action in ('bootstrap','grant','change_role','suspend','reactivate','revoke','restore')),
  previous_role text check (previous_role in ('administrator','evaluator')),
  previous_status text check (previous_status in ('active','suspended','revoked')),
  new_role text not null check (new_role in ('administrator','evaluator')),
  new_status text not null check (new_status in ('active','suspended','revoked')),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  target_version integer not null,
  mutation_id uuid not null,
  request jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (actor_id, mutation_id),
  unique (target_id, target_version)
);
create index staff_access_history_target on public.staff_access_history(target_id, created_at desc);
alter table public.staff_access_history enable row level security;
revoke all on public.staff_access_history from public, anon, authenticated;

-- Private helpers are not exposed as PostgREST RPCs. Callers cannot choose an actor.
create function private.verified_google_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null)
    and exists(select 1 from auth.identities i where i.user_id = auth.uid() and i.provider = 'google');
$$;
create function public.is_staff_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_memberships where user_id = auth.uid());
$$;
revoke all on function public.is_staff_account() from public, anon;
grant execute on function public.is_staff_account() to authenticated;

create function private.require_staff_admin() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.verified_google_user() or not exists (
    select 1 from public.staff_memberships where user_id = auth.uid() and role = 'administrator' and status = 'active'
  ) then raise exception using errcode = '42501', message = 'Administrator access required'; end if;
  if (auth.jwt()->>'aal') is distinct from 'aal2' then
    raise exception using errcode = '42501', message = 'MFA required';
  end if;
end;
$$;
revoke all on all functions in schema private from public, anon, authenticated;

create function private.staff_member_json(member public.staff_memberships) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('userId', member.user_id, 'email', u.email,
    'role', member.role, 'status', member.status, 'version', member.version,
    'createdAt', member.created_at, 'updatedAt', member.updated_at)
  from auth.users u where u.id = member.user_id;
$$;
revoke all on function private.staff_member_json(public.staff_memberships) from public, anon, authenticated;

create function public.list_staff_members() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_staff_admin();
  return coalesce((select jsonb_agg(private.staff_member_json(m) order by m.created_at, m.user_id)
    from public.staff_memberships m), '[]'::jsonb);
end;
$$;

create function public.list_staff_history(p_target_id uuid, p_before_version integer default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_staff_admin();
  return coalesce((select jsonb_agg(to_jsonb(h) order by h."targetVersion" desc) from (
    select e.id, e.actor_id as "actorId", a.email as "actorEmail", e.action,
      e.previous_role as "previousRole", e.previous_status as "previousStatus",
      e.new_role as "newRole", e.new_status as "newStatus", e.reason,
      e.target_version as "targetVersion", e.created_at as "createdAt"
    from public.staff_access_history e left join auth.users a on a.id = e.actor_id
    where e.target_id = p_target_id and (p_before_version is null or e.target_version < p_before_version)
    order by e.target_version desc limit 50
  ) h), '[]'::jsonb);
end;
$$;

create function public.manage_staff_access(p_request jsonb) returns jsonb
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
    if found then raise exception using errcode = '40001', message = 'Account already has a staff record'; end if;
    next_status := 'active';
  else
    if not found or before.version <> expected then raise exception using errcode = '40001', message = 'Staff access changed'; end if;
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

-- Only the database owner can run the first-admin bootstrap. No public self-enrollment.
create function public.bootstrap_first_staff_admin(p_email text, p_reason text) returns void
language plpgsql set search_path = '' as $$
declare target uuid; changed public.staff_memberships;
begin
  perform pg_advisory_xact_lock(20261019, 1);
  if exists(select 1 from public.staff_memberships where role = 'administrator') then
    raise exception 'An administrator record already exists; use staff management or the owner recovery runbook';
  end if;
  if char_length(btrim(p_reason)) not between 1 and 500 or p_reason is null then raise exception 'A reason is required'; end if;
  select u.id into target from auth.users u where lower(u.email) = lower(btrim(p_email)) and u.email_confirmed_at is not null
    and exists(select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google');
  if target is null then raise exception 'Google account must sign in first'; end if;
  perform 1 from auth.users where id = target for update;
  insert into public.staff_memberships(user_id,role,status) values(target,'administrator','active') returning * into changed;
  insert into public.staff_access_history(actor_id,target_id,action,new_role,new_status,reason,target_version,mutation_id,request,result)
    values(null,target,'bootstrap','administrator','active',btrim(p_reason),1,gen_random_uuid(),'{}',private.staff_member_json(changed));
end;
$$;
revoke all on function public.bootstrap_first_staff_admin(text,text) from public, anon, authenticated;
revoke all on function public.list_staff_members() from public, anon;
revoke all on function public.list_staff_history(uuid,integer) from public, anon;
revoke all on function public.manage_staff_access(jsonb) from public, anon;
grant execute on function public.list_staff_members() to authenticated;
grant execute on function public.list_staff_history(uuid,integer) to authenticated;
grant execute on function public.manage_staff_access(jsonb) to authenticated;

-- Preserve every draft while excluding all current/former staff accounts.
drop policy own_draft_read on public.applicant_drafts;
create policy own_draft_read on public.applicant_drafts for select to authenticated
  using ((select auth.uid()) = owner_id and not (select public.is_staff_account()));

-- A trigger adds exclusion to the existing save function without editing its applied migration.
create function private.check_applicant_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from auth.users where id = new.owner_id for update;
  if exists(select 1 from public.staff_memberships where user_id = new.owner_id) then
    raise exception using errcode = '42501', message = 'Staff accounts cannot use applicant drafts';
  end if;
  return new;
end;
$$;
revoke all on function private.check_applicant_account() from public, anon, authenticated;
create trigger applicant_account_guard before insert or update on public.applicant_drafts
  for each row execute function private.check_applicant_account();

-- Check exclusion before even an idempotent read, and use a consistent lock order.
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
  if not found then raise exception using errcode = '40001', message = 'Draft changed'; end if;
  if draft.last_mutation_id = p_mutation_id then
    if draft.data <> p_data then raise exception using errcode = '22023', message = 'Mutation identifier reused'; end if;
    return to_jsonb(draft);
  end if;
  if draft.version <> p_expected_version then raise exception using errcode = '40001', message = 'Draft changed'; end if;
  update public.applicant_drafts set data=p_data, email=actor_email, version=version+1, last_mutation_id=p_mutation_id, updated_at=clock_timestamp()
    where owner_id=actor returning * into draft;
  return to_jsonb(draft);
end;
$$;
