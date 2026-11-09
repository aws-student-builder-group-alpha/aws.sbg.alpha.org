-- One November cycle; only the owner may maintain intake settings.
create table public.recruitment_settings (
  id boolean primary key default true check (id),
  opens_at timestamptz not null,
  closes_at timestamptz not null check (closes_at > opens_at),
  intake_state text not null check (intake_state in ('open','paused','closed')),
  finalized_at timestamptz
);
insert into public.recruitment_settings(id,opens_at,closes_at,intake_state)
values(true,'2026-11-01 00:00:00+08','2026-12-01 00:00:00+08','open');
alter table public.recruitment_settings enable row level security;
revoke all on public.recruitment_settings from public,anon,authenticated;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id),
  reference text not null unique check (reference ~ '^ALPHA-2026-[0-9A-F]{12}$'),
  email text not null,
  data jsonb not null check (public.valid_draft_payload(data)),
  privacy_version text not null,
  consented_at timestamptz not null,
  source_draft_version integer not null check (source_draft_version > 0),
  status text not null default 'Submitted' check (status in ('Submitted','Withdrawn')),
  version integer not null default 1 check (version > 0),
  submit_mutation_id uuid not null,
  withdraw_mutation_id uuid,
  submitted_at timestamptz not null default clock_timestamp(),
  withdrawn_at timestamptz,
  check ((status = 'Submitted' and withdrawn_at is null and withdraw_mutation_id is null)
      or (status = 'Withdrawn' and withdrawn_at is not null and withdraw_mutation_id is not null))
);
create table public.application_public_history (
  application_id uuid not null references public.applications(id) on delete cascade,
  version integer not null,
  status text not null check (status in ('Submitted','Withdrawn')),
  created_at timestamptz not null default clock_timestamp(),
  primary key(application_id,version)
);
alter table public.applications enable row level security;
alter table public.application_public_history enable row level security;
revoke all on public.applications,public.application_public_history from public,anon,authenticated;
grant select on public.applications,public.application_public_history to authenticated;

create function public.is_applicant_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.verified_google_user() and not public.is_staff_account();
$$;
revoke all on function public.is_applicant_account() from public,anon;
grant execute on function public.is_applicant_account() to authenticated;
create policy own_application on public.applications for select to authenticated
  using ((select auth.uid()) = owner_id and (select public.is_applicant_account()));
create policy own_public_history on public.application_public_history for select to authenticated
  using ((select public.is_applicant_account()) and exists (
    select 1 from public.applications a where a.id=application_id and a.owner_id=(select auth.uid())
  ));

-- JavaScript's Unicode whitespace set, shared with wordCount/trim in the client validator.
create function private.application_trim(value text) returns text
language sql immutable strict set search_path = '' as $$
  select regexp_replace(value,
    '^['||chr(9)||'-'||chr(13)||' '||chr(160)||chr(5760)||chr(8192)||'-'||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)||']+|['||chr(9)||'-'||chr(13)||' '||chr(160)||chr(5760)||chr(8192)||'-'||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)||']+$','','g');
$$;
create function private.application_word_count(value text) returns integer
language sql immutable strict set search_path = '' as $$
  select case when private.application_trim(value)='' then 0 else cardinality(regexp_split_to_array(private.application_trim(value),
    '['||chr(9)||'-'||chr(13)||' '||chr(160)||chr(5760)||chr(8192)||'-'||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)||']+')) end;
