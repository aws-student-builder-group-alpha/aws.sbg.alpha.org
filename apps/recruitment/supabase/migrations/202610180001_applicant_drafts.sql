-- Single-cycle draft milestone. Run once on a dedicated Supabase project.
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
  if jsonb_typeof(p->'track') is distinct from 'string' or p->>'track' not in ('CORE_TEAM','COMMITTEE') or jsonb_typeof(p->'opportunityId') is distinct from 'string' then return false; end if;
  -- Catalog IDs are seeded from the approved repository catalog below.
  if p->>'opportunityId' <> '' and not exists(select 1 from public.draft_opportunities o where o.id = p->>'opportunityId' and o.track = p->>'track') then return false; end if;
  return true;
end;
$$;

create table public.draft_opportunities (id text primary key, track text not null check(track in ('CORE_TEAM','COMMITTEE')));
insert into public.draft_opportunities(id,track) values
('core-finance','CORE_TEAM'),
('core-secretariat','CORE_TEAM'),
('core-operations','CORE_TEAM'),
('core-creatives','CORE_TEAM'),
('core-marketing','CORE_TEAM'),
('core-relations','CORE_TEAM'),
('committee-finance','COMMITTEE'),
('committee-secretariat','COMMITTEE'),
('committee-operations','COMMITTEE'),
('committee-creatives','COMMITTEE'),
('committee-marketing','COMMITTEE'),
('committee-relations','COMMITTEE'),
('skillbuilders-cloud','COMMITTEE'),
('skillbuilders-ai','COMMITTEE'),
('skillbuilders-web','COMMITTEE'),
('buildher','COMMITTEE');
revoke all on public.draft_opportunities from public, anon, authenticated;
grant select on public.draft_opportunities to authenticated;
alter table public.draft_opportunities enable row level security;
create policy catalog_read on public.draft_opportunities for select to authenticated using (true);

create table public.applicant_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null check(char_length(email) between 3 and 254),
  data jsonb not null check(public.valid_draft_payload(data)),
  status text not null default 'Draft' check(status = 'Draft'),
  version integer not null default 1 check(version > 0),
  last_mutation_id uuid not null,
  privacy_version text not null default '2026-10-18',
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.applicant_drafts enable row level security;
revoke all on public.applicant_drafts from public, anon, authenticated;
grant select on public.applicant_drafts to authenticated;
create policy own_draft_read on public.applicant_drafts for select to authenticated using ((select auth.uid()) = owner_id);

create or replace function public.save_applicant_draft(p_data jsonb, p_expected_version integer, p_mutation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_email text;
  draft public.applicant_drafts;
begin
  if actor is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select email into actor_email from auth.users where id = actor and email_confirmed_at is not null;
  if actor_email is null or not exists(select 1 from auth.identities where user_id = actor and provider = 'google') then
    raise exception using errcode = '42501', message = 'Verified Google identity required';
  end if;
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
revoke all on function public.save_applicant_draft(jsonb,integer,uuid) from public, anon;
grant execute on function public.save_applicant_draft(jsonb,integer,uuid) to authenticated;
revoke all on function public.valid_draft_payload(jsonb) from public, anon;
grant execute on function public.valid_draft_payload(jsonb) to authenticated;
