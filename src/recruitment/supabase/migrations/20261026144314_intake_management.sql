-- One fixed recruitment cycle. Only future app changes receive attributable history.
alter table public.recruitment_settings
  add column version integer not null default 1 check(version>0),
  add column updated_at timestamptz not null default clock_timestamp();

create table public.intake_history (
  id uuid primary key default gen_random_uuid(),
  action text not null check(action in ('pause','resume','close')),
  previous_state text not null check(previous_state in ('open','paused')),
  new_state text not null check(new_state in ('open','paused','closed')),
  reason text not null check(char_length(reason) between 1 and 500 and reason=private.application_trim(reason)),
  settings_version integer not null unique check(settings_version>1),
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default clock_timestamp()
);
create index intake_history_actor on public.intake_history(actor_id);
create table public.intake_commands (
  actor_id uuid not null references auth.users(id),
  mutation_id uuid not null,
  request_hash text not null check(length(request_hash)=64),
  result jsonb not null,
  primary key(actor_id,mutation_id)
);
alter table public.intake_history enable row level security;
alter table public.intake_commands enable row level security;
revoke all on public.intake_history,public.intake_commands from public,anon,authenticated;

create function private.intake_json(s public.recruitment_settings) returns jsonb
language sql volatile set search_path='' as $$
  select jsonb_build_object('state',s.intake_state,'version',s.version,'opensAt',s.opens_at,'closesAt',s.closes_at,
    'updatedAt',s.updated_at,'serverNow',t.n,
    'accepting',s.intake_state='open' and t.n>=s.opens_at and t.n<s.closes_at,
    'canPause',s.intake_state='open' and t.n<s.closes_at,
    'canResume',s.intake_state='paused' and t.n<s.closes_at,
    'canClose',s.intake_state<>'closed') from (select clock_timestamp() n) t;
$$;
revoke all on function private.intake_json(public.recruitment_settings) from public,anon,authenticated;

create function public.intake_state() returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.recruitment_settings;
begin
  perform private.require_staff_admin();
  select * into strict s from public.recruitment_settings where id;
  return private.intake_json(s);
end;
$$;

create function public.intake_history_page(p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare page jsonb;
begin
  perform private.require_staff_admin();
  if p_offset is null or p_offset<0 or p_offset>100000 then raise exception using errcode='22023',message='Invalid history request'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.version desc),'[]'::jsonb) into page from (
    select h.id,h.action,h.previous_state as "previousState",h.new_state as "state",h.reason,h.settings_version as version,
      private.evaluation_person(h.actor_id) as actor,h.created_at as "createdAt"
    from public.intake_history h order by h.settings_version desc limit 26 offset p_offset
  ) t;
  return jsonb_build_object('items',(select coalesce(jsonb_agg(v order by n),'[]'::jsonb) from jsonb_array_elements(page) with ordinality t(v,n) where n<=25),
    'nextOffset',case when jsonb_array_length(page)>25 then p_offset+25 else null end);
end;
$$;

create function public.manage_intake(p_request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); s public.recruitment_settings; receipt public.intake_commands;
  keys text[]; action text; reason text; expected integer; mutation uuid; request_hash text; next_state text; previous_state text; result jsonb;
begin
  -- Same authority order as staff changes. Settings UPDATE conflicts with submission FOR SHARE.
  perform pg_advisory_xact_lock(20261019,1);
  perform private.require_staff_admin();
  if jsonb_typeof(p_request) is distinct from 'object' or octet_length(p_request::text)>8192 then raise exception using errcode='22023',message='Invalid intake request'; end if;
  select array_agg(k order by k) into keys from jsonb_object_keys(p_request) k;
  if keys is distinct from array['action','expectedVersion','mutationId','reason']
    or jsonb_typeof(p_request->'action') is distinct from 'string'
    or coalesce(p_request->>'action','') not in ('pause','resume','close')
    or jsonb_typeof(p_request->'reason') is distinct from 'string'
    or char_length(p_request->>'reason')>500
    or char_length(private.application_trim(p_request->>'reason'))<1
    or jsonb_typeof(p_request->'expectedVersion') is distinct from 'number'
    or (p_request->>'expectedVersion') !~ '^[1-9][0-9]{0,9}$'
    or jsonb_typeof(p_request->'mutationId') is distinct from 'string'
  then raise exception using errcode='22023',message='Invalid intake fields'; end if;
  action:=p_request->>'action'; reason:=private.application_trim(p_request->>'reason');
  expected:=(p_request->>'expectedVersion')::integer; mutation:=(p_request->>'mutationId')::uuid;
  if mutation is null or expected>=2147483647 then raise exception using errcode='22023',message='Invalid intake identifiers'; end if;
  request_hash:=encode(sha256(convert_to(p_request::text,'UTF8')),'hex');
  select * into receipt from public.intake_commands where actor_id=actor and mutation_id=mutation;
  if found then
    if receipt.request_hash<>request_hash then raise exception using errcode='22023',message='Operation identifier reused'; end if;
    return receipt.result;
  end if;
  select * into strict s from public.recruitment_settings where id for update;
  if s.version<>expected or s.intake_state='closed' then raise exception using errcode='PT409',message='Intake changed or is finally closed'; end if;
  if action<>'close' and clock_timestamp()>=s.closes_at then raise exception using errcode='PT409',message='The submission deadline has passed'; end if;
  if action='pause' and s.intake_state<>'open' or action='resume' and s.intake_state<>'paused' then raise exception using errcode='PT409',message='Intake state changed'; end if;
  previous_state:=s.intake_state;
  next_state:=case action when 'pause' then 'paused' when 'resume' then 'open' else 'closed' end;
  update public.recruitment_settings set intake_state=next_state,version=version+1,updated_at=clock_timestamp() where id returning * into s;
  insert into public.intake_history(action,previous_state,new_state,reason,settings_version,actor_id,created_at)
    values(action,previous_state,next_state,reason,s.version,actor,s.updated_at);
  result:=jsonb_build_object('state',s.intake_state,'version',s.version,'updatedAt',s.updated_at);
  insert into public.intake_commands(actor_id,mutation_id,request_hash,result) values(actor,mutation,request_hash,result);
  return result;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode='22023',message='Invalid intake identifiers or revision';
end;
$$;
revoke all on function public.intake_state(),public.intake_history_page(integer),public.manage_intake(jsonb) from public,anon;
grant execute on function public.intake_state(),public.intake_history_page(integer),public.manage_intake(jsonb) to authenticated;