$$;
create function private.submission_errors(p jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare errors jsonb := '{}'; profile jsonb := p->'profile'; q record; words integer;
begin
  if not public.valid_draft_payload(p) then return '{"form":"The saved draft contains invalid fields."}'::jsonb; end if;
  if char_length(private.application_trim(profile->>'fullName')) < 2 then errors := errors || '{"fullName":"Enter your full name (2–120 characters)."}'; end if;
  if profile->>'mobile' <> '' and regexp_replace(profile->>'mobile','['||chr(9)||'-'||chr(13)||' '||chr(160)||chr(5760)||chr(8192)||'-'||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)||'().-]','','g') !~ '^\+?[0-9]{7,15}$' then errors := errors || '{"mobile":"Use a phone number with 7–15 digits."}'; end if;
  if private.application_trim(profile->>'university')='' then errors := errors || '{"university":"Choose your university."}'; end if;
  if profile->>'university'='Other' and private.application_trim(profile->>'otherUniversity')='' then errors := errors || '{"otherUniversity":"Enter your university name."}'; end if;
  if private.application_trim(profile->>'program')='' then errors := errors || '{"program":"Enter your degree or program."}'; end if;
  if profile->>'programLevel' not in ('undergraduate','postgraduate','other') then errors := errors || '{"programLevel":"Choose your program level."}'; end if;
  if profile->>'year' not in ('1','2','3','4','5','6+','other') then errors := errors || '{"year":"Choose your current academic year."}'; end if;
  if profile->>'year'='other' and private.application_trim(profile->>'yearExplanation')='' then errors := errors || '{"yearExplanation":"Tell us your academic standing."}'; end if;
  if profile->>'enrolled'<>'true' then errors := errors || '{"enrolled":"Confirm that you are currently enrolled."}'; end if;
  if p->>'track'='CORE_TEAM' and (profile->>'enrolled'<>'true' or profile->>'programLevel'<>'undergraduate' or profile->>'year' not in ('1','2')) then errors := errors || '{"eligibility":"Core Team requires an enrolled first- or second-year undergraduate."}'; end if;
  if not exists(select 1 from public.draft_opportunities o where o.id=p->>'opportunityId' and o.track=p->>'track') then errors := errors || '{"opportunityId":"Choose an opportunity in your selected track."}'; end if;
  if jsonb_array_length(profile->'availability')=0 then errors := errors || '{"availabilityDays":"Choose at least one available day."}'; end if;
  if private.application_trim(profile->>'experience')='' then errors := errors || '{"experience":"Tell us about your experience or interests. Beginners are welcome."}'; end if;
  for q in select * from (values ('motivation',50,200),('collaboration',50,200),('availability',20,100),('pathway',50,250),('scenario',50,250)) as limits(id,minimum,maximum) loop
    words := private.application_word_count(p->'answers'->>q.id);
    if words<q.minimum or words>q.maximum then errors := errors || jsonb_build_object(q.id,format('Write %s–%s words. You currently have %s.',q.minimum,q.maximum,words)); end if;
  end loop;
  if p->>'accuracy'<>'true' then errors := errors || '{"accuracy":"Confirm that your application is accurate."}'; end if;
  return errors;
end;
$$;

alter table public.applications add constraint submitted_answers_valid check (private.submission_errors(data)='{}'::jsonb);

create function private.require_applicant() returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception using errcode='42501',message='Verified Google identity required'; end if;
  perform 1 from auth.users where id=actor for update;
  if not private.verified_google_user() then raise exception using errcode='42501',message='Verified Google identity required'; end if;
  if public.is_staff_account() then raise exception using errcode='42501',message='Staff accounts cannot use applicant workflows'; end if;
  return actor;
end;
$$;
create function private.application_json(a public.applications) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id',a.id,'reference',a.reference,'email',a.email,'data',a.data,'status',a.status,'version',a.version,
    'submittedAt',a.submitted_at,'withdrawnAt',a.withdrawn_at,'history',coalesce((
      select jsonb_agg(jsonb_build_object('status',h.status,'createdAt',h.created_at) order by h.version)
      from public.application_public_history h where h.application_id=a.id),'[]'::jsonb));
$$;
create function private.keep_application_snapshot() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.id,new.owner_id,new.reference,new.email,new.data,new.privacy_version,new.consented_at,new.source_draft_version,new.submit_mutation_id,new.submitted_at)
     is distinct from (old.id,old.owner_id,old.reference,old.email,old.data,old.privacy_version,old.consented_at,old.source_draft_version,old.submit_mutation_id,old.submitted_at)
     or old.status<>'Submitted' or new.status<>'Withdrawn' or new.version<>old.version+1 then
    raise exception using errcode='42501',message='Submitted answers are immutable';
  end if;
  return new;
end;
$$;
create trigger immutable_application_snapshot before update on public.applications
  for each row execute function private.keep_application_snapshot();

create function public.get_application_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare a public.applications; settings public.recruitment_settings; server_time timestamptz := clock_timestamp();
begin
  if not public.is_applicant_account() then raise exception using errcode='42501',message='Applicant access required'; end if;
  select * into strict settings from public.recruitment_settings where id;
  select * into a from public.applications where owner_id=auth.uid();
  return jsonb_build_object('application',case when a.id is null then null else private.application_json(a) end,
    'intake',jsonb_build_object('opensAt',settings.opens_at,'closesAt',settings.closes_at,'state',settings.intake_state,'serverNow',server_time,
      'accepting',settings.intake_state='open' and server_time>=settings.opens_at and server_time<settings.closes_at));
end;
$$;
create function public.submit_applicant_application(p_expected_version integer,p_mutation_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid; draft public.applicant_drafts; a public.applications; settings public.recruitment_settings;
  errors jsonb; constraint_name text; attempt integer;
begin
  actor := private.require_applicant();
  if p_expected_version is null or p_expected_version<1 or p_mutation_id is null then raise exception using errcode='22023',message='Invalid submission request'; end if;
  select * into a from public.applications where owner_id=actor for update;
  if found then
    if a.submit_mutation_id=p_mutation_id and a.source_draft_version<>p_expected_version then raise exception using errcode='22023',message='Operation identifier reused'; end if;
    return private.application_json(a);
  end if;
  -- Share locks permit concurrent applicants, while owner intake changes wait.
  select * into strict settings from public.recruitment_settings where id for share;
  if settings.intake_state<>'open' or clock_timestamp()<settings.opens_at or clock_timestamp()>=settings.closes_at then
    raise exception using errcode='PT423',message='Submissions are not open';
  end if;
  select * into draft from public.applicant_drafts where owner_id=actor for update;
  if not found or draft.version<>p_expected_version then raise exception using errcode='PT409',message='Draft changed before submission'; end if;
  errors := private.submission_errors(draft.data);
  if errors<>'{}'::jsonb then raise exception using errcode='PT422',message='Complete your application before submitting',detail=errors::text; end if;
  for attempt in 1..5 loop
    if clock_timestamp()>=settings.closes_at then raise exception using errcode='PT423',message='Submissions are not open'; end if;
    begin
      insert into public.applications(owner_id,reference,email,data,privacy_version,consented_at,source_draft_version,submit_mutation_id)
      values(actor,'ALPHA-2026-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
        (select email from auth.users where id=actor),draft.data,draft.privacy_version,draft.consented_at,draft.version,p_mutation_id) returning * into a;
      exit;
    exception when unique_violation then
      get stacked diagnostics constraint_name = CONSTRAINT_NAME;
      if constraint_name<>'applications_reference_key' or attempt=5 then raise; end if;
    end;
  end loop;
  insert into public.application_public_history(application_id,version,status,created_at) values(a.id,a.version,a.status,a.submitted_at);
  return private.application_json(a);
end;
$$;
create function public.withdraw_applicant_application(p_expected_version integer,p_mutation_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid; a public.applications;
begin
  actor := private.require_applicant();
  if p_expected_version is null or p_expected_version<1 or p_mutation_id is null then raise exception using errcode='22023',message='Invalid withdrawal request'; end if;
  select * into a from public.applications where owner_id=actor for update;
  if not found then raise exception using errcode='P0002',message='Application not found'; end if;
  if a.submit_mutation_id=p_mutation_id then raise exception using errcode='22023',message='Operation identifier reused'; end if;
  if a.status='Withdrawn' then
    if a.withdraw_mutation_id=p_mutation_id and p_expected_version<>a.version-1 then raise exception using errcode='22023',message='Operation identifier reused'; end if;
    return private.application_json(a);
  end if;
  if a.version<>p_expected_version then raise exception using errcode='PT409',message='Application changed'; end if;
  update public.applications set status='Withdrawn',version=version+1,withdraw_mutation_id=p_mutation_id,withdrawn_at=clock_timestamp()
    where id=a.id returning * into a;
  insert into public.application_public_history(application_id,version,status,created_at) values(a.id,a.version,a.status,a.withdrawn_at);
  return private.application_json(a);
end;
$$;

revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.get_application_state(),public.submit_applicant_application(integer,uuid),public.withdraw_applicant_application(integer,uuid) from public,anon;
grant execute on function public.get_application_state(),public.submit_applicant_application(integer,uuid),public.withdraw_applicant_application(integer,uuid) to authenticated;

-- Guard before even an old idempotent draft retry. The account lock is shared with submission.
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
  if exists(select 1 from public.applications where owner_id=actor) then raise exception using errcode='PT410',message='Application already submitted'; end if;
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
